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

// NEW: Get user submission status with free tier count
router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`📊 Getting submission status for UID: ${uid}`);
    
    const user = await storage.getUserByUid(uid);
    if (!user) {
      console.log(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get actual submissions from database
    const userSubmissions = await storage.getSubmissionsByUser(user.id);
    
    // Count free tier submissions (all-time count, not monthly)
    const freeSubmissionCount = userSubmissions.filter(submission => submission.tier === 'free').length;
    
    const totalSubmissions = userSubmissions.length;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    console.log(`✅ User ${user.email} has ${freeSubmissionCount} free submissions and ${totalSubmissions} total submissions`);
    
    res.json({
      freeSubmissionCount,
      totalSubmissions,
      contestMonth: currentMonth
    });
  } catch (error: any) {
    console.error('❌ Error getting submission status:', error);
    res.status(500).json({ error: 'Failed to get submission status', details: error.message });
  }
});

// Create order for Razorpay
router.post('/api/create-order', async (req, res) => {
  try {
    const { amount, tier } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    console.log(`💳 Creating Razorpay order for ₹${amount} (${tier})`);

    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        tier: tier,
        timestamp: new Date().toISOString()
      }
    };

    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);
    
    res.json({
      orderId: order.id,
      amount: amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error('❌ Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Verify Razorpay payment
router.post('/api/verify-payment', async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    
    console.log('🔍 Verifying Razorpay payment:', { orderId, paymentId });

    // Create signature hash
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === signature) {
      console.log('✅ Razorpay payment verified successfully');
      res.json({ success: true, verified: true });
    } else {
      console.log('❌ Razorpay payment verification failed');
      res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (error: any) {
    console.error('❌ Error verifying Razorpay payment:', error);
    res.status(500).json({ error: 'Payment verification failed', details: error.message });
  }
});

// Webhook handler for Razorpay (optional)
router.post('/api/razorpay-webhook', (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(body)
      .digest('hex');

    if (signature === expectedSignature) {
      console.log('✅ Razorpay webhook verified');
      const event = req.body.event;
      
      if (event === 'payment.captured') {
        console.log('💰 Payment captured:', req.body.payload.payment.entity);
      }
      
      res.json({ status: 'ok' });
    } else {
      console.log('❌ Razorpay webhook verification failed');
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (error: any) {
    console.error('❌ Razorpay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Submit poem
router.post('/api/submit-poem', upload.fields([
  { name: 'poem', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), async (req, res) => {
  console.log('📝 Poem submission started');
  console.log('Body:', req.body);
  console.log('Files:', req.files);

  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      age, 
      poemTitle, 
      tier, 
      amount,
      userUid,
      paymentId, 
      paymentMethod,
      paymentAmount,
      paymentStatus
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Validate required fields
    if (!firstName || !email || !poemTitle || !tier) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { firstName, email, poemTitle, tier }
      });
    }

    if (!files?.poem?.[0]) {
      return res.status(400).json({ error: 'Poem file is required' });
    }

    // Get or create user
    let user;
    if (userUid) {
      user = await storage.getUserByUid(userUid);
      if (!user) {
        console.log(`Creating new user with UID: ${userUid}`);
        user = await storage.createUser({
          uid: userUid,
          email,
          name: firstName + (lastName ? ' ' + lastName : ''),
          phone: phone || null
        });
      }
    } else {
      // Legacy support - find by email
      user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({
          uid: null,
          email,
          name: firstName + (lastName ? ' ' + lastName : ''),
          phone: phone || null
        });
      }
    }

    console.log(`📝 Submitting poem for user: ${user.email} (ID: ${user.id})`);

    // Upload files to Google Drive
    console.log('📁 Uploading files to Google Drive...');
    
    const poemFile = files.poem[0];
    const photoFile = files.photo?.[0];

    const poemDriveLink = await uploadPoemFile(poemFile, poemTitle);
    console.log('✅ Poem uploaded to Drive:', poemDriveLink);

    let photoDriveLink = null;
    if (photoFile) {
      photoDriveLink = await uploadPhotoFile(photoFile, `${firstName}_${lastName || 'photo'}`);
      console.log('✅ Photo uploaded to Drive:', photoDriveLink);
    }

    // Create submission record
    const submissionData = {
      userId: user.id,
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age || '',
      poemTitle,
      tier,
      price: parseFloat(amount) || 0,
      poemFileUrl: poemDriveLink,
      photoUrl: photoDriveLink,
      paymentId: paymentId || null,
      paymentMethod: paymentMethod || null,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
      paymentStatus: paymentStatus || null,
      submittedAt: new Date()
    };

    console.log('💾 Saving submission to database...');
    const submission = await storage.createSubmission(submissionData);
    console.log('✅ Submission saved:', submission.id);

    // Add to Google Sheets
    console.log('📊 Adding to Google Sheets...');
    const sheetData = {
      name: `${firstName}${lastName ? ' ' + lastName : ''}`,
      email,
      phone: phone || '',
      age: age || '',
      poemTitle,
      tier,
      amount: amount || '0',
      poemFile: poemDriveLink,
      photo: photoDriveLink || '',
      timestamp: new Date().toISOString(),
      paymentId: paymentId || '',
      paymentMethod: paymentMethod || '',
      paymentStatus: paymentStatus || ''
    };

    await addPoemSubmissionToSheet(sheetData);
    console.log('✅ Added to Google Sheets');

    // Send confirmation email
    console.log('📧 Sending confirmation email...');
    const emailSent = await sendSubmissionConfirmation({
      name: `${firstName}${lastName ? ' ' + lastName : ''}`,
      email,
      poemTitle,
      tier
    });

    if (emailSent) {
      console.log('✅ Confirmation email sent');
    } else {
      console.log('⚠️ Email sending failed, but submission was successful');
    }

    // Clean up uploaded files
    try {
      fs.unlinkSync(poemFile.path);
      if (photoFile) {
        fs.unlinkSync(photoFile.path);
      }
      console.log('🗑️ Temporary files cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ File cleanup warning:', cleanupError);
    }

    console.log('🎉 Poem submission completed successfully!');
    
    res.json({
      success: true,
      submissionId: submission.id,
      message: 'Poem submitted successfully!',
      emailSent
    });

  } catch (error: any) {
    console.error('❌ Poem submission error:', error);
    
    // Clean up files in case of error
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files?.poem?.[0]) {
        fs.unlinkSync(files.poem[0].path);
      }
      if (files?.photo?.[0]) {
        fs.unlinkSync(files.photo[0].path);
      }
    } catch (cleanupError) {
      console.warn('⚠️ Error cleanup warning:', cleanupError);
    }

    res.status(500).json({
      error: 'Submission failed',
      details: error.message
    });
  }
});

// Contact form submission
router.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    console.log('📞 Contact form submission:', { name, email });
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Add to Google Sheets
    await addContactToSheet({
      name,
      email,
      message,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Contact form added to sheets');
    
    res.json({ success: true, message: 'Contact form submitted successfully!' });
  } catch (error: any) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ error: 'Failed to submit contact form', details: error.message });
  }
});

