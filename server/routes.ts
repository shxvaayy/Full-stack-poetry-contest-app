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

// MINIMAL FIX: Only set JSON header for API routes
router.use('/api/*', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// CRITICAL FIX: Error handling middleware
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('❌ Async Handler Error:', error);
    res.setHeader('Content-Type', 'application/json');
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error'
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

// SAFER: Wrapper function for upload.any() with better error handling
const safeUploadAny = (req: any, res: any, next: any) => {
  upload.any()(req, res, (error) => {
    if (error) {
      console.error('❌ Multer error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next();
  });
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
      error: 'Legacy submission failed: ' + error.message
    });
  }
}));

// Legacy multiple poems submission
router.post('/api/submit-multiple', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📝 Legacy multiple poems submission received');
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

    // Basic validation
    if (!firstName || !email || !titles.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
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

    // Upload files to Google Drive
    let poemFileUrls = [];
    let photoFileUrl = null;

    if (poemFiles.length > 0) {
      poemFileUrls = await uploadMultiplePoemFiles(poemFiles, email, titles);
    }

    if (photoFile) {
      photoFileUrl = await uploadPhotoFile(photoFile, email, 'multiple-poems');
    }

    // Create submissions for each poem (legacy in-memory storage)
    const submissionBatch = [];
    const baseId = submissions.length;

    for (let i = 0; i < titles.length; i++) {
      const submission = {
        id: baseId + i + 1,
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || '',
        age: age || '',
        poemTitle: titles[i],
        tier: tier || 'free',
        price: i === 0 ? (price || 0) : 0,
        paymentId: i === 0 ? (paymentId || null) : null,
        paymentMethod: paymentMethod || 'free',
        poemFileUrl: poemFileUrls[i] || null,
        photoFileUrl: i === 0 ? photoFileUrl : null,
        submittedAt: new Date().toISOString(),
        poemIndex: i + 1,
        totalPoems: titles.length
      };

      submissions.push(submission);
      submissionBatch.push(submission);
    }

    // Add to Google Sheets
    try {
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
        submissionIds: submissionBatch.map(s => s.id)
      });
    } catch (sheetError) {
      console.error('⚠️ Failed to add to Google Sheets:', sheetError);
    }

    // Send confirmation email
    try {
      await sendMultiplePoemsConfirmation(email, {
        name: firstName,
        poemTitles: titles,
        tier: tier || 'free'
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
      message: `${titles.length} poems submitted successfully!`,
      submissionIds: submissionBatch.map(s => s.id),
      totalSubmissions: titles.length
    });

  } catch (error) {
    console.error('❌ Legacy multiple submission error:', error);
    
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
      error: 'Legacy multiple submission failed: ' + error.message
    });
  }
}));

// ===== ADMIN ENDPOINTS =====

