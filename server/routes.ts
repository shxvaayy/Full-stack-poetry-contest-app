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
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    paypal_configured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    razorpay_configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    email_configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  });
});

// ===== RAZORPAY PAYMENT ENDPOINTS =====

// Create Razorpay order - WORKING VERSION FROM BACKUP
router.post('/api/create-razorpay-order', async (req, res) => {
  try {
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

  } catch (error: any) {
    console.error('❌ Razorpay order creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create payment order',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment system error'
    });
  }
});

// Keep the original create-order endpoint for backward compatibility
router.post('/api/create-order', async (req, res) => {
  try {
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

  } catch (error: any) {
    console.error('❌ Razorpay order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment system error'
    });
  }
});

// Verify Razorpay payment
router.post('/api/verify-payment', async (req, res) => {
  try {
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

  } catch (error: any) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Verification system error'
    });
  }
});

// Test Razorpay configuration
router.get('/api/test-razorpay', async (req, res) => {
  try {
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

  } catch (error: any) {
    console.error('❌ Razorpay test error:', error);
    res.json({
      success: false,
      configured: false,
      error: 'Razorpay test failed',
      details: error.message
    });
  }
});

// ===== END RAZORPAY ENDPOINTS =====

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
router.get('/api/test-sheets-simple', async (req, res) => {
  try {
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
  } catch (error: any) {
    console.error('🔴 Simple test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🧪 Test Google Sheets connection
router.get('/api/test-sheets-connection', async (req, res) => {
  try {
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
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔍 DEBUG: Check storage state
router.get('/api/debug/storage', async (req, res) => {
  try {
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
      fileExists,
      fileContent: fileExists ? JSON.parse(fileContent) : null,
      memoryData: {
        users: allUsers,
        submissions: allSubmissions,
        userCount: allUsers.length,
        submissionCount: allSubmissions.length
      },
      workingDirectory: process.cwd()
    });
  } catch (error: any) {
    res.json({ 
      error: 'Debug failed', 
      details: error.message 
    });
  }
});

// 🔧 FORCE: Create data.json file
router.post('/api/debug/create-data-file', async (req, res) => {
  try {
    console.log('🔧 Force creating data.json file...');
    await (storage as any).saveData();

    res.json({
      success: true,
      message: 'data.json file created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// 🔧 MIGRATION: Link existing submissions to users by email
router.post('/api/migrate/link-submissions', async (req, res) => {
  try {
    console.log('🔄 Starting submission migration...');

    const allSubmissions = await storage.getAllSubmissions();
    const allUsers = (storage as any).data?.users || [];

    let migratedCount = 0;

    for (const submission of allSubmissions) {
      if (!submission.userId && submission.email) {
        // Find user with matching email
        const matchingUser = allUsers.find((user: any) => user.email === submission.email);

        if (matchingUser) {
          // Update submission with userId
          (submission as any).userId = matchingUser.id;
          migratedCount++;
          console.log(`✅ Linked submission "${submission.poemTitle}" to user ${matchingUser.email}`);
        }
      }
    }

    // Save the updated data
    await (storage as any).saveData();

    res.json({
      success: true,
      message: `Migration completed. Linked ${migratedCount} submissions to users.`,
      migratedCount
    });

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  }
});

// Test email endpoint
router.get('/api/test-email', async (req, res) => {
  try {
    console.log('🧪 Testing email functionality...');
    const testEmailSent = await sendSubmissionConfirmation({
      name: 'Test User',
      email: process.env.EMAIL_USER || 'writorycontest@gmail.com',
      poemTitle: 'Test Poem Title',
      tier: 'free'
    });

    if (testEmailSent) {
      res.json({ success: true, message: 'Test email sent successfully!' });
    } else {
      res.json({ success: false, message: 'Test email failed to send.' });
    }
  } catch (error: any) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/validate-coupon', async (req, res) => {
  try {
    const { code, tier, amount, userUid } = req.body;

    if (!code || !tier || amount === undefined) {
      return res.status(400).json({
        valid: false,
        error: 'Missing required fields'
      });
    }

    // Import coupon validation from coupon-codes.ts
    const { validateCouponCode, markCodeAsUsed } = await import('../client/src/pages/coupon-codes.js');
    
    const validation = validateCouponCode(code, tier);
    
    if (!validation.valid) {
      return res.json({
        valid: false,
        error: validation.message || 'Invalid coupon code'
      });
    }

    // Don't mark code as used here - only mark after successful submission

    // Calculate discount amount based on percentage
    let discountAmount = 0;
    if (validation.discount === 100) {
      discountAmount = amount; // 100% discount
    } else {
      discountAmount = Math.round((amount * validation.discount) / 100);
    }

    return res.json({
      valid: true,
      discount: discountAmount,
      discountPercentage: validation.discount,
      message: validation.message
    });

  } catch (error: any) {
    console.error('Coupon validation error:', error);
    res.status(500).json({
      valid: false,
      error: 'Failed to validate coupon'
    });
  }
});

// PayPal configuration test endpoint
router.get('/api/test-paypal', async (req, res) => {
  try {
    console.log('Testing PayPal Configuration...');

    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com';

    console.log('Environment variables check:');
    console.log('- PAYPAL_CLIENT_ID exists:', !!PAYPAL_CLIENT_ID);
    console.log('- PAYPAL_CLIENT_SECRET exists:', !!PAYPAL_CLIENT_SECRET);
    console.log('- Environment:', process.env.NODE_ENV);
    console.log('- PayPal URL:', PAYPAL_BASE_URL);

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      return res.json({
        success: false,
        configured: false,
        error: 'PayPal credentials not found in environment variables',
        debug: {
          client_id_exists: !!PAYPAL_CLIENT_ID,
          client_secret_exists: !!PAYPAL_CLIENT_SECRET,
          env: process.env.NODE_ENV
        }
      });
    }

    // Test authentication
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    const responseText = await response.text();

    if (response.ok) {
      const data = JSON.parse(responseText);
      res.json({
        success: true,
        configured: true,
        message: 'PayPal authentication successful',
        token_type: data.token_type,
        expires_in: data.expires_in
      });
    } else {
      res.json({
        success: false,
        configured: false,
        error: 'PayPal authentication failed',
        status: response.status,
        response: responseText
      });
    }

  } catch (error: any) {
    console.error('PayPal test error:', error);
    res.json({
      success: false,
      configured: false,
      error: 'PayPal test failed',
      details: error.message
    });
  }
});

// Get user by UID
router.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`🔍 Getting user by UID: ${uid}`);

    const user = await storage.getUserByUid(uid);

    if (!user) {
      console.log(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    res.json(user);
  } catch (error: any) {
    console.error('❌ Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user', details: error.message });
  }
});

// Create user endpoint
router.post('/api/users', async (req, res) => {
  try {
    const { uid, email, name, phone } = req.body;
    console.log(`🔧 Creating user: ${email} with UID: ${uid}`);

    // Check if user already exists
    const existingUser = await storage.getUserByUid(uid);
    if (existingUser) {
      console.log(`✅ User already exists: ${existingUser.email}`);
      return res.json(existingUser);
    }

    const user = await storage.createUser({
      uid,
      email,
      name: name || null,
      phone: phone || null
    });

    console.log(`✅ Created new user: ${user.email} (ID: ${user.id})`);
    res.status(201).json(user);
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// Get user submissions by UID
router.get('/api/users/:uid/submissions', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`📝 Getting submissions for UID: ${uid}`);

    const user = await storage.getUserByUid(uid);
    if (!user) {
      console.log(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const submissions = await storage.getUserSubmissions(user.id);
    console.log(`✅ Found ${submissions.length} submissions for user: ${user.email}`);

    res.json(submissions);
  } catch (error: any) {
    console.error('❌ Error getting user submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

// Get user submission status
router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`📊 Getting submission status for UID: ${uid}`);

    const user = await storage.getUserByUid(uid);
    if (!user) {
      return res.json({ hasSubmitted: false, submissionCount: 0 });
    }

    const submissions = await storage.getUserSubmissions(user.id);
    const hasSubmitted = submissions.length > 0;

    console.log(`✅ User ${user.email} submission status: ${hasSubmitted ? 'has submitted' : 'no submissions'}`);

    res.json({
      hasSubmitted,
      submissionCount: submissions.length,
      submissions: submissions.map(s => ({
        id: s.id,
        poemTitle: s.poemTitle,
        tier: s.tier,
        submittedAt: s.createdAt
      }))
    });
  } catch (error: any) {
    console.error('❌ Error getting submission status:', error);
    res.status(500).json({ error: 'Failed to get submission status', details: error.message });
  }
});

// Submit poem endpoint with multiple files - ENHANCED FOR PAYMENT FLOW
router.post('/api/submit', upload.fields([
  { name: 'poems', maxCount: 5 },
  { name: 'photo', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 NEW SUBMISSION REQUEST RECEIVED');
    console.log('Raw body data:', req.body);
    console.log('Files received:', req.files);

    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      tier,
      poemTitle,
      userUid,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method,
      amount,
      paypal_order_id,
      stripe_session_id,
      poemTitles,
      couponCode
    } = req.body;

    console.log('🔍 Processing submission for:', { firstName, lastName, email, tier, payment_method, amount });

    // Validate required fields
    const requiredFields = { firstName, lastName, email, phone, age, tier };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
    }

    // Validate tier
    if (!validateTierPoemCount(tier, 1)) {
      console.error('❌ Invalid tier:', tier);
      return res.status(400).json({ error: 'Invalid tier selected' });
    }

    // Get expected poem count for tier
    const expectedPoemCount = TIER_POEM_COUNTS[tier as keyof typeof TIER_POEM_COUNTS];
    console.log(`📊 Expected poem count for tier "${tier}":`, expectedPoemCount);

    // Handle files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const poemFiles = files?.poems || [];
    const photoFiles = files?.photo || [];

    console.log(`📄 Received ${poemFiles.length} poem files, expected ${expectedPoemCount}`);

    // Validate poem count matches tier
    if (poemFiles.length !== expectedPoemCount) {
      console.error(`❌ Poem count mismatch: received ${poemFiles.length}, expected ${expectedPoemCount}`);
      return res.status(400).json({
        error: `Invalid number of poems. Expected ${expectedPoemCount} for ${tier} tier, received ${poemFiles.length}`
      });
    }

    // Payment validation for paid tiers
    const actualAmount = parseFloat(amount) || 0;
    if (tier !== 'free' && actualAmount > 0) {
      console.log('💳 Validating payment for paid tier...');
      
      // Check for valid payment data
      const hasRazorpayPayment = razorpay_order_id && razorpay_payment_id && razorpay_signature;
      const hasPayPalPayment = paypal_order_id;
      const hasStripePayment = stripe_session_id;

      if (!hasRazorpayPayment && !hasPayPalPayment && !hasStripePayment) {
        console.error('❌ No valid payment data found for paid tier');
        return res.status(400).json({
          error: 'Payment required for this tier',
          details: 'No valid payment information found'
        });
      }

      console.log('✅ Payment data found:', {
        razorpay: !!hasRazorpayPayment,
        paypal: !!hasPayPalPayment,
        stripe: !!hasStripePayment,
        amount: actualAmount
      });
    }

    // Check if user exists or create them
    let user = null;
    if (userUid) {
      user = await storage.getUserByUid(userUid);
      if (!user) {
        console.log('👤 Creating new user from UID:', userUid);
        user = await storage.createUser({
          uid: userUid,
          email,
          name: `${firstName} ${lastName}`,
          phone
        });
      }
    } else {
      // Legacy support - create user without UID
      console.log('👤 Creating legacy user without UID');
      user = await storage.createUser({
        uid: null,
        email,
        name: `${firstName} ${lastName}`,
        phone
      });
    }

    console.log('👤 User created/found:', user.id, user.email);

    // Upload files to Google Drive
    let poemUrls: string[] = [];
    let photoUrl = '';

    try {
      console.log('☁️ Uploading poem files to Google Drive...');
      if (expectedPoemCount === 1) {
        // Single poem
        const poemUrl = await uploadPoemFile(poemFiles[0], poemTitle || 'Untitled Poem');
        poemUrls = [poemUrl];
        console.log('✅ Single poem uploaded:', poemUrl);
      } else {
        // Multiple poems
        const titles = Array.isArray(poemTitles) ? poemTitles : 
                      typeof poemTitles === 'string' ? JSON.parse(poemTitles) : 
                      poemFiles.map((_, i) => `Poem ${i + 1}`);
        
        poemUrls = await uploadMultiplePoemFiles(poemFiles, titles);
        console.log('✅ Multiple poems uploaded:', poemUrls.length);
      }

      if (photoFiles.length > 0) {
        console.log('📸 Uploading photo to Google Drive...');
        photoUrl = await uploadPhotoFile(photoFiles[0], `${firstName}_${lastName}_photo`);
        console.log('✅ Photo uploaded:', photoUrl);
      }
    } catch (uploadError: any) {
      console.error('❌ File upload failed:', uploadError);
      return res.status(500).json({
        error: 'Failed to upload files',
        details: uploadError.message
      });
    }

    // Create submission data with enhanced payment information
    const submissionData = {
      userId: user.id,
      firstName,
      lastName,
      email,
      phone,
      age: parseInt(age),
      tier,
      poemTitle: expectedPoemCount === 1 ? poemTitle : poemTitles,
      poemUrls,
      photoUrl,
      paymentData: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_method: payment_method || 'unknown',
        amount: actualAmount,
        paypal_order_id,
        stripe_session_id,
        couponCode: couponCode || null,
        payment_status: 'completed'
      }
    };

    console.log('💾 Creating submission record...');
    const submission = await storage.createSubmission(submissionData);
    console.log('✅ Submission created with ID:', submission.id);

    // Add to Google Sheets
    try {
      console.log('📊 Adding to Google Sheets...');
      if (expectedPoemCount === 1) {
        await addPoemSubmissionToSheet({
          name: `${firstName} ${lastName}`,
          email,
          phone,
          age,
          poemTitle: poemTitle || 'Untitled',
          tier,
          amount: actualAmount.toString(),
          poemFile: poemUrls[0] || '',
          photo: photoUrl,
          paymentMethod: payment_method || 'unknown',
          paymentId: razorpay_payment_id || paypal_order_id || stripe_session_id || 'unknown',
          timestamp: new Date().toISOString()
        });
      } else {
        await addMultiplePoemsToSheet({
          name: `${firstName} ${lastName}`,
          email,
          phone,
          age,
          tier,
          amount: actualAmount.toString(),
          poems: poemUrls.map((url, i) => ({
            title: Array.isArray(poemTitles) ? poemTitles[i] : `Poem ${i + 1}`,
            url
          })),
          photo: photoUrl,
          paymentMethod: payment_method || 'unknown',
          paymentId: razorpay_payment_id || paypal_order_id || stripe_session_id || 'unknown',
          timestamp: new Date().toISOString()
        });
      }
      console.log('✅ Added to Google Sheets successfully');
    } catch (sheetsError: any) {
      console.error('⚠️ Google Sheets error (non-critical):', sheetsError.message);
    }

    // Mark coupon as used if applicable
    if (couponCode) {
      try {
        console.log('🎫 Marking coupon as used:', couponCode);
        const { markCodeAsUsed } = await import('../client/src/pages/coupon-codes.js');
        markCodeAsUsed(couponCode);
        console.log('✅ Coupon marked as used');
      } catch (couponError: any) {
        console.error('⚠️ Coupon marking error (non-critical):', couponError.message);
      }
    }

    // Send confirmation email
    try {
      console.log('📧 Sending confirmation email...');
      if (expectedPoemCount === 1) {
        await sendSubmissionConfirmation({
          name: `${firstName} ${lastName}`,
          email,
          poemTitle: poemTitle || 'Untitled',
          tier
        });
      } else {
        await sendMultiplePoemsConfirmation({
          name: `${firstName} ${lastName}`,
          email,
          tier,
          poemCount: expectedPoemCount
        });
      }
      console.log('✅ Confirmation email sent successfully');
    } catch (emailError: any) {
      console.error('⚠️ Email sending error (non-critical):', emailError.message);
    }

    // Clean up uploaded files
    try {
      [...poemFiles, ...photoFiles].forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      console.log('✅ Temporary files cleaned up');
    } catch (cleanupError: any) {
      console.error('⚠️ File cleanup error (non-critical):', cleanupError.message);
    }

    console.log('🎉 SUBMISSION COMPLETED SUCCESSFULLY');
    res.json({
      success: true,
      message: 'Submission completed successfully!',
      submissionId: submission.id,
      poemUrls,
      photoUrl
    });

  } catch (error: any) {
    console.error('💥 SUBMISSION ERROR:', error);
    res.status(500).json({
      error: 'Submission failed',
      details: error.message
    });
  }
});

// Contact form endpoint
router.post('/api/contact', async (req, res) => {
  try {
    console.log('📞 Contact form submission received');
    const { name, email, phone, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email', 'message']
      });
    }

    // Add to Google Sheets
    try {
      await addContactToSheet({
        name,
        email,
        phone: phone || '',
        message,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Contact form added to Google Sheets');
    } catch (sheetsError: any) {
      console.error('⚠️ Google Sheets error for contact form:', sheetsError.message);
    }

    res.json({
      success: true,
      message: 'Contact form submitted successfully!'
    });

  } catch (error: any) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      error: 'Failed to submit contact form',
      details: error.message
    });
  }
});

// Get submission count
router.get('/api/submission-count', async (req, res) => {
  try {
    const count = await getSubmissionCountFromSheet();
    res.json({ count });
  } catch (error: any) {
    console.error('❌ Error getting submission count:', error);
    res.status(500).json({ error: 'Failed to get submission count', details: error.message });
  }
});

// Get all submissions (for admin)
router.get('/api/submissions', async (req, res) => {
  try {
    const submissions = await storage.getAllSubmissions();
    res.json(submissions);
  } catch (error: any) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

export { router };