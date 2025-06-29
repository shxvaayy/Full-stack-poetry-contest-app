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

// 🚀 NEW: Get user submission status by UID - Check if free entry used this month
router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`📊 Getting submission status for UID: ${uid}`);
    
    const user = await storage.getUserByUid(uid);
    if (!user) {
      console.log(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get all submissions for this user
    const userSubmissions = await storage.getSubmissionsByUser(user.id);
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Filter submissions for current month and check for free entries
    const currentMonthSubmissions = userSubmissions.filter(sub => {
      const subMonth = sub.submittedAt.toISOString().slice(0, 7);
      return subMonth === currentMonth;
    });
    
    const freeSubmissionThisMonth = currentMonthSubmissions.find(sub => sub.tier === 'free');
    
    const submissionStatus = {
      freeSubmissionUsed: !!freeSubmissionThisMonth,
      totalSubmissions: userSubmissions.length,
      currentMonthSubmissions: currentMonthSubmissions.length,
      contestMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
    
    console.log(`✅ Submission status for user ${user.email}:`, submissionStatus);
    res.json(submissionStatus);
    
  } catch (error: any) {
    console.error('❌ Error getting submission status:', error);
    res.status(500).json({ 
      error: 'Failed to get submission status',
      details: error.message 
    });
  }
});

// Submit contact form
router.post('/api/contact', async (req, res) => {
  try {
    console.log('📧 Contact form submission received');
    console.log('Request body:', req.body);
    
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Name, email, and message are required' 
      });
    }

    // Save to database first
    try {
      const contact = await storage.createContact({
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message
      });

      console.log(`✅ Contact saved to database: ${contact.email} (ID: ${contact.id})`);
    } catch (dbError) {
      console.error('❌ Failed to save contact to database:', dbError);
      // Continue with sheets operation even if database fails
    }

    const contactData = {
      name,
      email,
      phone: phone || '',
      message,
      timestamp: new Date().toISOString()
    };

    // Try to add to Google Sheets
    try {
      await addContactToSheet(contactData);
      console.log('✅ Contact added to Google Sheets');
    } catch (sheetsError) {
      console.error('⚠️ Failed to add to Google Sheets (continuing):', sheetsError);
    }

    res.json({ 
      success: true, 
      message: 'Contact form submitted successfully' 
    });

  } catch (error: any) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to submit contact form',
      details: error.message
    });
  }
});