// Get all submissions
router.get('/api/submissions', asyncHandler(async (req: any, res: any) => {
  console.log('🔍 Getting all submissions');
  
  try {
    const dbSubmissions = await storage.getAllSubmissions();
    console.log(`✅ Found ${dbSubmissions.length} submissions in database`);
    
    // Transform database submissions
    const transformedDbSubmissions = dbSubmissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName || ''}`.trim(),
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      amount: parseFloat(sub.price?.toString() || '0'),
      submittedAt: sub.submittedAt,
      email: sub.email,
      phone: sub.phone,
      age: sub.age,
      paymentId: sub.paymentId,
      paymentMethod: sub.paymentMethod,
      poemFileUrl: sub.poemFileUrl,
      photoFileUrl: sub.photoFileUrl,
      isWinner: sub.isWinner || false,
      winnerPosition: sub.winnerPosition,
      score: sub.score,
      type: sub.type || 'Human',
      status: sub.status || 'Pending',
      scoreBreakdown: sub.scoreBreakdown ? JSON.parse(sub.scoreBreakdown) : null,
      submissionUuid: sub.submissionUuid,
      poemIndex: sub.poemIndex,
      totalPoemsInSubmission: sub.totalPoemsInSubmission
    }));

    // Combine with in-memory submissions (legacy)
    const legacySubmissions = submissions.map(sub => ({
      ...sub,
      source: 'legacy'
    }));

    const allSubmissions = [
      ...transformedDbSubmissions,
      ...legacySubmissions
    ];

    res.json({
      submissions: allSubmissions,
      total: allSubmissions.length,
      database: transformedDbSubmissions.length,
      legacy: legacySubmissions.length
    });

  } catch (error) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
}));

// Get submission statistics
router.get('/api/submission-stats', asyncHandler(async (req: any, res: any) => {
  console.log('📊 Getting submission statistics');
  
  try {
    const dbSubmissions = await storage.getAllSubmissions();
    const totalSubmissions = dbSubmissions.length + submissions.length;
    
    // Calculate tier distribution
    const tierCounts = {};
    [...dbSubmissions, ...submissions].forEach(sub => {
      const tier = sub.tier || 'free';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });
    
    // Calculate monthly submissions
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlySubmissions = [...dbSubmissions, ...submissions].filter(sub => {
      const subDate = sub.submittedAt;
      if (!subDate) return false;
      const subMonth = (subDate instanceof Date ? subDate : new Date(subDate)).toISOString().slice(0, 7);
      return subMonth === currentMonth;
    }).length;

    const stats = {
      totalSubmissions,
      monthlySubmissions,
      tierDistribution: tierCounts,
      databaseSubmissions: dbSubmissions.length,
      legacySubmissions: submissions.length,
      currentMonth
    };

    console.log('✅ Submission stats:', stats);
    res.json(stats);

  } catch (error) {
    console.error('❌ Error getting submission stats:', error);
    res.status(500).json({ error: 'Failed to get submission statistics' });
  }
}));

// Update submission (admin only)
router.put('/api/submissions/:id', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const updates = req.body;
  
  console.log(`📝 Updating submission ${id}:`, updates);
  
  try {
    const submission = await storage.updateSubmission(parseInt(id), updates);
    console.log('✅ Submission updated:', submission.id);
    
    res.json({
      success: true,
      submission
    });

  } catch (error) {
    console.error('❌ Error updating submission:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
}));

// Delete submission (admin only)
router.delete('/api/submissions/:id', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  
  console.log(`🗑️ Deleting submission ${id}`);
  
  try {
    await storage.deleteSubmission(parseInt(id));
    console.log('✅ Submission deleted:', id);
    
    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
}));

// ===== UTILITY ENDPOINTS =====

// Get submission count from Google Sheets
router.get('/api/submission-count', asyncHandler(async (req: any, res: any) => {
  console.log('📊 Getting submission count from Google Sheets');
  
  try {
    const count = await getSubmissionCountFromSheet();
    console.log('✅ Submission count from sheets:', count);
    
    res.json({
      count,
      source: 'Google Sheets'
    });

  } catch (error) {
    console.error('❌ Error getting submission count:', error);
    res.status(500).json({ error: 'Failed to get submission count' });
  }
}));

// Contact form submission
router.post('/api/contact', asyncHandler(async (req: any, res: any) => {
  console.log('📧 Contact form submission received');
  const { name, email, message, subject } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, email, message'
    });
  }

  try {
    // Add to Google Sheets
    await addContactToSheet({
      name,
      email,
      subject: subject || 'General Inquiry',
      message,
      submittedAt: new Date().toISOString()
    });

    console.log('✅ Contact form submitted successfully');

    res.json({
      success: true,
      message: 'Contact form submitted successfully!'
    });

  } catch (error) {
    console.error('❌ Contact form submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form: ' + error.message
    });
  }
}));

// Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Final error handler
router.use((error: any, req: any, res: any, next: any) => {
  console.error('🚨 Final error handler:', error);
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
});

// Register routes function
export function registerRoutes(app: any) {
  console.log('🛣️  Registering API routes...');
  app.use('/', router);
  console.log('✅ Routes registered successfully');
}

// Export router
export { router };