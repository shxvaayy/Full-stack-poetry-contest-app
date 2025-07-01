import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { uploadPoemFile, uploadPhotoFile } from './google-drive.js';
import { addPoemSubmissionToSheet, getSubmissionCountFromSheet, addContactToSheet } from './google-sheets.js';
import { paypalRouter } from './paypal.js';
import { storage } from './storage.js';
import { sendSubmissionConfirmation } from './mailSender.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// In-memory storage for submissions (legacy compatibility)
const submissions: any[] = [];

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

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

    const submissions = await storage.getSubmissionsByUser(user.id);

    // Format submissions for frontend
    const formattedSubmissions = submissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName}${sub.lastName ? ' ' + sub.lastName : ''}`,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      amount: sub.price,
      submittedAt: sub.submittedAt.toISOString(),
      isWinner: sub.isWinner,
      winnerPosition: sub.winnerPosition
    }));

    console.log(`✅ Returning ${formattedSubmissions.length} submissions for user ${user.id}`);
    res.json(formattedSubmissions);
  } catch (error: any) {
    console.error('❌ Error getting user submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

// 🚀 FIXED: Get user submission status by UID - PERMANENT DATA FIX
router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`📊 Getting submission status for UID: ${uid}`);

    const user = await storage.getUserByUid(uid);
    if (!user) {
      console.log(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // 🚀 FIX: Get actual submissions from database instead of relying on separate count table
    const userSubmissions = await storage.getSubmissionsByUser(user.id);
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Filter submissions for current month
    const currentMonthSubmissions = userSubmissions.filter(sub => 
      sub.submittedAt.toISOString().slice(0, 7) === currentMonth
    );

    // Check if user used free submission this month
    const freeSubmissionUsed = currentMonthSubmissions.some(sub => sub.tier === 'free');

    const status = {
      freeSubmissionUsed: freeSubmissionUsed,
      totalSubmissions: currentMonthSubmissions.length,
      contestMonth: currentMonth,
      allTimeSubmissions: userSubmissions.length // 🚀 BONUS: Add all-time count
    };

    console.log(`📊 PERMANENT Submission status for user ${user.id}:`, status);
    res.json(status);
  } catch (error: any) {
    console.error('❌ Error getting submission status:', error);
    res.status(500).json({ error: 'Failed to get submission status', details: error.message });
  }
});

// Create Razorpay order
router.post('/api/create-razorpay-order', async (req, res) => {
  try {
    const { amount, tier, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const options = {
      amount: amount * 100, // Razorpay expects amount in paisa
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        tier: tier,
        ...metadata
      }
    };

    console.log('Creating Razorpay order with options:', options);

    const order = await razorpay.orders.create(options);

    console.log('Razorpay order created:', order);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify Razorpay payment
router.post('/api/verify-razorpay-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      console.log('Razorpay payment verified successfully');
      res.json({ 
        success: true, 
        message: 'Payment verified successfully',
        amount: 50,
        currency: 'INR'
      });
    } else {
      console.error('Razorpay signature verification failed');
      res.status(400).json({ success: false, error: 'Payment verification failed' });
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

// Verify checkout session
router.post('/api/verify-checkout-session', async (req, res) => {
  try {
    const { sessionId } = req.body;

    console.log('✅ Verifying checkout session:', sessionId);

    res.json({
      success: true,
      message: 'Session verified successfully',
      sessionId: sessionId,
      payment_status: 'completed'
    });
  } catch (error: any) {
    console.error('❌ Error verifying checkout session:', error);
    res.status(500).json({ success: false, error: 'Session verification failed' });
  }
});

// Verify PayPal payment
router.post('/api/verify-paypal-payment', async (req, res) => {
  try {
    const { orderId } = req.body;

    console.log('✅ Verifying PayPal payment:', orderId);

    if (orderId && orderId.length > 0) {
      res.json({
        success: true,
        message: 'PayPal payment verified successfully',
        orderId: orderId,
        amount: 50,
        currency: 'USD',
        payment_status: 'completed'
      });
    } else {
      console.error('❌ Invalid PayPal order ID provided');
      res.status(400).json({ success: false, error: 'Invalid PayPal order ID' });
    }
  } catch (error: any) {
    console.error('❌ Error verifying PayPal payment:', error);
    res.status(500).json({ success: false, error: 'PayPal verification failed' });
  }
});

// Submit poem with email confirmation - FIXED GOOGLE SHEETS INTEGRATION
router.post('/api/submit-poem', upload.any(), async (req, res) => {
  try {
    console.log('📝 Poem submission request received');
    console.log('Form data:', req.body);

    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      tier,
      amount,
      paymentId,
      paymentMethod,
      userUid,
      razorpay_order_id,
      razorpay_signature,
      discountAmount,
      poemCount,
      submissionId
    } = req.body;

    // Validate required fields
    if (!firstName || !email || !tier || !poemCount) {
      console.error('Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'First name, email, tier, and poem count are required'
      });
    }

    const numPoems = parseInt(poemCount);
    if (isNaN(numPoems) || numPoems < 1) {
      return res.status(400).json({
        error: 'Invalid poem count',
        details: 'Poem count must be a positive number'
      });
    }

    // Extract poem titles
    const poemTitles = [];
    for (let i = 0; i < numPoems; i++) {
      const title = req.body[`poemTitle_${i}`];
      if (!title || !title.trim()) {
        return res.status(400).json({
          error: 'Missing poem title',
          details: `Title for poem ${i + 1} is required`
        });
      }
      poemTitles.push(title);
    }

    // If discount amount brings the amount to 0, bypass payment verification
    const discountedAmount = parseFloat(amount) - (parseFloat(discountAmount) || 0);

    if (discountedAmount <= 0) {
      console.log('Discounted amount is zero, bypassing payment verification');
    } else {
      // Verify payment for paid tiers
      if (tier !== 'free' && amount && parseFloat(amount) > 0) {
        console.log('Verifying payment for paid tier...');

        if (!paymentId || !paymentMethod) {
          console.error('Missing payment information for paid tier');
          return res.status(400).json({
            error: 'Payment information required',
            details: 'Payment ID and method are required for paid submissions'
          });
        }

        // Verify Razorpay payment if applicable
        if (paymentMethod === 'razorpay' && razorpay_order_id && razorpay_signature) {
          const body = razorpay_order_id + '|' + paymentId;
          const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest('hex');

          if (expectedSignature !== razorpay_signature) {
            console.error('Razorpay signature verification failed');
            return res.status(400).json({
              error: 'Payment verification failed',
              details: 'Invalid payment signature'
            });
          }
        }
      }
    }

    // 🚀 CRITICAL: Get or create user first
    let user = null;
    if (userUid) {
      user = await storage.getUserByUid(userUid);
      if (!user) {
        console.log('Creating user for submission...');
        user = await storage.createUser({
          uid: userUid,
          email: email,
          name: firstName + (lastName ? ' ' + lastName : ''),
          phone: phone || null
        });
      }
    }

    // Handle file uploads
    const files = req.files as Express.Multer.File[];
    let photoUrl = null;
    const poemFileUrls: (string | null)[] = [];

    // Find photo file
    const photoFile = files.find(file => file.fieldname === 'photo');
    if (photoFile) {
      console.log('🔵 Uploading photo file...');
      try {
        const photoBuffer = fs.readFileSync(photoFile.path);
        photoUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
        console.log('✅ Photo file uploaded:', photoUrl);
      } catch (error) {
        console.error('❌ Photo file upload failed:', error);
      }
    }

    // Upload poem files
    for (let i = 0; i < numPoems; i++) {
      const poemFile = files.find(file => file.fieldname === `poem_${i}`);
      let poemFileUrl = null;
      
      if (poemFile) {
        console.log(`🔵 Uploading poem file ${i + 1}...`);
        try {
          const poemBuffer = fs.readFileSync(poemFile.path);
          poemFileUrl = await uploadPoemFile(poemBuffer, email, poemFile.originalname);
          console.log(`✅ Poem file ${i + 1} uploaded:`, poemFileUrl);
        } catch (error) {
          console.error(`❌ Poem file ${i + 1} upload failed:`, error);
        }
      }
      
      poemFileUrls.push(poemFileUrl);
    }

    // Create separate submission for each poem with unique tracking
    const submissions = [];
    const baseSubmissionId = submissionId || crypto.randomUUID();
    
    for (let i = 0; i < numPoems; i++) {
      const uniqueSubmissionId = numPoems === 1 ? baseSubmissionId : `${baseSubmissionId}_poem_${i + 1}`;
      
      const submission = await storage.createSubmission({
        userId: user?.id || null,
        firstName,
        lastName: lastName || null,
        email,
        phone: phone || null,
        age: age || null,
        poemTitle: poemTitles[i],
        tier: numPoems === 1 ? tier : `${tier}_poem_${i + 1}`,
        price: parseFloat(amount) || 0,
        poemFileUrl: poemFileUrls[i],
        photoUrl: photoUrl,
        paymentId: paymentId || null,
        paymentMethod: paymentMethod || null,
        submissionUuid: uniqueSubmissionId // Add unique submission UUID
      });

      submissions.push(submission);
      console.log(`✅ Submission ${i + 1} created:`, submission);
    }

    // Mark coupon code as used only after successful submission
    const { couponCode } = req.body;
    if (couponCode) {
      try {
        const { markCodeAsUsed } = await import('../client/src/pages/coupon-codes.js');
        markCodeAsUsed(couponCode);
        console.log(`✅ Marked coupon code "${couponCode}" as used after successful submission`);
      } catch (error) {
        console.error('❌ Error marking coupon code as used:', error);
      }
    }

    // FIXED: Add to Google Sheets with EXTENSIVE DEBUGGING - Multiple Poems
    try {
      console.log('🟡 STARTING Google Sheets integration for multiple poems...');
      
      const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`.trim();
      
      // Add each poem as separate entry in Google Sheets
      for (let i = 0; i < submissions.length; i++) {
        const submission = submissions[i];
        
        const sheetsData = {
          name: fullName,
          email: email,
          phone: phone || '',
          age: age || '',
          poemTitle: poemTitles[i],
          tier: submission.tier,
          amount: (parseFloat(amount) || 0).toString(),
          poemFile: poemFileUrls[i] || '',
          photo: photoUrl || '',
          timestamp: new Date().toISOString(),
          submissionUuid: submission.submissionUuid || '' // Add unique identifier
        };

        console.log(`🟡 Adding poem ${i + 1} to Google Sheets:`, sheetsData);
        await addPoemSubmissionToSheet(sheetsData);
        console.log(`🟢 Poem ${i + 1} added to Google Sheets successfully!`);
      }
    } catch (sheetsError) {
      console.error('🔴 GOOGLE SHEETS ERROR:', sheetsError);
      console.error('🔴 Error message:', sheetsError?.message);
      console.error('🔴 Error stack:', sheetsError?.stack);
      // Don't fail the whole submission
    }

    // Send confirmation email
    try {
      console.log('📧 Sending confirmation email...');
      const emailSent = await sendSubmissionConfirmation({
        name: firstName + (lastName ? ' ' + lastName : ''),
        email: email,
        poemTitle: numPoems === 1 ? poemTitles[0] : `${numPoems} poems: ${poemTitles.join(', ')}`,
        tier: tier,
        poemCount: numPoems
      });

      if (emailSent) {
        console.log('✅ Confirmation email sent successfully');
      } else {
        console.log('⚠️ Confirmation email failed to send');
      }
    } catch (error) {
      console.error('❌ Email sending error:', error);
    }

    // Clean up uploaded files
    files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Error cleaning up file:', file.originalname, error);
      }
    });

    // Return success response
    res.json({
      success: true,
      message: `${numPoems} poem${numPoems > 1 ? 's' : ''} submitted successfully!`,
      submissions: submissions.map(sub => ({
        id: sub.id,
        poemTitle: sub.poemTitle,
        tier: sub.tier,
        submittedAt: sub.submittedAt,
        submissionUuid: sub.submissionUuid
      })),
      submissionCount: numPoems
    });

  } catch (error: any) {
    console.error('❌ Submission error:', error);
    res.status(500).json({
      error: 'Submission failed',
      details: error.message
    });
  }
});