// Submit poem
router.post('/api/submit-poem', upload.fields([
  { name: 'poem', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 Poem submission received');
    console.log('Form data:', req.body);
    console.log('Files:', req.files);

    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      poemTitle,
      tier,
      price,
      paymentCompleted,
      sessionId
    } = req.body;

    // Validate required fields
    if (!firstName || !email || !poemTitle || !tier) {
      return res.status(400).json({ 
        error: 'Missing required fields: firstName, email, poemTitle, tier' 
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const poemFile = files?.poem?.[0];
    const photoFile = files?.photo?.[0];

    if (!poemFile) {
      return res.status(400).json({ error: 'Poem file is required' });
    }

    console.log(`📝 Processing submission for: ${firstName} (${email})`);

    // Get or create user
    let user = await storage.getUserByEmail(email);
    if (!user) {
      console.log(`👤 Creating new user for: ${email}`);
      user = await storage.createUser({
        uid: `email_${email}_${Date.now()}`, // Fallback UID for non-authenticated users
        email,
        name: `${firstName} ${lastName || ''}`.trim(),
        phone: phone || null
      });
    }

    console.log(`👤 Using user: ${user.email} (ID: ${user.id})`);

    // Check if free tier and user already used it this month
    if (tier === 'free') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const userSubmissions = await storage.getSubmissionsByUser(user.id);
      const freeSubmissionThisMonth = userSubmissions.find(sub => {
        const subMonth = sub.submittedAt.toISOString().slice(0, 7);
        return subMonth === currentMonth && sub.tier === 'free';
      });

      if (freeSubmissionThisMonth) {
        return res.status(400).json({ 
          error: 'You have already used your free entry for this month' 
        });
      }
    }

    let poemFileUrl = '';
    let photoUrl = '';

    try {
      // Upload poem file to Google Drive
      console.log('📤 Uploading poem file to Google Drive...');
      const poemBuffer = fs.readFileSync(poemFile.path);
      poemFileUrl = await uploadPoemFile(poemBuffer, email, poemFile.originalname);
      console.log('✅ Poem file uploaded:', poemFileUrl);

      // Upload photo if provided
      if (photoFile) {
        console.log('📤 Uploading photo to Google Drive...');
        const photoBuffer = fs.readFileSync(photoFile.path);
        photoUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
        console.log('✅ Photo uploaded:', photoUrl);
      }
    } catch (uploadError) {
      console.error('❌ File upload failed:', uploadError);
      return res.status(500).json({ 
        error: 'Failed to upload files',
        details: uploadError 
      });
    }

    // Create submission in database
    const submission = await storage.createSubmission({
      userId: user.id,
      firstName,
      lastName: lastName || null,
      email,
      phone: phone || null,
      age: age || null,
      poemTitle,
      tier,
      price: parseInt(price) || 0,
      poemFileUrl,
      photoUrl: photoUrl || null,
      paymentId: sessionId || null,
      paymentMethod: tier === 'free' ? 'free' : 'paid'
    });

    console.log(`✅ Submission saved to database: ${submission.poemTitle} (ID: ${submission.id})`);

    // Try to add to Google Sheets (non-blocking)
    try {
      const sheetData = {
        name: `${firstName} ${lastName || ''}`.trim(),
        email,
        phone: phone || '',
        age: age || '',
        poemTitle,
        tier,
        amount: price || '0',
        poemFile: poemFileUrl,
        photo: photoUrl,
        timestamp: new Date().toISOString()
      };

      await addPoemSubmissionToSheet(sheetData);
      console.log('✅ Submission added to Google Sheets');
    } catch (sheetsError) {
      console.error('⚠️ Failed to add to Google Sheets (non-critical):', sheetsError);
    }

    // Send confirmation email (non-blocking)
    try {
      await sendSubmissionConfirmation({
        name: `${firstName} ${lastName || ''}`.trim(),
        email,
        poemTitle,
        tier
      });
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation email (non-critical):', emailError);
    }

    // Clean up uploaded files
    try {
      fs.unlinkSync(poemFile.path);
      if (photoFile) fs.unlinkSync(photoFile.path);
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up files:', cleanupError);
    }

    res.json({ 
      success: true, 
      message: 'Poem submitted successfully',
      submissionId: submission.id
    });

  } catch (error: any) {
    console.error('❌ Poem submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit poem',
      details: error.message
    });
  }
});

// Get all submissions (admin)
router.get('/api/submissions', async (req, res) => {
  try {
    console.log('📋 Getting all submissions');
    
    const allSubmissions = await storage.getAllSubmissions();
    
    // Format submissions for display
    const formattedSubmissions = allSubmissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName}${sub.lastName ? ' ' + sub.lastName : ''}`,
      email: sub.email,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      amount: sub.price,
      submittedAt: sub.submittedAt.toISOString(),
      isWinner: sub.isWinner,
      winnerPosition: sub.winnerPosition,
      poemFileUrl: sub.poemFileUrl,
      photoUrl: sub.photoUrl
    }));

    console.log(`✅ Returning ${formattedSubmissions.length} submissions`);
    res.json(formattedSubmissions);

  } catch (error: any) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({ 
      error: 'Failed to get submissions',
      details: error.message 
    });
  }
});

// Get public submissions (for leaderboard/display)
router.get('/api/submissions/public', async (req, res) => {
  try {
    console.log('📋 Getting public submissions');
    
    const allSubmissions = await storage.getAllSubmissions();
    
    // Return only safe public data
    const publicSubmissions = allSubmissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName}${sub.lastName ? ' ' + sub.lastName : ''}`,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      submittedAt: sub.submittedAt.toISOString(),
      isWinner: sub.isWinner,
      winnerPosition: sub.winnerPosition
    }));

    console.log(`✅ Returning ${publicSubmissions.length} public submissions`);
    res.json(publicSubmissions);

  } catch (error: any) {
    console.error('❌ Error getting public submissions:', error);
    res.status(500).json({ 
      error: 'Failed to get submissions',
      details: error.message 
    });
  }
});

// Get winning submissions
router.get('/api/winners', async (req, res) => {
  try {
    console.log('🏆 Getting winning submissions');
    
    const winners = await storage.getWinningSubmissions();
    
    // Return public winner data
    const publicWinners = winners.map(winner => ({
      id: winner.id,
      name: `${winner.firstName}${winner.lastName ? ' ' + winner.lastName : ''}`,
      poemTitle: winner.poemTitle,
      tier: winner.tier,
      submittedAt: winner.submittedAt.toISOString(),
      winnerPosition: winner.winnerPosition
    }));

    console.log(`✅ Returning ${publicWinners.length} winners`);
    res.json(publicWinners);

  } catch (error: any) {
    console.error('❌ Error getting winners:', error);
    res.status(500).json({ 
      error: 'Failed to get winners',
      details: error.message 
    });
  }
});

// Create Razorpay order
router.post('/api/create-order', async (req, res) => {
  try {
    const { amount, tier } = req.body;
    
    console.log('💳 Creating Razorpay order:', { amount, tier });

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paisa
      currency: 'INR',
      receipt: `poem_${Date.now()}`,
      notes: {
        tier: tier,
        type: 'poem_submission'
      }
    });

    console.log('✅ Razorpay order created:', order.id);
    res.json({ orderId: order.id, amount: order.amount });

  } catch (error: any) {
    console.error('❌ Razorpay order creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: error.message 
    });
  }
});

