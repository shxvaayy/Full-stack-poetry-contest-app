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

// SAFER: Configure multer with better error handling
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 15 // Maximum 15 files total
  },
  fileFilter: (req, file, cb) => {
    // Check if req exists and has headers
    if (!req || !req.headers) {
      console.error('❌ Invalid request object in multer');
      return cb(new Error('Invalid request'), false);
    }
    
    console.log('📁 Multer receiving file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    // Accept all file types
    cb(null, true);
  }
});

// SAFER: Wrapper function for upload.any() with error handling
const safeUploadAny = (req: any, res: any, next: any) => {
  // Ensure req has proper structure before passing to multer
  if (!req || !req.headers || typeof req.headers !== 'object') {
    console.error('❌ Invalid request structure for multer');
    return res.status(400).json({
      success: false,
      error: 'Invalid request format'
    });
  }
  
  // Ensure headers exist
  req.headers = req.headers || {};
  
  // Call multer with safe request
  upload.any()(req, res, next);
};

// Define field configurations
const uploadFields = upload.fields([
  { name: 'poemFile', maxCount: 1 },
  { name: 'photoFile', maxCount: 1 },
  { name: 'poems', maxCount: 10 },
  { name: 'photo', maxCount: 1 },
  { name: 'files', maxCount: 15 },
]);

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

// Debug endpoint to test file uploads
router.post('/api/test-upload', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('🧪 Test upload endpoint hit');
  console.log('📋 Request body:', req.body);
  console.log('📁 Files received:', req.files);
  
  res.json({
    success: true,
    message: 'Upload test successful',
    body: req.body,
    files: req.files?.map((f: any) => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      size: f.size,
      mimetype: f.mimetype
    })) || []
  });
}));

// ===== USER API ENDPOINTS =====

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

// Create Razorpay order
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
      message: 'Razorpay credentials not configured'
    });
  }

  try {
    // Try to create a test order
    const testOrder = await razorpay.orders.create({
      amount: 100, // ₹1 in paise
      currency: 'INR',
      receipt: `test_${Date.now()}`
    });

    res.json({
      success: true,
      configured: true,
      message: 'Razorpay is properly configured',
      testOrderId: testOrder.id
    });

  } catch (error: any) {
    console.error('❌ Razorpay test failed:', error);
    res.json({
      success: false,
      configured: false,
      message: 'Razorpay test failed: ' + error.message
    });
  }
}));

// ===== SUBMISSION ENDPOINTS =====

// Single poem submission with proper file handling
router.post('/api/submit-poem', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📝 Single poem submission received');
  console.log('📋 Body:', JSON.stringify(req.body, null, 2));
  console.log('📁 Files:', req.files?.map((f: any) => ({ fieldname: f.fieldname, originalname: f.originalname })));

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      poemTitle,
      tier,
      price,
      paymentId,
      paymentMethod,
      uid
    } = req.body;

    // Validate required fields
    if (!firstName || !email || !poemTitle || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, email, poemTitle, tier'
      });
    }

    // Find uploaded files
    let poemFile = null;
    let photoFile = null;

    if (req.files && Array.isArray(req.files)) {
      poemFile = req.files.find((f: any) => 
        f.fieldname === 'poemFile' || 
        f.fieldname === 'poems' || 
        f.originalname?.toLowerCase().includes('poem')
      );
      
      photoFile = req.files.find((f: any) => 
        f.fieldname === 'photoFile' || 
        f.fieldname === 'photo' || 
        f.originalname?.toLowerCase().includes('photo') ||
        f.mimetype?.startsWith('image/')
      );
    }

    console.log('📁 Identified files:', {
      poemFile: poemFile?.originalname,
      photoFile: photoFile?.originalname
    });

    // Upload files to Google Drive
    let poemFileUrl = null;
    let photoFileUrl = null;

    if (poemFile) {
      console.log('☁️ Uploading poem file to Google Drive...');
      poemFileUrl = await uploadPoemFile(poemFile, email, poemTitle);
      console.log('✅ Poem file uploaded:', poemFileUrl);
    }

    if (photoFile) {
      console.log('☁️ Uploading photo file to Google Drive...');
      photoFileUrl = await uploadPhotoFile(photoFile, email, poemTitle);
      console.log('✅ Photo file uploaded:', photoFileUrl);
    }

    // Create submission data
    const submissionData = {
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age ? parseInt(age) : null,
      poemTitle,
      tier,
      price: price ? parseFloat(price) : 0,
      paymentId: paymentId || null,
      paymentMethod: paymentMethod || 'free',
      poemFileUrl,
      photoFileUrl,
      submissionUuid: crypto.randomUUID(),
      poemIndex: 1,
      totalPoemsInSubmission: 1,
      submittedAt: new Date(),
      status: 'Pending',
      type: 'Human'
    };

    // Create or find user
    let user = null;
    if (uid) {
      user = await storage.getUserByUid(uid);
      if (!user) {
        user = await storage.createUser({
          uid,
          email,
          name: firstName + (lastName ? ` ${lastName}` : ''),
          phone: phone || null
        });
      }
      submissionData.userId = user.id;
    }

    // Save to database
    console.log('💾 Saving submission to database...');
    const submission = await storage.createSubmission(submissionData);
    console.log('✅ Submission saved with ID:', submission.id);

    // Add to Google Sheets
    try {
      console.log('📊 Adding to Google Sheets...');
      await addPoemSubmissionToSheet({
        ...submissionData,
        submissionId: submission.id
      });
      console.log('✅ Added to Google Sheets');
    } catch (sheetError) {
      console.error('⚠️ Failed to add to Google Sheets:', sheetError);
      // Continue even if sheets fail
    }

    // Send confirmation email
    try {
      console.log('📧 Sending confirmation email...');
      await sendSubmissionConfirmation(email, {
        name: firstName,
        poemTitle,
        tier,
        submissionId: submission.id
      });
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send email:', emailError);
      // Continue even if email fails
    }

    // Clean up uploaded files
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Warning: Could not delete temp file:', file.path);
        }
      });
    }

    console.log('🎉 Submission completed successfully!');
    
    res.json({
      success: true,
      message: 'Poem submitted successfully!',
      submissionId: submission.id,
      submissionUuid: submission.submissionUuid
    });

  } catch (error) {
    console.error('❌ Submission error:', error);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          // Ignore cleanup errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Submission failed: ' + error.message
    });
  }
}));

