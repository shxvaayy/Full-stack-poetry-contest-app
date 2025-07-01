import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { uploadPoemFile, uploadPhotoFile, uploadMultiplePoemFiles } from './google-drive.js';
import { addPoemSubmissionToSheet, addMultiplePoemsToSheet, getSubmissionCountFromSheet, addContactToSheet } from './google-sheets.js';
import { paypalRouter } from './paypal.js';
import { storage } from './storage.js';
import { sendSubmissionConfirmation, sendMultiplePoemsConfirmation } from './mailSender.js';
import { validateTierPoemCount, TIER_POEM_COUNTS, TIER_PRICES } from './schema.js';

const router = Router();

// ERROR HANDLING MIDDLEWARE - CRITICAL FIX
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Configure multer for multiple file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10 // Maximum 10 files (5 poems + 1 photo + extras)
  }
});

// In-memory storage for submissions (legacy compatibility)
const submissions: any[] = [];

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

console.log('🔧 Razorpay Configuration Check:');
console.log('- Key ID exists:', !!process.env.RAZORPAY_KEY_ID);
console.log('- Key Secret exists:', !!process.env.RAZORPAY_KEY_SECRET);

// Add PayPal routes
router.use('/', paypalRouter);

// Test endpoint
router.get('/api/test', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    paypal_configured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    razorpay_configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    email_configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  });
});

// ===== RAZORPAY PAYMENT ENDPOINTS =====

