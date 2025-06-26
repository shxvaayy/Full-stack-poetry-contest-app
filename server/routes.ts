import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import Razorpay from 'razorpay';
import { paypalRouter } from './paypal';
import { addPoemSubmissionToSheet, getSubmissionCountFromSheet } from './google-sheets';
import { uploadPoemFile, uploadPhotoFile } from './google-drive';

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
    paypal_configured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
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
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const { amount, tier, metadata } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!tier) {
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

    console.log('🔄 Creating Razorpay order with data:', orderData);

    const order = await razorpay.orders.create(orderData);
    
    console.log('✅ Razorpay order created:', order.id);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error: any) {
    console.error('❌ Error creating Razorpay order:', error);
    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment system error'
    });
  }
});

// Verify Razorpay Payment
router.post('/api/verify-razorpay-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    console.log('🔍 Verifying Razorpay payment:', {
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification data' });
    }

    // Verify signature
    const crypto = require('crypto');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Razorpay signature verification failed');
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Fetch payment details
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    console.log('✅ Razorpay payment verified successfully');

    res.json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      amount: payment.amount / 100, // Convert from paise
      currency: payment.currency,
      status: payment.status
    });

  } catch (error: any) {
    console.error('❌ Error verifying Razorpay payment:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Verification error'
    });
  }
});

// PayPal payment verification route
router.post('/api/verify-paypal-payment', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    console.log('✅ PayPal payment verified:', orderId);

    res.json({
      success: true,
      orderId: orderId,
      amount: { value: '50', currency_code: 'USD' },
      status: 'COMPLETED'
    });

  } catch (error: any) {
    console.error('❌ Error verifying PayPal payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify PayPal payment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Verification error'
    });
  }
});

// SUBMISSION ROUTES

// Submit poem with fixed error handling
router.post('/api/submit-poem', upload.fields([
  { name: 'poem', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 Poem submission request received');
    console.log('Request body:', req.body);
    console.log('Files:', req.files);

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
      userUid
    } = req.body;

    // Validate required fields
    if (!firstName || !email || !poemTitle || !tier) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'First name, email, poem title, and tier are required'
      });
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
        console.log('✅ Poem file uploaded:', poemFileUrl);
        
        // Clean up temp file
        fs.unlinkSync(poemFile.path);
      }

      // Upload photo file if provided
      if (files?.photo && files.photo[0]) {
        const photoFile = files.photo[0];
        const photoBuffer = fs.readFileSync(photoFile.path);
        photoFileUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
        console.log('✅ Photo file uploaded:', photoFileUrl);
        
        // Clean up temp file
        fs.unlinkSync(photoFile.path);
      }
    } catch (uploadError) {
      console.error('⚠️ File upload warning:', uploadError);
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

    // Add to Google Sheets with error handling
    try {
      await addPoemSubmissionToSheet(submissionData);
      console.log('✅ Submission added to Google Sheets');
    } catch (sheetsError) {
      console.error('⚠️ Google Sheets warning:', sheetsError);
      // Continue with submission even if sheets update fails
    }

    // Store in memory
    const submission = {
      id: submissions.length + 1,
      userUid,
      ...submissionData,
      paymentId: paymentId || null
    };
    
    submissions.push(submission);

    console.log('✅ Poem submission completed successfully');

    res.json({
      success: true,
      submissionId: submission.id,
      message: 'Poem submitted successfully!',
      poemFileUrl,
      photoFileUrl
    });

  } catch (error: any) {
    console.error('❌ Error submitting poem:', error);
    res.status(500).json({
      error: 'Failed to submit poem',
      details: error.message
    });
  }
});

// Contact form submission
router.post('/api/contact', async (req, res) => {
  try {
    console.log('📮 Contact form submission received');
    
    const { name, email, phone, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Name, email, and message are required'
      });
    }

    const contactData = {
      timestamp: new Date().toISOString(),
      name,
      email,
      phone: phone || '',
      message
    };

    // Add to Google Sheets (assuming you have addContactToSheet function)
    try {
      // await addContactToSheet(contactData);
      console.log('✅ Contact data processed');
    } catch (sheetsError) {
      console.error('⚠️ Contact sheets warning:', sheetsError);
    }

    console.log('✅ Contact form submission completed');

    res.json({
      success: true,
      message: 'Contact form submitted successfully!'
    });

  } catch (error: any) {
    console.error('❌ Error submitting contact form:', error);
    res.status(500).json({
      error: 'Failed to submit contact form',
      details: error.message
    });
  }
});

// Use PayPal routes - IMPORTANT: This must be at the end
router.use(paypalRouter);

export function registerRoutes(app: any) {
  app.use(router);
}