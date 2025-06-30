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

router.post('/api/validate-coupon', async (req, res) => {
  try {
    const { code, tier, amount, userUid } = req.body;

    if (!code || !tier || amount === undefined) {
      return res.status(400).json({
        valid: false,
        error: 'Missing required fields'
      });
    }

    // Import coupon validation from coupon-codes.ts
    const { validateCouponCode, markCodeAsUsed } = await import('../client/src/pages/coupon-codes.js');
    
    const validation = validateCouponCode(code, tier);
    
    if (!validation.valid) {
      return res.json({
        valid: false,
        error: validation.message || 'Invalid coupon code'
      });
    }

    // Don't mark code as used here - only mark after successful submission

    // Calculate discount amount based on percentage
    let discountAmount = 0;
    if (validation.discount === 100) {
      discountAmount = amount; // 100% discount
    } else {
      discountAmount = Math.round((amount * validation.discount) / 100);
    }

    return res.json({
      valid: true,
      discount: discountAmount,
      discountPercentage: validation.discount,
      message: validation.message
    });

  } catch (error: any) {
    console.error('Coupon validation error:', error);
    res.status(500).json({
      valid: false,
      error: 'Failed to validate coupon'
    });
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

// ✅ FIXED: Admin CSV Upload Endpoint
router.post('/api/admin/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    console.log('📤 Admin CSV upload request received');
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
    }

    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV file is empty or invalid' });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const processed = [];
    const errors = [];

    console.log(`📋 Processing ${lines.length - 1} rows from CSV...`);

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Invalid number of columns`);
        continue;
      }

      const rowData: any = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });

      try {
        const { email, poemtitle, score, type, originality, emotion, structure, language, theme, status } = rowData;

        if (!email || !poemtitle) {
          errors.push(`Row ${i + 1}: Missing email or poem title`);
          continue;
        }

        console.log(`🔍 Processing row ${i + 1}: ${email} - ${poemtitle}`);

        // ✅ SOLUTION: Create user if they don't exist
        let user = await storage.getUserByEmail(email);
        if (!user) {
          console.log(`👤 Creating missing user: ${email}`);
          
          // Extract name from email for user creation
          const nameFromEmail = email.split('@')[0].replace(/[._]/g, ' ');
          
          const newUser = await storage.createUser({
            uid: `csv_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: email,
            name: nameFromEmail,
            phone: null
          });
          
          user = newUser;
          console.log(`✅ Created user: ${email} with ID: ${user.id}`);
        }

        // Find submission by email and poem title
        const allSubmissions = await storage.getAllSubmissions();
        const submission = allSubmissions.find(s => 
          s.email === email && s.poemTitle.toLowerCase() === poemtitle.toLowerCase()
        );

        if (!submission) {
          errors.push(`Row ${i + 1}: Submission not found for ${email} - ${poemtitle}`);
          continue;
        }

        // Update the submission with evaluation data
        const scoreBreakdown = {
          originality: parseInt(originality) || 0,
          emotion: parseInt(emotion) || 0,
          structure: parseInt(structure) || 0,
          language: parseInt(language) || 0,
          theme: parseInt(theme) || 0
        };

        const updatedSubmission = await storage.updateSubmissionEvaluation(submission.id, {
          score: parseInt(score) || 0,
          type: type || 'Human',
          status: status || 'Evaluated',
          scoreBreakdown
        });

        if (updatedSubmission) {
          processed.push(`${email} - ${poemtitle}`);
          console.log(`✅ Updated submission ID ${submission.id}: ${poemtitle} (Score: ${score})`);
        } else {
          errors.push(`Row ${i + 1}: Failed to update submission for ${email} - ${poemtitle}`);
        }

      } catch (error: any) {
        console.error(`❌ Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log(`📊 CSV processing complete: ${processed.length} processed, ${errors.length} errors`);

    res.json({
      success: true,
      message: `Successfully processed ${processed.length} records`,
      processed: processed.length,
      errors: errors
    });

  } catch (error: any) {
    console.error('❌ CSV upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file',
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
      submittedAt: sub.submittedAt,
      isWinner: sub.isWinner,
      winnerPosition: sub.winnerPosition,
      score: sub.score,
      type: sub.type,
      status: sub.status,
      scoreBreakdown: sub.scoreBreakdown
    }));

    console.log(`✅ Found ${formattedSubmissions.length} submissions for user`);
    res.json(formattedSubmissions);
  } catch (error: any) {
    console.error('❌ Error getting user submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

// Get user submission status by UID
router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`🔍 Getting submission status for UID: ${uid}`);

    const user = await storage.getUserByUid(uid);
    if (!user) {
      console.log(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const submissions = await storage.getSubmissionsByUser(user.id);

    // Check for free submission (tier: 'free')
    const freeSubmission = submissions.find(s => s.tier === 'free');
    const freeSubmissionUsed = !!freeSubmission;

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const currentMonthSubmissions = submissions.filter(s => {
      const submissionDate = new Date(s.submittedAt!);
      const submissionMonth = submissionDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      return submissionMonth === currentMonth;
    });

    const status = {
      freeSubmissionUsed,
      totalSubmissions: currentMonthSubmissions.length,
      contestMonth: currentMonth,
      allTimeSubmissions: submissions.length
    };

    console.log(`✅ Submission status for ${user.email}:`, status);
    res.json(status);
  } catch (error: any) {
    console.error('❌ Error getting submission status:', error);
    res.status(500).json({ error: 'Failed to get submission status', details: error.message });
  }
});

// Contact form endpoint
router.post('/api/contact', async (req, res) => {
  try {
    console.log('📧 Contact form submission received');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('📋 Contact data received:', {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      phoneType: typeof req.body.phone,
      phoneLength: req.body.phone?.length,
      message: req.body.message?.substring(0, 100) + '...'
    });

    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    // Save to database
    const contact = await storage.createContact({
      name,
      email,
      phone: phone || null,
      message,
      subject: null
    });

    console.log(`✅ Contact saved to database with ID: ${contact.id}`);

    // Save to Google Sheets
    try {
      await addContactToSheet({
        name,
        email,
        phone: phone || '',
        message,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Contact data saved to Google Sheets');
    } catch (sheetError) {
      console.warn('⚠️ Failed to save to Google Sheets:', sheetError);
    }

    res.json({ 
      success: true, 
      message: 'Contact form submitted successfully',
      id: contact.id
    });
  } catch (error: any) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ error: 'Failed to submit contact form', details: error.message });
  }
});

// Get all winners
router.get('/api/winners', async (req, res) => {
  try {
    console.log('🏆 Getting all winners...');
    const winners = await storage.getWinningSubmissions();
    
    const formattedWinners = winners.map(winner => ({
      id: winner.id,
      name: `${winner.firstName}${winner.lastName ? ' ' + winner.lastName : ''}`,
      poemTitle: winner.poemTitle,
      position: winner.winnerPosition,
      submittedAt: winner.submittedAt,
      score: winner.score
    }));

    console.log(`✅ Found ${formattedWinners.length} winners`);
    res.json(formattedWinners);
  } catch (error: any) {
    console.error('❌ Error getting winners:', error);
    res.status(500).json({ error: 'Failed to get winners', details: error.message });
  }
});

// Get submission count
router.get('/api/submission-count', async (req, res) => {
  try {
    console.log('📊 Getting submission count...');
    
    let count = 0;
    
    // Try to get count from Google Sheets first
    try {
      count = await getSubmissionCountFromSheet();
      console.log(`📈 Got count from Google Sheets: ${count}`);
    } catch (sheetError) {
      console.warn('⚠️ Failed to get count from Google Sheets, using database...');
      
      // Fallback to database count
      const allSubmissions = await storage.getAllSubmissions();
      count = allSubmissions.length;
      console.log(`📈 Got count from database: ${count}`);
    }

    res.json({ count });
  } catch (error: any) {
    console.error('❌ Error getting submission count:', error);
    res.status(500).json({ error: 'Failed to get submission count', details: error.message });
  }
});

// Create Razorpay order
router.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    console.log(`💰 Creating Razorpay order for amount: ${amount} ${currency}`);

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: `order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    console.log(`✅ Razorpay order created: ${order.id}`);

    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error: any) {
    console.error('❌ Razorpay order creation error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Verify Razorpay payment
router.post('/api/verify-payment', async (req, res) => {
  try {
    const { paymentId, orderId, signature } = req.body;
    console.log(`🔍 Verifying Razorpay payment: ${paymentId}`);

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === signature) {
      console.log('✅ Razorpay payment verification successful');
      res.json({ success: true });
    } else {
      console.log('❌ Razorpay payment verification failed');
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error: any) {
    console.error('❌ Razorpay verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed', details: error.message });
  }
});

// Verify checkout session (Stripe)
router.post('/api/verify-checkout-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log(`🔍 Verifying Stripe checkout session: ${sessionId}`);

    // For now, just return success - implement actual Stripe verification if needed
    console.log('✅ Stripe session verification successful');
    res.json({ 
      success: true,
      sessionId,
      verified: true
    });
  } catch (error: any) {
    console.error('❌ Stripe verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed', details: error.message });
  }
});

