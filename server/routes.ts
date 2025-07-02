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
import { client } from './db.js';

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

// Note: Using database storage instead of in-memory for persistence

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
    console.log(`✅ Found ${submissions.length} submissions for user ${user.id}`);

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

// Helper function to generate username from phone number
function generateUsernameFromPhone(phone: string, email?: string): string {
  if (email) {
    // If email is provided, use part of email as name
    const emailPart = email.split('@')[0];
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
  }

  if (!phone) return 'User';

  // Remove +91 or other country codes and take last 4 digits
  const cleanPhone = phone.replace(/^\+\d{1,3}/, '').replace(/\D/g, '');
  const lastFourDigits = cleanPhone.slice(-4);

  // Generate username like "User7890" 
  return `User${lastFourDigits}`;
}

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
      // Generate name for phone users
      let userName = name;
      let userEmail = email;

      if (!userName && phone) {
        userName = generateUsernameFromPhone(phone, email);
        console.log('📱 Generated username for phone user:', userName);
      }

      // For phone users, require email (no fallback)
      if (phone && !email) {
        console.error('❌ Phone user missing email address');
        return res.status(400).json({
          error: 'Email address is required for phone authentication'
        });
      }

      const newUser = await storage.createUser({
        uid,
        email: userEmail,
        name: userName || 'User',
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

// ===== COUPON VALIDATION ENDPOINT =====

// Validate coupon code with usage tracking
router.post('/api/validate-coupon', asyncHandler(async (req: any, res: any) => {
  const { code, tier, amount, uid, email } = req.body;

  console.log('🎫 Coupon validation request:', { code, tier, amount, uid, email });

  // Validate required fields
  if (!code || !tier) {
    return res.status(400).json({
      valid: false,
      error: 'Coupon code and tier are required'
    });
  }

  const upperCode = code.toUpperCase();

  // Free tier codes (100% discount on ₹50 tier only)
  const FREE_TIER_CODES = [
    'INKWIN100', 'VERSEGIFT', 'WRITEFREE', 'WRTYGRACE', 'LYRICSPASS',
    'ENTRYBARD', 'QUILLPASS', 'PENJOY100', 'LINESFREE', 'PROSEPERK',
    'STANZAGIFT', 'FREELYRICS', 'RHYMEGRANT', 'SONNETKEY', 'ENTRYVERSE',
    'PASSWRTY1', 'PASSWRTY2', 'GIFTPOEM', 'WORDSOPEN', 'STAGEPASS',
    'LITERUNLOCK', 'PASSINKED', 'WRTYGENIUS', 'UNLOCKINK', 'ENTRYMUSE',
    'WRTYSTAR', 'FREEQUILL', 'PENPASS100', 'POEMKEY', 'WRITEACCESS',
    'PASSFLARE', 'WRITERJOY', 'MUSE100FREE', 'PASSCANTO', 'STANZAOPEN',
    'VERSEUNLOCK', 'QUILLEDPASS', 'FREEMUSE2025', 'WRITYSTREAK', 'RHYMESMILE',
    'PENMIRACLE', 'GIFTOFVERSE', 'LYRICALENTRY', 'WRTYWAVE', 'MUSEDROP',
    'POEMHERO', 'OPENPOETRY', 'FREEVERSE21', 'POETENTRY', 'UNLOCK2025'
  ];

  // 10% discount codes for all paid tiers
  const DISCOUNT_CODES = [
    'FLOWRHYME10', 'VERSETREAT', 'WRITEJOY10', 'CANTODEAL', 'LYRICSPARK',
    'INKSAVER10', 'WRTYBRIGHT', 'PASSPOETRY', 'MUSEDISCOUNT', 'SONNETSAVE',
    'QUILLFALL10', 'PENSPARKLE', 'LINESLOVE10', 'VERSELIGHT', 'RHYMEBOOST',
    'WRITORSAVE', 'PROSEJOY10', 'POETPOWER10', 'WRTYDREAM', 'MUSESAVER10',
    'POEMSTARS', 'WRITERSHADE', 'LYRICLOOT10', 'SONNETBLISS', 'INKBREEZE',
    'VERSECHILL', 'PASSHUES', 'WRITERFEST', 'CANTOFEEL', 'POEMDISCOUNT',
    'MIRACLEMUSE', 'LYRICSTORY10', 'POEMCUP10', 'WRTYFEAST10', 'PASSMIRROR',
    'INKRAYS10', 'WRTYFLY', 'DISCOUNTINK', 'QUILLFLASH', 'WRITGLOW10',
    'FREESHADE10', 'WRTYJUMP', 'BARDGIFT10', 'POETRAYS', 'LIGHTQUILL',
    'RHYMERUSH', 'WRTYSOUL', 'STORYDROP10', 'POETWISH10', 'WRTYWONDER'
  ];

  // Check if code is valid first
  const isFreeTierCode = FREE_TIER_CODES.includes(upperCode);
  const isDiscountCode = DISCOUNT_CODES.includes(upperCode);

  if (!isFreeTierCode && !isDiscountCode) {
    return res.json({
      valid: false,
      error: 'Invalid coupon code'
    });
  }

  // ENHANCED: Check if user has already used this coupon code
  try {
    let hasUsedCoupon = false;

    if (uid) {
      // Check by user UID - PRIMARY CHECK
      const usageCheck = await client.query(`
        SELECT cu.id, cu.used_at, c.code
        FROM coupon_usage cu
        JOIN coupons c ON cu.coupon_id = c.id
        WHERE c.code = $1 AND cu.user_uid = $2
      `, [upperCode, uid]);

      if (usageCheck.rows.length > 0) {
        const usageDate = new Date(usageCheck.rows[0].used_at).toLocaleDateString();
        return res.json({
          valid: false,
          error: `Coupon already used. You used "${upperCode}" on ${usageDate}.`
        });
      }
    } else if (email) {
      // Check by email as fallback - SECONDARY CHECK
      const usageCheck = await client.query(`
        SELECT cu.id, cu.used_at, c.code, s.email
        FROM coupon_usage cu
        JOIN coupons c ON cu.coupon_id = c.id
        JOIN submissions s ON cu.submission_id = s.id
        WHERE c.code = $1 AND s.email = $2
      `, [upperCode, email]);

      if (usageCheck.rows.length > 0) {
        const usageDate = new Date(usageCheck.rows[0].used_at).toLocaleDateString();
        return res.json({
          valid: false,
          error: `Coupon already used. This email used "${upperCode}" on ${usageDate}.`
        });
      }
    }

    // Validate tier restrictions for free codes
    if (isFreeTierCode && tier !== 'single') {
      return res.json({
        valid: false,
        error: '100% discount codes only work on the ₹50 tier'
      });
    }

    // Return appropriate discount
    if (isFreeTierCode) {
      return res.json({
        valid: true,
        type: 'free',
        discount: amount || 50,
        discountPercentage: 100,
        message: 'Valid 100% discount code! This tier is now free.',
        code: upperCode
      });
    }

    if (isDiscountCode) {
      const discountAmount = Math.round((amount || 0) * 0.10);
      return res.json({
        valid: true,
        type: 'discount',
        discount: discountAmount,
        discountPercentage: 10,
        message: 'Valid discount code! 10% discount applied.',
        code: upperCode
      });
    }

  } catch (error) {
    console.error('❌ Error checking coupon usage:', error);
    return res.status(500).json({
      valid: false,
      error: 'Error validating coupon. Please try again.'
    });
  }
}));

// Record coupon usage after successful submission
router.post('/api/record-coupon-usage', asyncHandler(async (req: any, res: any) => {
  const { code, uid, email, submissionId, discountAmount } = req.body;

  console.log('📝 Recording coupon usage:', { code, uid, email, submissionId, discountAmount });

  if (!code || !submissionId || discountAmount === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields for coupon usage recording'
    });
  }

  try {
    const upperCode = code.toUpperCase();

    // Find or create the coupon record
    let couponResult = await client.query(`
      SELECT id FROM coupons WHERE code = $1
    `, [upperCode]);

    let couponId;

    if (couponResult.rows.length === 0) {
      // Create coupon record if it doesn't exist
      const newCouponResult = await client.query(`
        INSERT INTO coupons (
          code, 
          discount_type, 
          discount_value, 
          valid_from, 
          valid_until, 
          is_active,
          created_at
        ) VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', true, NOW())
        RETURNING id
      `, [upperCode, 'percentage', discountAmount === 100 ? 100 : 10]);

      couponId = newCouponResult.rows[0].id;
      console.log('✅ Created new coupon record:', couponId);
    } else {
      couponId = couponResult.rows[0].id;
      console.log('✅ Found existing coupon:', couponId);
    }

    // Get user ID if available
    let userId = null;
    if (uid) {
      const userResult = await storage.getUserByUid(uid);
      userId = userResult?.id || null;
    }

    // Record the usage
    await client.query(`
      INSERT INTO coupon_usage (
        coupon_id,
        user_id,
        submission_id,
        user_uid,
        discount_amount,
        used_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [couponId, userId, submissionId, uid || null, discountAmount]);

    // Update coupon used count
    await client.query(`
      UPDATE coupons 
      SET used_count = used_count + 1,
          updated_at = NOW()
      WHERE id = $1
    `, [couponId]);

    console.log('✅ Coupon usage recorded successfully');

    res.json({
      success: true,
      message: 'Coupon usage recorded'
    });

  } catch (error) {
    console.error('❌ Error recording coupon usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record coupon usage'
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

// Single poem submission with proper file handling - FIXED VERSION
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
      uid,
      userUid // Also accept userUid as fallback
    } = req.body;

    // Use uid or userUid (frontend might send either)
    const userId = uid || userUid;

    // Extract coupon data
    const couponCode = req.body.couponCode;
    const couponDiscount = req.body.couponDiscount ? parseFloat(req.body.couponDiscount) : 0;
    const finalAmount = req.body.finalAmount ? parseFloat(req.body.finalAmount) : parseFloat(price || '0');

    // Validate required fields
    if (!firstName || !email || !poemTitle || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, email, poemTitle, tier'
      });
    }

    // CRITICAL: Double-check coupon usage before submission
    if (couponCode && couponDiscount > 0) {
      const upperCouponCode = couponCode.toUpperCase();
      console.log('🔍 Double-checking coupon usage for:', upperCouponCode);

      try {
        let couponAlreadyUsed = false;

        if (userId) {
          const usageCheck = await client.query(`
            SELECT cu.id, cu.used_at
            FROM coupon_usage cu
            JOIN coupons c ON cu.coupon_id = c.id
            WHERE c.code = $1 AND cu.user_uid = $2
          `, [upperCouponCode, userId]);
          couponAlreadyUsed = usageCheck.rows.length > 0;
        } else if (email) {
          const usageCheck = await client.query(`
            SELECT cu.id, cu.used_at
            FROM coupon_usage cu
            JOIN coupons c ON cu.coupon_id = c.id
            JOIN submissions s ON cu.submission_id = s.id
            WHERE c.code = $1 AND s.email = $2
          `, [upperCouponCode, email]);
          couponAlreadyUsed = usageCheck.rows.length > 0;
        }

        if (couponAlreadyUsed) {
          return res.status(400).json({
            success: false,
            error: `Coupon "${upperCouponCode}" has already been used and cannot be reused.`
          });
        }
      } catch (error) {
        console.error('❌ Error double-checking coupon:', error);
        return res.status(500).json({
          success: false,
          error: 'Error validating coupon during submission. Please try again.'
        });
      }
    }

    console.log('🔍 Processing submission for user UID:', userId);
    console.log('📋 Form data received:', { firstName, lastName, email, phone, age, poemTitle, tier });

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
    });    // Upload files to Google Drive
    let poemFileUrl = null;
    let photoFileUrl = null;

    if (poemFile) {
      console.log('☁️ Uploading poem file to Google Drive...');

      // Convert multer file to buffer
      const poemBuffer = fs.readFileSync(poemFile.path);

      poemFileUrl = await uploadPoemFile(
        poemBuffer, 
        email, 
        poemFile.originalname
      );
      console.log('✅ Poem file uploaded:', poemFileUrl);
    }

    if (photoFile) {
      console.log('☁️ Uploading photo file to Google Drive...');

      // Convert multer file to buffer
      const photoBuffer = fs.readFileSync(photoFile.path);

      photoFileUrl = await uploadPhotoFile(
        photoBuffer, 
        email, 
        photoFile.originalname
      );
      console.log('✅ Photo file uploaded:', photoFileUrl);
    }

    // Create or find user - FIXED VERSION
    let user = null;
    if (userId) {
      console.log('🔍 Looking for user with UID:', userId);
      user = await storage.getUserByUid(userId);
      if (!user) {
        console.log('🔄 Creating new user:', email);
        user = await storage.createUser({
          uid: userId,
          email,
          name: firstName + (lastName ? ` ${lastName}` : ''),
          phone: phone || null
        });
        console.log('✅ User created:', user.email);
      } else {
        console.log('✅ User found:', user.email);
      }
    } else {
      // Try to find user by email as fallback
      console.log('⚠️ No UID provided, trying to find user by email:', email);
      try {
        const existingUsers = await storage.getAllUsers?.() || [];
        user = existingUsers.find(u => u.email === email) || null;
        if (user) {
          console.log('✅ Found user by email:', user.email);
        } else {
          console.log('⚠️ No user found by email, creating submission without user link');
        }
      } catch (error) {
        console.log('⚠️ Could not search for user by email, creating submission without user link');
      }
    }

    // Create submission data
    const submissionData = {
      userId: user?.id || null, // CRITICAL: Link to user
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

    console.log('🔗 Linking submission to user ID:', user?.id);
    console.log('💾 Submission data:', submissionData);

    // Save to database
    console.log('💾 Saving submission to database...');
    const submission = await storage.createSubmission(submissionData);
    console.log('✅ Submission saved with ID:', submission.id);

    // Background tasks - don't wait for these to complete
    // This ensures fast response to user while still completing necessary tasks
    setImmediate(async () => {
      try {
        // Add to Google Sheets in background
        await addPoemSubmissionToSheet({
          ...submissionData,
          submissionId: submission.id
        });
        console.log('✅ Google Sheets updated for submission:', submission.id);
      } catch (sheetError) {
        console.error('⚠️ Failed to add to Google Sheets:', sheetError);
      }

      try {
        // Send confirmation email in background
        await sendSubmissionConfirmation(email, {
          name: firstName,
          poemTitle,
          tier,
          submissionId: submission.id
        });
        console.log('✅ Email sent for submission:', submission.id);
      } catch (emailError) {
        console.error('⚠️ Failed to send email:', emailError);
      }

      try {
        // Record coupon usage if coupon was used
        const couponCode = req.body.couponCode;
        const couponDiscount = req.body.couponDiscount;

        if (couponCode && couponDiscount > 0) {
          await fetch(`${req.protocol}://${req.get('host')}/api/record-coupon-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: couponCode,
              uid: userId,
              email: email,
              submissionId: submission.id,
              discountAmount: couponDiscount
            })
          });
          console.log('✅ Coupon usage recorded for submission:', submission.id);
        }
      } catch (couponError) {
        console.error('⚠️ Failed to record coupon usage:', couponError);
      }
    });

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
      submissionUuid: submission.submissionUuid,
      submissions: [submission] // For consistency with frontend expectations
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

