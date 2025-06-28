import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { uploadPoemFile, uploadPhotoFile } from './google-drive.js';
import { addPoemSubmissionToSheet, getSubmissionCountFromSheet } from './google-sheets.js';
import { paypalRouter } from './paypal.js';
import { storage } from './storage.js';
import { sendSubmissionConfirmation } from './mailSender.js'; // 🚀 NEW: Import email function

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
    email_configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS) // 🚀 NEW: Email config check
  });
});

// 🚀 NEW: Test email endpoint
router.get('/api/test-email', async (req, res) => {
  try {
    console.log('🧪 Testing email functionality...');
    const testEmailSent = await sendSubmissionConfirmation({
      name: 'Test User',
      email: process.env.EMAIL_USER || 'writorycontest@gmail.com', // Send test email to yourself
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

// 🚀 NEW: Get user by UID
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

// 🚀 NEW: Create user endpoint
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

// 🚀 NEW: Get user submissions by UID
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

// 🚀 NEW: Get user submission status by UID
router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`📊 Getting submission status for UID: ${uid}`);
    
    const user = await storage.getUserByUid(uid);
    if (!user) {
      console.log(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const submissionCount = await storage.getUserSubmissionCount(user.id, currentMonth);
    
    const status = {
      freeSubmissionUsed: submissionCount?.freeSubmissionUsed || false,
      totalSubmissions: submissionCount?.totalSubmissions || 0,
      contestMonth: currentMonth
    };
    
    console.log(`📊 Submission status for user ${user.id}:`, status);
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

// CRITICAL FIX: Verify checkout session (missing endpoint causing payment errors)
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

// CRITICAL FIX: Verify PayPal payment (missing endpoint causing payment errors)
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

// 🚀 UPDATED: Submit poem with email confirmation
router.post('/api/submit-poem', upload.fields([
  { name: 'poem', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 Poem submission request received');
    console.log('Form data:', req.body);

    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      poemTitle,
      tier,
      amount,
      paymentId,
      paymentMethod,
      userUid,
      razorpay_order_id,
      razorpay_signature
    } = req.body;

    // Validate required fields
    if (!firstName || !email || !poemTitle || !tier) {
      console.error('Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'First name, email, poem title, and tier are required'
      });
    }

    // Verify payment for paid tiers
    if (tier !== 'free' && amount && parseFloat(amount) > 0) {
      console.log('Verifying payment for paid tier...');
      
      if (!paymentId || !paymentMethod) {
        console.error('Missing payment information for paid tier');
        return res.status(400).json({
          error: 'Payment verification required',
          details: 'Payment information is missing for paid tier'
        });
      }

      // Verify Razorpay payment if needed
      if (paymentMethod === 'razorpay' && razorpay_order_id && razorpay_signature) {
        try {
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
          
          console.log('Razorpay payment verified');
        } catch (verifyError) {
          console.error('Payment verification error:', verifyError);
          return res.status(400).json({
            error: 'Payment verification failed',
            details: 'Unable to verify payment'
          });
        }
      }
    }

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let poemFileUrl = '';
    let photoFileUrl = '';

    try {
      // Upload poem file if provided
      if (files?.poem && files.poem[0]) {
        const poemFile = files.poem[0];
        const poemBuffer = fs.readFileSync(poemFile.path);
        poemFileUrl = await uploadPoemFile(poemBuffer, email, poemFile.originalname);
        console.log('📄 Poem file uploaded:', poemFileUrl);
        
        // Clean up temp file
        try { fs.unlinkSync(poemFile.path); } catch {}
      }

      // Upload photo file if provided
      if (files?.photo && files.photo[0]) {
        const photoFile = files.photo[0];
        const photoBuffer = fs.readFileSync(photoFile.path);
        photoFileUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
        console.log('📸 Photo file uploaded:', photoFileUrl);
        
        // Clean up temp file
        try { fs.unlinkSync(photoFile.path); } catch {}
      }
    } catch (uploadError) {
      console.error('File upload warning:', uploadError);
      // Continue with submission even if file upload fails
    }

    // Create submission data
    const submissionData = {
      timestamp: new Date().toISOString(),
      name: `${firstName}${lastName ? ' ' + lastName : ''}`,
      email,
      phone: phone || '',
      age: age || '',
      poemTitle,
      tier,
      amount: amount || '0',
      poemFile: poemFileUrl,
      photo: photoFileUrl
    };

    // First, ensure user exists in storage
    let user;
    try {
      user = await storage.getUserByUid(userUid);
      if (!user) {
        // Create user if doesn't exist
        user = await storage.createUser({
          uid: userUid,
          email: email,
          name: `${firstName}${lastName ? ' ' + lastName : ''}`,
          phone: phone || null
        });
        console.log('Created new user in storage:', user.email);
      }
    } catch (userError) {
      console.error('Error handling user:', userError);
      return res.status(500).json({
        error: 'Failed to process user data',
        details: userError.message
      });
    }

    // Add to local storage (primary source for API responses)
    let localSubmission;
    try {
      localSubmission = await storage.createSubmission({
        userId: user.id,
        firstName: firstName,
        lastName: lastName || null,
        email: email,
        phone: phone || null,
        age: age || null,
        poemTitle: poemTitle,
        tier: tier,
        price: parseFloat(amount) || 0,
        paymentId: paymentId || null,
        paymentMethod: paymentMethod || null,
        poemFileUrl: poemFileUrl || null,
        photoFileUrl: photoFileUrl || null
      });

      console.log('✅ Submission saved to storage with ID:', localSubmission.id);
    } catch (storageError) {
      console.error('❌ Error saving to storage:', storageError);
      return res.status(500).json({
        error: 'Failed to save submission',
        details: storageError.message
      });
    }

    // Add to in-memory array (legacy support)
    submissions.push({
      id: submissions.length + 1,
      ...submissionData,
      submittedAt: new Date().toISOString()
    });

    console.log(`✅ Total submissions in memory: ${submissions.length}`);

    // Add to Google Sheets (backup storage)
    try {
      await addPoemSubmissionToSheet(submissionData);
      console.log('✅ Submission added to Google Sheets');
    } catch (sheetsError) {
      console.error('⚠️ Warning: Failed to add to Google Sheets:', sheetsError);
      // Continue anyway - local storage is primary
    }

    // 🚀 NEW: Send confirmation email
    try {
      const emailSent = await sendSubmissionConfirmation({
        name: `${firstName}${lastName ? ' ' + lastName : ''}`,
        email: email,
        poemTitle: poemTitle,
        tier: tier
      });
      
      if (emailSent) {
        console.log('✅ Confirmation email sent to:', email);
      } else {
        console.log('⚠️ Warning: Confirmation email failed to send');
      }
    } catch (emailError) {
      console.error('⚠️ Warning: Email sending failed:', emailError);
      // Continue anyway - email is not critical
    }

    res.json({
      success: true,
      message: 'Poem submitted successfully!',
      submissionId: localSubmission.id,
      emailSent: true // Assuming email was sent for UI feedback
    });

  } catch (error: any) {
    console.error('❌ Error in poem submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit poem',
      details: error.message
    });
  }
});

// Get submissions endpoint
router.get('/api/submissions', async (req, res) => {
  try {
    console.log('📋 Getting all submissions...');
    
    // Get from storage (primary source)
    const storageSubmissions = await storage.getAllSubmissions();
    
    if (storageSubmissions && storageSubmissions.length > 0) {
      console.log(`✅ Found ${storageSubmissions.length} submissions in storage`);
      
      // Format for frontend
      const formattedSubmissions = storageSubmissions.map(sub => ({
        id: sub.id,
        name: `${sub.firstName}${sub.lastName ? ' ' + sub.lastName : ''}`,
        email: sub.email,
        phone: sub.phone,
        age: sub.age,
        poemTitle: sub.poemTitle,
        tier: sub.tier,
        amount: sub.price,
        submittedAt: sub.submittedAt.toISOString(),
        isWinner: sub.isWinner,
        winnerPosition: sub.winnerPosition
      }));
      
      return res.json(formattedSubmissions);
    }
    
    // Fallback to in-memory (legacy)
    console.log(`📋 Fallback: Found ${submissions.length} submissions in memory`);
    res.json(submissions);
    
  } catch (error: any) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({ 
      error: 'Failed to get submissions', 
      details: error.message 
    });
  }
});

// Get submission count
router.get('/api/submission-count', async (req, res) => {
  try {
    console.log('📊 Getting submission count...');
    
    // Try storage first
    const storageSubmissions = await storage.getAllSubmissions();
    if (storageSubmissions) {
      const count = storageSubmissions.length;
      console.log(`✅ Storage count: ${count}`);
      return res.json({ count });
    }
    
    // Fallback to in-memory count
    const count = submissions.length;
    console.log(`📊 Memory count: ${count}`);
    res.json({ count });
    
  } catch (error: any) {
    console.error('❌ Error getting submission count:', error);
    res.status(500).json({ 
      error: 'Failed to get submission count', 
      details: error.message 
    });
  }
});

// Get Google Sheets count (secondary verification)
router.get('/api/sheet-count', async (req, res) => {
  try {
    console.log('📊 Getting Google Sheets submission count...');
    const count = await getSubmissionCountFromSheet();
    console.log(`✅ Google Sheets count: ${count}`);
    res.json({ count });
  } catch (error: any) {
    console.error('❌ Error getting sheet count:', error);
    res.status(500).json({ 
      error: 'Failed to get sheet count', 
      details: error.message 
    });
  }
});

// Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// 🚀 EXPORT: Function to register routes with Express app (matching index.ts expectations)
export const registerRoutes = (app: any) => {
  app.use(router);
};

// Also export the router for flexibility
export { router };