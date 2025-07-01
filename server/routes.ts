import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { uploadPoemFile, uploadPhotoFile, uploadMultiplePoemFiles } from './google-drive.js';
import { addPoemSubmissionToSheet, addMultiplePoemsToSheet, getSubmissionCountFromSheet, addContactToSheet } from './google-sheets.js';
import { paypalRouter } from './paypal.js';
import { storage } from './storage.js';
import { sendSubmissionConfirmation, sendMultiplePoemsConfirmation } from './mailSender.js';
import { validateTierPoemCount, TIER_POEM_COUNTS, TIER_PRICES } from './schema.js';

const router = Router();

// Configure multer for multiple file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10 // Maximum 10 files (5 poems + 1 photo + extras)
  }
});

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
      status: sub.status,
      score: sub.score,
      isWinner: sub.isWinner,
      submissionUuid: sub.submissionUuid,
      poemIndex: sub.poemIndex,
      totalPoemsInSubmission: sub.totalPoemsInSubmission
    }));

    console.log(`✅ Found ${submissions.length} submissions for user ${user.email}`);
    res.json(formattedSubmissions);
  } catch (error: any) {
    console.error('❌ Error getting user submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

// Check user submission status
router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`🔍 Checking submission status for UID: ${uid}`);

    const user = await storage.getUserByUid(uid);
    if (!user) {
      console.log(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const submissions = await storage.getSubmissionsByUser(user.id);
    const hasSubmitted = submissions.length > 0;

    console.log(`✅ User ${user.email} submission status: ${hasSubmitted ? 'Has submitted' : 'No submissions'}`);
    res.json({ 
      hasSubmitted,
      submissionCount: submissions.length,
      submissions: submissions.map(sub => ({
        id: sub.id,
        poemTitle: sub.poemTitle,
        tier: sub.tier,
        submittedAt: sub.submittedAt,
        submissionUuid: sub.submissionUuid,
        poemIndex: sub.poemIndex
      }))
    });
  } catch (error: any) {
    console.error('❌ Error checking submission status:', error);
    res.status(500).json({ error: 'Failed to check submission status', details: error.message });
  }
});