// Get all submissions (admin endpoint)
router.get('/api/admin/submissions', async (req, res) => {
  try {
    console.log('📊 Getting all submissions for admin...');
    
    const submissions = await storage.getAllSubmissions();
    
    // Format submissions for admin view
    const formattedSubmissions = submissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName}${sub.lastName ? ' ' + sub.lastName : ''}`,
      email: sub.email,
      phone: sub.phone,
      age: sub.age,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      amount: sub.price,
      poemFileUrl: sub.poemFileUrl,
      photoUrl: sub.photoUrl,
      paymentId: sub.paymentId,
      paymentMethod: sub.paymentMethod,
      submittedAt: sub.submittedAt.toISOString(),
      isWinner: sub.isWinner,
      winnerPosition: sub.winnerPosition
    }));
    
    console.log(`✅ Returning ${formattedSubmissions.length} submissions`);
    res.json(formattedSubmissions);
  } catch (error: any) {
    console.error('❌ Error getting submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions', details: error.message });
  }
});

// Update submission (admin endpoint)
router.put('/api/admin/submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`✏️ Updating submission ${id}:`, updates);
    
    const submission = await storage.updateSubmission(parseInt(id), updates);
    
    console.log(`✅ Updated submission ${id}`);
    res.json(submission);
  } catch (error: any) {
    console.error('❌ Error updating submission:', error);
    res.status(500).json({ error: 'Failed to update submission', details: error.message });
  }
});

// Delete submission (admin endpoint)
router.delete('/api/admin/submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting submission ${id}`);
    
    await storage.deleteSubmission(parseInt(id));
    
    console.log(`✅ Deleted submission ${id}`);
    res.json({ success: true, message: 'Submission deleted successfully' });
  } catch (error: any) {
    console.error('❌ Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission', details: error.message });
  }
});

// Get submission statistics
router.get('/api/stats', async (req, res) => {
  try {
    console.log('📈 Getting submission statistics...');
    
    const submissions = await storage.getAllSubmissions();
    
    const stats = {
      totalSubmissions: submissions.length,
      tierBreakdown: {
        free: submissions.filter(s => s.tier === 'free').length,
        single: submissions.filter(s => s.tier === 'single').length,
        double: submissions.filter(s => s.tier === 'double').length,
        bulk: submissions.filter(s => s.tier === 'bulk').length
      },
      totalRevenue: submissions
        .filter(s => s.tier !== 'free')
        .reduce((sum, s) => sum + (s.price || 0), 0),
      submissionsByDate: submissions.reduce((acc: any, s) => {
        const date = s.submittedAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}),
      winners: submissions.filter(s => s.isWinner).length
    };
    
    console.log('✅ Statistics generated');
    res.json(stats);
  } catch (error: any) {
    console.error('❌ Error getting statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics', details: error.message });
  }
});

export default router;