// Multiple poems submission
router.post('/api/submit-multiple-poems', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📝 Multiple poems submission received');
  console.log('📋 Body:', JSON.stringify(req.body, null, 2));
  console.log('📁 Files count:', req.files?.length || 0);

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      tier,
      price,
      paymentId,
      paymentMethod,
      uid,
      poemTitles // This should be a JSON string array
    } = req.body;

    // Parse poem titles
    let titles = [];
    try {
      titles = JSON.parse(poemTitles || '[]');
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid poemTitles format'
      });
    }

    // Validate required fields
    if (!firstName || !email || !titles.length || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate tier and poem count
    if (!validateTierPoemCount(tier, titles.length)) {
      return res.status(400).json({
        success: false,
        error: `Invalid poem count for tier ${tier}. Expected ${TIER_POEM_COUNTS[tier]}, got ${titles.length}`
      });
    }

    // Separate poem files and photo file
    const poemFiles = req.files?.filter((f: any) => 
      f.fieldname === 'poems' || f.originalname?.toLowerCase().includes('poem')
    ) || [];
    
    const photoFile = req.files?.find((f: any) => 
      f.fieldname === 'photo' || 
      f.fieldname === 'photoFile' ||
      f.mimetype?.startsWith('image/')
    );

    console.log('📁 Identified files:', {
      poemFiles: poemFiles.length,
      photoFile: photoFile?.originalname
    });

    // Upload files to Google Drive
    let poemFileUrls = [];
    let photoFileUrl = null;

    if (poemFiles.length > 0) {
      console.log('☁️ Uploading poem files to Google Drive...');
      poemFileUrls = await uploadMultiplePoemFiles(poemFiles, email, titles);
      console.log('✅ Poem files uploaded:', poemFileUrls.length);
    }

    if (photoFile) {
      console.log('☁️ Uploading photo file to Google Drive...');
      photoFileUrl = await uploadPhotoFile(photoFile, email, 'multiple-poems');
      console.log('✅ Photo file uploaded:', photoFileUrl);
    }

    // Create or find user
    let user = null;
    if (uid) {
      user = await storage.getUserByUid(uid);
      if (!user) {
        user = await storage.createUser({
          uid,
          email,
          name: firstName + (lastName ? ` ${lastName}` : ''),
          phone: phone || null
        });
      }
    }

    // Create submissions for each poem
    const submissionUuid = crypto.randomUUID();
    const submissions = [];

    for (let i = 0; i < titles.length; i++) {
      const submissionData = {
        userId: user?.id || null,
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || '',
        age: age ? parseInt(age) : null,
        poemTitle: titles[i],
        tier,
        price: i === 0 ? (price ? parseFloat(price) : 0) : 0, // Only first submission has price
        paymentId: i === 0 ? (paymentId || null) : null,
        paymentMethod: i === 0 ? (paymentMethod || 'free') : paymentMethod,
        poemFileUrl: poemFileUrls[i] || null,
        photoFileUrl: i === 0 ? photoFileUrl : null, // Only first submission has photo
        submissionUuid,
        poemIndex: i + 1,
        totalPoemsInSubmission: titles.length,
        submittedAt: new Date(),
        status: 'Pending',
        type: 'Human'
      };

      console.log(`💾 Saving submission ${i + 1}/${titles.length}: ${titles[i]}`);
      const submission = await storage.createSubmission(submissionData);
      submissions.push(submission);
    }

    console.log('✅ All submissions saved');

    // Add to Google Sheets
    try {
      console.log('📊 Adding to Google Sheets...');
      await addMultiplePoemsToSheet({
        firstName,
        lastName,
        email,
        phone,
        age,
        tier,
        price,
        paymentId,
        paymentMethod,
        titles,
        submissionUuid,
        submissionIds: submissions.map(s => s.id)
      });
      console.log('✅ Added to Google Sheets');
    } catch (sheetError) {
      console.error('⚠️ Failed to add to Google Sheets:', sheetError);
    }

    // Send confirmation email
    try {
      console.log('📧 Sending confirmation email...');
      await sendMultiplePoemsConfirmation(email, {
        name: firstName,
        poemTitles: titles,
        tier,
        submissionUuid
      });
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send email:', emailError);
    }

    // Clean up uploaded files
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Warning: Could not delete temp file:', file.path);
        }
      });
    }

    console.log('🎉 Multiple poems submission completed successfully!');
    
    res.json({
      success: true,
      message: `${titles.length} poems submitted successfully!`,
      submissionUuid,
      submissionIds: submissions.map(s => s.id),
      totalSubmissions: titles.length
    });

  } catch (error) {
    console.error('❌ Multiple poems submission error:', error);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          // Ignore cleanup errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Multiple poems submission failed: ' + error.message
    });
  }
}));

