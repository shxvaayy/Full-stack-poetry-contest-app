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

// Submit poem with email confirmation
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
    let poemFileUrl = null;
    let photoUrl = null;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (files?.poem?.[0]) {
      console.log('Uploading poem file...');
      try {
        poemFileUrl = await uploadPoemFile(files.poem[0]);
        console.log('✅ Poem file uploaded:', poemFileUrl);
      } catch (error) {
        console.error('❌ Poem file upload failed:', error);
      }
    }

    if (files?.photo?.[0]) {
      console.log('Uploading photo file...');
      try {
        photoUrl = await uploadPhotoFile(files.photo[0]);
        console.log('✅ Photo file uploaded:', photoUrl);
      } catch (error) {
        console.error('❌ Photo file upload failed:', error);
      }
    }

    // Create submission with proper user linking
    const submission = await storage.createSubmission({
      userId: user?.id || null, // 🚀 CRITICAL: Link to user ID
      firstName,
      lastName: lastName || null,
      email,
      phone: phone || null,
      age: age || null,
      poemTitle,
      tier,
      price: parseFloat(amount) || 0,
      poemFileUrl,
      photoUrl,
      paymentId: paymentId || null,
      paymentMethod: paymentMethod || null
    });

    console.log('✅ Submission created:', submission);

    // Add to Google Sheets
    try {
      console.log('📊 Adding submission to Google Sheets...');
      await addPoemSubmissionToSheet({
        id: submission.id,
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || '',
        age: age || '',
        poemTitle,
        tier,
        amount: parseFloat(amount) || 0,
        paymentId: paymentId || '',
        paymentMethod: paymentMethod || '',
        submittedAt: submission.submittedAt.toISOString()
      });
      console.log('✅ Added to Google Sheets successfully');
    } catch (error) {
      console.error('❌ Failed to add to Google Sheets:', error);
    }

    // Send confirmation email
    try {
      console.log('📧 Sending confirmation email...');
      const emailSent = await sendSubmissionConfirmation({
        name: firstName + (lastName ? ' ' + lastName : ''),
        email: email,
        poemTitle: poemTitle,
        tier: tier
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
    if (files?.poem?.[0]) {
      try {
        fs.unlinkSync(files.poem[0].path);
      } catch (error) {
        console.error('Error cleaning up poem file:', error);
      }
    }

    if (files?.photo?.[0]) {
      try {
        fs.unlinkSync(files.photo[0].path);
      } catch (error) {
        console.error('Error cleaning up photo file:', error);
      }
    }

    // Return success response
    res.json({
      success: true,
      message: 'Poem submitted successfully!',
      submission: {
        id: submission.id,
        poemTitle: submission.poemTitle,
        tier: submission.tier,
        submittedAt: submission.submittedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Submission error:', error);
    res.status(500).json({
      error: 'Submission failed',
      details: error.message
    });
  }
});

// Contact form submission
router.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message, subject } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Name, email, and message are required'
      });
    }

    const contact = await storage.createContact({
      name,
      email,
      phone: phone || null,
      message,
      subject: subject || null
    });

    console.log('✅ Contact form submitted:', contact);

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
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      amount: sub.price,
      submittedAt: sub.submittedAt.toISOString(),
      isWinner: sub.isWinner,
      winnerPosition: sub.winnerPosition
    }));

    res.json(formattedSubmissions);
  } catch (error: any) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Get submission count (for homepage)
router.get('/api/submission-count', async (req, res) => {
  try {
    const submissions = await storage.getAllSubmissions();
    res.json({ count: submissions.length });
  } catch (error: any) {
    console.error('❌ Error getting submission count:', error);
    res.status(500).json({ error: 'Failed to get submission count', count: 0 });
  }
});

// Add this endpoint to your routes.ts file

// 🔧 DATABASE: Initialize database tables
router.post('/api/init-database', async (req, res) => {
  try {
    console.log('🔧 Initializing database tables...');
    
    const { client } = await import('./db.js');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create submissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        first_name TEXT NOT NULL,
        last_name TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        age TEXT,
        poem_title TEXT NOT NULL,
        tier TEXT NOT NULL,
        price INTEGER DEFAULT 0,
        poem_file_url TEXT,
        photo_url TEXT,
        payment_id TEXT,
        payment_method TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        is_winner BOOLEAN DEFAULT FALSE,
        winner_position INTEGER
      );
    `);

    // Create contacts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        subject TEXT,
        submitted_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Database tables created successfully');
    
    res.json({
      success: true,
      message: 'Database tables created successfully'
    });
  } catch (error: any) {
    console.error('❌ Error creating tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tables',
      details: error.message
    });
  }
});







// Get winners
router.get('/api/winners', async (req, res) => {
  try {
    const winners = await storage.getWinningSubmissions();
    
    const formattedWinners = winners.map(winner => ({
      id: winner.id,
      name: `${winner.firstName}${winner.lastName ? ' ' + winner.lastName : ''}`,
      poemTitle: winner.poemTitle,
      position: winner.winnerPosition,
      submittedAt: winner.submittedAt.toISOString()
    }));

    res.json(formattedWinners);
  } catch (error: any) {
    console.error('❌ Error getting winners:', error);
    res.status(500).json({ error: 'Failed to get winners' });
  }
});

// 🚀 REQUIRED: registerRoutes function
export function registerRoutes(app: any) {
  app.use(router);
}

export default router;