// Create Razorpay order - FIXED VERSION
router.post('/api/create-razorpay-order', asyncHandler(async (req: any, res: any) => {
  console.log('💳 Creating Razorpay order...');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { amount, tier, metadata } = req.body;

  // Validate inputs
  if (!amount || amount <= 0) {
    console.error('❌ Invalid amount:', amount);
    return res.status(400).json({ 
      success: false,
      error: 'Valid amount is required' 
    });
  }

  if (!tier) {
    console.error('❌ Missing tier');
    return res.status(400).json({ 
      success: false,
      error: 'Tier is required' 
    });
  }

  // Check Razorpay configuration
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('❌ Razorpay not configured');
    return res.status(500).json({ 
      success: false,
      error: 'Payment system not configured' 
    });
  }

  console.log(`💰 Creating Razorpay order for amount: ₹${amount}`);

  const orderOptions = {
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}_${tier}`,
    notes: {
      tier: tier,
      amount: amount.toString(),
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };

  console.log('🔄 Calling Razorpay create order with options:', orderOptions);

  const order = await razorpay.orders.create(orderOptions);
  console.log('✅ Razorpay order created successfully:', order.id);

  // Return response in the format expected by the working PaymentForm
  res.json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    orderId: order.id,
    name: 'Writory Poetry Contest',
    description: `Poetry Contest - ${tier}`,
    receipt: order.receipt
  });
}));

// Keep the original create-order endpoint for backward compatibility
router.post('/api/create-order', asyncHandler(async (req: any, res: any) => {
  console.log('📞 Razorpay order creation request received');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { amount, currency = 'INR', receipt, tier } = req.body;

  // Validate inputs
  if (!amount || amount <= 0) {
    console.error('❌ Invalid amount:', amount);
    return res.status(400).json({ 
      success: false,
      error: 'Valid amount is required' 
    });
  }

  if (!receipt) {
    console.error('❌ Missing receipt');
    return res.status(400).json({ 
      success: false,
      error: 'Receipt is required' 
    });
  }

  // Check Razorpay configuration
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('❌ Razorpay not configured');
    return res.status(500).json({ 
      success: false,
      error: 'Payment system not configured' 
    });
  }

  console.log(`💰 Creating Razorpay order for amount: ${amount} paise`);

  const orderOptions = {
    amount: amount, // amount in paise (already converted in frontend)
    currency: currency,
    receipt: receipt,
    notes: {
      tier: tier || 'unknown',
      timestamp: new Date().toISOString()
    }
  };

  console.log('🔄 Calling Razorpay create order with options:', orderOptions);

  const order = await razorpay.orders.create(orderOptions);
  console.log('✅ Razorpay order created successfully:', order.id);

  res.json({
    success: true,
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    status: order.status
  });
}));

// Verify Razorpay payment
router.post('/api/verify-payment', asyncHandler(async (req: any, res: any) => {
  console.log('🔍 Payment verification request received');
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    amount,
    tier 
  } = req.body;

  // Validate required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    console.error('❌ Missing required payment verification fields');
    return res.status(400).json({ 
      success: false,
      error: 'Missing payment verification data' 
    });
  }

  console.log('🔐 Verifying payment signature...');

  // Create signature verification string
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest('hex');

  console.log('🔒 Signature verification:', {
    received: razorpay_signature,
    expected: expectedSignature,
    matches: expectedSignature === razorpay_signature
  });

  if (expectedSignature === razorpay_signature) {
    console.log('✅ Payment signature verified successfully');

    // Fetch additional payment details for verification
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      console.log('💳 Payment details from Razorpay:', {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        method: payment.method
      });

      res.json({
        success: true,
        verified: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: payment.amount / 100, // Convert back to rupees
        status: payment.status,
        method: payment.method,
        captured: payment.status === 'captured'
      });

    } catch (fetchError: any) {
      console.error('⚠️ Could not fetch payment details, but signature is valid:', fetchError.message);
      // If we can't fetch payment details but signature is valid, still consider it verified
      res.json({
        success: true,
        verified: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: amount,
        note: 'Payment verified by signature (details fetch failed)'
      });
    }
  } else {
    console.error('❌ Payment signature verification failed');
    res.status(400).json({ 
      success: false,
      error: 'Payment verification failed - invalid signature' 
    });
  }
}));

// Test Razorpay configuration
router.get('/api/test-razorpay', asyncHandler(async (req: any, res: any) => {
  console.log('🧪 Testing Razorpay configuration...');

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.json({
      success: false,
      configured: false,
      error: 'Razorpay credentials not found in environment variables'
    });
  }

  // Test by creating a small test order
  const testOrder = await razorpay.orders.create({
    amount: 100, // ₹1 in paise
    currency: 'INR',
    receipt: 'test_receipt_' + Date.now(),
    notes: { test: true }
  });

  res.json({
    success: true,
    configured: true,
    message: 'Razorpay is configured correctly',
    test_order_id: testOrder.id,
    test_amount: testOrder.amount
  });
}));

// ===== END RAZORPAY ENDPOINTS =====

// Check Google Sheets environment
router.get('/api/debug-google-env', (req, res) => {
  res.json({
    success: true,
    GOOGLE_SERVICE_ACCOUNT_JSON_exists: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    GOOGLE_SERVICE_ACCOUNT_JSON_length: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0,
    GOOGLE_SHEET_ID_exists: !!process.env.GOOGLE_SHEET_ID,
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || 'NOT_SET'
  });
});

// Super simple Google Sheets test
router.get('/api/test-sheets-simple', asyncHandler(async (req: any, res: any) => {
  console.log('🧪 SIMPLE Google Sheets test...');

  const testData = {
    name: 'TEST USER',
    email: 'test@test.com',
    phone: '1234567890',
    age: '25',
    poemTitle: 'Test Poem Title',
    tier: 'single',
    amount: '50',
    poemFile: 'https://drive.google.com/file/d/TEST123/view',
    photo: 'https://drive.google.com/file/d/TEST456/view',
    timestamp: '2025-06-29T00:00:00.000Z'
  };

  console.log('🧪 Test data:', testData);

  const { addPoemSubmissionToSheet } = await import('./google-sheets.js');
  console.log('🧪 Function imported successfully');

  await addPoemSubmissionToSheet(testData);
  console.log('🧪 Function called successfully');

  res.json({ success: true, message: 'Simple test completed' });
}));

// 🧪 Test Google Sheets connection
router.get('/api/test-sheets-connection', asyncHandler(async (req: any, res: any) => {
  console.log('🧪 Testing Google Sheets connection...');

  // Test data
  const testData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    age: '25',
    poemTitle: 'Test Poem',
    tier: 'single',
    amount: '50',
    poemFile: 'https://drive.google.com/test',
    photo: 'https://drive.google.com/test-photo',
    timestamp: new Date().toISOString()
  };

  console.log('📝 Sending test data to sheets...');
  await addPoemSubmissionToSheet(testData);

  res.json({ success: true, message: 'Test data sent to sheets' });
}));

// 🔍 DEBUG: Check storage state
router.get('/api/debug/storage', asyncHandler(async (req: any, res: any) => {
  // Check if data.json exists
  const fs = await import('fs/promises');
  let fileExists = false;
  let fileContent = null;

  try {
    fileContent = await fs.readFile('./data.json', 'utf-8');
    fileExists = true;
  } catch (error) {
    fileExists = false;
  }

  // Get current storage data from memory
  const allSubmissions = await storage.getAllSubmissions();
  const allUsers = (storage as any).data?.users || [];

  res.json({
    success: true,
    file_exists: fileExists,
    file_content_length: fileContent?.length || 0,
    memory_submissions: allSubmissions.length,
    memory_users: allUsers.length,
    timestamp: new Date().toISOString()
  });
}));

// 🔍 DEBUG: Check all environment variables
router.get('/api/debug/env', (req, res) => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL_exists: !!process.env.DATABASE_URL,
    RAZORPAY_KEY_ID_exists: !!process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET_exists: !!process.env.RAZORPAY_KEY_SECRET,
    PAYPAL_CLIENT_ID_exists: !!process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET_exists: !!process.env.PAYPAL_CLIENT_SECRET,
    EMAIL_USER_exists: !!process.env.EMAIL_USER,
    EMAIL_PASS_exists: !!process.env.EMAIL_PASS,
    GOOGLE_SERVICE_ACCOUNT_JSON_exists: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    GOOGLE_SHEET_ID_exists: !!process.env.GOOGLE_SHEET_ID,
    PORT: process.env.PORT || 'not set'
  };

  res.json({
    success: true,
    environment: envVars,
    timestamp: new Date().toISOString()
  });
});

// 📊 Get submission statistics
router.get('/api/stats', asyncHandler(async (req: any, res: any) => {
  console.log('📊 Fetching submission statistics...');

  const allSubmissions = await storage.getAllSubmissions();
  
  const stats = {
    total_submissions: allSubmissions.length,
    by_tier: {
      free: allSubmissions.filter(s => s.tier === 'free').length,
      single: allSubmissions.filter(s => s.tier === 'single').length,
      double: allSubmissions.filter(s => s.tier === 'double').length,
      bulk: allSubmissions.filter(s => s.tier === 'bulk').length
    },
    by_status: {
      pending: allSubmissions.filter(s => s.status === 'pending').length,
      approved: allSubmissions.filter(s => s.status === 'approved').length,
      rejected: allSubmissions.filter(s => s.status === 'rejected').length
    },
    winners: allSubmissions.filter(s => s.isWinner).length,
    recent_submissions: allSubmissions
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        name: s.firstName,
        email: s.email,
        tier: s.tier,
        poem_title: s.poemTitle,
        submitted_at: s.submittedAt
      }))
  };

  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString()
  });
}));

// 📝 SUBMISSION ENDPOINTS

// Submit single poem
router.post('/api/submit', upload.fields([
  { name: 'poemFile', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), asyncHandler(async (req: any, res: any) => {
  console.log('📝 Single poem submission received');
  console.log('Body:', req.body);
  console.log('Files:', req.files);

  const {
    firstName, lastName, email, phone, age, poemTitle, tier, paymentId, paymentMethod, authorBio, contestMonth
  } = req.body;

  // Validate required fields
  if (!firstName || !email || !poemTitle || !tier) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: firstName, email, poemTitle, tier'
    });
  }

  // Validate tier
  if (!['free', 'single', 'double', 'bulk'].includes(tier)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid tier. Must be one of: free, single, double, bulk'
    });
  }

  // Get uploaded files
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const poemFile = files?.poemFile?.[0];
  const photoFile = files?.photo?.[0];

  if (!poemFile) {
    return res.status(400).json({
      success: false,
      error: 'Poem file is required'
    });
  }

  let poemFileUrl = '';
  let photoUrl = '';

  try {
    // Upload poem file to Google Drive
    const poemBuffer = await fs.promises.readFile(poemFile.path);
    poemFileUrl = await uploadPoemFile(poemBuffer, email, poemFile.originalname);

    // Upload photo if provided
    if (photoFile) {
      const photoBuffer = await fs.promises.readFile(photoFile.path);
      photoUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
    }

    // Clean up temporary files
    await fs.promises.unlink(poemFile.path);
    if (photoFile) {
      await fs.promises.unlink(photoFile.path);
    }

  } catch (uploadError) {
    console.error('❌ File upload error:', uploadError);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload files'
    });
  }

  // Create user if doesn't exist
  let user = await storage.getUserByEmail(email);
  if (!user) {
    user = await storage.createUser({
      uid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name: `${firstName} ${lastName || ''}`.trim(),
      phone: phone || null
    });
  }

  // Create submission
  const submission = await storage.createSubmission({
    userId: user.id,
    firstName,
    lastName: lastName || null,
    email,
    phone: phone || null,
    age: age || null,
    poemTitle,
    tier,
    price: TIER_PRICES[tier as keyof typeof TIER_PRICES],
    poemFileUrl,
    photoUrl: photoUrl || null,
    paymentId: paymentId || null,
    paymentMethod: paymentMethod || null,
    submissionUuid: `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    poemIndex: 0,
    totalPoemsInSubmission: 1
  });

  // Add to Google Sheets
  try {
    await addPoemSubmissionToSheet({
      name: `${firstName} ${lastName || ''}`.trim(),
      email,
      phone: phone || '',
      age: age || '',
      poemTitle,
      tier,
      amount: TIER_PRICES[tier as keyof typeof TIER_PRICES].toString(),
      poemFile: poemFileUrl,
      photo: photoUrl,
      timestamp: new Date().toISOString()
    });
  } catch (sheetsError) {
    console.error('⚠️ Google Sheets error (non-critical):', sheetsError);
  }

  // Send confirmation email
  try {
    await sendSubmissionConfirmation({
      name: `${firstName} ${lastName || ''}`.trim(),
      email,
      poemTitle,
      tier,
      poemCount: 1
    });
  } catch (emailError) {
    console.error('⚠️ Email error (non-critical):', emailError);
  }

  res.json({
    success: true,
    message: 'Submission successful',
    submission: {
      id: submission.id,
      poemTitle: submission.poemTitle,
      tier: submission.tier,
      submittedAt: submission.submittedAt
    }
  });
}));