// Multiple poems submission - FIXED VERSION
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
      userUid, // Also accept userUid as fallback
      poemTitles // This should be a JSON string array
    } = req.body;

    // Use uid or userUid (frontend might send either)
    const userId = uid || userUid;

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

      // Convert multer files to buffers
      const poemBuffers = poemFiles.map(file => fs.readFileSync(file.path));
      const originalFileNames = poemFiles.map(file => file.originalname);

      poemFileUrls = await uploadMultiplePoemFiles(
        poemBuffers, 
        email, 
        originalFileNames,
        titles
      );
      console.log('✅ Poem files uploaded:', poemFileUrls.length);
    }

    if (photoFile) {
      console.log('☁️ Uploading photo file to Google Drive...');

      // Convert multer file to buffer
      const photoBuffer = fs.readFileSync(photoFile.path);

      photoFileUrl = await uploadPhotoFile(
        photoBuffer, 
        email, 
        photoFile.originalname
      );
      console.log('✅ Photo file uploaded:', photoFileUrl);
    }

    // Create or find user - FIXED VERSION
    let user = null;
    if (userId) {
      console.log('🔍 Looking for user with UID:', userId);
      user = await storage.getUserByUid(userId);
      if (!user) {
        console.log('🔄 Creating new user:', email);
        user = await storage.createUser({
          uid: userId,
          email,
          name: firstName + (lastName ? ` ${lastName}` : ''),
          phone: phone || null
        });
        console.log('✅ User created:', user.email);
      } else {
        console.log('✅ User found:', user.email);
      }
      console.log('🔗 Will link all submissions to user ID:', user.id);
    } else {
      // Try to find user by email as fallback
      console.log('⚠️ No UID provided, trying to find user by email:', email);
      try {
        const existingUsers = await storage.getAllUsers?.() || [];
        user = existingUsers.find(u => u.email === email) || null;
        if (user) {
          console.log('✅ Found user by email:', user.email);
        } else {
          console.log('⚠️ No user found by email, creating submissions without user link');
        }
      } catch (error) {
        console.log('⚠️ Could not search for user by email, creating submissions without user link');
      }
    }

    // Create submissions for each poem
    const submissionUuid = crypto.randomUUID();
    const submissions = [];

    for (let i = 0; i < titles.length; i++) {
      const submissionData = {
        userId: user?.id || null, // CRITICAL: Link to user
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || '',
        age: age ? parseInt(age) : null,
        poemTitle: titles[i],
        tier,
        price: price ? parseFloat(price) : 0, // Same price for all poems in the submission
        paymentId: paymentId || null, // Same payment ID for all poems
        paymentMethod: paymentMethod || 'free',
        poemFileUrl: poemFileUrls[i] || null,
        photoFileUrl: photoFileUrl, // Same photo for all poems
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

    // Background tasks - don't wait for these to complete
    // This ensures fast response to user while still completing necessary tasks
    setImmediate(async () => {
      try {
        // Add to Google Sheets in background
        await addMultiplePoemsToSheet({
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          age: age,
          tier: tier,
          price: price ? parseFloat(price) : 0,
          paymentId: paymentId,
          paymentMethod: paymentMethod,
          titles: titles,
          submissionUuid: submissionUuid,
          submissionIds: submissions.map(s => s.id),
          poemFileUrls: poemFileUrls,
          photoFileUrl: photoFileUrl
        });
        console.log('✅ Google Sheets updated for multiple submissions:', submissionUuid);
      } catch (sheetError) {
        console.error('⚠️ Failed to add to Google Sheets:', sheetError);
      }

      try {
        // Send confirmation email in background
        await sendMultiplePoemsConfirmation(email, {
          name: firstName,
          poemTitles: titles,
          tier,
          submissionUuid
        });
        console.log('✅ Email sent for multiple submissions:', submissionUuid);
      } catch (emailError) {
        console.error('⚠️ Failed to send email:', emailError);
      }

      try {
        // Record coupon usage if coupon was used (for first submission only to avoid duplicates)
        const couponCode = req.body.couponCode;
        const couponDiscount = req.body.couponDiscount;

        if (couponCode && couponDiscount > 0 && submissions.length > 0) {
          await fetch(`${req.protocol}://${req.get('host')}/api/record-coupon-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: couponCode,
              uid: userId,
              email: email,
              submissionId: submissions[0].id, // Use first submission ID
              discountAmount: couponDiscount
            })
          });
          console.log('✅ Coupon usage recorded for multiple submissions:', submissionUuid);
        }
      } catch (couponError) {
        console.error('⚠️ Failed to record coupon usage:', couponError);
      }
    });

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
      const poemBuffer = fs.readFileSync(poemFile.path);
      poemFileUrl = await uploadPoemFile(poemBuffer, email, poemFile.originalname);
    }

    if (photoFile) {
      const photoBuffer = fs.readFileSync(photoFile.path);
      photoFileUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
    }

    // Save to database (legacy endpoint but using persistent storage)
    const submissionData = {
      userId: null, // Legacy submissions don't have user links
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age ? parseInt(age) : null,
      poemTitle,
      tier,
      price: tier === 'free' ? 0 : TIER_PRICES[tier as keyof typeof TIER_PRICES] || 0,
      paymentId: paymentId || null,
      paymentMethod,
      poemFileUrl,
      photoFileUrl: photoFileUrl,
      submissionUuid: crypto.randomUUID(),
      poemIndex: 1,
      totalPoemsInSubmission: 1,
      submittedAt: new Date(),
      status: 'Pending',
      type: 'Human'
    };

    const submission = await storage.createSubmission(submissionData);

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

// ===== ADMIN/RESULTS ENDPOINTS =====

// Get all submissions (admin)
router.get('/api/submissions', asyncHandler(async (req: any, res: any) => {
  try {
    const submissions = await storage.getAllSubmissions();
    console.log(`✅ Retrieved ${submissions.length} total submissions`);

    // Transform submissions
    const transformedSubmissions = submissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName || ''}`.trim(),
      email: sub.email,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      price: parseFloat(sub.price?.toString() || '0'),
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
    console.error('❌ Error getting all submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
}));

// Get submission count from database
router.get('/api/submission-count', asyncHandler(async (req: any, res: any) => {
  try {
    // Get count from database instead of Google Sheets for real-time accuracy
    const submissions = await storage.getAllSubmissions();
    const count = submissions.length;
    res.json({ count });
  } catch (error) {
    console.error('❌ Error getting submission count:', error);
    res.status(500).json({ error: 'Failed to get submission count' });
  }
}));

// Contact form submission
router.post('/api/contact', asyncHandler(async (req: any, res: any) => {
  const { name, email, phone, message, timestamp } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required'
    });
  }

  try {
    // Store in database
    await storage.addContact({ name, email, phone, message });

    // Send to Google Sheets with phone number
    await addContactToSheet({ name, email, phone, message });

    res.json({
      success: true,
      message: 'Contact form submitted successfully'
    });
  } catch (error) {
    console.error('❌ Contact form submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form'
    });
  }
}));

// Get legacy submissions from database
router.get('/api/legacy-submissions', asyncHandler(async (req: any, res: any) => {
  try {
    const submissions = await storage.getAllSubmissions();
    // Transform to legacy format
    const legacySubmissions = submissions.map(sub => ({
      id: sub.id,
      firstName: sub.firstName,
      lastName: sub.lastName || '',
      email: sub.email,
      phone: sub.phone || '',
      age: sub.age?.toString() || '',
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      paymentId: sub.paymentId,
      paymentMethod: sub.paymentMethod || 'free',
      poemFileUrl: sub.poemFileUrl,
      photoFileUrl: sub.photoUrl,
      submittedAt: sub.submittedAt?.toISOString()
    }));
    res.json(legacySubmissions);
  } catch (error) {
    console.error('❌ Error getting legacy submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
}));

// Admin CSV upload endpoint
router.post('/api/admin/upload-csv', upload.single('csvFile'), asyncHandler(async (req: any, res: any) => {
  console.log('📊 Admin CSV upload request received');

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No CSV file uploaded'
    });
  }

  try {
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty'
      });
    }

    // Expected header: email,poemtitle,score,type,originality,emotion,structure,language,theme,status
    const header = lines[0].toLowerCase();
    if (!header.includes('email') || !header.includes('poemtitle') || !header.includes('score')) {
      return res.status(400).json({
        success: false,
        error: 'CSV file must contain email, poemtitle, and score columns'
      });
    }

    let processed = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = line.split(',');
        if (values.length < 10) {
          errors.push(`Line ${i + 1}: Insufficient columns`);
          continue;
        }

        const [email, poemTitle, score, type, originality, emotion, structure, language, theme, status] = values;

        // Find the submission to update
        const submissions = await storage.getSubmissionsByEmailAndTitle(email.trim(), poemTitle.trim());

        if (submissions.length === 0) {
          errors.push(`Line ${i + 1}: No submission found for ${email} - ${poemTitle}`);
          continue;
        }

        // Update the submission
        for (const submission of submissions) {
          await storage.updateSubmissionEvaluation(submission.id, {
            score: parseInt(score) || 0,
            type: type.trim() || 'Human',
            scoreBreakdown: JSON.stringify({
              originality: parseInt(originality) || 0,
              emotion: parseInt(emotion) || 0,
              structure: parseInt(structure) || 0,
              language: parseInt(language) || 0,
              theme: parseInt(theme) || 0
            }),
            status: status.trim() || 'Evaluated',
            isWinner: false,
            winnerPosition: null
          });
        }

        processed++;
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Successfully processed ${processed} records`,
      processed,
      errors: errors.slice(0, 10) // Limit errors to first 10
    });

  } catch (error) {
    console.error('❌ CSV upload error:', error);

    // Clean up uploaded file
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to clean up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file: ' + error.message
    });
  }
}));

// Debug endpoint to manually trigger user-submission linking
router.post('/api/debug/fix-user-links', asyncHandler(async (req: any, res: any) => {
  try {
    console.log('🔧 Manual user-submission linking triggered...');

    // Get all submissions that don't have a user_id but have email addresses
    const unlinkedSubmissions = await client.query(`
      SELECT id, email, first_name, last_name 
      FROM submissions 
      WHERE user_id IS NULL AND email IS NOT NULL
      ORDER BY submitted_at DESC
    `);

    if (unlinkedSubmissions.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No unlinked submissions found',
        linked: 0,
        usersCreated: 0
      });
    }

    console.log(`🔍 Found ${unlinkedSubmissions.rows.length} unlinked submissions`);

    let linked = 0;
    let usersCreated = 0;

    for (const submission of unlinkedSubmissions.rows) {
      // Try to find a user with this email
      let userResult = await client.query(`
        SELECT id, email FROM users WHERE email = $1
      `, [submission.email]);

      let user;

      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
        console.log(`👤 Found existing user for ${submission.email}`);
      } else {
        // Create a user account for this submission
        console.log(`👤 Creating user account for ${submission.email}`);
        try {
          const newUserResult = await client.query(`
            INSERT INTO users (uid, email, name, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, email
          `, [
            `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique UID
            submission.email,
            `${submission.first_name} ${submission.last_name || ''}`.trim()
          ]);

          user = newUserResult.rows[0];
          usersCreated++;
          console.log(`✅ Created user account for ${submission.email}`);
        } catch (createError) {
          console.error(`❌ Failed to create user for ${submission.email}:`, createError.message);
          continue; // Skip this submission
        }
      }

      if (user) {
        // Link the submission to this user
        await client.query(`
          UPDATE submissions 
          SET user_id = $1 
          WHERE id = $2
        `, [user.id, submission.id]);

        console.log(`✅ Linked submission ${submission.id} to user ${user.email}`);
        linked++;
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${unlinkedSubmissions.rows.length} submissions!`,
      totalProcessed: unlinkedSubmissions.rows.length,
      usersCreated,
      linked
    });

  } catch (error) {
    console.error('❌ Manual linking failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Debug endpoint to check submission linking
router.get('/api/debug/submissions', asyncHandler(async (req: any, res: any) => {
  try {
    // Get total submissions count
    const totalResult = await storage.getAllSubmissions();
    const total = totalResult.length;

    // Get submissions with user links
    const linkedResult = await client.query(`
      SELECT COUNT(*) FROM submissions WHERE user_id IS NOT NULL
    `);
    const linked = parseInt(linkedResult.rows[0].count);

    // Get submissions without user links
    const unlinkedResult = await client.query(`
      SELECT COUNT(*) FROM submissions WHERE user_id IS NULL
    `);
    const unlinked = parseInt(unlinkedResult.rows[0].count);

    // Get recent submissions
    const recentResult = await client.query(`
      SELECT id, email, first_name, last_name, poem_title, user_id, submitted_at
      FROM submissions 
      ORDER BY submitted_at DESC 
      LIMIT 10
    `);

    // Get all users
    const usersResult = await client.query(`SELECT COUNT(*) FROM users`);
    const totalUsers = parseInt(usersResult.rows[0].count);

    res.json({
      success: true,
      summary: {
        totalSubmissions: total,
        linkedToUsers: linked,
        unlinkedSubmissions: unlinked,
        totalUsers: totalUsers
      },
      recentSubmissions: recentResult.rows.map(sub => ({
        id: sub.id,
        email: sub.email,
        name: `${sub.first_name} ${sub.last_name || ''}`.trim(),
        poemTitle: sub.poem_title,
        userId: sub.user_id,
        hasUserLink: !!sub.user_id,
        submittedAt: sub.submitted_at
      }))
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug query failed' });
  }
}));

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