// ===== LEGACY SUBMISSION ENDPOINTS (Backward Compatibility) =====

// Legacy single poem submission
router.post('/api/submit', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📝 Legacy single poem submission received (redirecting to new endpoint)');
  
  // Just redirect to the new endpoint logic
  const {
    firstName,
    lastName,
    email,
    phone,
    age,
    poemTitle,
    tier = 'free', // Default to free for legacy submissions
    paymentId,
    paymentMethod = 'free'
  } = req.body;

  try {
    // Basic validation
    if (!firstName || !email || !poemTitle) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, email, poemTitle'
      });
    }

    // Find uploaded files
    let poemFile = null;
    let photoFile = null;

    if (req.files && Array.isArray(req.files)) {
      poemFile = req.files.find((f: any) => 
        f.fieldname === 'poemFile' || 
        f.fieldname === 'poems' || 
        f.originalname?.toLowerCase().includes('poem')
      );
      
      photoFile = req.files.find((f: any) => 
        f.fieldname === 'photoFile' || 
        f.fieldname === 'photo' || 
        f.mimetype?.startsWith('image/')
      );
    }

    // Upload files to Google Drive
    let poemFileUrl = null;
    let photoFileUrl = null;

    if (poemFile) {
      poemFileUrl = await uploadPoemFile(poemFile, email, poemTitle);
    }

    if (photoFile) {
      photoFileUrl = await uploadPhotoFile(photoFile, email, poemTitle);
    }

    // Save to in-memory storage (legacy)
    const submission = {
      id: submissions.length + 1,
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age || '',
      poemTitle,
      tier,
      paymentId: paymentId || null,
      paymentMethod,
      poemFileUrl,
      photoFileUrl,
      submittedAt: new Date().toISOString()
    };

    submissions.push(submission);

    // Add to Google Sheets
    try {
      await addPoemSubmissionToSheet(submission);
    } catch (sheetError) {
      console.error('⚠️ Failed to add to Google Sheets:', sheetError);
    }

    // Send confirmation email
    try {
      await sendSubmissionConfirmation(email, {
        name: firstName,
        poemTitle,
        tier,
        submissionId: submission.id
      });
    } catch (emailError) {
      console.error('⚠️ Failed to send email:', emailError);
    }

    // Clean up uploaded files
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Warning: Could not delete temp file:', file.path);
        }
      });
    }

    res.json({
      success: true,
      message: 'Poem submitted successfully!',
      submissionId: submission.id
    });

  } catch (error) {
    console.error('❌ Legacy submission error:', error);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          // Ignore cleanup errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Submission failed: ' + error.message
    });
  }
}));

// ===== CONTACT FORM ENDPOINT =====

router.post('/api/contact', asyncHandler(async (req: any, res: any) => {
  console.log('📞 Contact form submission received');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { name, email, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and message are required'
    });
  }

  try {
    // Add to Google Sheets
    await addContactToSheet({
      name,
      email,
      subject: subject || 'Contact Form Submission',
      message,
      submittedAt: new Date()
    });

    console.log('✅ Contact form added to Google Sheets');

    res.json({
      success: true,
      message: 'Contact form submitted successfully!'
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form: ' + error.message
    });
  }
}));