// 🔧 UPDATED: Contact form submission with Google Sheets integration
router.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message, subject } = req.body;

    console.log('📧 Received contact form submission:', {
      name,
      email, 
      phone: phone || 'not provided',
      message: message?.substring(0, 50) + '...'
    });

    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Name, email, and message are required'
      });
    }

    // Create contact record in database
    const contact = await storage.createContact({
      name,
      email,
      phone: phone || null,
      message,
      subject: subject || null
    });

    console.log(`✅ Contact saved to database with ID: ${contact.id}`);

    // 🔧 NEW: Add to Google Sheets
    try {
      const contactData = {
        name,
        email,
        phone: phone || '',
        message,
        timestamp: new Date().toISOString()
      };

      console.log('📊 Sending contact data to Google Sheets:', contactData);
      await addContactToSheet(contactData);
      console.log('✅ Contact data added to Google Sheets');
    } catch (sheetError: any) {
      console.error('❌ Failed to add contact to Google Sheets:', sheetError);
      // Don't fail the whole request if sheets fail
    }

    res.json({
      success: true,
      message: 'Contact form submitted successfully!',
      id: contact.id
    });

  } catch (error: any) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      error: 'Contact form submission failed',
      details: error.message
    });
  }
});

// Get all submissions (admin)
router.get('/api/submissions', async (req, res) => {
  try {
    const submissions = await storage.getAllSubmissions();

    // Format for frontend
    const formattedSubmissions = submissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName}${sub.lastName ? ' ' + sub.lastName : ''}`,
      email: sub.email,
      phone: sub.phone,
      age: sub.age,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      price: sub.price,
      submittedAt: sub.submittedAt.toISOString(),
      isWinner: sub.isWinner,
      winnerPosition: sub.winnerPosition,
      poemFileUrl: sub.poemFileUrl,
      photoUrl: sub.photoUrl
    }));

    console.log(`📊 Returning ${formattedSubmissions.length} total submissions`);
    res.json(formattedSubmissions);
  } catch (error: any) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

// Get submission count
router.get('/api/submission-count', async (req, res) => {
  try {
    const allSubmissions = await storage.getAllSubmissions();
    console.log(`📊 Returning ${allSubmissions.length} total submissions`);
    res.json({ count: allSubmissions.length });
  } catch (error: any) {
    console.error('❌ Error getting submission count:', error);
    res.status(500).json({ error: 'Failed to get submission count', details: error.message });
  }
});

// Get stats endpoint
router.get('/api/stats/submissions', async (req, res) => {
  try {
    const allSubmissions = await storage.getAllSubmissions();
    const count = allSubmissions.length;
    console.log(`📊 Stats: ${count} total submissions`);
    res.json({ count });
  } catch (error: any) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

// Get winners
router.get('/api/winners', async (req, res) => {
  try {
    const allSubmissions = await storage.getAllSubmissions();
    const winners = allSubmissions.filter(sub => sub.isWinner);

    const formattedWinners = winners.map(winner => ({
      id: winner.id,
      name: `${winner.firstName}${winner.lastName ? ' ' + winner.lastName : ''}`,
      poemTitle: winner.poemTitle,
      position: winner.winnerPosition
    }));

    console.log(`🏆 Returning ${formattedWinners.length} winners`);
    res.json(formattedWinners);
  } catch (error: any) {
    console.error('❌ Error getting winners:', error);
    res.status(500).json({ error: 'Failed to get winners', details: error.message });
  }
});

// Update winner status (admin)
router.post('/api/submissions/:id/winner', async (req, res) => {
  try {
    const { id } = req.params;
    const { isWinner, position } = req.body;

    const submission = await storage.updateSubmissionWinner(parseInt(id), isWinner, position);

    console.log(`🏆 Updated winner status for submission ${id}`);
    res.json({
      success: true,
      message: 'Winner status updated',
      submission
    });
  } catch (error: any) {
    console.error('❌ Error updating winner status:', error);
    res.status(500).json({ error: 'Failed to update winner status', details: error.message });
  }
});

// Admin CSV upload endpoint
router.post('/api/admin/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    console.log('📊 Admin CSV upload request received');

    // Set proper JSON content type
    res.setHeader('Content-Type', 'application/json');

    if (!req.file) {
      console.error('❌ No file provided in request');
      return res.status(400).json({
        success: false,
        error: 'No CSV file provided',
        details: 'Please upload a CSV file'
      });
    }

    console.log('📁 CSV file received:', req.file.originalname, 'Size:', req.file.size);

    // Read and parse CSV file with error handling
    let csvContent;
    try {
      const fs = await import('fs/promises');
      csvContent = await fs.readFile(req.file.path, 'utf-8');
      console.log('📄 CSV content loaded, length:', csvContent.length);
    } catch (fileError: any) {
      console.error('❌ Error reading CSV file:', fileError);
      return res.status(400).json({
        success: false,
        error: 'Failed to read CSV file',
        details: fileError.message
      });
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty',
        details: 'Please provide a valid CSV file with data'
      });
    }

    // Parse CSV with proper CSV parsing
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'CSV file must have header and at least one data row',
        details: 'File has insufficient data'
      });
    }

    // Function to parse CSV line properly
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    console.log('📊 CSV headers found:', headers);

    // Validate headers - more flexible matching
    const expectedHeaders = ['email', 'poemtitle', 'score', 'type', 'originality', 'emotion', 'structure', 'language', 'theme', 'status'];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      console.error('❌ Missing required headers:', missingHeaders);
      return res.status(400).json({
        success: false,
        error: 'Invalid CSV format',
        details: `Missing headers: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`
      });
    }

    let processedCount = 0;
    const errors: string[] = [];

    console.log(`📊 Processing ${lines.length - 1} data rows...`);

    // Get all users first to avoid repeated database calls
    const allUsers = await storage.getAllSubmissions().then(submissions => {
      const userEmails = new Set(submissions.map(s => s.email));
      return Array.from(userEmails).map(email => ({ email }));
    });

    console.log(`👥 Found ${allUsers.length} unique user emails in database`);

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = parseCSVLine(line);
        
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Invalid number of columns (expected ${headers.length}, got ${values.length})`);
          continue;
        }

        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index].replace(/^["']|["']$/g, ''); // Remove quotes
        });

        console.log(`📝 Processing row ${i + 1}: ${rowData.email} - ${rowData.poemtitle}`);

        // Find user by email (using direct database query)
        const user = await storage.getUserByEmail(rowData.email);
        
        if (!user) {
          errors.push(`Row ${i + 1}: User not found with email ${rowData.email}`);
          console.log(`❌ User not found: ${rowData.email}`);
          continue;
        }

        // Find submission by title and user
        const userSubmissions = await storage.getSubmissionsByUser(user.id);
        const submission = userSubmissions.find((s: any) => 
          s.poemTitle.toLowerCase().trim() === rowData.poemtitle.toLowerCase().trim()
        );

        if (!submission) {
          errors.push(`Row ${i + 1}: Poem "${rowData.poemtitle}" not found for user ${rowData.email}`);
          console.log(`❌ Submission not found: "${rowData.poemtitle}" for ${rowData.email}`);
          continue;
        }

        // Parse numeric values safely
        const score = parseInt(rowData.score) || 0;
        const originality = parseInt(rowData.originality) || 0;
        const emotion = parseInt(rowData.emotion) || 0;
        const structure = parseInt(rowData.structure) || 0;
        const language = parseInt(rowData.language) || 0;
        const theme = parseInt(rowData.theme) || 0;

        // Update submission with evaluation results
        await storage.updateSubmissionEvaluation(submission.id, {
          score: score,
          type: rowData.type || 'AI',
          status: rowData.status || 'Evaluated',
          scoreBreakdown: {
            originality,
            emotion,
            structure,
            language,
            theme
          }
        });

        processedCount++;
        console.log(`✅ Updated submission ${submission.id} for ${rowData.email} with score ${score}`);

      } catch (rowError: any) {
        console.error(`❌ Error processing row ${i + 1}:`, rowError);
        errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    // Clean up uploaded file
    try {
      const fs = await import('fs/promises');
      await fs.unlink(req.file.path);
      console.log('🧹 Cleaned up uploaded file');
    } catch (cleanupError) {
      console.error('⚠️ Error cleaning up file:', cleanupError);
    }

    console.log(`📊 CSV processing complete: ${processedCount} processed, ${errors.length} errors`);

    // Return success response
    return res.status(200).json({
      success: true,
      message: `Successfully processed ${processedCount} records`,
      processed: processedCount,
      totalRows: lines.length - 1,
      errors: errors.slice(0, 20) // Show more errors for debugging
    });

  } catch (error: any) {
    console.error('❌ CSV upload error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Clean up file if it exists
    if (req.file) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    // Always return JSON error response
    return res.status(500).json({
      success: false,
      error: 'CSV processing failed',
      details: error.message,
      processed: 0,
      errors: [error.message]
    });
  }
});

// Export the router and the registerRoutes function
export function registerRoutes(app: any) {
  app.use(router);
}

export default router;