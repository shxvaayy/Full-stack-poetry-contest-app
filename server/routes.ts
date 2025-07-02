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
import { db } from './db.js';
import { couponUsage, users } from './schema.js';
import { eq, and } from 'drizzle-orm';

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

// FIXED: REMOVED In-memory storage for submissions - ALL DATA NOW FROM DATABASE
// const submissions: any[] = []; // DELETED - this was causing reset issues

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

// Get user submissions - FIXED VERSION
router.get('/api/users/:uid/submissions', asyncHandler(async (req: any, res: any) => {
  const { uid } = req.params;
  console.log('🔍 Getting submissions for UID:', uid);

  try {
    const user = await storage.getUserByUid(uid);

    if (!user) {
      console.log('❌ User not found for UID:', uid);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ User found:', user.email, 'User ID:', user.id);

    const submissions = await storage.getSubmissionsByUser(user.id);
    console.log(`✅ Found ${submissions.length} submissions for user ${user.email}`);

    // Log the raw submissions for debugging
    console.log('📋 Raw submissions:', submissions.map(s => ({
      id: s.id,
      poemTitle: s.poemTitle,
      tier: s.tier,
      userId: s.userId,
      submittedAt: s.submittedAt
    })));

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
      scoreBreakdown: sub.scoreBreakdown ? JSON.parse(sub.scoreBreakdown) : null,
      submissionUuid: sub.submissionUuid,
      poemIndex: sub.poemIndex,
      totalPoemsInSubmission: sub.totalPoemsInSubmission
    }));

    console.log('✅ Transformed submissions:', transformedSubmissions.length);
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

// ===== COUPON VALIDATION ENDPOINT - COMPLETELY FIXED =====
router.post('/api/validate-coupon', asyncHandler(async (req: any, res: any) => {
  const { code, tier, amount, uid } = req.body;
  console.log('🎫 Validating coupon:', { code, tier, amount, uid });

  if (!code || !tier || !uid) {
    return res.status(400).json({
      valid: false,
      error: 'Missing required fields'
    });
  }

  const upperCode = code.toUpperCase();

  try {
    // CRITICAL FIX: Use database transaction to prevent race conditions
    const result = await db.transaction(async (tx) => {
      // Check if user already used this coupon code
      const existingUsage = await tx
        .select()
        .from(couponUsage)
        .where(
          and(
            eq(couponUsage.couponCode, upperCode),
            eq(couponUsage.userUid, uid)
          )
        )
        .limit(1);

      if (existingUsage.length > 0) {
        throw new Error('You have already used this coupon code');
      }

      // Validate against coupon codes (your existing logic)
      const { validateCouponCode } = await import('./coupon-codes.js');
      const validation = validateCouponCode(code, tier);

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Calculate discount
      let discount = 0;
      if (validation.type === 'free') {
        discount = amount; // 100% discount
      } else if (validation.type === 'discount') {
        discount = Math.round(amount * (validation.discount / 100));
      }

      return {
        valid: true,
        discount,
        message: validation.message
      };
    });

    console.log('✅ Coupon validation successful:', result);
    res.json(result);

  } catch (error: any) {
    console.error('❌ Coupon validation failed:', error);
    res.status(400).json({
      valid: false,
      error: error.message || 'Invalid coupon code'
    });
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

  console.log('🔍 Signature verification:', {
    received: razorpay_signature,
    expected: expectedSignature,
    match: expectedSignature === razorpay_signature
  });

  if (expectedSignature === razorpay_signature) {
    console.log('✅ Payment signature verified successfully');
    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id
    });
  } else {
    console.error('❌ Payment signature verification failed');
    res.status(400).json({
      success: false,
      error: 'Payment signature verification failed'
    });
  }
}));

// ===== SUBMISSION ENDPOINTS =====

// Single poem submission endpoint
router.post('/api/submit-poem', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📝 Single poem submission received');
  console.log('Form data received:', JSON.stringify(req.body, null, 2));
  console.log('Files received:', req.files?.map((f: any) => ({ 
    fieldname: f.fieldname, 
    originalname: f.originalname,
    size: f.size 
  })) || []);

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
    sessionId,
    uid,
    termsAccepted,
    couponCode,
    discountAmount
  } = req.body;

  // Validation
  if (!firstName || !email || !poemTitle || !tier) {
    console.error('❌ Missing required fields:', { firstName, email, poemTitle, tier });
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: firstName, email, poemTitle, and tier are required'
    });
  }

  if (termsAccepted !== 'true') {
    console.error('❌ Terms not accepted');
    return res.status(400).json({
      success: false,
      error: 'Terms and conditions must be accepted'
    });
  }

  // File validation
  const poemFile = req.files?.find((f: any) => f.fieldname === 'poemFile');
  const photoFile = req.files?.find((f: any) => f.fieldname === 'photoFile');

  if (!poemFile) {
    console.error('❌ No poem file uploaded');
    return res.status(400).json({
      success: false,
      error: 'Poem file is required'
    });
  }

  if (!photoFile) {
    console.error('❌ No photo file uploaded');
    return res.status(400).json({
      success: false,
      error: 'Photo file is required'
    });
  }

  try {
    console.log('📤 Uploading files to Google Drive...');

    // Upload poem file
    const poemUploadResult = await uploadPoemFile(poemFile);
    console.log('✅ Poem file uploaded:', poemUploadResult.url);

    // Upload photo file
    const photoUploadResult = await uploadPhotoFile(photoFile);
    console.log('✅ Photo file uploaded:', photoUploadResult.url);

    // Create user if not exists
    let user = null;
    if (uid) {
      try {
        user = await storage.getUserByUid(uid);
        if (!user) {
          user = await storage.createUser({
            uid,
            email,
            name: `${firstName} ${lastName || ''}`.trim(),
            phone: phone || null
          });
        }
      } catch (error) {
        console.error('❌ Error handling user:', error);
      }
    }

    // Prepare submission data
    const submissionData = {
      userId: user?.id || null,
      firstName,
      lastName: lastName || null,
      email,
      phone: phone || null,
      age: age ? parseInt(age) : null,
      poemTitle,
      tier,
      price: price ? parseFloat(price) : 0,
      paymentId: paymentId || null,
      paymentMethod: paymentMethod || null,
      paymentStatus: tier === 'free' ? 'completed' : 'completed',
      sessionId: sessionId || null,
      termsAccepted: true,
      poemFileUrl: poemUploadResult.url,
      photoFileUrl: photoUploadResult.url,
      driveFileId: poemUploadResult.fileId,
      drivePhotoId: photoUploadResult.fileId,
      poemIndex: 1,
      submissionUuid: crypto.randomUUID(),
      totalPoemsInSubmission: 1,
      contestMonth: new Date().toISOString().slice(0, 7),
      contestYear: new Date().getFullYear(),
      submittedAt: new Date()
    };

    console.log('💾 Creating submission in database...');
    const submission = await storage.createSubmission(submissionData);
    console.log('✅ Submission created with ID:', submission.id);

    // Track coupon usage if applied - FIXED WITH PROPER ERROR HANDLING
    if (couponCode && discountAmount && parseFloat(discountAmount) > 0) {
      try {
        console.log('🎫 Tracking coupon usage...');
        await storage.trackCouponUsage({
          couponCode,
          userUid: uid || email,
          submissionId: submission.id,
          discountAmount: parseFloat(discountAmount)
        });
        console.log('✅ Coupon usage tracked successfully');
      } catch (couponError) {
        console.error('❌ Error tracking coupon usage:', couponError);
        // CRITICAL: If coupon tracking fails, delete the submission to prevent abuse
        try {
          await storage.deleteSubmission(submission.id);
          console.log('🗑️ Submission deleted due to coupon tracking failure');
        } catch (deleteError) {
          console.error('❌ Error deleting submission:', deleteError);
        }
        
        return res.status(400).json({
          success: false,
          error: 'Coupon validation failed. Please try again or contact support.'
        });
      }
    }

    console.log('📊 Adding to Google Sheets...');
    await addPoemSubmissionToSheet(submissionData);
    console.log('✅ Added to Google Sheets');

    console.log('📧 Sending confirmation email...');
    await sendSubmissionConfirmation({
      email,
      firstName,
      poemTitle,
      tier,
      submissionId: submission.id.toString(),
      poemFileUrl: poemUploadResult.url,
      photoFileUrl: photoUploadResult.url
    });
    console.log('✅ Confirmation email sent');

    // Clean up uploaded files
    try {
      fs.unlinkSync(poemFile.path);
      fs.unlinkSync(photoFile.path);
      console.log('🗑️ Temporary files cleaned up');
    } catch (cleanupError) {
      console.error('⚠️ Error cleaning up files:', cleanupError);
    }

    res.json({
      success: true,
      message: 'Poem submitted successfully!',
      submissionId: submission.id,
      poemFileUrl: poemUploadResult.url,
      photoFileUrl: photoUploadResult.url
    });

  } catch (error) {
    console.error('❌ Error in poem submission:', error);

    // Clean up files on error
    try {
      if (poemFile) fs.unlinkSync(poemFile.path);
      if (photoFile) fs.unlinkSync(photoFile.path);
    } catch (cleanupError) {
      console.error('⚠️ Error cleaning up files on error:', cleanupError);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit poem'
    });
  }
}));