// Submit multiple poems
router.post('/api/submit-multiple', upload.fields([
  { name: 'poemFiles', maxCount: 5 },
  { name: 'photo', maxCount: 1 }
]), asyncHandler(async (req: any, res: any) => {
  console.log('📝 Multiple poems submission received');
  console.log('Body:', req.body);
  console.log('Files:', req.files);

  const {
    firstName, lastName, email, phone, age, tier, paymentId, paymentMethod, authorBio, contestMonth
  } = req.body;

  // Parse poem titles (they come as JSON string)
  let poemTitles: string[] = [];
  try {
    poemTitles = JSON.parse(req.body.poemTitles || '[]');
  } catch (e) {
    return res.status(400).json({
      success: false,
      error: 'Invalid poemTitles format'
    });
  }

  // Validate required fields
  if (!firstName || !email || !tier || !poemTitles.length) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: firstName, email, tier, poemTitles'
    });
  }

  // Validate tier and poem count
  if (!validateTierPoemCount(tier, poemTitles.length)) {
    return res.status(400).json({
      success: false,
      error: `Invalid poem count for tier ${tier}. Expected: ${TIER_POEM_COUNTS[tier as keyof typeof TIER_POEM_COUNTS]}, got: ${poemTitles.length}`
    });
  }

  // Get uploaded files
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const poemFiles = files?.poemFiles || [];
  const photoFile = files?.photo?.[0];

  if (poemFiles.length !== poemTitles.length) {
    return res.status(400).json({
      success: false,
      error: `Poem files count (${poemFiles.length}) doesn't match poem titles count (${poemTitles.length})`
    });
  }

  let poemFileUrls: string[] = [];
  let photoUrl = '';

  try {
    // Upload poem files to Google Drive
    const poemBuffers = await Promise.all(
      poemFiles.map(file => fs.promises.readFile(file.path))
    );
    const originalFileNames = poemFiles.map(file => file.originalname);
    
    poemFileUrls = await uploadMultiplePoemFiles(poemBuffers, email, originalFileNames, poemTitles);

    // Upload photo if provided
    if (photoFile) {
      const photoBuffer = await fs.promises.readFile(photoFile.path);
      photoUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
    }

    // Clean up temporary files
    await Promise.all(poemFiles.map(file => fs.promises.unlink(file.path)));
    if (photoFile) {
      await fs.promises.unlink(photoFile.path);
    }

  } catch (uploadError) {
    console.error('❌ File upload error:', uploadError);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload files'
    });
  }

  // Create user if doesn't exist
  let user = await storage.getUserByEmail(email);
  if (!user) {
    user = await storage.createUser({
      uid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name: `${firstName} ${lastName || ''}`.trim(),
      phone: phone || null
    });
  }

  // Create submissions for each poem
  const submissionUuid = `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const submissions = [];

  for (let i = 0; i < poemTitles.length; i++) {
    const submission = await storage.createSubmission({
      userId: user.id,
      firstName,
      lastName: lastName || null,
      email,
      phone: phone || null,
      age: age || null,
      poemTitle: poemTitles[i],
      tier,
      price: TIER_PRICES[tier as keyof typeof TIER_PRICES],
      poemFileUrl: poemFileUrls[i],
      photoUrl: photoUrl || null,
      paymentId: paymentId || null,
      paymentMethod: paymentMethod || null,
      submissionUuid,
      poemIndex: i,
      totalPoemsInSubmission: poemTitles.length
    });
    submissions.push(submission);
  }

  // Add to Google Sheets
  try {
    await addMultiplePoemsToSheet({
      name: `${firstName} ${lastName || ''}`.trim(),
      email,
      phone: phone || '',
      age: age || '',
      tier,
      amount: TIER_PRICES[tier as keyof typeof TIER_PRICES].toString(),
      photo: photoUrl,
      timestamp: new Date().toISOString(),
      submissionUuid,
      poems: poemTitles.map((title, index) => ({
        title,
        fileUrl: poemFileUrls[index],
        index
      }))
    });
  } catch (sheetsError) {
    console.error('⚠️ Google Sheets error (non-critical):', sheetsError);
  }

  // Send confirmation email
  try {
    await sendMultiplePoemsConfirmation({
      name: `${firstName} ${lastName || ''}`.trim(),
      email,
      poemTitle: poemTitles[0], // First poem title for compatibility
      tier,
      poemCount: poemTitles.length,
      allPoemTitles: poemTitles
    });
  } catch (emailError) {
    console.error('⚠️ Email error (non-critical):', emailError);
  }

  res.json({
    success: true,
    message: 'Multiple poems submission successful',
    submissions: submissions.map(s => ({
      id: s.id,
      poemTitle: s.poemTitle,
      poemIndex: s.poemIndex
    })),
    totalPoems: poemTitles.length,
    tier,
    submissionUuid
  });
}));

// Contact form endpoint
router.post('/api/contact', asyncHandler(async (req: any, res: any) => {
  console.log('📧 Contact form submission received');
  console.log('Body:', req.body);

  const { name, email, phone, message, subject } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, email, message'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  // Create contact entry
  const contact = await storage.createContact({
    name,
    email,
    phone: phone || null,
    message,
    subject: subject || null
  });

  // Add to Google Sheets
  try {
    await addContactToSheet({
      name,
      email,
      phone: phone || '',
      message,
      timestamp: new Date().toISOString()
    });
  } catch (sheetsError) {
    console.error('⚠️ Google Sheets error (non-critical):', sheetsError);
  }

  res.json({
    success: true,
    message: 'Contact form submitted successfully',
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      submittedAt: contact.submittedAt
    }
  });
}));

// Get submission by ID
router.get('/api/submission/:id', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid submission ID'
    });
  }

  const allSubmissions = await storage.getAllSubmissions();
  const submission = allSubmissions.find(s => s.id === parseInt(id));

  if (!submission) {
    return res.status(404).json({
      success: false,
      error: 'Submission not found'
    });
  }

  res.json({
    success: true,
    submission: {
      id: submission.id,
      firstName: submission.firstName,
      lastName: submission.lastName,
      email: submission.email,
      poemTitle: submission.poemTitle,
      tier: submission.tier,
      status: submission.status,
      score: submission.score,
      isWinner: submission.isWinner,
      submittedAt: submission.submittedAt
    }
  });
}));

// Get all submissions (admin)
router.get('/api/submissions', asyncHandler(async (req: any, res: any) => {
  console.log('📊 Fetching all submissions...');

  const allSubmissions = await storage.getAllSubmissions();
  
  const submissions = allSubmissions.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    poemTitle: s.poemTitle,
    tier: s.tier,
    status: s.status,
    score: s.score,
    isWinner: s.isWinner,
    submittedAt: s.submittedAt,
    poemIndex: s.poemIndex,
    totalPoemsInSubmission: s.totalPoemsInSubmission,
    submissionUuid: s.submissionUuid
  }));

  res.json({
    success: true,
    submissions,
    total: submissions.length,
    timestamp: new Date().toISOString()
  });
}));

// Get winners
router.get('/api/winners', asyncHandler(async (req: any, res: any) => {
  console.log('🏆 Fetching winners...');

  const winners = await storage.getWinningSubmissions();
  
  const winnersData = winners.map(w => ({
    id: w.id,
    firstName: w.firstName,
    lastName: w.lastName,
    email: w.email,
    poemTitle: w.poemTitle,
    tier: w.tier,
    score: w.score,
    winnerPosition: w.winnerPosition,
    submittedAt: w.submittedAt
  }));

  res.json({
    success: true,
    winners: winnersData,
    total: winnersData.length,
    timestamp: new Date().toISOString()
  });
}));

// Get submission count from Google Sheets
router.get('/api/submission-count', asyncHandler(async (req: any, res: any) => {
  console.log('📊 Getting submission count from Google Sheets...');

  const count = await getSubmissionCountFromSheet();

  res.json({
    success: true,
    count,
    timestamp: new Date().toISOString()
  });
}));

// Export router for registration
export const registerRoutes = (app: any) => {
  app.use('/', router);
  
  // Add error handling middleware at the end
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('❌ Unhandled API Error:', err);
    
    // Always return JSON, never HTML
    res.setHeader('Content-Type', 'application/json');
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error',
      details: isDevelopment ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });
  });
};

export default router;