// ✅ UPDATED: Main poem submission endpoint with multi-poem support
router.post('/api/submit-poem', upload.fields([
  { name: 'poems', maxCount: 5 }, // Multiple poem files
  { name: 'photo', maxCount: 1 }   // Single photo file
]), async (req, res) => {
  try {
    console.log('🚀 POEM SUBMISSION STARTED');
    console.log('📝 Request body keys:', Object.keys(req.body));
    console.log('📁 Files received:', {
      poems: req.files?.['poems']?.length || 0,
      photo: req.files?.['photo']?.length || 0
    });

    // Parse form data
    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      poemTitle, // First poem title
      tier,
      userUid,
      paymentData,
      multiplePoemTitles // JSON string of all poem titles
    } = req.body;

    console.log('📋 Form data received:', {
      firstName,
      email,
      tier,
      userUid,
      poemTitle,
      hasPaymentData: !!paymentData,
      multiplePoemTitles: multiplePoemTitles ? 'Present' : 'Not present'
    });

    // Validate required fields
    if (!firstName || !email || !poemTitle || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Parse multiple poem titles
    let allPoemTitles: string[] = [];
    try {
      if (multiplePoemTitles) {
        allPoemTitles = JSON.parse(multiplePoemTitles);
      } else {
        allPoemTitles = [poemTitle];
      }
    } catch (error) {
      console.error('❌ Error parsing poem titles:', error);
      allPoemTitles = [poemTitle];
    }

    console.log('📝 All poem titles:', allPoemTitles);

    // Validate tier and poem count
    const expectedPoemCount = TIER_POEM_COUNTS[tier as keyof typeof TIER_POEM_COUNTS] || 1;
    const poemFiles = req.files?.['poems'] as Express.Multer.File[] || [];
    const photoFiles = req.files?.['photo'] as Express.Multer.File[] || [];

    console.log('🔍 Validation check:', {
      expectedPoemCount,
      actualPoemFiles: poemFiles.length,
      actualPoemTitles: allPoemTitles.length,
      photoFiles: photoFiles.length
    });

    // Validate poem files
    if (poemFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No poem files uploaded'
      });
    }

    // Validate poem count matches
    if (poemFiles.length !== expectedPoemCount) {
      return res.status(400).json({
        success: false,
        error: `Expected ${expectedPoemCount} poem files for ${tier} tier, got ${poemFiles.length}`
      });
    }

    // Validate photo file
    if (photoFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No photo file uploaded'
      });
    }

    // Generate submission UUID for grouping
    const submissionUuid = crypto.randomUUID();
    console.log('🆔 Generated submission UUID:', submissionUuid);

    // Process payment data
    let processedPaymentData = null;
    if (paymentData) {
      try {
        processedPaymentData = JSON.parse(paymentData);
        console.log('💳 Payment data processed:', {
          method: processedPaymentData.payment_method,
          amount: processedPaymentData.amount
        });
      } catch (error) {
        console.error('❌ Error parsing payment data:', error);
      }
    }

    // Find or create user
    let user = null;
    if (userUid) {
      user = await storage.getUserByUid(userUid);
      if (!user) {
        user = await storage.createUser({
          uid: userUid,
          email,
          name: `${firstName} ${lastName || ''}`.trim(),
          phone: phone || null
        });
      }
    }

    console.log('👤 User processed:', user ? `${user.email} (ID: ${user.id})` : 'Anonymous submission');

    // Upload photo file
    console.log('📸 Uploading photo file...');
    const photoFile = photoFiles[0];
    const photoBuffer = fs.readFileSync(photoFile.path);
    const photoUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
    console.log('✅ Photo uploaded:', photoUrl);

    // Upload poem files and prepare data
    console.log(`📚 Uploading ${poemFiles.length} poem files...`);
    const poemBuffers = poemFiles.map(file => fs.readFileSync(file.path));
    const originalFileNames = poemFiles.map(file => file.originalname);
    
    // Upload multiple poem files with proper naming
    const poemUrls = await uploadMultiplePoemFiles(
      poemBuffers,
      email,
      originalFileNames,
      allPoemTitles
    );

    console.log('✅ All poem files uploaded:', poemUrls);

    // Prepare submissions data for database
    const submissions = [];
    const baseSubmissionData = {
      userId: user?.id,
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age || '',
      tier,
      price: TIER_PRICES[tier as keyof typeof TIER_PRICES] || 0,
      photoUrl,
      paymentId: processedPaymentData?.razorpay_payment_id || processedPaymentData?.paypal_order_id || null,
      paymentMethod: processedPaymentData?.payment_method || null,
      submissionUuid,
      totalPoemsInSubmission: poemFiles.length
    };

    // Create individual submissions for each poem
    for (let i = 0; i < poemFiles.length; i++) {
      const submission = await storage.createSubmission({
        ...baseSubmissionData,
        poemTitle: allPoemTitles[i] || `Poem ${i + 1}`,
        poemFileUrl: poemUrls[i],
        poemIndex: i
      });
      
      submissions.push(submission);
      console.log(`✅ Created submission ${i + 1}/${poemFiles.length}: "${submission.poemTitle}" (ID: ${submission.id})`);
    }

    // Add to Google Sheets (multiple rows)
    console.log('📊 Adding to Google Sheets...');
    const sheetsData = {
      name: `${firstName} ${lastName || ''}`.trim(),
      email,
      phone: phone || '',
      age: age || '',
      tier,
      amount: baseSubmissionData.price.toString(),
      photo: photoUrl,
      timestamp: new Date().toISOString(),
      submissionUuid,
      poems: allPoemTitles.map((title, index) => ({
        title,
        fileUrl: poemUrls[index],
        index
      }))
    };

    await addMultiplePoemsToSheet(sheetsData);
    console.log('✅ Added to Google Sheets');

    // Send confirmation email
    console.log('📧 Sending confirmation email...');
    const emailSent = await sendMultiplePoemsConfirmation({
      name: `${firstName} ${lastName || ''}`.trim(),
      email,
      tier,
      poems: allPoemTitles.map((title, index) => ({ title, index }))
    });

    if (emailSent) {
      console.log('✅ Confirmation email sent');
    } else {
      console.log('⚠️ Confirmation email failed to send');
    }

    // Clean up uploaded files
    console.log('🧹 Cleaning up temporary files...');
    [...poemFiles, ...photoFiles].forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.warn('⚠️ Failed to delete temp file:', file.path);
      }
    });

    // Update submission count
    try {
      const submissionCount = await getSubmissionCountFromSheet();
      console.log(`📊 Updated submission count: ${submissionCount}`);
    } catch (error) {
      console.warn('⚠️ Failed to get updated submission count:', error);
    }

    console.log('🎉 POEM SUBMISSION COMPLETED SUCCESSFULLY');
    res.json({
      success: true,
      message: `Successfully submitted ${poemFiles.length} poem${poemFiles.length > 1 ? 's' : ''}`,
      submissions: submissions.map(sub => ({
        id: sub.id,
        poemTitle: sub.poemTitle,
        tier: sub.tier,
        submissionUuid: sub.submissionUuid,
        poemIndex: sub.poemIndex
      })),
      submissionUuid,
      emailSent
    });

  } catch (error: any) {
    console.error('❌ POEM SUBMISSION ERROR:', error);
    
    // Clean up files on error
    if (req.files) {
      const allFiles = [
        ...(req.files['poems'] || []),
        ...(req.files['photo'] || [])
      ];
      
      allFiles.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup file:', file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Submission failed',
      details: error.message
    });
  }
});

