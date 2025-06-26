import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe with better error handling
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
  process.exit(1);
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

// Initialize Google Auth
const getGoogleAuth = () => {
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set');
    }

    const credentials = JSON.parse(
      Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
    );

    return new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });
  } catch (error) {
    console.error('Error initializing Google Auth:', error);
    throw error;
  }
};

// TEST ROUTES
router.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    cors: 'enabled',
    origin: req.headers.origin
  });
});

// STRIPE CHECKOUT ROUTES - NEW IMPLEMENTATION

// Create Stripe Checkout Session
router.post('/api/create-checkout-session', async (req, res) => {
  try {
    console.log('📥 Checkout session request received:', req.body);
    
    const { amount, tier, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `${req.protocol}://${req.get('host')}`
      : 'http://localhost:5173';

    console.log('🔗 Base URL for redirects:', baseUrl);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Poetry Contest - ${tier}`,
              description: `Submit ${tier === 'single' ? '1' : tier === 'double' ? '2' : '5'} poem(s)`,
            },
            unit_amount: amount * 100, // Convert to paise
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/submit?session_id={CHECKOUT_SESSION_ID}&payment_success=true`,
      cancel_url: `${baseUrl}/submit?payment_cancelled=true`,
      metadata: {
        tier: tier,
        amount: amount.toString(),
        ...metadata
      },
    });

    console.log('✅ Checkout session created:', session.id);

    res.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    console.log('🔍 Verifying checkout session:', sessionId);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('📊 Session status:', {
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency
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

// POEM SUBMISSION ROUTES - Updated to work with Checkout

// Submit poem with enhanced error handling
router.post('/api/submit-poem', upload.fields([
  { name: 'poem_file', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 Received poem submission request');
    console.log('Body keys:', Object.keys(req.body));
    console.log('Files:', req.files);

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

      // Verify payment with Stripe Checkout or Payment Intent
      if (submissionData.session_id) {
        try {
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
      } else if (submissionData.payment_intent_id && !submissionData.payment_intent_id.startsWith('qr_')) {
        // Handle old payment intent verification
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(submissionData.payment_intent_id);
          
          if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
              error: 'Payment not completed',
              status: paymentIntent.status 
            });
          }
          
          console.log('✅ Payment intent verified for submission');
        } catch (paymentError) {
          console.error('❌ Payment intent verification failed:', paymentError);
          return res.status(400).json({ 
            error: 'Invalid payment verification' 
          });
        }
      } else if (submissionData.payment_intent_id?.startsWith('qr_')) {
        console.log('✅ QR Payment ID received:', submissionData.payment_intent_id);
      }
    }

    // Process file uploads to Google Drive
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
      poemFileUrl,
      photoFileUrl,
      timestamp: new Date().toISOString()
    });

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