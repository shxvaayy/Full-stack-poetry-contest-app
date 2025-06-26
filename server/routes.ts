import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import Stripe from 'stripe';

const router = Router();

// In-memory storage for users and submissions (replace with database in production)
let users: any[] = [];
let submissions: any[] = [];

// Initialize Stripe
let stripe: Stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
  console.log('✅ Stripe initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error);
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
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    google_configured: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    users_count: users.length,
    submissions_count: submissions.length
  });
});

// STRIPE CHECKOUT ROUTES

// Create Stripe Checkout Session
router.post('/api/create-checkout-session', async (req, res) => {
  try {
    console.log('📥 Checkout session request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate Stripe initialization
    if (!stripe) {
      console.error('❌ Stripe not initialized');
      return res.status(500).json({ 
        error: 'Payment system not configured properly',
        details: 'Stripe not initialized'
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

    // Determine base URL for redirects
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    console.log('🔗 Redirect URLs will use base:', baseUrl);

    const successUrl = `${baseUrl}/submit?session_id={CHECKOUT_SESSION_ID}&payment_success=true`;
    const cancelUrl = `${baseUrl}/submit?payment_cancelled=true`;

    console.log('✅ Success URL:', successUrl);
    console.log('❌ Cancel URL:', cancelUrl);

    // Create checkout session
    const sessionData = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Poetry Contest - ${tier}`,
              description: `Submit ${tier === '1 Poem' ? '1' : tier === '2 Poems' ? '2' : '5'} poem(s)`,
            },
            unit_amount: Math.round(amount * 100), // Convert to paise
          },
          quantity: 1,
        },
      ],
      mode: 'payment' as const,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tier: tier,
        amount: amount.toString(),
        ...(metadata || {})
      },
    };

    console.log('📋 Creating Stripe session with data:', JSON.stringify(sessionData, null, 2));

    const session = await stripe.checkout.sessions.create(sessionData);

    console.log('✅ Checkout session created successfully');
    console.log('Session ID:', session.id);
    console.log('Session URL:', session.url);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment system error',
      type: error.type || 'unknown'
    });
  }
});

// Verify Stripe Checkout Session
router.post('/api/verify-checkout-session', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    console.log('🔍 Verifying checkout session:', sessionId);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('📊 Session details:', {
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata
    });

    if (session.payment_status === 'paid') {
      res.json({
        success: true,
        paymentIntentId: session.payment_intent,
        amount: session.amount_total,
        currency: session.currency,
        metadata: session.metadata
      });
    } else {
      res.status(400).json({
        error: 'Payment not completed',
        payment_status: session.payment_status
      });
    }

  } catch (error: any) {
    console.error('❌ Error verifying checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// QR Payment Creation (Fallback)
router.post('/api/create-qr-payment', async (req, res) => {
  try {
    const { amount, tier } = req.body;
    
    console.log('🏦 Creating QR payment for:', { amount, tier });
    
    // Generate a unique QR payment ID
    const qrPaymentId = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const qrData = {
      paymentId: qrPaymentId,
      amount: amount,
      upiId: 'writorycontest@paytm',
      merchantName: 'Writory Contest',
      qrCodeUrl: '/api/generate-qr/' + qrPaymentId
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
      session_id: submissionData.session_id
    });

    // For paid tiers, verify payment
    if (submissionData.tier !== 'free' && submissionData.payment_status !== 'free') {
      if (!submissionData.session_id && !submissionData.payment_intent_id) {
        return res.status(400).json({ 
          error: 'Payment verification required for paid submissions' 
        });
      }

      // Verify payment with Stripe Checkout
      if (submissionData.session_id && submissionData.session_id !== 'free_submission') {
        try {
          if (!stripe) {
            throw new Error('Stripe not initialized');
          }

          const session = await stripe.checkout.sessions.retrieve(submissionData.session_id);
          
          if (session.payment_status !== 'paid') {
            return res.status(400).json({ 
              error: 'Payment not completed',
              payment_status: session.payment_status 
            });
          }
          
          console.log('✅ Checkout payment verified for submission');
        } catch (paymentError) {
          console.error('❌ Checkout verification failed:', paymentError);
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
        sessionId: submissionData.session_id || null,
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