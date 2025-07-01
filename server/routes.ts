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

// CRITICAL FIX: Error handling middleware
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('❌ Async Handler Error:', error);

    // Force JSON response
    res.setHeader('Content-Type', 'application/json');

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
      });
    }
  });
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

// ===== USER API ENDPOINTS (MISSING) =====

// Get user by UID
router.get('/api/users/:uid', asyncHandler(async (req: any, res: any) => {
  const { uid } = req.params;
  console.log('🔍 Getting user by UID:', uid);
  
  try {
    const user = await storage.getUserByUid(uid);
    
    if (!user) {
      console.log('❌ User not found for UID:', uid);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User found:', user.email);
    res.json(user);
  } catch (error) {
    console.error('❌ Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}));

// Get user submissions
router.get('/api/users/:uid/submissions', asyncHandler(async (req: any, res: any) => {
  const { uid } = req.params;
  console.log('🔍 Getting submissions for UID:', uid);
  
  try {
    const user = await storage.getUserByUid(uid);
    
    if (!user) {
      console.log('❌ User not found for UID:', uid);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const submissions = await storage.getSubmissionsByUser(user.id);
    console.log(`✅ Found ${submissions.length} submissions for user ${user.email}`);
    
    // Transform submissions to match frontend expectations
    const transformedSubmissions = submissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName || ''}`.trim(),
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      amount: parseFloat(sub.price?.toString() || '0'),
      submittedAt: sub.submittedAt,
      isWinner: sub.isWinner || false,
      winnerPosition: sub.winnerPosition,
      score: sub.score,
      type: sub.type || 'Human',
      status: sub.status || 'Pending',
      scoreBreakdown: sub.scoreBreakdown ? JSON.parse(sub.scoreBreakdown) : null
    }));
    
    res.json(transformedSubmissions);
  } catch (error) {
    console.error('❌ Error getting user submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
}));

// Get user submission status
router.get('/api/users/:uid/submission-status', asyncHandler(async (req: any, res: any) => {
  const { uid } = req.params;
  console.log('🔍 Getting submission status for UID:', uid);
  
  try {
    const user = await storage.getUserByUid(uid);
    
    if (!user) {
      console.log('❌ User not found for UID:', uid);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const submissions = await storage.getSubmissionsByUser(user.id);
    
    // Check if user has used free submission
    const freeSubmissionUsed = submissions.some(sub => sub.tier === 'free');
    
    // Get current month submissions
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const currentMonthSubmissions = submissions.filter(sub => 
      sub.submittedAt && sub.submittedAt.toISOString().slice(0, 7) === currentMonth
    );
    
    const statusData = {
      freeSubmissionUsed,
      totalSubmissions: currentMonthSubmissions.length,
      contestMonth: currentMonth,
      allTimeSubmissions: submissions.length
    };
    
    console.log('✅ Submission status:', statusData);
    res.json(statusData);
  } catch (error) {
    console.error('❌ Error getting submission status:', error);
    res.status(500).json({ error: 'Failed to get submission status' });
  }
}));

// Create/update user
router.post('/api/users', asyncHandler(async (req: any, res: any) => {
  const { uid, email, name, phone } = req.body;
  console.log('🔍 Creating/updating user:', { uid, email, name });
  
  try {
    let user = await storage.getUserByUid(uid);
    
    if (user) {
      console.log('✅ User already exists:', user.email);
      res.json(user);
    } else {
      const newUser = await storage.createUser({
        uid,
        email,
        name: name || null,
        phone: phone || null
      });
      console.log('✅ Created new user:', newUser.email);
      res.json(newUser);
    }
  } catch (error) {
    console.error('❌ Error creating/updating user:', error);
    res.status(500).json({ error: 'Failed to create/update user' });
  }
}));

// ===== RAZORPAY PAYMENT ENDPOINTS =====

// Create Razorpay order - WORKING VERSION FROM BACKUP
router.post('/api/create-razorpay-order', asyncHandler(async (req: any, res: any) => {
  console.log('💳 Creating Razorpay order...');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { amount, tier, metadata } = req.body;

  // Validate inputs
  if (!amount || amount <= 0) {
    console.error('❌ Invalid amount:', amount);
    return res.status(400).json({ 
      error: 'Valid amount is required' 
    });
  }

  if (!tier) {
    console.error('❌ Missing tier');
    return res.status(400).json({ 
      error: 'Tier is required' 
    });
  }

  // Check Razorpay configuration
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('❌ Razorpay not configured');
    return res.status(500).json({ 
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
      error: 'Valid amount is required' 
    });
  }

  if (!receipt) {
    console.error('❌ Missing receipt');
    return res.status(400).json({ 
      error: 'Receipt is required' 
    });
  }

  // Check Razorpay configuration
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('❌ Razorpay not configured');
    return res.status(500).json({ 
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

// ===== STRIPE ENDPOINTS =====

// Verify Stripe checkout session
router.post('/api/verify-checkout-session', asyncHandler(async (req: any, res: any) => {
  console.log('🔍 Stripe session verification request received');
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // For now, we'll just return success - implement Stripe verification if needed
    console.log('✅ Stripe session verified (mock):', sessionId);
    
    res.json({
      verified: true,
      session_id: sessionId,
      payment_status: 'paid',
      amount: 50 // Mock amount
    });
  } catch (error: any) {
    console.error('❌ Stripe verification error:', error);
    res.status(500).json({ error: 'Session verification failed' });
  }
}));

// ===== PAYPAL ENDPOINTS =====

// Verify PayPal payment
router.post('/api/verify-paypal-payment', asyncHandler(async (req: any, res: any) => {
  console.log('🔍 PayPal payment verification request received');
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    // For now, we'll just return success - implement PayPal verification if needed
    console.log('✅ PayPal payment verified (mock):', orderId);
    
    res.json({
      verified: true,
      order_id: orderId,
      payment_status: 'COMPLETED',
      amount: 50 // Mock amount
    });
  } catch (error: any) {
    console.error('❌ PayPal verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
}));

// ===== ADMIN ENDPOINTS =====

// Admin CSV upload route
router.post('/api/admin/upload-csv', upload.single('csvFile'), asyncHandler(async (req: any, res: any) => {
  console.log('📤 Admin CSV upload started');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file provided' });
    }

    const csvData = req.file.buffer.toString('utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file must contain at least a header and one data row' });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('📊 CSV Headers:', headers);

    // Expected headers: email,poemtitle,score,type,originality,emotion,structure,language,theme,status
    const requiredHeaders = ['email', 'poemtitle', 'score', 'type', 'originality', 'emotion', 'structure', 'language', 'theme', 'status'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({ 
        error: `Missing required headers: ${missingHeaders.join(', ')}` 
      });
    }

    let processed = 0;
    const errors = [];

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = line.split(',').map(v => v.trim());
        
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });

        // Find submission by email and poem title
        const submission = await storage.getSubmissionByEmailAndTitle(
          rowData.email, 
          rowData.poemtitle
        );

        if (!submission) {
          errors.push(`Row ${i + 1}: Submission not found for ${rowData.email} - ${rowData.poemtitle}`);
          continue;
        }

        // Update submission with evaluation data
        const scoreBreakdown = {
          originality: parseInt(rowData.originality) || 0,
          emotion: parseInt(rowData.emotion) || 0,
          structure: parseInt(rowData.structure) || 0,
          language: parseInt(rowData.language) || 0,
          theme: parseInt(rowData.theme) || 0
        };

        await storage.updateSubmissionEvaluation(submission.id, {
          score: parseInt(rowData.score) || 0,
          type: rowData.type || 'Human',
          status: rowData.status || 'Evaluated',
          scoreBreakdown: JSON.stringify(scoreBreakdown),
          isWinner: false, // Set via separate winner upload
          winnerPosition: null
        });

        processed++;
        console.log(`✅ Updated submission ${submission.id}: ${rowData.email} - ${rowData.poemtitle}`);

      } catch (error: any) {
        console.error(`❌ Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    console.log(`✅ CSV upload completed: ${processed} processed, ${errors.length} errors`);

    res.json({
      success: true,
      message: `Successfully processed ${processed} submissions`,
      processed,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ CSV upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process CSV file',
      details: error.message 
    });
  }
}));

// ===== GOOGLE SERVICES ENDPOINTS =====

// Check Google Sheets environment
router.get('/api/debug-google-env', (req, res) => {
  res.json({
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

// Test Google Sheets connection
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

// ===== DEBUG ENDPOINTS =====

// DEBUG: Check storage state
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
    file_exists: fileExists,
    file_content_length: fileContent?.length || 0,
    memory_submissions: allSubmissions.length,
    memory_users: allUsers.length,
    timestamp: new Date().toISOString()
  });
}));

// DEBUG: Check all environment variables
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
    environment: envVars,
    timestamp: new Date().toISOString()
  });
});

// Get submission statistics
router.get('/api/stats', asyncHandler(async (req: any, res: any) => {
  console.log('📊 Getting submission statistics...');

  try {
    // Get all submissions from storage
    const allSubmissions = await storage.getAllSubmissions();
    
    // Calculate statistics
    const stats = {
      total_submissions: allSubmissions.length,
      by_tier: {
        free: allSubmissions.filter(s => s.tier === 'free').length,
        single: allSubmissions.filter(s => s.tier === 'single').length,
        double: allSubmissions.filter(s => s.tier === 'double').length,
        bulk: allSubmissions.filter(s => s.tier === 'bulk').length
      },
      by_status: {
        pending: allSubmissions.filter(s => (s.status || 'Pending') === 'Pending').length,
        evaluated: allSubmissions.filter(s => s.status === 'Evaluated').length,
        rejected: allSubmissions.filter(s => s.status === 'Rejected').length
      },
      winners: allSubmissions.filter(s => s.isWinner).length,
      total_revenue: allSubmissions.reduce((sum, s) => sum + (parseFloat(s.price?.toString() || '0')), 0),
      last_updated: new Date().toISOString()
    };

    console.log('✅ Statistics calculated:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error calculating statistics:', error);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
}));

// ===== COUPON ENDPOINTS =====

// Validate coupon code
router.post('/api/validate-coupon', asyncHandler(async (req: any, res: any) => {
  console.log('🎫 Coupon validation request received');
  const { code, tier, amount, userUid } = req.body;

  if (!code || !tier || !amount) {
    return res.status(400).json({ 
      error: 'Code, tier, and amount are required' 
    });
  }

  try {
    // Simple coupon validation logic (you can enhance this)
    const validCoupons = {
      'FIRST10': { discount: 10, type: 'percentage', tiers: ['single', 'double', 'bulk'] },
      'SAVE20': { discount: 20, type: 'percentage', tiers: ['double', 'bulk'] },
      'WELCOME50': { discount: 50, type: 'fixed', tiers: ['single', 'double', 'bulk'] }
    };

    const coupon = validCoupons[code.toUpperCase() as keyof typeof validCoupons];

    if (!coupon) {
      return res.json({ valid: false, error: 'Invalid coupon code' });
    }

    if (!coupon.tiers.includes(tier)) {
      return res.json({ valid: false, error: 'Coupon not valid for this tier' });
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = Math.round((amount * coupon.discount) / 100);
    } else {
      discount = coupon.discount;
    }

    // Ensure discount doesn't exceed amount
    discount = Math.min(discount, amount);

    console.log('✅ Coupon validated:', { code, discount, type: coupon.type });

    res.json({
      valid: true,
      discount,
      discountPercentage: coupon.type === 'percentage' ? coupon.discount : Math.round((discount / amount) * 100),
      finalAmount: amount - discount
    });

  } catch (error: any) {
    console.error('❌ Coupon validation error:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
}));

// ===== SUBMISSION ENDPOINTS =====

// Single poem submission
router.post('/api/submit-poem', upload.fields([
  { name: 'poemFile', maxCount: 1 },
  { name: 'photoFile', maxCount: 1 }
]), asyncHandler(async (req: any, res: any) => {
  console.log('🎭 Single poem submission received');
  console.log('📝 Form data:', req.body);
  console.log('📁 Files:', req.files);

  const {
    firstName,
    lastName,
    email,
    phone,
    age,
    poemTitle,
    tier,
    termsAccepted,
    paymentData,
    sessionId,
    userUid
  } = req.body;

  // Validate required fields
  if (!firstName || !email || !poemTitle || !tier) {
    return res.status(400).json({
      error: 'Missing required fields: firstName, email, poemTitle, tier'
    });
  }

  if (!termsAccepted) {
    return res.status(400).json({
      error: 'Terms and conditions must be accepted'
    });
  }

  try {
    // Parse payment data if it's a string
    let parsedPaymentData = null;
    if (paymentData) {
      parsedPaymentData = typeof paymentData === 'string' ? JSON.parse(paymentData) : paymentData;
    }

    // Upload files to Google Drive
    const files = req.files as any;
    let poemFileUrl = null;
    let photoFileUrl = null;
    let driveFileId = null;
    let drivePhotoId = null;

    if (files?.poemFile?.[0]) {
      console.log('📁 Uploading poem file...');
      const poemUpload = await uploadPoemFile(files.poemFile[0], poemTitle, email);
      poemFileUrl = poemUpload.webViewLink;
      driveFileId = poemUpload.id;
      console.log('✅ Poem file uploaded:', poemFileUrl);
    }

    if (files?.photoFile?.[0]) {
      console.log('📷 Uploading photo file...');
      const photoUpload = await uploadPhotoFile(files.photoFile[0], firstName, email);
      photoFileUrl = photoUpload.webViewLink;
      drivePhotoId = photoUpload.id;
      console.log('✅ Photo file uploaded:', photoFileUrl);
    }

    // Create or get user
    let user = null;
    if (userUid) {
      user = await storage.getUserByUid(userUid);
      if (!user) {
        user = await storage.createUser({
          uid: userUid,
          email,
          name: `${firstName} ${lastName || ''}`.trim(),
          phone
        });
      }
    }

    // Determine pricing
    const price = tier === 'free' ? 0 : TIER_PRICES[tier as keyof typeof TIER_PRICES];

    // Create submission
    const submissionData = {
      userId: user?.id || null,
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age ? parseInt(age) : null,
      poemTitle,
      tier,
      price,
      paymentId: parsedPaymentData?.payment_id || parsedPaymentData?.razorpay_payment_id || sessionId,
      paymentMethod: parsedPaymentData?.payment_method || 'razorpay',
      paymentStatus: parsedPaymentData ? 'completed' : 'pending',
      sessionId: sessionId || null,
      termsAccepted: termsAccepted === 'true' || termsAccepted === true,
      poemFileUrl,
      photoFileUrl,
      driveFileId,
      drivePhotoId,
      poemIndex: 1,
      totalPoemsInSubmission: 1,
      submissionUuid: crypto.randomUUID(),
      contestMonth: new Date().toISOString().slice(0, 7),
      contestYear: new Date().getFullYear()
    };

    console.log('💾 Creating submission in database...');
    const submission = await storage.createSubmission(submissionData);
    console.log('✅ Submission created:', submission.id);

    // Add to Google Sheets for backup
    try {
      const sheetData = {
        name: `${firstName} ${lastName || ''}`.trim(),
        email,
        phone: phone || '',
        age: age || '',
        poemTitle,
        tier,
        amount: price?.toString() || '0',
        poemFile: poemFileUrl || '',
        photo: photoFileUrl || '',
        timestamp: new Date().toISOString()
      };

      await addPoemSubmissionToSheet(sheetData);
      console.log('✅ Added to Google Sheets');
    } catch (sheetError) {
      console.error('⚠️ Google Sheets error (non-critical):', sheetError);
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
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Email error (non-critical):', emailError);
    }

    // Clean up uploaded files
    if (files?.poemFile?.[0]) {
      fs.unlinkSync(files.poemFile[0].path);
    }
    if (files?.photoFile?.[0]) {
      fs.unlinkSync(files.photoFile[0].path);
    }

    res.json({
      success: true,
      message: 'Poem submitted successfully',
      submissionId: submission.id,
      poemTitle,
      tier,
      amount: price
    });

  } catch (error: any) {
    console.error('❌ Submission error:', error);
    
    // Clean up files on error
    const files = req.files as any;
    try {
      if (files?.poemFile?.[0] && fs.existsSync(files.poemFile[0].path)) {
        fs.unlinkSync(files.poemFile[0].path);
      }
      if (files?.photoFile?.[0] && fs.existsSync(files.photoFile[0].path)) {
        fs.unlinkSync(files.photoFile[0].path);
      }
    } catch (cleanupError) {
      console.error('⚠️ File cleanup error:', cleanupError);
    }

    res.status(500).json({
      error: error.message || 'Failed to submit poem'
    });
  }
}));

// Multiple poems submission
router.post('/api/submit-multiple-poems', upload.array('files', 10), asyncHandler(async (req: any, res: any) => {
  console.log('🎭 Multiple poems submission received');
  console.log('📝 Form data:', req.body);
  console.log('📁 Files count:', req.files?.length || 0);

  const {
    firstName,
    lastName,
    email,
    phone,
    age,
    tier,
    termsAccepted,
    paymentData,
    sessionId,
    userUid,
    poemTitles // JSON string of poem titles
  } = req.body;

  // Validate required fields
  if (!firstName || !email || !tier || !poemTitles) {
    return res.status(400).json({
      error: 'Missing required fields: firstName, email, tier, poemTitles'
    });
  }

  if (!termsAccepted) {
    return res.status(400).json({
      error: 'Terms and conditions must be accepted'
    });
  }

  try {
    // Parse poem titles
    const titles = JSON.parse(poemTitles);
    const poemCount = validateTierPoemCount(tier, titles.length);

    if (!poemCount) {
      return res.status(400).json({
        error: `Invalid poem count for tier ${tier}`
      });
    }

    // Parse payment data
    let parsedPaymentData = null;
    if (paymentData) {
      parsedPaymentData = typeof paymentData === 'string' ? JSON.parse(paymentData) : paymentData;
    }

    // Upload files to Google Drive
    const files = req.files as Express.Multer.File[];
    const uploadResults = await uploadMultiplePoemFiles(
      files,
      titles,
      email,
      firstName
    );

    console.log('✅ Files uploaded:', uploadResults.length);

    // Create or get user
    let user = null;
    if (userUid) {
      user = await storage.getUserByUid(userUid);
      if (!user) {
        user = await storage.createUser({
          uid: userUid,
          email,
          name: `${firstName} ${lastName || ''}`.trim(),
          phone
        });
      }
    }

    // Determine pricing
    const price = tier === 'free' ? 0 : TIER_PRICES[tier as keyof typeof TIER_PRICES];
    const submissionUuid = crypto.randomUUID();

    // Create submissions for each poem
    const submissions = [];
    for (let i = 0; i < titles.length; i++) {
      const uploadResult = uploadResults[i];
      
      const submissionData = {
        userId: user?.id || null,
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || '',
        age: age ? parseInt(age) : null,
        poemTitle: titles[i],
        tier,
        price: i === 0 ? price : 0, // Only charge for first poem
        paymentId: parsedPaymentData?.payment_id || parsedPaymentData?.razorpay_payment_id || sessionId,
        paymentMethod: parsedPaymentData?.payment_method || 'razorpay',
        paymentStatus: parsedPaymentData ? 'completed' : 'pending',
        sessionId: sessionId || null,
        termsAccepted: termsAccepted === 'true' || termsAccepted === true,
        poemFileUrl: uploadResult?.poem?.webViewLink || null,
        photoFileUrl: uploadResult?.photo?.webViewLink || null,
        driveFileId: uploadResult?.poem?.id || null,
        drivePhotoId: uploadResult?.photo?.id || null,
        poemIndex: i + 1,
        totalPoemsInSubmission: titles.length,
        submissionUuid,
        contestMonth: new Date().toISOString().slice(0, 7),
        contestYear: new Date().getFullYear()
      };

      const submission = await storage.createSubmission(submissionData);
      submissions.push(submission);
      console.log(`✅ Submission ${i + 1} created:`, submission.id);
    }

    // Add to Google Sheets for backup
    try {
      await addMultiplePoemsToSheet({
        name: `${firstName} ${lastName || ''}`.trim(),
        email,
        phone: phone || '',
        age: age || '',
        tier,
        amount: price?.toString() || '0',
        poems: titles.map((title: string, index: number) => ({
          title,
          poemFile: uploadResults[index]?.poem?.webViewLink || '',
          photo: uploadResults[index]?.photo?.webViewLink || ''
        })),
        timestamp: new Date().toISOString()
      });
      console.log('✅ Added to Google Sheets');
    } catch (sheetError) {
      console.error('⚠️ Google Sheets error (non-critical):', sheetError);
    }

    // Send confirmation email
    try {
      await sendMultiplePoemsConfirmation({
        name: `${firstName} ${lastName || ''}`.trim(),
        email,
        tier,
        poemCount: titles.length,
        allPoemTitles: titles
      });
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Email error (non-critical):', emailError);
    }

    // Clean up uploaded files
    files.forEach(file => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (cleanupError) {
        console.error('⚠️ File cleanup error:', cleanupError);
      }
    });

    res.json({
      success: true,
      message: `${titles.length} poems submitted successfully`,
      submissionIds: submissions.map(s => s.id),
      poemTitles: titles,
      tier,
      amount: price,
      submissionUuid
    });

  } catch (error: any) {
    console.error('❌ Multiple submission error:', error);
    
    // Clean up files on error
    const files = req.files as Express.Multer.File[];
    files?.forEach(file => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (cleanupError) {
        console.error('⚠️ File cleanup error:', cleanupError);
      }
    });

    res.status(500).json({
      error: error.message || 'Failed to submit poems'
    });
  }
}));

// ===== CONTACT ENDPOINTS =====

// Submit contact form
router.post('/api/contact', asyncHandler(async (req: any, res: any) => {
  console.log('📧 Contact form submission received');
  const { name, email, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({
      error: 'Name, email, and message are required'
    });
  }

  try {
    // Save to database (if you have contacts table)
    try {
      await storage.createContact({
        name,
        email,
        subject: subject || 'General Inquiry',
        message,
        status: 'new'
      });
      console.log('✅ Contact saved to database');
    } catch (dbError) {
      console.error('⚠️ Database save error (non-critical):', dbError);
    }

    // Add to Google Sheets for backup
    try {
      await addContactToSheet({
        name,
        email,
        subject: subject || 'General Inquiry',
        message,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Contact added to Google Sheets');
    } catch (sheetError) {
      console.error('⚠️ Google Sheets error (non-critical):', sheetError);
    }

    res.json({
      success: true,
      message: 'Contact form submitted successfully'
    });

  } catch (error: any) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      error: 'Failed to submit contact form'
    });
  }
}));

// ===== GET ALL SUBMISSIONS FOR RESULTS =====

// Get all submissions (for results page)
router.get('/api/submissions', asyncHandler(async (req: any, res: any) => {
  console.log('📊 Getting all submissions...');

  try {
    const submissions = await storage.getAllSubmissions();
    
    // Transform submissions for frontend
    const transformedSubmissions = submissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName || ''}`.trim(),
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      submittedAt: sub.submittedAt,
      isWinner: sub.isWinner || false,
      winnerPosition: sub.winnerPosition,
      score: sub.score,
      type: sub.type || 'Human',
      status: sub.status || 'Pending'
    }));

    console.log(`✅ Retrieved ${transformedSubmissions.length} submissions`);
    res.json(transformedSubmissions);
  } catch (error) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
}));

// Register routes function
export function registerRoutes(app: any) {
  app.use(router);
}

// Export router
export { router };