// Verify Razorpay payment
router.post('/api/verify-payment', async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    
    console.log('🔍 Verifying Razorpay payment:', { orderId, paymentId });

    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === signature) {
      console.log('✅ Payment verification successful');
      res.json({ verified: true });
    } else {
      console.log('❌ Payment verification failed');
      res.status(400).json({ error: 'Payment verification failed' });
    }

  } catch (error: any) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: error.message 
    });
  }
});

// Get submission count
router.get('/api/submission-count', async (req, res) => {
  try {
    console.log('📊 Getting total submission count');
    
    const allSubmissions = await storage.getAllSubmissions();
    const count = allSubmissions.length;
    
    console.log(`✅ Total submissions: ${count}`);
    res.json({ count });

  } catch (error: any) {
    console.error('❌ Error getting submission count:', error);
    res.status(500).json({ 
      error: 'Failed to get submission count',
      details: error.message 
    });
  }
});

// Stripe checkout session creation
router.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { amount, tier, currency = 'INR' } = req.body;
    console.log('💳 Creating Stripe checkout session:', { amount, tier, currency });

    const stripe = (await import('stripe')).default;
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
    });

    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `Poetry Contest - ${tier} Tier`,
            description: `Submission for ${tier} tier poetry contest`,
          },
          unit_amount: amount * 100, // Convert to cents/paisa
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/submit?session_id={CHECKOUT_SESSION_ID}&payment_success=true`,
      cancel_url: `${req.headers.origin}/submit?payment_cancelled=true`,
      metadata: {
        tier: tier,
        amount: amount.toString(),
      },
    });

    console.log('✅ Stripe session created:', session.id);
    res.json({ 
      success: true, 
      sessionId: session.id, 
      url: session.url 
    });

  } catch (error: any) {
    console.error('❌ Stripe session creation failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
});

// Verify Stripe checkout session
router.post('/api/verify-checkout-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log('🔍 Verifying Stripe session:', sessionId);

    const stripe = (await import('stripe')).default;
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
    });

    const session = await stripeInstance.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      console.log('✅ Stripe payment verified successfully');
      res.json({ 
        verified: true, 
        session: {
          id: session.id,
          amount: session.amount_total,
          currency: session.currency,
          tier: session.metadata?.tier
        }
      });
    } else {
      console.log('❌ Stripe payment not completed');
      res.status(400).json({ error: 'Payment not completed' });
    }

  } catch (error: any) {
    console.error('❌ Stripe verification error:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      details: error.message 
    });
  }
});

// Create PayPal order
router.post('/api/create-paypal-order', async (req, res) => {
  try {
    const { amount, tier, currency = 'INR' } = req.body;
    console.log('💳 Creating PayPal order:', { amount, tier, currency });

    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal credentials not configured');
    }

    // Get access token
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`PayPal token error: ${tokenData.error_description}`);
    }

    // Create order
    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString()
          },
          description: `Poetry Contest - ${tier} Tier`
        }],
        application_context: {
          return_url: `${req.headers.origin}/submit?paypal_order_id=ORDER_ID&payment_success=true`,
          cancel_url: `${req.headers.origin}/submit?payment_cancelled=true`,
          brand_name: 'Writory Poetry Contest',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW'
        }
      })
    });

    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok) {
      throw new Error(`PayPal order error: ${orderData.message}`);
    }

    const approvalUrl = orderData.links.find((link: any) => link.rel === 'approve')?.href;
    
    console.log('✅ PayPal order created:', orderData.id);
    res.json({ 
      success: true, 
      orderId: orderData.id, 
      approvalUrl: approvalUrl?.replace('ORDER_ID', orderData.id)
    });

  } catch (error: any) {
    console.error('❌ PayPal order creation failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create PayPal order',
      details: error.message 
    });
  }
});

// Verify PayPal payment
router.post('/api/verify-paypal-payment', async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log('🔍 Verifying PayPal order:', orderId);

    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal credentials not configured');
    }

    // Get access token
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`PayPal token error: ${tokenData.error_description}`);
    }

    // Capture the order
    const captureResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureResponse.json();
    
    if (captureResponse.ok && captureData.status === 'COMPLETED') {
      console.log('✅ PayPal payment verified successfully');
      res.json({ 
        verified: true, 
        order: {
          id: captureData.id,
          status: captureData.status,
          amount: captureData.purchase_units[0].payments.captures[0].amount
        }
      });
    } else {
      console.log('❌ PayPal payment verification failed');
      res.status(400).json({ error: 'PayPal payment verification failed' });
    }

  } catch (error: any) {
    console.error('❌ PayPal verification error:', error);
    res.status(500).json({ 
      error: 'PayPal verification failed',
      details: error.message 
    });
  }
});

export function registerRoutes(app: any) {
  console.log('🛣️ Registering routes...');
  app.use('/', router);
  console.log('✅ Routes registered successfully');
}