// Contact form endpoint
router.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message, subject } = req.body;
    console.log('📧 Contact form submission:', { name, email, subject: subject || 'No subject' });

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create contact in database
    const contact = await storage.createContact({
      name,
      email,
      phone: phone || null,
      message,
      subject: subject || null
    });

    // Add to Google Sheets
    const contactData = {
      name,
      email,
      phone: phone || '',
      message,
      timestamp: new Date().toISOString()
    };

    await addContactToSheet(contactData);

    console.log('✅ Contact form processed successfully');
    res.json({
      success: true,
      message: 'Contact form submitted successfully'
    });

  } catch (error: any) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form',
      details: error.message
    });
  }
});

// Get all submissions (admin)
router.get('/api/submissions', async (req, res) => {
  try {
    console.log('📊 Getting all submissions...');
    const allSubmissions = await storage.getAllSubmissions();

    // Format for frontend
    const formattedSubmissions = allSubmissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName || ''}`.trim(),
      email: sub.email,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      amount: sub.price,
      submittedAt: sub.submittedAt,
      status: sub.status,
      score: sub.score,
      isWinner: sub.isWinner,
      submissionUuid: sub.submissionUuid,
      poemIndex: sub.poemIndex,
      totalPoemsInSubmission: sub.totalPoemsInSubmission
    }));

    console.log(`✅ Retrieved ${allSubmissions.length} submissions`);
    res.json(formattedSubmissions);
  } catch (error: any) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

// Get winning submissions
router.get('/api/winners', async (req, res) => {
  try {
    console.log('🏆 Getting winning submissions...');
    const winners = await storage.getWinningSubmissions();

    const formattedWinners = winners.map(sub => ({
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName || ''}`.trim(),
      email: sub.email,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      score: sub.score,
      winnerPosition: sub.winnerPosition,
      submittedAt: sub.submittedAt,
      submissionUuid: sub.submissionUuid
    }));

    console.log(`✅ Retrieved ${winners.length} winners`);
    res.json(formattedWinners);
  } catch (error: any) {
    console.error('❌ Error getting winners:', error);
    res.status(500).json({ error: 'Failed to get winners', details: error.message });
  }
});

// Create Razorpay order
router.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    console.log('💳 Creating Razorpay order:', { amount, currency, receipt });

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    });

    console.log('✅ Razorpay order created:', order.id);
    res.json(order);
  } catch (error: any) {
    console.error('❌ Razorpay order creation failed:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Verify Razorpay payment
router.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    console.log('🔍 Verifying Razorpay payment:', { razorpay_order_id, razorpay_payment_id });

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      console.log('✅ Payment verification successful');
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      console.log('❌ Payment verification failed');
      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error: any) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed', details: error.message });
  }
});

// Export router
export default router;