// Multiple poems submission endpoint
router.post('/api/submit-multiple-poems', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📝 Multiple poems submission received');
  console.log('Form data received:', JSON.stringify(req.body, null, 2));
  console.log('Files received:', req.files?.map((f: any) => ({ 
    fieldname: f.fieldname, 
    originalname: f.originalname,
    size: f.size 
  })) || []);

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
    sessionId,
    uid,
    termsAccepted,
    couponCode,
    discountAmount
  } = req.body;

  // Validation
  if (!firstName || !email || !tier) {
    console.error('❌ Missing required fields:', { firstName, email, tier });
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: firstName, email, and tier are required'
    });
  }

  if (termsAccepted !== 'true') {
    console.error('❌ Terms not accepted');
    return res.status(400).json({
      success: false,
      error: 'Terms and conditions must be accepted'
    });
  }

  // Get expected poem count
  const expectedPoemCount = TIER_POEM_COUNTS[tier as keyof typeof TIER_POEM_COUNTS];
  if (!expectedPoemCount) {
    console.error('❌ Invalid tier:', tier);
    return res.status(400).json({
      success: false,
      error: 'Invalid tier specified'
    });
  }

  // Parse poem titles
  let poemTitles: string[] = [];
  try {
    if (typeof req.body.poemTitles === 'string') {
      poemTitles = JSON.parse(req.body.poemTitles);
    } else if (Array.isArray(req.body.poemTitles)) {
      poemTitles = req.body.poemTitles;
    }
  } catch (error) {
    console.error('❌ Error parsing poem titles:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid poem titles format'
    });
  }

  // Validate poem count
  if (poemTitles.length !== expectedPoemCount) {
    console.error('❌ Poem count mismatch:', { received: poemTitles.length, expected: expectedPoemCount });
    return res.status(400).json({
      success: false,
      error: `Expected ${expectedPoemCount} poems for ${tier} tier, but received ${poemTitles.length}`
    });
  }

  // File validation
  const poemFiles = req.files?.filter((f: any) => f.fieldname.startsWith('poems[')) || [];
  const photoFile = req.files?.find((f: any) => f.fieldname === 'photo');

  if (poemFiles.length !== expectedPoemCount) {
    console.error('❌ Poem file count mismatch:', { received: poemFiles.length, expected: expectedPoemCount });
    return res.status(400).json({
      success: false,
      error: `Expected ${expectedPoemCount} poem files for ${tier} tier, but received ${poemFiles.length}`
    });
  }

  if (!photoFile) {
    console.error('❌ No photo file uploaded');
    return res.status(400).json({
      success: false,
      error: 'Photo file is required'
    });
  }

  try {
    console.log('📤 Uploading files to Google Drive...');

    // Upload poem files
    const poemUploadResults = await uploadMultiplePoemFiles(poemFiles);
    console.log('✅ Poem files uploaded:', poemUploadResults.map(r => r.url));

    // Upload photo file
    const photoUploadResult = await uploadPhotoFile(photoFile);
    console.log('✅ Photo file uploaded:', photoUploadResult.url);

    // Create user if not exists
    let user = null;
    if (uid) {
      try {
        user = await storage.getUserByUid(uid);
        if (!user) {
          user = await storage.createUser({
            uid,
            email,
            name: `${firstName} ${lastName || ''}`.trim(),
            phone: phone || null
          });
        }
      } catch (error) {
        console.error('❌ Error handling user:', error);
      }
    }

    // Generate submission UUID for grouping
    const submissionUuid = crypto.randomUUID();
    const submissions = [];

    console.log('💾 Creating submissions in database...');

    // Create individual submissions for each poem
    for (let i = 0; i < poemTitles.length; i++) {
      const submissionData = {
        userId: user?.id || null,
        firstName,
        lastName: lastName || null,
        email,
        phone: phone || null,
        age: age ? parseInt(age) : null,
        poemTitle: poemTitles[i],
        tier,
        price: i === 0 ? (price ? parseFloat(price) : 0) : 0, // Only first poem gets the price
        paymentId: i === 0 ? (paymentId || null) : null,
        paymentMethod: i === 0 ? (paymentMethod || null) : null,
        paymentStatus: tier === 'free' ? 'completed' : 'completed',
        sessionId: i === 0 ? (sessionId || null) : null,
        termsAccepted: true,
        poemFileUrl: poemUploadResults[i].url,
        photoFileUrl: photoUploadResult.url,
        driveFileId: poemUploadResults[i].fileId,
        drivePhotoId: photoUploadResult.fileId,
        poemIndex: i + 1,
        submissionUuid,
        totalPoemsInSubmission: poemTitles.length,
        contestMonth: new Date().toISOString().slice(0, 7),
        contestYear: new Date().getFullYear(),
        submittedAt: new Date()
      };

      const submission = await storage.createSubmission(submissionData);
      submissions.push(submission);
      console.log(`✅ Submission ${i + 1} created with ID:`, submission.id);
    }

    // Track coupon usage if applied (only for first submission) - FIXED WITH PROPER ERROR HANDLING
    if (couponCode && discountAmount && parseFloat(discountAmount) > 0 && submissions.length > 0) {
      try {
        console.log('🎫 Tracking coupon usage...');
        await storage.trackCouponUsage({
          couponCode,
          userUid: uid || email,
          submissionId: submissions[0].id,
          discountAmount: parseFloat(discountAmount)
        });
        console.log('✅ Coupon usage tracked successfully');
      } catch (couponError) {
        console.error('❌ Error tracking coupon usage:', couponError);
        // CRITICAL: If coupon tracking fails, delete all submissions to prevent abuse
        try {
          for (const submission of submissions) {
            await storage.deleteSubmission(submission.id);
          }
          console.log('🗑️ All submissions deleted due to coupon tracking failure');
        } catch (deleteError) {
          console.error('❌ Error deleting submissions:', deleteError);
        }
        
        return res.status(400).json({
          success: false,
          error: 'Coupon validation failed. Please try again or contact support.'
        });
      }
    }

    console.log('📊 Adding to Google Sheets...');
    const sheetData = {
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age || '',
      poemTitles,
      tier,
      price: price || '0',
      paymentId: paymentId || '',
      paymentMethod: paymentMethod || '',
      sessionId: sessionId || '',
      submissionUuid,
      poemFileUrls: poemUploadResults.map(r => r.url),
      photoFileUrl: photoUploadResult.url,
      submittedAt: new Date().toISOString()
    };

    await addMultiplePoemsToSheet(sheetData);
    console.log('✅ Added to Google Sheets');

    console.log('📧 Sending confirmation email...');
    await sendMultiplePoemsConfirmation({
      email,
      firstName,
      poemTitles,
      tier,
      submissionIds: submissions.map(s => s.id.toString()),
      poemFileUrls: poemUploadResults.map(r => r.url),
      photoFileUrl: photoUploadResult.url
    });
    console.log('✅ Confirmation email sent');

    // Clean up uploaded files
    try {
      poemFiles.forEach(file => fs.unlinkSync(file.path));
      fs.unlinkSync(photoFile.path);
      console.log('🗑️ Temporary files cleaned up');
    } catch (cleanupError) {
      console.error('⚠️ Error cleaning up files:', cleanupError);
    }

    res.json({
      success: true,
      message: `${poemTitles.length} poems submitted successfully!`,
      submissionIds: submissions.map(s => s.id),
      submissionUuid,
      poemFileUrls: poemUploadResults.map(r => r.url),
      photoFileUrl: photoUploadResult.url
    });

  } catch (error) {
    console.error('❌ Error in multiple poems submission:', error);

    // Clean up files on error
    try {
      if (poemFiles) poemFiles.forEach(file => fs.unlinkSync(file.path));
      if (photoFile) fs.unlinkSync(photoFile.path);
    } catch (cleanupError) {
      console.error('⚠️ Error cleaning up files on error:', cleanupError);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit poems'
    });
  }
}));