// ===== ADMIN ENDPOINTS =====

// Get all submissions (admin only)
router.get('/api/admin/submissions', asyncHandler(async (req: any, res: any) => {
  console.log('👨‍💼 Admin: Getting all submissions');
  
  try {
    // Get from database if available
    if (storage.getAllSubmissions) {
      const dbSubmissions = await storage.getAllSubmissions();
      console.log(`✅ Retrieved ${dbSubmissions.length} submissions from database`);
      res.json(dbSubmissions);
    } else {
      // Fallback to in-memory storage
      console.log(`✅ Retrieved ${submissions.length} submissions from memory`);
      res.json(submissions);
    }
  } catch (error) {
    console.error('❌ Error getting admin submissions:', error);
    // Fallback to in-memory storage on error
    res.json(submissions);
  }
}));

// Upload evaluation results (admin only)
router.post('/api/admin/upload-evaluations', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('👨‍💼 Admin: Uploading evaluation results');
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No CSV file uploaded'
    });
  }

  const csvFile = req.files[0];
  console.log('📁 CSV file received:', csvFile.originalname);

  try {
    // Read and parse CSV file
    const csvContent = fs.readFileSync(csvFile.path, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('📋 CSV headers:', headers);

    let updatedCount = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const rowData = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        // Find submission by email and poem title
        const email = rowData['Email'] || rowData['email'];
        const poemTitle = rowData['Poem Title'] || rowData['poemTitle'];
        
        if (!email || !poemTitle) {
          errors.push(`Row ${i + 1}: Missing email or poem title`);
          continue;
        }

        // Update submission with evaluation data
        if (storage.updateSubmissionEvaluation) {
          const submission = await storage.getSubmissionByEmailAndTitle(email, poemTitle);
          
          if (submission) {
            await storage.updateSubmissionEvaluation(submission.id, {
              score: parseInt(rowData['Score'] || rowData['score'] || '0'),
              type: rowData['Type'] || rowData['type'] || 'Human',
              status: rowData['Status'] || rowData['status'] || 'Evaluated',
              scoreBreakdown: JSON.stringify(rowData),
              isWinner: (rowData['Winner'] || rowData['winner'] || '').toLowerCase() === 'yes',
              winnerPosition: parseInt(rowData['Position'] || rowData['position'] || '0') || null
            });
            updatedCount++;
          } else {
            errors.push(`Row ${i + 1}: Submission not found for ${email} - ${poemTitle}`);
          }
        }
      } catch (rowError) {
        errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(csvFile.path);

    console.log(`✅ Updated ${updatedCount} submissions`);
    if (errors.length > 0) {
      console.log('⚠️ Errors:', errors);
    }

    res.json({
      success: true,
      message: `Evaluation results uploaded successfully. Updated ${updatedCount} submissions.`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ CSV upload error:', error);
    
    // Clean up file on error
    try {
      fs.unlinkSync(csvFile.path);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file: ' + error.message
    });
  }
}));

// ===== UTILITY ENDPOINTS =====

// Get submission count
router.get('/api/submission-count', asyncHandler(async (req: any, res: any) => {
  try {
    const count = await getSubmissionCountFromSheet();
    res.json({
      success: true,
      count: count || submissions.length || 0
    });
  } catch (error) {
    console.error('❌ Error getting submission count:', error);
    res.json({
      success: true,
      count: submissions.length || 0 // Return in-memory count on error
    });
  }
}));

// Get all submissions (public endpoint with limited data)
router.get('/api/submissions', asyncHandler(async (req: any, res: any) => {
  console.log('🔍 Getting public submissions list');
  
  try {
    // Return limited public data
    const publicSubmissions = submissions.map(sub => ({
      id: sub.id,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      submittedAt: sub.submittedAt,
      isWinner: sub.isWinner || false,
      winnerPosition: sub.winnerPosition,
      score: sub.score,
      type: sub.type || 'Human',
      status: sub.status || 'Pending'
    }));

    res.json({
      success: true,
      submissions: publicSubmissions,
      total: publicSubmissions.length
    });
  } catch (error) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get submissions'
    });
  }
}));

// Health check for file upload system
router.get('/api/upload-health', (req, res) => {
  res.json({
    success: true,
    message: 'File upload system is healthy',
    multer_configured: true,
    google_drive_configured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    google_sheets_configured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    timestamp: new Date().toISOString()
  });
});

// Export the router registration function
export function registerRoutes(app: any) {
  console.log('🛣️  Registering API routes...');
  app.use('/', router);
  console.log('✅ Routes registered successfully');
  console.log('🔧 Multer configured with safe upload handling');
  console.log('📁 Supported file fields: poemFile, photoFile, poems, photo, files');
}

// Export router
export { router };