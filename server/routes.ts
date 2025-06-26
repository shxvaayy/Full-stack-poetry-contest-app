
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import Razorpay from 'razorpay';
import { paypalRouter } from './paypal';



const router = Router();

// In-memory storage for users and submissions
let users: any[] = [];
let submissions: any[] = [];

// Initialize Razorpay
let razorpay: Razorpay;
try {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
  }
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('✅ Razorpay initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Razorpay:', error);
}

// Initialize PayPal
let paypalService: PayPalService;
try {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required');
  }
  paypalService = new PayPalService();
  console.log('✅ PayPal initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize PayPal:', error);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word documents, and image files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// USER MANAGEMENT ROUTES

// Create or get user
router.post('/api/users', async (req, res) => {
  try {
    const { uid, email, name, phone } = req.body;
    
    console.log('👤 Creating/getting user:', { uid, email, name });
    
    // Check if user already exists
    let user = users.find(u => u.uid === uid);
    
    if (user) {
      console.log('✅ User already exists:', user);
      return res.json(user);
    }
    
    // Create new user
    const newUser = {
      id: users.length + 1,
      uid,
      email,
      name: name || email?.split('@')[0] || 'User',
      phone: phone || null,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    console.log('✅ New user created:', newUser);
    res.json(newUser);
    
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get user by UID
router.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    console.log('🔍 Looking for user with UID:', uid);
    
    const user = users.find(u => u.uid === uid);
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User found:', user);
    res.json(user);
    
  } catch (error: any) {
    console.error('❌ Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user submissions
router.get('/api/users/:uid/submissions', async (req, res) => {
  try {
    const { uid } = req.params;
    
    console.log('📋 Getting submissions for user:', uid);
    
    // Find user first
    const user = users.find(u => u.uid === uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's submissions
    const userSubmissions = submissions.filter(s => s.userUid === uid);
    
    console.log('✅ Found submissions:', userSubmissions.length);
    
    res.json(userSubmissions.map(s => ({
      id: s.id,
      name: s.name,
      poemTitle: s.poemTitle,
      tier: s.tier,
      amount: parseInt(s.amount),
      submittedAt: s.timestamp,
      isWinner: false,
      winnerPosition: null
    })));
    
  } catch (error: any) {
    console.error('❌ Error getting user submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Get user submission status
router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    
    console.log('📊 Getting submission status for user:', uid);
    
    // Find user first
    const user = users.find(u => u.uid === uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's submissions
    const userSubmissions = submissions.filter(s => s.userUid === uid);
    const freeSubmissions = userSubmissions.filter(s => s.tier === 'free');
    
    const status = {
      freeSubmissionUsed: freeSubmissions.length > 0,
      totalSubmissions: userSubmissions.length,
      contestMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
    
    console.log('✅ Submission status:', status);
    
    res.json(status);
    
  } catch (error: any) {
    console.error('❌ Error getting submission status:', error);
    res.status(500).json({ error: 'Failed to get submission status' });
  }
});

// STATS ROUTES

// Get submission statistics
router.get('/api/stats/submissions', async (req, res) => {
  try {
    console.log('📈 Getting submission stats');
    
    const totalPoets = new Set(submissions.map(s => s.userUid)).size;
    const totalSubmissions = submissions.length;
    
    const stats = {
      totalPoets,
      totalSubmissions,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Stats:', stats);
    
    res.json(stats);
    
  } catch (error: any) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({ 
      totalPoets: 0, 
      totalSubmissions: 0,
      error: error.message 
    });
  }
});

// TEST ROUTES
router.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    cors: 'enabled',
    origin: req.headers.origin,
    razorpay_configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    google_configured: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    users_count: users.length,
    submissions_count: submissions.length
  });
});

// RAZORPAY PAYMENT ROUTES

// Create Razorpay Order
router.post('/api/create-razorpay-order', async (req, res) => {
  try {
    console.log('📥 Razorpay order request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate Razorpay initialization
    if (!razorpay) {
      console.error('❌ Razorpay not initialized');
      return res.status(500).json({ 
        error: 'Payment system not configured properly',
        details: 'Razorpay not initialized'
      });
    }

    const { amount, tier, metadata } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!tier) {
      console.error('❌ Missing tier');
      return res.status(400).json({ error: 'Tier is required' });
    }

    // Create Razorpay order
    const orderData = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      notes: {
        tier: tier,
        ...(metadata || {})
      }
    };

    console.log('📋 Creating Razorpay order with data:', JSON.stringify(orderData, null, 2));

    const order = await razorpay.orders.create(orderData);

    console.log('✅ Razorpay order created successfully');
    console.log('Order ID:', order.id);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error: any) {
    console.error('❌ Error creating Razorpay order:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment system error',
      type: error.type || 'unknown'
    });
  }
});

// Verify Razorpay Payment
router.post('/api/verify-razorpay-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Payment details are required' });
    }

    if (!razorpay) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    console.log('🔍 Verifying Razorpay payment:', { razorpay_order_id, razorpay_payment_id });

    // Verify signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Invalid payment signature');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Fetch payment details
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    console.log('📊 Payment details:', {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency
    });

    if (payment.status === 'captured') {
      res.json({
        success: true,
        paymentId: payment.id,
        orderId: razorpay_order_id,
        amount: payment.amount,
        currency: payment.currency
      });
    } else {
      res.status(400).json({
        error: 'Payment not captured',
        status: payment.status
      });
    }

  } catch (error: any) {
    console.error('❌ Error verifying Razorpay payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// QR Payment Creation (UPI Direct)
router.post('/api/create-qr-payment', async (req, res) => {
  try {
    const { amount, tier } = req.body;
    
    console.log('🏦 Creating UPI QR payment for:', { amount, tier });
    
    // Generate a unique QR payment ID
    const qrPaymentId = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const qrData = {
      paymentId: qrPaymentId,
      amount: amount,
      upiId: 'writorycontest@paytm',
      merchantName: 'Writory Contest',
      qrCodeUrl: `/api/generate-qr/${qrPaymentId}`
    };
    
    console.log('✅ QR payment created:', qrData);
    
    res.json({
      success: true,
      ...qrData
    });

  } catch (error: any) {
    console.error('❌ Error creating QR payment:', error);
    res.status(500).json({ 
      error: 'Failed to create QR payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PAYPAL PAYMENT ROUTES

// Create PayPal Order
router.post('/api/create-paypal-order', async (req, res) => {
  try {
    console.log('💳 PayPal order request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate PayPal initialization
    if (!paypalService) {
      console.error('❌ PayPal not initialized');
      return res.status(500).json({ 
        error: 'PayPal payment system not configured properly',
        details: 'PayPal not initialized'
      });
    }

    const { amount, tier, metadata } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!tier) {
      console.error('❌ Missing tier');
      return res.status(400).json({ error: 'Tier is required' });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const returnUrl = `${baseUrl}/api/paypal-success?tier=${encodeURIComponent(tier)}&amount=${amount}`;
    const cancelUrl = `${baseUrl}/api/paypal-cancel`;

    console.log('📋 Creating PayPal order with data:', { amount, tier, returnUrl, cancelUrl });

    const order = await paypalService.createOrder(amount, tier, returnUrl, cancelUrl);

    console.log('✅ PayPal order created successfully');
    console.log('Order ID:', order.id);

    // Find approval URL
    const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      throw new Error('No approval URL found in PayPal response');
    }

    res.json({
      success: true,
      orderId: order.id,
      approvalUrl: approvalUrl,
      amount: amount,
      tier: tier
    });

  } catch (error: any) {
    console.error('❌ Error creating PayPal order:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to create PayPal order',
      details: process.env.NODE_ENV === 'development' ? error.message : 'PayPal payment system error',
      type: error.type || 'unknown'
    });
  }
});

// PayPal Success Callback
router.get('/api/paypal-success', async (req, res) => {
  try {
    const { token, PayerID, tier, amount } = req.query;

    console.log('✅ PayPal payment success callback:', { token, PayerID, tier, amount });

    if (!token || !PayerID) {
      return res.status(400).json({ error: 'Missing payment parameters' });
    }

    if (!paypalService) {
      return res.status(500).json({ error: 'PayPal service not configured' });
    }

    // Capture the payment
    const captureResult = await paypalService.captureOrder(token as string);
    
    console.log('💰 PayPal payment captured:', captureResult);

    // Redirect back to the frontend with success parameters
    const redirectUrl = `/?payment_success=true&paypal_order_id=${token}&tier=${tier}&amount=${amount}`;
    res.redirect(redirectUrl);

  } catch (error: any) {
    console.error('❌ Error handling PayPal success:', error);
    
    // Redirect back with error
    const redirectUrl = `/?payment_error=true&message=${encodeURIComponent(error.message)}`;
    res.redirect(redirectUrl);
  }
});

// PayPal Cancel Callback
router.get('/api/paypal-cancel', async (req, res) => {
  try {
    console.log('❌ PayPal payment cancelled');
    
    // Redirect back to the frontend with cancel parameters
    const redirectUrl = `/?payment_cancelled=true`;
    res.redirect(redirectUrl);

  } catch (error: any) {
    console.error('❌ Error handling PayPal cancel:', error);
    res.redirect('/');
  }
});

// Verify PayPal Payment
router.post('/api/verify-paypal-payment', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    if (!paypalService) {
      return res.status(500).json({ error: 'PayPal service not configured' });
    }

    console.log('🔍 Verifying PayPal order:', orderId);

    // Verify the order
    const orderDetails = await paypalService.verifyOrder(orderId);

    console.log('📊 PayPal order details:', {
      id: orderDetails.id,
      status: orderDetails.status,
      intent: orderDetails.intent
    });

    if (orderDetails.status === 'COMPLETED') {
      res.json({
        success: true,
        orderId: orderDetails.id,
        status: orderDetails.status,
        amount: orderDetails.purchase_units?.[0]?.amount?.value,
        currency: orderDetails.purchase_units?.[0]?.amount?.currency_code
      });
    } else {
      res.status(400).json({
        error: 'Payment not completed',
        status: orderDetails.status
      });
    }

  } catch (error: any) {
    console.error('❌ Error verifying PayPal payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify PayPal payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POEM SUBMISSION ROUTES

// Submit poem with enhanced error handling
router.post('/api/submit-poem', upload.fields([
  { name: 'poem_file', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 Received poem submission request');
    console.log('Body keys:', Object.keys(req.body));
    console.log('Files received:', Object.keys(req.files || {}));

    // Validate files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files || !files.poem_file || !files.photo) {
      return res.status(400).json({ 
        error: 'Both poem file and photo are required',
        received: {
          poem_file: !!files?.poem_file,
          photo: !!files?.photo
        }
      });
    }

    // Parse and validate the submission data
    const submissionData = {
      ...req.body,
      age: parseInt(req.body.age),
    };

    console.log('📋 Parsed submission data:', {
      name: submissionData.firstName + ' ' + submissionData.lastName,
      email: submissionData.email,
      tier: submissionData.tier,
      payment_status: submissionData.payment_status,
      razorpay_order_id: submissionData.razorpay_order_id,
      razorpay_payment_id: submissionData.razorpay_payment_id
    });

    // For paid tiers, verify payment
    if (submissionData.tier !== 'free' && submissionData.payment_status !== 'free') {
      if (!submissionData.razorpay_order_id && !submissionData.payment_intent_id) {
        return res.status(400).json({ 
          error: 'Payment verification required for paid submissions' 
        });
      }

      // Verify payment with Razorpay
      if (submissionData.razorpay_payment_id && submissionData.razorpay_payment_id !== 'free_submission') {
        try {
          if (!razorpay) {
            throw new Error('Razorpay not initialized');
          }

          const payment = await razorpay.payments.fetch(submissionData.razorpay_payment_id);
          
          if (payment.status !== 'captured') {
            return res.status(400).json({ 
              error: 'Payment not captured',
              payment_status: payment.status 
            });
          }
          
          console.log('✅ Razorpay payment verified for submission');
        } catch (paymentError) {
          console.error('❌ Razorpay verification failed:', paymentError);
          return res.status(400).json({ 
            error: 'Invalid payment verification' 
          });
        }
      } else if (submissionData.payment_intent_id?.startsWith('qr_')) {
        console.log('✅ QR Payment ID received:', submissionData.payment_intent_id);
      }
    }

    // Create user if doesn't exist
    const userEmail = submissionData.email;
    let user = users.find(u => u.email === userEmail);
    
    if (!user) {
      // Create user from submission data
      const newUser = {
        id: users.length + 1,
        uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Generate UID
        email: userEmail,
        name: `${submissionData.firstName} ${submissionData.lastName}`,
        phone: submissionData.phone || null,
        createdAt: new Date().toISOString()
      };
      
      users.push(newUser);
      user = newUser;
      
      console.log('👤 Created new user from submission:', user);
    }

    // Process file uploads to Google Drive
    try {
      const { uploadPoemFile, uploadPhotoFile } = await import('./google-drive');
      
      const poemFileBuffer = files.poem_file[0].buffer || fs.readFileSync(files.poem_file[0].path);
      const photoFileBuffer = files.photo[0].buffer || fs.readFileSync(files.photo[0].path);
      
      const poemFileUrl = await uploadPoemFile(
        poemFileBuffer,
        submissionData.email,
        files.poem_file[0].originalname
      );
      
      const photoFileUrl = await uploadPhotoFile(
        photoFileBuffer,
        submissionData.email,
        files.photo[0].originalname
      );

      // Add to Google Sheets
      const { addPoemSubmissionToSheet } = await import('./google-sheets');
      
      await addPoemSubmissionToSheet({
        name: `${submissionData.firstName} ${submissionData.lastName}`,
        email: submissionData.email,
        phone: submissionData.phone || '',
        age: submissionData.age.toString(),
        poemTitle: submissionData.poemTitle,
        tier: submissionData.tier,
        amount: getTierAmount(submissionData.tier).toString(),
        poemFile: poemFileUrl,
        photo: photoFileUrl,
        timestamp: new Date().toISOString()
      });

      // Store submission in memory
      const newSubmission = {
        id: submissions.length + 1,
        userUid: user.uid,
        name: `${submissionData.firstName} ${submissionData.lastName}`,
        email: submissionData.email,
        phone: submissionData.phone || '',
        age: submissionData.age,
        poemTitle: submissionData.poemTitle,
        tier: submissionData.tier,
        amount: getTierAmount(submissionData.tier).toString(),
        poemFile: poemFileUrl,
        photo: photoFileUrl,
        timestamp: new Date().toISOString(),
        razorpayOrderId: submissionData.razorpay_order_id || null,
        razorpayPaymentId: submissionData.razorpay_payment_id || null,
        paymentIntentId: submissionData.payment_intent_id || null
      };
      
      submissions.push(newSubmission);
      
      console.log('✅ Submission stored in memory:', newSubmission);

      console.log('✅ Files uploaded and data saved successfully');

      // Clean up uploaded files
      try {
        if (files.poem_file[0].path && fs.existsSync(files.poem_file[0].path)) {
          fs.unlinkSync(files.poem_file[0].path);
        }
        if (files.photo[0].path && fs.existsSync(files.photo[0].path)) {
          fs.unlinkSync(files.photo[0].path);
        }
      } catch (cleanupError) {
        console.warn('⚠️ File cleanup warning:', cleanupError);
      }

      console.log('✅ Poem submission completed successfully');

      res.json({
        success: true,
        message: 'Poem submitted successfully',
        submissionId: newSubmission.id,
        poemFileUrl,
        photoFileUrl,
        timestamp: new Date().toISOString()
      });

    } catch (uploadError) {
      console.error('❌ Error during file upload or data saving:', uploadError);
      throw uploadError;
    }

  } catch (error: any) {
    console.error('❌ Error submitting poem:', error);
    
    // Clean up files on error
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files) {
        Object.values(files).flat().forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
    } catch (cleanupError) {
      console.error('❌ File cleanup error:', cleanupError);
    }

    res.status(500).json({ 
      error: 'Failed to submit poem',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Submission failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function
function getTierAmount(tier: string): number {
  const amounts = {
    'free': 0,
    'single': 50,
    'double': 100,
    'bulk': 480
  };
  return amounts[tier as keyof typeof amounts] || 0;
}

// Contact submission route
router.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const { addContactToSheet } = await import('./google-sheets');
    
    await addContactToSheet({
      name,
      email,
      phone: phone || '',
      message,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Contact form submitted successfully');

    res.json({
      success: true,
      message: 'Contact form submitted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error submitting contact form:', error);
    res.status(500).json({ 
      error: 'Failed to submit contact form',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Submission failed',
      timestamp: new Date().toISOString()
    });
  }
});

export function registerRoutes(app: any) {
  app.use(router);
}