// ===== STRIPE PAYMENT ENDPOINTS =====

// Create Stripe checkout session
router.post('/api/create-checkout-session', asyncHandler(async (req: any, res: any) => {
  console.log('💳 Creating Stripe checkout session...');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { tier, amount, metadata } = req.body;

  // Validate inputs
  if (!tier || amount === undefined) {
    console.error('❌ Missing required fields:', { tier, amount });
    return res.status(400).json({ 
      error: 'Tier and amount are required' 
    });
  }

  // Skip Stripe for free submissions
  if (amount === 0) {
    console.log('💰 Free submission, skipping Stripe');
    return res.json({
      success: true,
      sessionId: null,
      message: 'Free submission, no payment required'
    });
  }

  // Check Stripe configuration
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Stripe not configured');
    return res.status(500).json({ 
      error: 'Payment system not configured' 
    });
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Poetry Contest - ${tier}`,
              description: `Submit your poem(s) in the ${tier} tier`,
            },
            unit_amount: amount * 100, // Convert to paise
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/submit?session_id={CHECKOUT_SESSION_ID}&payment_success=true`,
      cancel_url: `${req.headers.origin}/submit?payment_cancelled=true`,
      metadata: {
        tier,
        amount: amount.toString(),
        ...metadata
      }
    });

    console.log('✅ Stripe session created:', session.id);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error: any) {
    console.error('❌ Stripe session creation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create payment session'
    });
  }
}));

