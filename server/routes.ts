import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { uploadPoemFile, uploadPhotoFile } from "./google-drive.js";
import { addPoemSubmissionToSheet } from "./google-sheets.js";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'poem') {
      const allowedTypes = ['.pdf', '.doc', '.docx'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, DOC, and DOCX files are allowed for poems'));
      }
    } else if (file.fieldname === 'photo') {
      const allowedTypes = ['.jpg', '.jpeg', '.png'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG, JPEG, and PNG files are allowed for photos'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

// In-memory storage for submissions
const submissions: any[] = [];

// PayPal configuration test endpoint
router.get('/api/test-paypal', async (req, res) => {
  try {
    console.log('🔧 Testing PayPal Configuration...');
    
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

// Submit poem with improved error handling
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
      console.error('❌ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'First name, email, poem title, and tier are required'
      });
    }

    // Verify payment for paid tiers
    if (tier !== 'free' && amount && parseFloat(amount) > 0) {
      console.log('💰 Verifying payment for paid tier...');
      
      if (!paymentId || !paymentMethod) {
        console.error('❌ Missing payment information for paid tier');
        return res.status(400).json({
          error: 'Payment verification required',
          details: 'Payment information is missing for paid tier'
        });
      }

      // Verify Razorpay payment if needed
      if (paymentMethod === 'razorpay' && razorpay_order_id && razorpay_signature) {
        try {
          const body = razorpay_order_id + '|' + paymentId;
          const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
            .update(body.toString())
            .digest('hex');

          if (expectedSignature !== razorpay_signature) {
            console.error('❌ Razorpay signature verification failed');
            return res.status(400).json({
              error: 'Payment verification failed',
              details: 'Invalid payment signature'
            });
          }
          
          console.log('✅ Razorpay payment verified');
        } catch (verifyError) {
          console.error('❌ Payment verification error:', verifyError);
          return res.status(400).json({
            error: 'Payment verification failed',
            details: 'Unable to verify payment'
          });
        }
      }
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
        try { fs.unlinkSync(poemFile.path); } catch {}
      }

      // Upload photo file if provided
      if (files?.photo && files.photo[0]) {
        const photoFile = files.photo[0];
        const photoBuffer = fs.readFileSync(photoFile.path);
        photoFileUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
        console.log('✅ Photo file uploaded:', photoFileUrl);
        
        // Clean up temp file
        try { fs.unlinkSync(photoFile.path); } catch {}
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
      paymentId: paymentId || null,
      paymentMethod: paymentMethod || null
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

// Razorpay order creation
router.post('/api/create-razorpay-order', async (req, res) => {
  try {
    console.log('💳 Creating Razorpay order...');
    
    const { amount, tier, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        tier,
        ...metadata
      }
    };

    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error: any) {
    console.error('❌ Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Get all submissions (admin endpoint)
router.get('/api/submissions', (req, res) => {
  res.json({
    submissions: submissions,
    total: submissions.length
  });
});

// Get user submission status
router.get('/api/users/:uid/submission-status', (req, res) => {
  const { uid } = req.params;
  
  const userSubmissions = submissions.filter(sub => sub.userUid === uid);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthSubmissions = userSubmissions.filter(sub => {
    const subDate = new Date(sub.timestamp);
    return subDate.getMonth() === currentMonth && subDate.getFullYear() === currentYear;
  });
  
  const freeSubmissionUsed = thisMonthSubmissions.some(sub => sub.tier === 'free');
  
  res.json({
    totalSubmissions: userSubmissions.length,
    thisMonthSubmissions: thisMonthSubmissions.length,
    freeSubmissionUsed,
    submissions: thisMonthSubmissions
  });
});

export { router };