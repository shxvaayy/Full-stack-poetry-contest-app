import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

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
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'));
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

// STRIPE PAYMENT ROUTES

// Create payment intent
router.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'inr' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    console.log('Creating payment intent for amount:', amount, 'currency:', currency);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        integration_check: 'accept_a_payment',
      },
    });

    console.log('Payment intent created successfully:', paymentIntent.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe error creating payment intent:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify payment
router.post('/api/verify-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    console.log('Verifying payment for intent:', paymentIntentId);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      console.log('Payment verified successfully');
      res.json({ 
        success: true, 
        amount: paymentIntent.amount,
        currency: paymentIntent.currency 
      });
    } else {
      console.log('Payment not completed, status:', paymentIntent.status);
      res.status(400).json({ 
        error: 'Payment not completed',
        status: paymentIntent.status 
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POEM SUBMISSION ROUTES

// Submit poem
router.post('/api/submit-poem', upload.single('poem_file'), async (req, res) => {
  try {
    console.log('Received poem submission request');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    // Parse and validate the submission data
    const submissionData = {
      ...req.body,
      age: parseInt(req.body.age),
    };

    const validatedData = PoemSubmissionSchema.parse(submissionData);
    console.log('Validated data:', validatedData);

    // For paid tiers, verify payment
    if (validatedData.tier !== 'free') {
      if (!validatedData.payment_intent_id) {
        return res.status(400).json({ 
          error: 'Payment verification required for paid submissions' 
        });
      }

      // Verify payment with Stripe
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(validatedData.payment_intent_id);
        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({ 
            error: 'Payment not completed',
            status: paymentIntent.status 
          });
        }
        validatedData.payment_status = 'completed';
      } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(400).json({ error: 'Payment verification failed' });
      }
    } else {
      validatedData.payment_status = 'free';
    }

    // Initialize Google services
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    let fileUrl = null;
    
    // Upload file to Google Drive if provided
    if (req.file) {
      console.log('Uploading file to Google Drive...');
      
      const fileMetadata = {
        name: `${validatedData.name}_${validatedData.poem_title}_${Date.now()}${path.extname(req.file.originalname)}`,
        parents: [process.env.DRIVE_FOLDER_ID!]
      };

      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path)
      };

      const driveResponse = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      // Make file publicly readable
      await drive.permissions.create({
        fileId: driveResponse.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      fileUrl = `https://drive.google.com/file/d/${driveResponse.data.id}/view`;
      
      // Clean up local file
      fs.unlinkSync(req.file.path);
      
      console.log('File uploaded successfully:', fileUrl);
    }

    // Prepare data for Google Sheets
    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp,
      validatedData.name,
      validatedData.email,
      validatedData.phone,
      validatedData.age,
      validatedData.category,
      validatedData.tier,
      validatedData.poem_title,
      validatedData.poem_content,
      fileUrl || 'No file',
      validatedData.payment_status,
      validatedData.payment_intent_id || 'N/A'
    ];

    // Add to Google Sheets
    console.log('Adding submission to Google Sheets...');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Sheet1!A:L',
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData]
      }
    });

    console.log('Submission added to Google Sheets successfully');

    res.json({
      success: true,
      message: 'Poem submitted successfully!',
      submissionId: timestamp,
      fileUrl
    });

  } catch (error) {
    console.error('Error in poem submission:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to submit poem',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get submission statistics
router.get('/api/stats', async (req, res) => {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Sheet1!A:L'
    });

    const rows = response.data.values || [];
    const submissions = rows.slice(1); // Skip header row

    const stats = {
      total: submissions.length,
      byCategory: {},
      byTier: {},
      byPaymentStatus: {}
    };

    submissions.forEach(row => {
      const category = row[5];
      const tier = row[6];
      const paymentStatus = row[10];

      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;
      stats.byPaymentStatus[paymentStatus] = (stats.byPaymentStatus[paymentStatus] || 0) + 1;
    });

    res.json(stats);

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check
router.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    google: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  });
});

export default router;

export const registerRoutes = (app: any) => {
  app.use(router);
};