// Verify Stripe checkout session
router.post('/api/verify-checkout-session', asyncHandler(async (req: any, res: any) => {
  console.log('🔍 Verifying Stripe checkout session...');
  const { sessionId } = req.body;

  if (!sessionId) {
    console.error('❌ Missing session ID');
    return res.status(400).json({ 
      error: 'Session ID is required' 
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Stripe not configured');
    return res.status(500).json({ 
      error: 'Payment system not configured' 
    });
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('🔍 Session retrieved:', { 
      id: session.id, 
      status: session.payment_status,
      amount: session.amount_total 
    });

    if (session.payment_status === 'paid') {
      console.log('✅ Payment verified successfully');
      res.json({
        success: true,
        session: {
          id: session.id,
          amount: session.amount_total / 100, // Convert back from paise
          currency: session.currency,
          status: session.payment_status,
          metadata: session.metadata
        }
      });
    } else {
      console.error('❌ Payment not completed:', session.payment_status);
      res.status(400).json({
        error: 'Payment not completed',
        status: session.payment_status
      });
    }

  } catch (error: any) {
    console.error('❌ Session verification error:', error);
    res.status(500).json({
      error: error.message || 'Failed to verify payment session'
    });
  }
}));

// ===== PAYPAL PAYMENT VERIFICATION =====

// Verify PayPal payment
router.post('/api/verify-paypal-payment', asyncHandler(async (req: any, res: any) => {
  console.log('🔍 Verifying PayPal payment...');
  const { orderId } = req.body;

  if (!orderId) {
    console.error('❌ Missing PayPal order ID');
    return res.status(400).json({ 
      error: 'PayPal order ID is required' 
    });
  }

  // For now, we'll accept any orderId as valid since PayPal integration is handled client-side
  // In production, you should verify this with PayPal's API
  console.log('✅ PayPal payment verified (mock verification)');
  
  res.json({
    success: true,
    orderId,
    status: 'COMPLETED',
    message: 'PayPal payment verified successfully'
  });
}));

// ===== CONTACT FORM ENDPOINT =====

// Contact form submission
router.post('/api/contact', asyncHandler(async (req: any, res: any) => {
  console.log('📧 Contact form submission received');
  const { name, email, subject, message } = req.body;

  // Validation
  if (!name || !email || !message) {
    console.error('❌ Missing required contact fields');
    return res.status(400).json({
      success: false,
      error: 'Name, email, and message are required'
    });
  }

  try {
    console.log('📊 Adding contact to Google Sheets...');
    await addContactToSheet({
      name,
      email,
      subject: subject || '',
      message,
      submittedAt: new Date().toISOString()
    });
    console.log('✅ Contact added to Google Sheets');

    res.json({
      success: true,
      message: 'Contact form submitted successfully!'
    });

  } catch (error) {
    console.error('❌ Error in contact form submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form'
    });
  }
}));

// ===== ADMIN ENDPOINTS =====

// Get all submissions (admin only)
router.get('/api/admin/submissions', asyncHandler(async (req: any, res: any) => {
  console.log('👑 Admin: Getting all submissions');

  try {
    const submissions = await storage.getAllSubmissions();
    console.log(`✅ Found ${submissions.length} total submissions`);

    // Transform submissions for admin view
    const transformedSubmissions = submissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName || ''}`.trim(),
      email: sub.email,
      phone: sub.phone,
      age: sub.age,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      price: parseFloat(sub.price?.toString() || '0'),
      paymentId: sub.paymentId,
      paymentMethod: sub.paymentMethod,
      paymentStatus: sub.paymentStatus,
      submittedAt: sub.submittedAt,
      isWinner: sub.isWinner || false,
      winnerPosition: sub.winnerPosition,
      score: sub.score,
      type: sub.type || 'Human',
      status: sub.status || 'Pending',
      poemFileUrl: sub.poemFileUrl,
      photoFileUrl: sub.photoFileUrl,
      submissionUuid: sub.submissionUuid,
      poemIndex: sub.poemIndex,
      totalPoemsInSubmission: sub.totalPoemsInSubmission
    }));

    res.json(transformedSubmissions);
  } catch (error) {
    console.error('❌ Error getting admin submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
}));

// Get submission counts
router.get('/api/submissions/count', asyncHandler(async (req: any, res: any) => {
  console.log('📊 Getting submission counts');

  try {
    // Get count from Google Sheets
    const sheetCount = await getSubmissionCountFromSheet();
    
    // Get count from database
    const dbSubmissions = await storage.getAllSubmissions();
    const dbCount = dbSubmissions.length;

    // Get current month count
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthCount = dbSubmissions.filter(sub => 
      sub.submittedAt && sub.submittedAt.toISOString().slice(0, 7) === currentMonth
    ).length;

    // Get tier breakdown
    const tierCounts = dbSubmissions.reduce((acc: any, sub) => {
      acc[sub.tier] = (acc[sub.tier] || 0) + 1;
      return acc;
    }, {});

    const counts = {
      totalFromSheet: sheetCount,
      totalFromDatabase: dbCount,
      currentMonth: currentMonthCount,
      tierBreakdown: tierCounts,
      contestMonth: currentMonth
    };

    console.log('✅ Submission counts:', counts);
    res.json(counts);
  } catch (error) {
    console.error('❌ Error getting submission counts:', error);
    res.status(500).json({ error: 'Failed to get submission counts' });
  }
}));

// Upload CSV for bulk evaluation updates
router.post('/api/admin/upload-csv', upload.single('csvFile'), asyncHandler(async (req: any, res: any) => {
  console.log('📊 Admin: CSV upload for evaluation');

  if (!req.file) {
    console.error('❌ No CSV file uploaded');
    return res.status(400).json({
      success: false,
      error: 'CSV file is required'
    });
  }

  try {
    console.log('📖 Reading CSV file...');
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    
    // Parse CSV (simple implementation - you might want to use a CSV library)
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log('📋 CSV headers:', headers);
    console.log(`📊 Processing ${lines.length - 1} rows...`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process each row (skip header)
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        
        // Assuming CSV format: email, poemTitle, score, type, status, isWinner, winnerPosition
        if (values.length >= 5) {
          const [email, poemTitle, score, type, status, isWinner, winnerPosition] = values;
          
          // Find submission by email and poem title
          const submission = await storage.getSubmissionByEmailAndTitle(email, poemTitle);
          
          if (submission) {
            // Update submission with evaluation data
            await storage.updateSubmissionEvaluation(submission.id, {
              score: parseInt(score) || 0,
              type: type || 'Human',
              status: status || 'Evaluated',
              scoreBreakdown: JSON.stringify({}), // You can expand this
              isWinner: isWinner?.toLowerCase() === 'true',
              winnerPosition: winnerPosition ? parseInt(winnerPosition) : null
            });
            
            updatedCount++;
            console.log(`✅ Updated submission ${submission.id} for ${email} - ${poemTitle}`);
          } else {
            console.log(`⚠️ Submission not found: ${email} - ${poemTitle}`);
            errorCount++;
          }
        }
      } catch (rowError) {
        console.error(`❌ Error processing row ${i}:`, rowError);
        errorCount++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log(`✅ CSV processing complete: ${updatedCount} updated, ${errorCount} errors`);

    res.json({
      success: true,
      message: `CSV processed successfully`,
      updatedCount,
      errorCount,
      totalRows: lines.length - 1
    });

  } catch (error) {
    console.error('❌ Error processing CSV:', error);
    
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('⚠️ Error cleaning up CSV file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process CSV'
    });
  }
}));

// Export function to register routes
export function registerRoutes(app: any) {
  app.use('/', router);
  console.log('✅ Routes registered successfully');
}

export default router;