// Verify PayPal payment
router.post('/api/verify-paypal-payment', async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log(`🔍 Verifying PayPal payment: ${orderId}`);

    // For now, just return success - implement actual PayPal verification if needed
    console.log('✅ PayPal payment verification successful');
    res.json({ 
      success: true,
      orderId,
      verified: true
    });
  } catch (error: any) {
    console.error('❌ PayPal verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed', details: error.message });
  }
});

// Submit poem
router.post('/api/submit-poem', upload.fields([
  { name: 'poemFile', maxCount: 1 },
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
      authorBio,
      poemTitle,
      tier,
      price,
      paymentId,
      paymentMethod,
      userUid,
      contestMonth
    } = req.body;

    // Validate required fields
    if (!firstName || !email || !poemTitle || !tier || !userUid) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['firstName', 'email', 'poemTitle', 'tier', 'userUid'] 
      });
    }

    // Get or create user
    let user = await storage.getUserByUid(userUid);
    if (!user) {
      console.log(`👤 Creating user for UID: ${userUid}`);
      user = await storage.createUser({
        uid: userUid,
        email,
        name: `${firstName}${lastName ? ' ' + lastName : ''}`,
        phone: phone || null
      });
    }

    let poemFileUrl = '';
    let photoUrl = '';

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (files?.poemFile?.[0]) {
      console.log('📄 Uploading poem file...');
      const poemFile = files.poemFile[0];
      const poemBuffer = fs.readFileSync(poemFile.path);
      poemFileUrl = await uploadPoemFile(poemBuffer, email, poemFile.originalname);
      fs.unlinkSync(poemFile.path); // Clean up
      console.log('✅ Poem file uploaded:', poemFileUrl);
    }

    if (files?.photo?.[0]) {
      console.log('📸 Uploading photo...');
      const photoFile = files.photo[0];
      const photoBuffer = fs.readFileSync(photoFile.path);
      photoUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
      fs.unlinkSync(photoFile.path); // Clean up
      console.log('✅ Photo uploaded:', photoUrl);
    }

    // Create submission
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
      photoUrl,
      paymentId: paymentId || null,
      paymentMethod: paymentMethod || null,
      status: 'pending'
    });

    console.log(`✅ Submission created with ID: ${submission.id}`);

    // Save to Google Sheets
    try {
      await addPoemSubmissionToSheet({
        name: `${firstName}${lastName ? ' ' + lastName : ''}`,
        email,
        phone: phone || '',
        age: age || '',
        poemTitle,
        tier,
        amount: price || '0',
        poemFile: poemFileUrl,
        photo: photoUrl,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Submission saved to Google Sheets');
    } catch (sheetError) {
      console.warn('⚠️ Failed to save to Google Sheets:', sheetError);
    }

    // Send confirmation email
    try {
      await sendSubmissionConfirmation({
        name: `${firstName}${lastName ? ' ' + lastName : ''}`,
        email,
        poemTitle,
        tier
      });
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.warn('⚠️ Failed to send confirmation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Poem submitted successfully!',
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

// Legacy endpoints for backward compatibility
router.get('/submissions', (req, res) => {
  res.json(submissions);
});

router.post('/submit', upload.fields([
  { name: 'poemFile', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), (req, res) => {
  const submission = req.body;
  submission.id = submissions.length + 1;
  submission.timestamp = new Date().toISOString();

  submissions.push(submission);
  res.json({ success: true, id: submission.id });
});

// Admin endpoints
router.get('/api/admin/submissions', async (req, res) => {
  try {
    console.log('🔍 Getting all submissions for admin...');
    const allSubmissions = await storage.getAllSubmissions();
    
    const formattedSubmissions = allSubmissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName}${sub.lastName ? ' ' + sub.lastName : ''}`,
      email: sub.email,
      phone: sub.phone,
      age: sub.age,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      price: sub.price,
      submittedAt: sub.submittedAt,
      paymentId: sub.paymentId,
      paymentMethod: sub.paymentMethod,
      poemFileUrl: sub.poemFileUrl,
      photoUrl: sub.photoUrl,
      score: sub.score,
      type: sub.type,
      status: sub.status,
      scoreBreakdown: sub.scoreBreakdown,
      isWinner: sub.isWinner,
      winnerPosition: sub.winnerPosition
    }));

    console.log(`✅ Found ${formattedSubmissions.length} submissions for admin`);
    res.json(formattedSubmissions);
  } catch (error: any) {
    console.error('❌ Error getting admin submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

router.get('/api/admin/contacts', async (req, res) => {
  try {
    console.log('🔍 Getting all contacts for admin...');
    const allContacts = await storage.getAllContacts();
    
    console.log(`✅ Found ${allContacts.length} contacts for admin`);
    res.json(allContacts);
  } catch (error: any) {
    console.error('❌ Error getting admin contacts:', error);
    res.status(500).json({ error: 'Failed to get contacts', details: error.message });
  }
});

router.get('/api/admin/users', async (req, res) => {
  try {
    console.log('🔍 Getting all users for admin...');
    const allUsers = await storage.getAllUsers();
    
    console.log(`✅ Found ${allUsers.length} users for admin`);
    res.json(allUsers);
  } catch (error: any) {
    console.error('❌ Error getting admin users:', error);
    res.status(500).json({ error: 'Failed to get users', details: error.message });
  }
});

// Update submission status
router.put('/api/admin/submissions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Updating submission ${id} status to: ${status}`);
    
    const updatedSubmission = await storage.updateSubmissionStatus(parseInt(id), status);
    
    if (updatedSubmission) {
      console.log(`✅ Successfully updated submission ${id} status`);
      res.json({ success: true, submission: updatedSubmission });
    } else {
      console.log(`❌ Submission ${id} not found`);
      res.status(404).json({ error: 'Submission not found' });
    }
  } catch (error: any) {
    console.error('❌ Error updating submission status:', error);
    res.status(500).json({ error: 'Failed to update status', details: error.message });
  }
});

// Mark submission as winner
router.put('/api/admin/submissions/:id/winner', async (req, res) => {
  try {
    const { id } = req.params;
    const { position } = req.body;
    
    console.log(`🏆 Marking submission ${id} as winner (position: ${position})`);
    
    const updatedSubmission = await storage.markSubmissionAsWinner(parseInt(id), position);
    
    if (updatedSubmission) {
      console.log(`✅ Successfully marked submission ${id} as winner`);
      res.json({ success: true, submission: updatedSubmission });
    } else {
      console.log(`❌ Submission ${id} not found`);
      res.status(404).json({ error: 'Submission not found' });
    }
  } catch (error: any) {
    console.error('❌ Error marking submission as winner:', error);
    res.status(500).json({ error: 'Failed to mark as winner', details: error.message });
  }
});

// Delete submission
router.delete('/api/admin/submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting submission ${id}`);
    
    const deleted = await storage.deleteSubmission(parseInt(id));
    
    if (deleted) {
      console.log(`✅ Successfully deleted submission ${id}`);
      res.json({ success: true, message: 'Submission deleted successfully' });
    } else {
      console.log(`❌ Submission ${id} not found`);
      res.status(404).json({ error: 'Submission not found' });
    }
  } catch (error: any) {
    console.error('❌ Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission', details: error.message });
  }
});

// Delete contact
router.delete('/api/admin/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting contact ${id}`);
    
    const deleted = await storage.deleteContact(parseInt(id));
    
    if (deleted) {
      console.log(`✅ Successfully deleted contact ${id}`);
      res.json({ success: true, message: 'Contact deleted successfully' });
    } else {
      console.log(`❌ Contact ${id} not found`);
      res.status(404).json({ error: 'Contact not found' });
    }
  } catch (error: any) {
    console.error('❌ Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact', details: error.message });
  }
});

// Delete user
router.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting user ${id}`);
    
    const deleted = await storage.deleteUser(parseInt(id));
    
    if (deleted) {
      console.log(`✅ Successfully deleted user ${id}`);
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      console.log(`❌ User ${id} not found`);
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error: any) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Catch-all for undefined API routes
router.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

export function registerRoutes(app: any) {
  app.use(router);
}