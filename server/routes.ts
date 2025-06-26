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

// Validation schemas
const PoemSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  age: z.number().min(5).max(100),
  category: z.enum(['5-12', '13-17', '18-25', '26-35', '36-50', '50+']),
  tier: z.enum(['free', 'single', 'double', 'bulk']),
  poem_title: z.string().min(1, 'Poem title is required'),
  poem_content: z.string().min(1, 'Poem content is required'),
  payment_status: z.enum(['pending', 'completed', 'free']).default('pending'),
  payment_intent_id: z.string().optional()
});

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

// Test Stripe connection
router.get('/api/stripe-test', async (req, res) => {
  try {
    // Test Stripe connection by creating a minimal payment intent
    const testIntent = await stripe.paymentIntents.create({
      amount: 100, // ₹1.00 in paise
      currency: 'inr',
      metadata: { test: 'connection' }
    });

    res.json({
      success: true,
      message: 'Stripe connection working',
      testIntentId: testIntent.id,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Stripe test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.type
    });
  }
});

// STRIPE PAYMENT ROUTES - ENHANCED

// Create payment intent - ENHANCED
router.post('/api/create-payment-intent', async (req, res) => {
  try {
    console.log('📥 Payment intent request received:', req.body);
    
    const { amount, currency = 'inr' } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Convert to smallest currency unit (paise for INR)
    const amountInPaise = Math.round(amount * 100);
    
    console.log('💰 Creating payment intent:', {
      amount: amountInPaise,
      currency,
      originalAmount: amount
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        integration_check: 'accept_a_payment',
        original_amount: amount.toString(),
      },
    });

    console.log('✅ Payment intent created:', paymentIntent.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInPaise,
      currency: currency
    });

  } catch (error: any) {
    console.error('❌ Stripe error creating payment intent:', error);
    
    // Enhanced error response
    const errorMessage = error.type === 'StripeCardError' 
      ? error.message 
      : 'Failed to create payment intent';
      
    res.status(500).json({ 
      error: errorMessage,
      type: error.type || 'unknown_error',
      code: error.code || 'unknown_code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify payment - ENHANCED
router.post('/api/verify-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    console.log('🔍 Verifying payment for intent:', paymentIntentId);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log('📊 Payment status:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

    if (paymentIntent.status === 'succeeded') {
      console.log('✅ Payment verified successfully');
      res.json({ 
        success: true, 
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      });
    } else {
      console.log('⚠️ Payment not completed, status:', paymentIntent.status);
      res.status(400).json({ 
        error: 'Payment not completed',
        status: paymentIntent.status,
        requires_action: paymentIntent.status === 'requires_action'
      });
    }
  } catch (error: any) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment verification failed'
    });
  }
});

// POEM SUBMISSION ROUTES - Enhanced with better error handling

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
      payment_status: submissionData.payment_status
    });

    // For paid tiers, verify payment
    if (submissionData.tier !== 'free' && submissionData.payment_status !== 'free') {
      if (!submissionData.payment_intent_id) {
        return res.status(400).json({ 
          error: 'Payment verification required for paid submissions' 
        });
      }

      // Verify payment with Stripe (skip for QR payments)
      if (!submissionData.payment_intent_id.startsWith('qr_')) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(submissionData.payment_intent_id);
          
          if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
              error: 'Payment not completed',
              status: paymentIntent.status 
            });
          }
          
          console.log('✅ Payment verified for submission');
        } catch (paymentError) {
          console.error('❌ Payment verification failed:', paymentError);
          return res.status(400).json({ 
            error: 'Invalid payment verification' 
          });
        }
      } else {
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