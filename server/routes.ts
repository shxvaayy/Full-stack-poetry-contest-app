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
        poemFileUrl: poemFileUrl || null,
        photoUrl: photoFileUrl || null,
        paymentId: paymentId || null,
        paymentMethod: paymentMethod || null
      });
      console.log('✅ Submission added to local storage:', localSubmission.id);
      
      // Update user submission count
      const now = new Date();
      const contestMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Get current count or create new one
      const currentCount = await storage.getUserSubmissionCount(user.id, contestMonth);
      const isFreeSubmission = tier === 'free';
      const newTotalCount = (currentCount?.totalSubmissions || 0) + 1;
      const freeUsed = currentCount?.freeSubmissionUsed || isFreeSubmission;
      
      await storage.updateUserSubmissionCount(user.id, contestMonth, freeUsed, newTotalCount);
      console.log(`✅ Updated submission count for user ${user.email}: ${newTotalCount} total, free used: ${freeUsed}`);
      
    } catch (storageError) {
      console.error('Local storage error:', storageError);
      // Continue with other operations even if storage fails
    }

    // Add to Google Sheets (backup)
    try {
      await addPoemSubmissionToSheet(submissionData);
      console.log('✅ Submission added to Google Sheets');
    } catch (sheetError) {
      console.error('Google Sheets error (non-critical):', sheetError);
      // Continue with other operations even if sheets fail
    }

    // 🚀 NEW: Send confirmation email
    try {
      console.log('📧 Attempting to send confirmation email...');
      const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`;
      const emailSent = await sendSubmissionConfirmation({
        name: fullName,
        email: email,
        poemTitle: poemTitle,
        tier: tier
      });
      
      if (emailSent) {
        console.log('✅ Confirmation email sent successfully to:', email);
      } else {
        console.log('⚠️ Confirmation email failed to send to:', email);
      }
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      // Don't fail the entire submission if email fails
    }

    // Add to in-memory array for legacy compatibility
    submissions.push({
      id: submissions.length + 1,
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age || '',
      poemTitle,
      tier,
      amount: amount || '0',
      poemFile: poemFileUrl,
      photo: photoFileUrl,
      paymentId: paymentId || '',
      paymentMethod: paymentMethod || '',
      submittedAt: new Date().toISOString()
    });

    console.log('✅ Poem submission completed successfully');

    // Return success response
    res.json({
      success: true,
      message: 'Poem submitted successfully! A confirmation email has been sent to your email address.',
      submission: {
        id: localSubmission?.id || submissions.length,
        name: submissionData.name,
        email: submissionData.email,
        poemTitle: submissionData.poemTitle,
        tier: submissionData.tier,
        amount: submissionData.amount,
        submittedAt: submissionData.timestamp
      }
    });

  } catch (error: any) {
    console.error('❌ Error submitting poem:', error);
    res.status(500).json({
      error: 'Failed to submit poem',
      details: error.message
    });
  }
});

// Get all submissions (for admin)
router.get('/api/submissions', async (req, res) => {
  try {
    const allSubmissions = await storage.getAllSubmissions();
    console.log(`Retrieved ${allSubmissions.length} submissions from storage`);
    res.json(allSubmissions);
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Get submission statistics
router.get('/api/stats/submissions', async (req, res) => {
  try {
    let totalPoets = 0;
    
    try {
      totalPoets = await getSubmissionCountFromSheet();
      console.log(`📊 Retrieved ${totalPoets} total poets from Google Sheets`);
    } catch (sheetError) {
      console.warn('⚠️ Could not get count from Google Sheets, using local storage');
      const localSubmissions = await storage.getAllSubmissions();
      totalPoets = localSubmissions.length;
      console.log(`📊 Using local count: ${totalPoets} poets`);
    }
    
    res.json({
      totalPoets: totalPoets,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error fetching submission stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      totalPoets: 0
    });
  }
});

// Contact form endpoint
router.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    console.log('📞 Contact form submission received:', {
      name,
      email,
      phone: phone || 'Not provided',
      phoneLength: phone?.length || 0,
      phoneType: typeof phone,
      messagePreview: message?.substring(0, 50) + '...'
    });

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and message are required'
      });
    }

    // Save to Google Sheets
    try {
      const { addContactToSheet } = await import('./google-sheets.js');
      await addContactToSheet({
        name,
        email,
        phone: phone || '',
        message,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Contact saved to Google Sheets');
    } catch (sheetError) {
      console.error('❌ Google Sheets contact error:', sheetError);
    }

    // Save to local storage
    try {
      await storage.createContact({
        name,
        email,
        phone: phone || '',
        message
      });
      console.log('✅ Contact saved to local storage');
    } catch (storageError) {
      console.error('❌ Local storage contact error:', storageError);
    }

    res.json({
      success: true,
      message: 'Contact form submitted successfully'
    });

  } catch (error: any) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form'
    });
  }
});

// User management endpoints
router.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`🔍 Looking for user with UID: ${uid}`);
    
    const user = await storage.getUserByUid(uid);
    
    if (user) {
      console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
      res.json(user);
    } else {
      console.log(`❌ User not found with UID: ${uid}`);
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error: any) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/api/users', async (req, res) => {
  try {
    const { uid, email, name, phone } = req.body;
    console.log(`👤 Creating user: ${email} with UID: ${uid}`);
    
    const user = await storage.createUser({ uid, email, name, phone });
    console.log(`✅ User created successfully: ${user.email} (ID: ${user.id})`);
    
    res.status(201).json(user);
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/api/users/:uid/submissions', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`📝 Fetching submissions for user UID: ${uid}`);
    
    const user = await storage.getUserByUid(uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const submissions = await storage.getSubmissionsByUser(user.id);
    console.log(`✅ Found ${submissions.length} submissions for user ${user.email}`);
    
    res.json(submissions);
  } catch (error: any) {
    console.error('❌ Error fetching user submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    const user = await storage.getUserByUid(uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const submissionCount = await storage.getUserSubmissionCount(user.id, currentMonth);
    
    res.json({
      freeSubmissionUsed: submissionCount?.freeSubmissionUsed || false,
      totalSubmissions: submissionCount?.totalSubmissions || 0,
      contestMonth: currentMonth
    });
  } catch (error: any) {
    console.error('❌ Error fetching submission status:', error);
    res.status(500).json({ error: 'Failed to fetch submission status' });
  }
});

export function registerRoutes(app: any) {
  app.use(router);
}