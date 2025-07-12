import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import multer from 'multer';
import { uploadProfilePhotoToCloudinary, uploadPoemFileToCloudinary, uploadPhotoFileToCloudinary } from './cloudinary.js';
import { addPoemSubmissionToSheet, addMultiplePoemsToSheet, getSubmissionCountFromSheet, addContactToSheet } from './google-sheets.js';
import { paypalRouter } from './paypal.js';
import { storage } from './storage.js';
import { sendSubmissionConfirmation, sendMultiplePoemsConfirmation } from './mailSender.js';
import { validateTierPoemCount, TIER_POEM_COUNTS, TIER_PRICES } from './schema.js';
import { client, connectDatabase } from './db.js';
import { initializeAdminSettings, getSetting, updateSetting, getAllSettings, resetFreeTierSubmissions } from './admin-settings.js';
import { initializeAdminUsers, isAdmin } from './admin-auth.js';

const router = Router();

// Configure multer for file uploads - optimized for 2000+ concurrent users
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Reduced to 5MB for better performance
    files: 5, // Maximum 5 files per request
    fieldSize: 1024 * 1024, // 1MB for text fields
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 Multer file filter:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    
    // Allow only PDF and image files
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype.startsWith('image/') ||
      ['pdf', 'jpg', 'jpeg', 'png'].includes(fileExtension || '')
    ) {
      console.log('✅ File accepted:', file.originalname);
      cb(null, true);
    }
    // Allow CSV files for admin uploads
    else if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      console.log('✅ CSV file accepted:', file.originalname);
      cb(null, true);
    }
    // Reject other file types
    else {
      console.error('❌ File type rejected:', file.mimetype, file.originalname);
      cb(new Error(`File type not allowed: ${file.mimetype}. Please upload only PDF files for poems and JPG/PNG images for photos.`));
    }
  }
});

// MINIMAL FIX: Only set JSON header for API routes
router.use('/api/*', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// CRITICAL FIX: Error handling middleware
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('❌ Async Handler Error:', error);
    res.setHeader('Content-Type', 'application/json');
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error'
      });
    }
  });
};

// Admin authentication middleware
const requireAdmin = asyncHandler(async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const userEmail = req.headers['x-user-email'];

  console.log('🔐 Admin auth check:', { userEmail, authHeader: !!authHeader });

  if (!userEmail) {
    console.log('❌ No user email provided');
    return res.status(401).json({
      success: false,
      error: 'User email required for admin access'
    });
  }

  try {
    // Check hardcoded admin emails first as fallback
    const hardcodedAdmins = [
      'shivaaymehra2@gmail.com',
      'bhavyaseth2005@gmail.com',
      'writorycontest@gmail.com',
      'admin@writory.com'
    ];

    const isHardcodedAdmin = hardcodedAdmins.includes(userEmail as string);
    console.log('🔍 Hardcoded admin check:', { userEmail, isHardcodedAdmin });

    if (isHardcodedAdmin) {
      console.log('✅ Admin access granted (hardcoded) for:', userEmail);
      next();
      return;
    }

    // Check database admin status
    const adminAccess = await isAdmin(userEmail as string);
    console.log('🔍 Database admin access result:', { userEmail, adminAccess });

    if (!adminAccess) {
      console.log('❌ Admin access denied for:', userEmail);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log('✅ Admin access granted (database) for:', userEmail);
    next();
  } catch (error) {
    console.error('❌ Admin auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
});

// Profile picture uploads are now handled by Firebase Storage on the frontend

// SAFER: Wrapper function for upload.any() with better error handling
const safeUploadAny = (req: any, res: any, next: any) => {
  console.log('📁 Processing file upload...');
  upload.any()(req, res, (error) => {
    if (error) {
      console.error('❌ Multer error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    console.log('✅ Multer processing completed');
    console.log('📁 Files processed:', req.files?.length || 0);
    if (req.files) {
      req.files.forEach((file: any) => {
        console.log('📄 File details:', {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });
      });
    }
    next();
  });
};

// Define field configurations
const uploadFields = []; // upload.fields([]);  // Modified as upload is not defined

// Note: Using database storage instead of in-memory for persistence

import { paypalRouter } from './paypal.js';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

console.log('🔧 Razorpay Configuration Check:');
console.log('- Key ID exists:', !!process.env.RAZORPAY_KEY_ID);
console.log('- Key Secret exists:', !!process.env.RAZORPAY_KEY_SECRET);

// Add PayPal routes
router.use('/', paypalRouter);

// Test endpoint
router.get('/api/test', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    paypal_configured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    razorpay_configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    email_configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    cloudinary_configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  });
});

// ===== FILE UPLOAD ENDPOINTS =====

// Test file upload endpoint
router.post('/api/test-cloudinary-upload', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('🧪 Testing Cloudinary upload');

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files uploaded'
    });
  }

  try {
    const file = req.files[0];
    const isImage = file.mimetype.startsWith('image/');
    
    let uploadUrl;
    if (isImage) {
      uploadUrl = await uploadPhotoFileToCloudinary(file.buffer, 'test@example.com', file.originalname);
    } else {
      uploadUrl = await uploadPoemFileToCloudinary(file.buffer, 'test@example.com', file.originalname);
    }

    res.json({
      success: true,
      message: 'File uploaded successfully to Cloudinary',
      url: uploadUrl,
      fileType: isImage ? 'image' : 'document'
    });
  } catch (error) {
    console.error('❌ Cloudinary test upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed: ' + error.message
    });
  }
}));

// ===== ADMIN SETTINGS ENDPOINTS =====

// Get admin settings
router.get('/api/admin/settings', requireAdmin, asyncHandler(async (req: any, res: any) => {
  console.log('🔧 Getting admin settings...');

  try {
    const settings = await getAllSettings();
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {} as Record<string, string>);

    res.json({
      success: true,
      settings: settingsObj
    });
  } catch (error) {
    console.error('❌ Error getting admin settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admin settings'
    });
  }
}));

// Update admin settings
router.post('/api/admin/settings', requireAdmin, asyncHandler(async (req: any, res: any) => {
  console.log('🔧 Updating admin settings...');
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Settings object is required'
    });
  }

  try {
    const results = [];

    for (const [key, value] of Object.entries(settings)) {
      const success = await updateSetting(key, String(value));
      results.push({ key, value, success });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      results
    });
  } catch (error) {
    console.error('❌ Error updating admin settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update admin settings'
    });
  }
}));

// Get free tier status specifically
router.get('/api/free-tier-status', asyncHandler(async (req: any, res: any) => {
  try {
    console.log('🔍 Checking free tier status...');

    // Check if database is connected
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ DATABASE_URL not configured, defaulting free tier to enabled');
      return res.json({
        success: true,
        enabled: true
      });
    }

    // Get fresh setting from database
    const freeTierEnabled = await getSetting('free_tier_enabled');
    const isEnabled = freeTierEnabled === 'true' || freeTierEnabled === null; // Default to true if not set

    console.log('🔍 Free tier status check:', { 
      setting: freeTierEnabled, 
      enabled: isEnabled,
      timestamp: new Date().toISOString()
    });

    // Set no-cache headers to ensure fresh data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      enabled: isEnabled,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting free tier status:', error);
    // When there's a database error, default to enabled for backward compatibility
    res.json({
      success: true,
      enabled: true
    });
  }
}));

// Debug endpoint to test file uploads
router.post('/api/test-upload', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('🧪 Test upload endpoint hit');
  console.log('📋 Request body:', req.body);
  console.log('📁 Files received:', req.files);

  res.json({
    success: true,
    message: 'Upload test successful',
    body: req.body,
    files: req.files?.map((f: any) => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      size: f.size,
      mimetype: f.mimetype
    })) || []
  });
}));

// ===== USER API ENDPOINTS =====

// Get user by UID
router.get('/api/users/:uid', asyncHandler(async (req: any, res: any) => {
  const { uid } = req.params;
  console.log('🔍 Getting user by UID:', uid);

  try {
    let user = await storage.getUserByUid(uid);

    if (!user) {
      console.log('⚠️ User not found for UID:', uid, '- This might be a new user');
      // Return a basic user structure instead of error
      // The frontend can handle this and show appropriate UI
      return res.json({
        uid: uid,
        email: '',
        name: '',
        phone: null,
        id: null,
        createdAt: new Date().toISOString()
      });
    }

    console.log('✅ User found:', user.email);
    res.json(user);
  } catch (error) {
    console.error('❌ Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}));

// Update user profile with Cloudinary photo upload
router.put('/api/users/:uid/update-profile', upload.single('profilePicture'), asyncHandler(async (req: any, res: any) => {
  try {
    const { uid } = req.params;
    const { name, email } = req.body;
    const profilePictureFile = req.file;

    console.log('📝 Update profile request:', {
      uid,
      name,
      email,
      hasProfilePictureFile: !!profilePictureFile
    });

    if (!uid || !name?.trim() || !email?.trim()) {
      return res.status(400).json({ 
        error: 'UID, name, and email are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    try {
      // Ensure database connection
      await connectDatabase();

      let user = null;
      let profilePictureUrl = null;

      // Handle profile picture upload to Cloudinary
      if (profilePictureFile) {
        try {
          console.log('📸 Uploading profile picture to Cloudinary...');
          profilePictureUrl = await uploadProfilePhotoToCloudinary(
            profilePictureFile.buffer,
            uid,
            profilePictureFile.originalname
          );
          console.log('✅ Profile picture uploaded to Cloudinary:', profilePictureUrl);
        } catch (uploadError) {
          console.error('❌ Cloudinary upload failed:', uploadError);
          return res.status(500).json({
            error: 'Failed to upload profile picture',
            message: uploadError.message
          });
        }
      }

      // Try to get existing user
      try {
        user = await storage.getUserByUid(uid);
        console.log('🔍 Found existing user:', user?.email || 'none');
      } catch (getUserError) {
        console.log('⚠️ Could not find user, will create new one');
        user = null;
      }

      // If user doesn't exist, create them first
      if (!user) {
        console.log('⚠️ User not found for UID:', uid, '- Creating new user');
        try {
          const createResult = await client.query(`
            INSERT INTO users (uid, email, name, phone, profile_picture_url, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (uid) DO UPDATE SET
              name = EXCLUDED.name,
              email = EXCLUDED.email,
              profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, users.profile_picture_url),
              updated_at = NOW()
            RETURNING *
          `, [uid, email.trim(), name.trim(), null, profilePictureUrl]);

          user = createResult.rows[0];
          console.log('✅ Created/Updated user:', user.email);

          const transformedUser = {
            id: user.id,
            uid: user.uid,
            email: user.email,
            name: user.name,
            phone: user.phone,
            profilePictureUrl: user.profile_picture_url,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          };

          return res.json(transformedUser);
        } catch (createError) {
          console.error('❌ Failed to create user:', createError);

          if (createError.code === '23505' && createError.constraint?.includes('email')) {
            return res.status(400).json({ 
              error: 'Email already taken',
              message: 'This email is already registered to another user.' 
            });
          }

          return res.status(500).json({ 
            error: 'Failed to create user profile',
            message: createError.message 
          });
        }
      } else {
        // Update existing user
        console.log('🔄 Updating existing user:', user.email);

        // Check email uniqueness only if email is being changed
        if (email.trim() !== user.email) {
          try {
            const emailCheckResult = await client.query(`
              SELECT id, uid FROM users WHERE email = $1 AND uid != $2
            `, [email.trim(), uid]);

            if (emailCheckResult.rows.length > 0) {
              return res.status(400).json({ 
                error: 'Email already taken',
                message: 'This email is already registered to another user.' 
              });
            }
          } catch (emailCheckError) {
            console.error('❌ Error checking email uniqueness:', emailCheckError);
          }
        }

        // Update user in database (only update profile picture if new one was uploaded)
        const updateQuery = profilePictureUrl ? `
          UPDATE users 
          SET name = $1, email = $2, profile_picture_url = $3, updated_at = NOW()
          WHERE uid = $4 
          RETURNING *
        ` : `
          UPDATE users 
          SET name = $1, email = $2, updated_at = NOW()
          WHERE uid = $3 
          RETURNING *
        `;

        const updateParams = profilePictureUrl ? 
          [name.trim(), email.trim(), profilePictureUrl, uid] :
          [name.trim(), email.trim(), uid];

        const updateResult = await client.query(updateQuery, updateParams);

        if (updateResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found for update' });
        }

        const updatedUser = updateResult.rows[0];
        console.log('✅ User profile updated successfully:', updatedUser.email);

        const transformedUser = {
          id: updatedUser.id,
          uid: updatedUser.uid,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone,
          profilePictureUrl: updatedUser.profile_picture_url,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at
        };

        console.log('✅ Returning transformed user:', transformedUser);
        return res.json(transformedUser);
      }
    } catch (updateError) {
      console.error('❌ Error updating user profile:', updateError);

      if (updateError.code === '23505' && updateError.constraint?.includes('email')) {
        return res.status(400).json({ 
          error: 'Email already taken',
          message: 'This email is already registered to another user.' 
        });
      }

      return res.status(500).json({ 
        error: 'Failed to update user profile',
        message: updateError.message
      });
    }
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    return res.status(500).json({ 
      error: 'Failed to update user profile',
      message: error.message || 'Internal server error'
    });
  } finally {
    // Clean up any remaining temp files
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (err) {
          console.error('Warning: Could not delete temp file:', file.path);
        }
      });
    }
  }
}));

// Get user submissions - FIXED VERSION
router.get('/api/users/:uid/submissions', asyncHandler(async (req: any, res: any) => {
  const { uid } = req.params;
  console.log('🔍 Getting submissions for UID:', uid);

  try {
    const user = await storage.getUserByUid(uid);

    if (!user) {
      console.log('❌ User not found for UID:', uid);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ User found:', user.email, 'User ID:', user.id);

    const submissions = await storage.getSubmissionsByUser(user.id);
    console.log(`✅ Found ${submissions.length} submissions for user ${user.id}`);

    // Log the raw submissions for debugging
    console.log('📋 Raw submissions:', submissions.map(s => ({
      id: s.id,
      poemTitle: s.poemTitle,
      tier: s.tier,
      userId: s.userId,
      submittedAt: s.submittedAt
    })));

    // Transform submissions to match frontend expectations
    const transformedSubmissions = submissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName || ''}`.trim(),
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      amount: parseFloat(sub.price?.toString() || '0'),
      submittedAt: sub.submittedAt,
      isWinner: sub.isWinner || false,
      winnerPosition: sub.winnerPosition || null,
      score: sub.score || null,
      type: sub.type || 'Human',
      status: sub.status || 'Pending',
      scoreBreakdown: sub.scoreBreakdown ? JSON.parse(sub.scoreBreakdown) : null,
      submissionUuid: sub.submissionUuid,
      poemIndex: sub.poemIndex,
      totalPoemsInSubmission: sub.totalPoemsInSubmission
    }));

    console.log('✅ Transformed submissions:', transformedSubmissions.length);
    res.json(transformedSubmissions);
  } catch (error) {
    console.error('❌ Error getting user submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
}));

// Get user submission status
router.get('/api/users/:uid/submission-status', asyncHandler(async (req: any, res: any) => {
  const { uid } = req.params;
  console.log('🔍 Getting submission status for UID:', uid);

  try {
    const user = await storage.getUserByUid(uid);

    if (!user) {
      console.log('❌ User not found for UID:', uid);
      return res.status(404).json({ error: 'User not found' });
    }

    const submissions = await storage.getSubmissionsByUser(user.id);

    // Check if user has used free submission
    const freeSubmissionUsed = submissions.some(sub => sub.tier === 'free');

    // Get current month submissions
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const currentMonthSubmissions = submissions.filter(sub => 
      sub.submittedAt && sub.submittedAt.toISOString().slice(0, 7) === currentMonth
    );

    const statusData = {
      freeSubmissionUsed,
      totalSubmissions: currentMonthSubmissions.length,
      contestMonth: currentMonth,
      allTimeSubmissions: submissions.length
    };

    console.log('✅ Submission status:', statusData);
    res.json(statusData);
  } catch (error) {
    console.error('❌ Error getting submission status:', error);
    res.status(500).json({ error: 'Failed to get submission status' });
  }
}));

// Helper function to generate username from phone number
function generateUsernameFromPhone(phone: string, email?: string): string {
  if (email) {
    // If email is provided, use part of email as name
    const emailPart = email.split('@')[0];
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
  }

  if (!phone) return 'User';

  // Remove +91 or other country codes and take last 4 digits
  const cleanPhone = phone.replace(/^\+\d{1,3}/, '').replace(/\D/g, '');
  const lastFourDigits = cleanPhone.slice(-4);

  // Generate username like "User7890" 
  return `User${lastFourDigits}`;
}

// Create/update user
router.post('/api/users', asyncHandler(async (req: any, res: any) => {
  const { uid, email, name, phone } = req.body;
  console.log('🔍 Creating/updating user:', { uid, email, name });

  try {
    let user = await storage.getUserByUid(uid);

    if (user) {
      console.log('✅ User already exists:', user.email);
      res.json(user);
    } else {
      // Generate name for phone users
      let userName = name;
      let userEmail = email;

      if (!userName && phone) {
        userName = generateUsernameFromPhone(phone, email);
        console.log('📱 Generated username for phone user:', userName);
      }

      // For phone users, require email (no fallback)
      if (phone && !email) {
        console.error('❌ Phone user missing email address');
        return res.status(400).json({
          error: 'Email address is required for phone authentication'
        });
      }

      const newUser = await storage.createUser({
        uid,
        email: userEmail,
        name: userName || 'User',
        phone: phone || null
      });
      console.log('✅ Created new user:', newUser.email);
      res.json(newUser);
    }
  } catch (error) {
    console.error('❌ Error creating/updating user:', error);
    res.status(500).json({ error: 'Failed to create/update user' });
  }
}));

// ===== RAZORPAY PAYMENT ENDPOINTS =====

// Create Razorpay order
router.post('/api/create-razorpay-order', asyncHandler(async (req: any, res: any) => {
  console.log('💳 Creating Razorpay order...');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { amount, tier, metadata } = req.body;

  // Validate inputs
  if (!amount || amount <= 0) {
    console.error('❌ Invalid amount:', amount);
    return res.status(400).json({ 
      error: 'Valid amount is required' 
    });
  }

  if (!tier) {
    console.error('❌ Missing tier');
    return res.status(400).json({ 
      error: 'Tier is required' 
    });
  }

  // Check Razorpay configuration
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('❌ Razorpay not configured');
    return res.status(500).
json({ 
      error: 'Payment system not configured' 
    });
  }

  console.log(`💰 Creating Razorpay order for amount: ₹${amount}`);

  const orderOptions = {
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}_${tier}`,
    notes: {
      tier: tier,
      amount: amount.toString(),
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };

  console.log('🔄 Calling Razorpay create order with options:', orderOptions);

  const order = await razorpay.orders.create(orderOptions);
  console.log('✅ Razorpay order created successfully:', order.id);

  res.json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    orderId: order.id,
    name: 'Writory Poetry Contest',
    description: `Poetry Contest - ${tier}`,
    receipt: order.receipt
  });
}));

// Keep the original create-order endpoint for backward compatibility
router.post('/api/create-order', asyncHandler(async (req: any, res: any) => {
  console.log('📞 Razorpay order creation request received');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { amount, currency = 'INR', receipt, tier } = req.body;

  // Validate inputs
  if (!amount || amount <= 0) {
    console.error('❌ Invalid amount:', amount);
    return res.status(400).json({ 
      error: 'Valid amount is required' 
    });
  }

  if (!receipt) {
    console.error('❌ Missing receipt');
    return res.status(400).json({ 
      error: 'Receipt is required' 
    });
  }

  // Check Razorpay configuration
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('❌ Razorpay not configured');
    return res.status(500).json({ 
      error: 'Payment system not configured' 
    });
  }

  console.log(`💰 Creating Razorpay order for amount: ${amount} paise`);

  const orderOptions = {
    amount: amount, // amount in paise (already converted in frontend)
    currency: currency,
    receipt: receipt,
    notes: {
      tier: tier || 'unknown',
      timestamp: new Date().toISOString()
    }
  };

  console.log('🔄 Calling Razorpay create order with options:', orderOptions);

  const order = await razorpay.orders.create(orderOptions);
  console.log('✅ Razorpay order created successfully:', order.id);

  res.json({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    status: order.status
  });
}));

// Verify Razorpay payment
router.post('/api/verify-payment', asyncHandler(async (req: any, res: any) => {
  console.log('🔍 Payment verification request received');
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    amount,
    tier 
  } = req.body;

  // Validate required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    console.error('❌ Missing required payment verification fields');
    return res.status(400).json({ 
      error: 'Missing payment verification data' 
    });
  }

  console.log('🔐 Verifying payment signature...');

  // Create signature verification string
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest('hex');

  console.log('🔒 Signature verification:', {
    received: razorpay_signature,
    expected: expectedSignature,
    matches: expectedSignature === razorpay_signature
  });

  if (expectedSignature === razorpay_signature) {
    console.log('✅ Payment signature verified successfully');

    // Fetch additional payment details for verification
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      console.log('💳 Payment details from Razorpay:', {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        method: payment.method
      });

      res.json({
        verified: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: payment.amount / 100, // Convert back to rupees
        status: payment.status,
        method: payment.method,
        captured: payment.status === 'captured'
      });

    } catch (fetchError: any) {
      console.error('⚠️ Could not fetch payment details, but signature is valid:', fetchError.message);
      // If we can't fetch payment details but signature is valid, still consider it verified
      res.json({
        verified: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: amount,
        note: 'Payment verified by signature (details fetch failed)'
      });
    }
  } else {
    console.error('❌ Payment signature verification failed');
    res.status(400).json({ 
      error: 'Payment verification failed - invalid signature' 
    });
  }
}));

// ===== COUPON VALIDATION ENDPOINT =====

// Validate coupon code with usage tracking
router.post('/api/validate-coupon', asyncHandler(async (req: any, res: any) => {
  const { code, tier, amount, uid, email } = req.body;

  console.log('🎫 Coupon validation request:', { code, tier, amount, uid, email });

  // Validate required fields
  if (!code || !tier) {
    return res.status(400).json({
      valid: false,
      error: 'Coupon code and tier are required'
    });
  }

  const upperCode = code.toUpperCase();

  // Free tier codes (100% discount on ₹50 tier only)
  const FREE_TIER_CODES = [
    'INKWIN100', 'VERSEGIFT', 'WRITEFREE', 'WRTYGRACE', 'LYRICSPASS',
    'ENTRYBARD', 'QUILLPASS', 'PENJOY100', 'LINESFREE', 'PROSEPERK',
    'STANZAGIFT', 'FREELYRICS', 'RHYMEGRANT', 'SONNETKEY', 'ENTRYVERSE',
    'PASSWRTY1', 'PASSWRTY2', 'GIFTPOEM', 'WORDSOPEN', 'STAGEPASS',
    'LITERUNLOCK', 'PASSINKED', 'WRTYGENIUS', 'UNLOCKINK', 'ENTRYMUSE',
    'WRTYSTAR', 'FREEQUILL', 'PENPASS100', 'POEMKEY', 'WRITEACCESS',
    'PASSFLARE', 'WRITERJOY', 'MUSE100FREE', 'PASSCANTO', 'STANZAOPEN',
    'VERSEUNLOCK', 'QUILLEDPASS', 'FREEMUSE2025', 'WRITYSTREAK', 'RHYMESMILE',
    'PENMIRACLE', 'GIFTOFVERSE', 'LYRICALENTRY', 'WRTYWAVE', 'MUSEDROP',
    'POEMHERO', 'OPENPOETRY', 'FREEVERSE21', 'POETENTRY', 'UNLOCK2025'
  ];

  // 10% discount codes for all paid tiers (reusable)
  const DISCOUNT_CODES = [
    'FLOWRHYME10', 'VERSETREAT', 'WRITEJOY10', 'CANTODEAL', 'LYRICSPARK',
    'INKSAVER10', 'WRTYBRIGHT', 'PASSPOETRY', 'MUSEDISCOUNT', 'SONNETSAVE',
    'QUILLFALL10', 'PENSPARKLE', 'LINESLOVE10', 'VERSELIGHT', 'RHYMEBOOST',
    'WRITORSAVE', 'PROSEJOY10', 'POETPOWER10', 'WRTYDREAM', 'MUSESAVER10',
    'POEMSTARS', 'WRITERSHADE', 'LYRICLOOT10', 'SONNETBLISS', 'INKBREEZE',
    'VERSECHILL', 'PASSHUES', 'WRITERFEST', 'CANTOFEEL', 'POEMDISCOUNT',
    'MIRACLEMUSE', 'LYRICSTORY10', 'POEMCUP10', 'WRTYFEAST10', 'PASSMIRROR',
    'INKRAYS10', 'WRTYFLY', 'DISCOUNTINK', 'QUILLFLASH', 'WRITGLOW10',
    'FREESHADE10', 'WRTYJUMP', 'BARDGIFT10', 'POETRAYS', 'LIGHTQUILL',
    'RHYMERUSH', 'WRTYSOUL', 'STORYDROP10', 'POETWISH10', 'WRTYWONDER'
  ];

  // 10% discount codes - ONE-TIME USE GLOBALLY (like 100% codes)
  const RESTRICTED_DISCOUNT_CODES = [
    'ZLY93DKA1T', 'BQC27XRMP8', 'HNF85VZEKQ', 'TRX49MJDSL', 'WPE18UAKOY',
    'XKZ07YGMBD', 'FDN63TOIXV', 'MAQ92BLRZH', 'VJG56EMCUW', 'UYT13PLDXQ',
    'KSD71OWYAG', 'LMF84CZVNB', 'NYJ28RXOQT', 'TBK95DSUEH', 'RXP47GLMJA',
    'VHW39KUBTL', 'QEM60CZNWF', 'ZJA74TQXVP', 'GDT05MRKLE', 'HPY62NXWUB',
    'MCL31QZJRY', 'KXP89VMTLC', 'NWF47ODKJB', 'YRA02MGZTS', 'SHQ80ULVXN',
    'DKT56ZYFOW', 'BQY14LJAVN', 'TXN92KGZCE', 'ZUP37MWFYL', 'HME40RCXAV'
  ];

  // Check if code is valid first
  const isFreeTierCode = FREE_TIER_CODES.includes(upperCode);
  const isDiscountCode = DISCOUNT_CODES.includes(upperCode);
  const isRestrictedDiscountCode = RESTRICTED_DISCOUNT_CODES.includes(upperCode);

  if (!isFreeTierCode && !isDiscountCode && !isRestrictedDiscountCode) {
    return res.json({
      valid: false,
      error: 'Invalid or already used coupon code'
    });
  }

  // ENHANCED: Check coupon usage with different logic for 100% vs 10% codes vs restricted 10% codes
  try {
    if (isFreeTierCode || isRestrictedDiscountCode) {
      // For 100% codes AND restricted 10% codes: Check if ANY user has used this code
      const anyUsageCheck = await client.query(`
        SELECT cu.id, cu.used_at, c.code, s.email, cu.user_uid
        FROM coupon_usage cu
        JOIN coupons c ON cu.coupon_id = c.id
        LEFT JOIN submissions s ON cu.submission_id = s.id
        WHERE c.code = $1
        ORDER BY cu.used_at DESC
        LIMIT 1
      `, [upperCode]);

      if (anyUsageCheck.rows.length > 0) {
        const firstUsage = anyUsageCheck.rows[0];
        const usedByEmail = firstUsage.email;
        const usedByUid = firstUsage.user_uid;

        // Check if this is the same user trying to reuse
        const isSameUser = (uid && uid === usedByUid) || (email && email === usedByEmail);

        if (!isSameUser) {
          // Different user trying to use an already-used one-time code
          return res.json({
            valid: false,
            error: 'Invalid or already used coupon code'
          });
        }

        // Same user trying to reuse - still block it
        return res.json({
          valid: false,
          error: 'Invalid or already used coupon code'
        });
      }
    } else if (isDiscountCode) {
      // For regular 10% codes: Check if THIS user has used this code
      let hasUsedCoupon = false;

      if (uid) {
        // Check by user UID - PRIMARY CHECK
        const usageCheck = await client.query(`
          SELECT cu.id, cu.used_at, c.code
          FROM coupon_usage cu
          JOIN coupons c ON cu.coupon_id = c.id
          WHERE c.code = $1 AND cu.user_uid = $2
        `, [upperCode, uid]);

        if (usageCheck.rows.length > 0) {
          return res.json({
            valid: false,
            error: 'Invalid or already used coupon code'
          });
        }
      } else if (email) {
        // Check by email as fallback - SECONDARY CHECK
        const usageCheck = await client.query(`
          SELECT cu.id, cu.used_at, c.code, s.email
          FROM coupon_usage cu
          JOIN coupons c ON cu.coupon_id = c.id
          JOIN submissions s ON cu.submission_id = s.id
          WHERE c.code = $1 AND s.email = $2
        `, [upperCode, email]);

        if (usageCheck.rows.length > 0) {
          return res.json({
            valid: false,
            error: 'Invalid or already used coupon code'
          });
        }
      }
    }

    // Validate tier restrictions for free codes
    if (isFreeTierCode && tier !== 'single') {
      return res.json({
        valid: false,
        error: '100% discount codes only work on the ₹50 tier'
      });
    }

    // Return appropriate discount
    if (isFreeTierCode) {
      return res.json({
        valid: true,
        type: 'free',
        discount: amount || 50,
        discountPercentage: 100,
        message: 'Valid 100% discount code! This tier is now free.',
        code: upperCode
      });
    }

    if (isDiscountCode || isRestrictedDiscountCode) {
      const discountAmount = Math.round((amount || 0) * 0.10);
      return res.json({
        valid: true,
        type: 'discount',
        discount: discountAmount,
        discountPercentage: 10,
        message: 'Valid discount code! 10% discount applied.',
        code: upperCode
      });
    }

  } catch (error) {
    console.error('❌ Error checking coupon usage:', error);
    return res.status(500).json({
      valid: false,
      error: 'Error validating coupon. Please try again.'
    });
  }
}));

// Record coupon usage after successful submission
router.post('/api/record-coupon-usage', asyncHandler(async (req: any, res: any) => {
  const { code, uid, email, submissionId, discountAmount } = req.body;

  console.log('📝 Recording coupon usage:', { code, uid, email, submissionId, discountAmount });

  if (!code || !submissionId || discountAmount === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields for coupon usage recording'
    });
  }

  try {
    const upperCode = code.toUpperCase();

    // Find or create the coupon record
    let couponResult = await client.query(`
      SELECT id FROM coupons WHERE code = $1
    `, [upperCode]);

    let couponId;

    if (couponResult.rows.length === 0) {
      // Create coupon record if it doesn't exist
      const newCouponResult = await client.query(`
        INSERT INTO coupons (
          code, 
          discount_type, 
          discount_value, 
          valid_from, 
          valid_until, 
          is_active,
          created_at
        ) VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', true, NOW())
        RETURNING id
      `, [upperCode, 'percentage', discountAmount === 100 ? 100 : 10]);

      couponId = newCouponResult.rows[0].id;
      console.log('✅ Created new coupon record:', couponId);
    } else {
      couponId = couponResult.rows[0].id;
      console.log('✅ Found existing coupon:', couponId);
    }

    // Get user ID if available
    let userId = null;
    if (uid) {
      const userResult = await storage.getUserByUid(uid);
      userId = userResult?.id || null;
    }

    // Record the usage
    await client.query(`
      INSERT INTO coupon_usage (
        coupon_id,
        user_id,
        submission_id,
        user_uid,
        discount_amount,
        used_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [couponId, userId, submissionId, uid || null, discountAmount]);

    // Update coupon used count
    await client.query(`
      UPDATE coupons 
      SET used_count = used_count + 1,
          updated_at = NOW()
      WHERE id = $1
    `, [couponId]);

    console.log('✅ Coupon usage recorded successfully');

    res.json({
      success: true,
      message: 'Coupon usage recorded'
    });

  } catch (error) {
    console.error('❌ Error recording coupon usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record coupon usage'
    });
  }
}));

// Test Razorpay configuration
router.get('/api/test-razorpay', asyncHandler(async (req: any, res: any) => {
  console.log('🧪 Testing Razorpay configuration...');

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.json({
      success: false,
      configured: false,
      message: 'Razorpay credentials not configured'
    });
  }

  try {
    // Try to create a test order
    const testOrder = await razorpay.orders.create({
      amount: 100, // ₹1 in paise
      currency: 'INR',
      receipt: `test_${Date.now()}`
    });

    res.json({
      success: true,
      configured: true,
      message: 'Razorpay is properly configured',
      testOrderId: testOrder.id
    });

  } catch (error: any) {
    console.error('❌ Razorpay test failed:', error);
    res.json({
      success: false,
      configured: false,
      message: 'Razorpay test failed: ' + error.message
    });
  }
}));

// Test Cloudinary configuration
router.get('/api/test-cloudinary', asyncHandler(async (req: any, res: any) => {
  console.log('🧪 Testing Cloudinary configuration...');

  try {
    // Check Cloudinary environment variables
    const hasCloudinaryCredentials = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

    console.log('🔍 Cloudinary Environment check:', {
      hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'NOT_SET'
    });

    if (!hasCloudinaryCredentials) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
    }

    // Test file upload
    const testFile = Buffer.from('This is a test file for Cloudinary upload - ' + new Date().toISOString(), 'utf-8');
    const testFileName = `cloudinary_test_${Date.now()}.txt`;

    console.log('📤 Attempting to upload test file to Cloudinary...');
    console.log('📄 Test file details:', {
      fileName: testFileName,
      size: testFile.length,
      content: testFile.toString().substring(0, 50) + '...'
    });

    const fileUrl = await uploadPoemFileToCloudinary(testFile, 'test@example.com', testFileName, 'Cloudinary Test');

    console.log('✅ Cloudinary test successful!');

    res.json({
      success: true,
      configured: true,
      message: 'Cloudinary is properly configured and working',
      testFileUrl: fileUrl,
      environment: {
        hasCloudinaryCredentials: true,
        nodeEnv: process.env.NODE_ENV
      }
    });

  } catch (error: any) {
    console.error('❌ Cloudinary test failed:', error);
    console.error('❌ Full error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    res.json({
      success: false,
      configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      message: 'Cloudinary test failed: ' + error.message,
      details: {
        hasCloudinaryCredentials: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
        errorMessage: error.message,
        errorCode: error.code,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
}));

// ===== SUBMISSION ENDPOINTS =====

// Helper function to get the free tier reset timestamp
async function getFreeTierResetTimestamp(): Promise<Date | null> {
  try {
    const resetTimestamp = await getSetting('free_tier_reset_timestamp');
    if (resetTimestamp) {
      return new Date(resetTimestamp);
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting free tier reset timestamp:', error);
    return null;
  }
}

// Single poem submission with proper file handling - FIXED VERSION
router.post('/api/submit-poem', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📝 Single poem submission received');
  console.log('📋 Body:', JSON.stringify(req.body, null, 2));
  console.log('📁 Files:', req.files?.map((f: any) => ({ fieldname: f.fieldname, originalname: f.originalname })));

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      poemTitle,
      tier,
      price,
      paymentId,
      paymentMethod,
      uid,
      userUid // Also accept userUid as fallback
    } = req.body;

    // Check if free tier is enabled and user hasn't used it before
    if (tier === 'free') {
      const freeTierEnabled = await getSetting('free_tier_enabled');
      if (freeTierEnabled !== 'true') {
        return res.status(403).json({
          success: false,
          error: 'Free tier submissions are currently disabled. Please try a paid tier or contact support.'
        });
      }

      // Check if user has already used free tier after the last reset
      const userId = uid || userUid;
      if (userId) {
        try {
          const user = await storage.getUserByUid(userId);
          if (user) {
            const existingSubmissions = await storage.getSubmissionsByUser(user.id);
            const resetTimestamp = await getFreeTierResetTimestamp();

            // Filter free tier submissions to only those after the last reset
            const freeSubmissionsAfterReset = existingSubmissions.filter(sub => {
              if (sub.tier !== 'free') return false;
              if (!resetTimestamp) return true; // No reset timestamp means check all submissions
              return new Date(sub.submittedAt) > resetTimestamp;
            });

            if (freeSubmissionsAfterReset.length > 0) {
              return res.status(403).json({
                success: false,
                error: 'You have already used the free tier once. Please choose a paid tier.'
              });
            }
          }
        } catch (error) {
          console.error('❌ Error checking free tier usage:', error);
        }
      }
    }

    // Use uid or userUid (frontend might send either)
    //const userId = uid || userUid;

    // Extract coupon data
    const couponCode = req.body.couponCode;
    const couponDiscount = req.body.couponDiscount ? parseFloat(req.body.couponDiscount) : 0;
    const finalAmount = req.body.finalAmount ? parseFloat(req.body.finalAmount) : parseFloat(price || '0');

    // Validate required fields
    if (!firstName || !email || !poemTitle || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, email, poemTitle, tier'
      });
    }

    // CRITICAL: Double-check coupon usage before submission
    if (couponCode && couponDiscount > 0) {
      const upperCouponCode = couponCode.toUpperCase();
      console.log('🔍 Double-checking coupon usage for:', upperCouponCode);

      try {
        // Check if this is a 100% discount code
        const FREE_TIER_CODES = [
          'INKWIN100', 'VERSEGIFT', 'WRITEFREE', 'WRTYGRACE', 'LYRICSPASS',
          'ENTRYBARD', 'QUILLPASS', 'PENJOY100', 'LINESFREE', 'PROSEPERK',
          'STANZAGIFT', 'FREELYRICS', 'RHYMEGRANT', 'SONNETKEY', 'ENTRYVERSE',
          'PASSWRTY1', 'PASSWRTY2', 'GIFTPOEM', 'WORDSOPEN', 'STAGEPASS',
          'LITERUNLOCK', 'PASSINKED', 'WRTYGENIUS', 'UNLOCKINK', 'ENTRYMUSE',
          'WRTYSTAR', 'FREEQUILL', 'PENPASS100', 'POEMKEY', 'WRITEACCESS',
          'PASSFLARE', 'WRITERJOY', 'MUSE100FREE', 'PASSCANTO', 'STANZAOPEN',
          'VERSEUNLOCK', 'QUILLEDPASS', 'FREEMUSE2025', 'WRITYSTREAK', 'RHYMESMILE',
          'PENMIRACLE', 'GIFTOFVERSE', 'LYRICALENTRY', 'WRTYWAVE', 'MUSEDROP',
          'POEMHERO', 'OPENPOETRY', 'FREEVERSE21', 'POETENTRY', 'UNLOCK2025'
        ];

        // Define the same code arrays as in validation endpoint
        const FREE_TIER_CODES_CHECK = [
          'INKWIN100', 'VERSEGIFT', 'WRITEFREE', 'WRTYGRACE', 'LYRICSPASS',
          'ENTRYBARD', 'QUILLPASS', 'PENJOY100', 'LINESFREE', 'PROSEPERK',
          'STANZAGIFT', 'FREELYRICS', 'RHYMEGRANT', 'SONNETKEY', 'ENTRYVERSE',
          'PASSWRTY1', 'PASSWRTY2', 'GIFTPOEM', 'WORDSOPEN', 'STAGEPASS',
          'LITERUNLOCK', 'PASSINKED', 'WRTYGENIUS', 'UNLOCKINK', 'ENTRYMUSE',
          'WRTYSTAR', 'FREEQUILL', 'PENPASS100', 'POEMKEY', 'WRITEACCESS',
          'PASSFLARE', 'WRITERJOY', 'MUSE100FREE', 'PASSCANTO', 'STANZAOPEN',
          'VERSEUNLOCK', 'QUILLEDPASS', 'FREEMUSE2025', 'WRITYSTREAK', 'RHYMESMILE',
          'PENMIRACLE', 'GIFTOFVERSE', 'LYRICALENTRY', 'WRTYWAVE', 'MUSEDROP',
          'POEMHERO', 'OPENPOETRY', 'FREEVERSE21', 'POETENTRY', 'UNLOCK2025'
        ];

        const RESTRICTED_DISCOUNT_CODES_CHECK = [
          'ZLY93DKA1T', 'BQC27XRMP8', 'HNF85VZEKQ', 'TRX49MJDSL', 'WPE18UAKOY',
          'XKZ07YGMBD', 'FDN63TOIXV', 'MAQ92BLRZH', 'VJG56EMCUW', 'UYT13PLDXQ',
          'KSD71OWYAG', 'LMF84CZVNB', 'NYJ28RXOQT', 'TBK95DSUEH', 'RXP47GLMJA',
          'VHW39KUBTL', 'QEM60CZNWF', 'ZJA74TQXVP', 'GDT05MRKLE', 'HPY62NXWUB',
          'MCL31QZJRY', 'KXP89VMTLC', 'NWF47ODKJB', 'YRA02MGZTS', 'SHQ80ULVXN',
          'DKT56ZYFOW', 'BQY14LJAVN', 'TXN92KGZCE', 'ZUP37MWFYL', 'HME40RCXAV'
        ];

        const isFreeTierCode = FREE_TIER_CODES_CHECK.includes(upperCouponCode);
        const isRestrictedDiscountCode = RESTRICTED_DISCOUNT_CODES_CHECK.includes(upperCouponCode);
        let couponAlreadyUsed = false;

        if (isFreeTierCode || isRestrictedDiscountCode) {
          // For 100% codes AND restricted 10% codes: Check if ANY user has used this code
          const anyUsageCheck = await client.query(`
            SELECT cu.id
            FROM coupon_usage cu
            JOIN coupons c ON cu.coupon_id = c.id
            WHERE c.code = $1
            LIMIT 1
          `, [upperCouponCode]);
          couponAlreadyUsed = anyUsageCheck.rows.length > 0;
        } else {
          // For regular 10% codes: Check if THIS user has used this code
          const userId = uid || userUid;
          if (userId) {
            const usageCheck = await client.query(`
              SELECT cu.id, cu.used_at
              FROM coupon_usage cu
              JOIN coupons c ON cu.coupon_id = c.id
              WHERE c.code = $1 AND cu.user_uid = $2
            `, [upperCouponCode, userId]);
            couponAlreadyUsed = usageCheck.rows.length > 0;
          } else if (email) {
            const usageCheck = await client.query(`
              SELECT cu.id, cu.used_at
              FROM coupon_usage cu
              JOIN coupons c ON cu.coupon_id = c.id
              JOIN submissions s ON cu.submission_id = s.id
              WHERE c.code = $1 AND s.email = $2
            `, [upperCouponCode, email]);
            couponAlreadyUsed = usageCheck.rows.length > 0;
          }
        }

        if (couponAlreadyUsed) {
          return res.status(400).json({
            success: false,
            error: 'Invalid or already used coupon code'
          });
        }
      } catch (error) {
        console.error('❌ Error double-checking coupon:', error);
        return res.status(500).json({
          success: false,
          error: 'Error validating coupon during submission. Please try again.'
        });
      }
    }

    const userId = uid || userUid;
    console.log('🔍 Processing submission for user UID:', userId);
    console.log('📋 Form data received:', { firstName, lastName, email, phone, age, poemTitle, tier });

    // Find uploaded files
    let poemFile = null;
    let photoFile = null;

    console.log('📁 Processing uploaded files...');
    console.log('📁 Request files:', req.files);
    console.log('📁 Files count:', req.files?.length || 0);

    if (req.files && Array.isArray(req.files)) {
      console.log('📄 All uploaded files:');
      req.files.forEach((file: any, index: number) => {
        console.log(`  File ${index + 1}:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
                });
      });

      // More flexible file detection
      poemFile = req.files.find((f: any) => 
        f.fieldname === 'poemFile' || 
        f.fieldname === 'poems' || 
        f.fieldname === 'poem' ||
        f.originalname?.toLowerCase().includes('poem') ||
        (!f.mimetype?.startsWith('image/') && (
          f.mimetype === 'application/pdf' ||
          f.mimetype === 'application/msword' ||
          f.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          f.mimetype === 'text/plain'
        ))
      );

      photoFile = req.files.find((f: any) => 
        f.fieldname === 'photoFile' || 
        f.fieldname === 'photo' || 
        f.fieldname === 'profilePicture' ||
        f.originalname?.toLowerCase().includes('photo') ||
        f.mimetype?.startsWith('image/')
      );
    }

    console.log('📁 Identified files:', {
      poemFile: poemFile ? {
        name: poemFile.originalname,
        type: poemFile.mimetype,
        size: poemFile.size,
        fieldname: poemFile.fieldname
      } : null,
      photoFile: photoFile ? {
        name: photoFile.originalname,
        type: photoFile.mimetype,
        size: photoFile.size,
        fieldname: photoFile.fieldname
      } : null
    });

    // Upload files to Cloudinary
    let poemFileUrl = null;
    let photoFileUrl = null;

    if (poemFile) {
      console.log('☁️ Starting poem file upload to Cloudinary...');
      console.log('📄 Poem file details:', {
        name: poemFile.originalname,
        size: poemFile.size,
        type: poemFile.mimetype,
        bufferSize: poemFile.buffer?.length || 0
      });

      try {
        if (!poemFile.buffer || poemFile.buffer.length === 0) {
          throw new Error('Poem file buffer is empty');
        }

        poemFileUrl = await uploadPoemFileToCloudinary(
          poemFile.buffer, 
          email, 
          poemFile.originalname,
          poemTitle
        );
        console.log('✅ Poem file uploaded to Cloudinary:', poemFileUrl);
      } catch (error) {
        console.error('❌ Failed to upload poem file to Cloudinary:', error);
        
        // Return error to user if Cloudinary upload fails
        return res.status(500).json({
          success: false,
          error: `Failed to upload poem file: ${error.message}`
        });
      }
    } else {
      console.log('⚠️ No poem file found in request');
      console.log('📋 Available files:', req.files?.map(f => f.fieldname) || []);
    }

    if (photoFile) {
      console.log('☁️ Starting photo file upload to Cloudinary...');
      console.log('📸 Photo file details:', {
        name: photoFile.originalname,
        size: photoFile.size,
        type: photoFile.mimetype,
        bufferSize: photoFile.buffer?.length || 0
      });

      try {
        photoFileUrl = await uploadPhotoFileToCloudinary(photoFile.buffer, email, photoFile.originalname);
        console.log('✅ Photo file uploaded to Cloudinary:', photoFileUrl);
      } catch (error) {
        console.error('❌ Failed to upload photo file to Cloudinary:', error);
        
        // Continue with submission even if photo upload fails (photo is optional)
        console.log('⚠️ Continuing submission without photo URL (photo is optional)');
      }
    } else {
      console.log('⚠️ No photo file found in request');
      console.log('📋 Available files:', req.files?.map(f => f.fieldname) || []);
    }

    // Create or find user - FIXED VERSION
    let user = null;
    if (userId) {
      console.log('🔍 Looking for user with UID:', userId);
      user = await storage.getUserByUid(userId);
      if (!user) {
        console.log('🔄 Creating new user:', email);
        user = await storage.createUser({
          uid: userId,
          email,
          name: firstName + (lastName ? ` ${lastName}` : ''),
          phone: phone || null
        });
        console.log('✅ User created:', user.email);
      } else {
        console.log('✅ User found:', user.email);
      }
    } else {
      // Try to find user by email as fallback
      console.log('⚠️ No UID provided, trying to find user by email:', email);
      try {
        const existingUsers = await storage.getAllUsers?.() || [];
        user = existingUsers.find(u => u.email === email) || null;
        if (user) {
          console.log('✅ Found user by email:', user.email);
        } else {
          console.log('⚠️ No user found by email, creating submission without user link');
        }
      } catch (error) {
        console.log('⚠️ Could not search for user by email, creating submission without user link');
      }
    }

    // Create submission data
    const submissionData = {
      userId: user?.id || null, // CRITICAL: Link to user
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age ? parseInt(age) : null,
      poemTitle,
      tier,
      price: price ? parseFloat(price) : 0,
      paymentId: paymentId || null,
      paymentMethod: paymentMethod || 'free',
      poemFileUrl: poemFileUrl,
        photoFileUrl: photoFileUrl,
        submissionUuid: crypto.randomUUID(),
      poemIndex: 1,
      totalPoemsInSubmission: 1,
      submittedAt: new Date(),
      status: 'Pending',
      type: 'Human'
    };

    console.log('🔗 Linking submission to user ID:', user?.id);
    console.log('💾 Submission data:', submissionData);

    // Save to database
    console.log('💾 Saving submission to database...');
    const submission = await storage.createSubmission(submissionData);
    console.log('✅ Submission saved with ID:', submission.id);

    // Background tasks - don't wait for these to complete
    // This ensures fast response to user while still completing necessary tasks
    setImmediate(async () => {
      try {
        // Add to Google Sheets in background with proper file URLs
        console.log('🔍 File URLs being sent to sheets:', { 
          poemFileUrl: poemFileUrl || 'EMPTY', 
          photoFileUrl: photoFileUrl || 'EMPTY',
          poemFileUrlType: typeof poemFileUrl,
          photoFileUrlType: typeof photoFileUrl,
          allDataKeys: Object.keys(submissionData)
        });

        // Validate URLs before sending to sheets
        if (poemFileUrl && !poemFileUrl.startsWith('https://drive.google.com/')) {
          console.warn('⚠️ Poem file URL does not look like a Google Drive link:', poemFileUrl);
        }
        if (photoFileUrl && !photoFileUrl.startsWith('https://drive.google.com/')) {
          console.warn('⚠️ Photo file URL does not look like a Google Drive link:', photoFileUrl);
        }

        await addPoemSubmissionToSheet({
          ...submissionData,
          submissionId: submission.id,
          poemFileUrl: poemFileUrl, // Explicitly pass poem file URL
          photoFileUrl: photoFileUrl // Explicitly pass photo file URL
        });
        console.log('✅ Google Sheets updated for submission:', submission.id);
      } catch (sheetError) {
        console.error('⚠️ Failed to add to Google Sheets:', sheetError);
      }

      try {
        // Send confirmation email in background
        await sendSubmissionConfirmation(email, {
          name: firstName,
          poemTitle,
          tier,
          submissionId: submission.id
        });
        console.log('✅ Email sent for submission:', submission.id);
      } catch (emailError) {
        console.error('⚠️ Failed to send email:', emailError);
      }

      try {
        // Record coupon usage if coupon was used
        const couponCode = req.body.couponCode;
        const couponDiscount = req.body.couponDiscount;

        if (couponCode && couponDiscount > 0) {
          await fetch(`${req.protocol}://${req.get('host')}/api/record-coupon-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: couponCode,
              uid: userId,
              email: email,
              submissionId: submission.id,
              discountAmount: couponDiscount
            })
          });
          console.log('✅ Coupon usage recorded for submission:', submission.id);
        }
      } catch (couponError) {
        console.error('⚠️ Failed to record coupon usage:', couponError);
      }
    });

    // Clean up uploaded files
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Warning: Could not delete temp file:', file.path);
        }
      });
    }

    console.log('🎉 Submission completed successfully!');

    res.json({
      success: true,
      message: 'Poem submitted successfully!',
      submissionId: submission.id,
      submissionUuid: submission.submissionUuid,
      submissions: [submission] // For consistency with frontend expectations
    });

  } catch (error) {
    console.error('❌ Submission error:', error);

    // Clean up files on error
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          // Ignore cleanup errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Submission failed: ' + error.message
    });
  }
}));

// Multiple poems submission - FIXED VERSION
router.post('/api/submit-multiple-poems', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📝 Multiple poems submission received');
  console.log('📋 Body:', JSON.stringify(req.body, null, 2));
  console.log('📁 Files count:', req.files?.length || 0);

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      tier,
      price,
      paymentId,
      paymentMethod,
      uid,
      userUid, // Also accept userUid as fallback
      poemTitles // This should be a JSON string array
    } = req.body;

    // Use uid or userUid (frontend might send either)
    const userId = uid || userUid;

    // Parse poem titles
    let titles = [];
    try {
      titles = JSON.parse(poemTitles || '[]');
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid poemTitles format'
      });
    }

    // Validate required fields
    if (!firstName || !email || !titles.length || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Check if free tier is enabled
    if (tier === 'free') {
      const freeTierEnabled = await getSetting('free_tier_enabled');
      if (freeTierEnabled !== 'true') {
        return res.status(403).json({
          success: false,
          error: 'Free tier submissions are currently disabled. Please try a paid tier or contact support.'
        });
      }

      // Check if user has already used free tier after the last reset
      const userId = uid || userUid;
      if (userId) {
        try {
          const user = await storage.getUserByUid(userId);
          if (user) {
            const existingSubmissions = await storage.getSubmissionsByUser(user.id);
            const resetTimestamp = await getFreeTierResetTimestamp();

            // Filter free tier submissions to only those after the last reset
            const freeSubmissionsAfterReset = existingSubmissions.filter(sub => {
              if (sub.tier !== 'free') return false;
              if (!resetTimestamp) return true; // No reset timestamp means check all submissions
              return new Date(sub.submittedAt) > resetTimestamp;
            });

            if (freeSubmissionsAfterReset.length > 0) {
              return res.status(403).json({
                success: false,
                error: 'You have already used the free tier once. Please choose a paid tier.'
              });
            }
          }
        } catch (error) {
          console.error('❌ Error checking free tier usage:', error);
        }        
      }
    }

    // Validate tier and poem count
    if (!validateTierPoemCount(tier, titles.length)) {
      return res.status(400).json({
        success: false,
        error: `Invalid poem count for tier ${tier}. Expected ${TIER_POEM_COUNTS[tier]}, got ${titles.length}`
      });
    }

    // Separate poem files and photo file
    const poemFiles = req.files?.filter((f: any) => 
      f.fieldname === 'poems' || f.originalname?.toLowerCase().includes('poem')
    ) || [];

    const photoFile = req.files?.find((f: any) => 
      f.fieldname === 'photo' || 
      f.fieldname === 'photoFile' || 
      f.mimetype?.startsWith('image/')
    );

    console.log('📁 Identified files:', {
      poemFiles: poemFiles.length,
      photoFile: photoFile?.originalname
    });

    // Upload files to Cloudinary
    let poemFileUrls = [];
    let photoFileUrl = null;

    if (poemFiles.length > 0) {
      console.log('☁️ Uploading poem files to Cloudinary...');

      try {
        // Upload each poem file to Cloudinary
        for (let i = 0; i < poemFiles.length; i++) {
          const file = poemFiles[i];
          const poemTitle = titles[i] || `poem_${i + 1}`;
          
          console.log(`📄 Uploading poem ${i + 1}/${poemFiles.length}: ${poemTitle}`);
          
          const fileUrl = await uploadPoemFileToCloudinary(
            file.buffer,
            email,
            file.originalname,
            poemTitle
          );
          
          poemFileUrls.push(fileUrl);
          console.log(`✅ Poem ${i + 1} uploaded to Cloudinary:`, fileUrl);
        }
        
        console.log('✅ All poem files uploaded to Cloudinary:', poemFileUrls.length);
      } catch (error) {
        console.error('❌ Failed to upload poem files to Cloudinary:', error);

        return res.status(500).json({
          success: false,
          error: `Failed to upload poem files: ${error.message}`
        });
      }
    }

    if (photoFile) {
      console.log('☁️ Uploading photo file to Cloudinary...');
      console.log('📸 Photo file details:', {
        name: photoFile.originalname,
        size: photoFile.size,
        type: photoFile.mimetype
      });

      try {
        photoFileUrl = await uploadPhotoFileToCloudinary(photoFile.buffer, email, photoFile.originalname);
        console.log('✅ Photo file uploaded to Cloudinary:', photoFileUrl);
      } catch (error) {
        console.error('❌ Failed to upload photo file to Cloudinary:', error);
        console.log('⚠️ Continuing submission without photo URL (photo is optional)');
      }
    } else {
      console.log('⚠️ No photo file found in request');
    }

    // Create or find user - FIXED VERSION
    let user = null;
    if (userId) {
      console.log('🔍 Looking for user with UID:', userId);
      user = await storage.getUserByUid(userId);
      if (!user) {
        console.log('🔄 Creating new user:', email);
        user = await storage.createUser({
          uid: userId,
          email,
          name: firstName + (lastName ? ` ${lastName}` : ''),
          phone: phone || null
        });
        console.log('✅ User created:', user.email);
      } else {
        console.log('✅ User found:', user.email);
      }
      console.log('🔗 Will link all submissions to user ID:', user.id);
    } else {
      // Try to find user by email as fallback
      console.log('⚠️ No UID provided, trying to find user by email:', email);
      try {
        const existingUsers = await storage.getAllUsers?.() || [];
        user = existingUsers.find(u => u.email === email) || null;
        if (user) {
          console.log('✅ Found user by email:', user.email);
        } else {
          console.log('⚠️ No user found by email, creating submissions without user link');
        }
      } catch (error) {
        console.log('⚠️ Could not search for user by email, creating submissions without user link');
      }
    }

    // Create submissions for each poem
    const submissionUuid = crypto.randomUUID();
    const submissions = [];

    for (let i = 0; i < titles.length; i++) {
      const submissionData = {
        userId: user?.id || null, // CRITICAL: Link to user
        firstName,
        lastName: lastName || '',
        email,
        phone: phone || '',
        age: age ? parseInt(age) : null,
        poemTitle: titles[i],
        tier,
        price: price ? parseFloat(price) : 0, // Same price for all poems in the submission
        paymentId: paymentId || null, // Same payment ID for all poems
        paymentMethod: paymentMethod || 'free',
        poemFileUrl: poemFileUrls[i] || null,
        photoFileUrl: photoFileUrl,
        submissionUuid: submissionUuid,
        poemIndex: i + 1,
        totalPoemsInSubmission: titles.length,
        submittedAt: new Date(),
        status: 'Pending',
        type: 'Human'
      };

      console.log(`💾 Saving submission ${i + 1}/${titles.length}: ${titles[i]}`);
      const submission = await storage.createSubmission(submissionData);
      submissions.push(submission);
    }

    console.log('✅ All submissions saved');

    // Background tasks - don't wait for these to complete
    // This ensures fast response to user while still completing necessary tasks
    setImmediate(async () => {
      try {
        // Add to Google Sheets in background with proper file URLs
        console.log('🔍 File URLs being sent to sheets:', {
          titles: titles.length,
          poemFileUrls: poemFileUrls.length,
          photoFileUrl: photoFileUrl ? 'YES' : 'NO',
          poemFileUrlsType: typeof poemFileUrls,
          photoFileUrlType: typeof photoFileUrl,
        });

        // Validate URLs before sending to sheets
        if (poemFileUrls && Array.isArray(poemFileUrls)) {
          poemFileUrls.forEach((url, index) => {
            if (url && !url.startsWith('https://drive.google.com/')) {
              console.warn(`⚠️ Poem file URL ${index + 1} does not look like a Google Drive link:`, url);
            }
          });
        }
        if (photoFileUrl && !photoFileUrl.startsWith('https://drive.google.com/')) {
          console.warn('⚠️ Photo file URL does not look like a Google Drive link:', photoFileUrl);
        }

        await addMultiplePoemsToSheet({
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          age: age,
          tier: tier,
          price: price ? parseFloat(price) : 0,
          paymentId: paymentId,
          paymentMethod: paymentMethod,
          titles: titles,
          submissionUuid: submissionUuid,
          submissionIds: submissions.map(s => s.id),
          poemFileUrls: poemFileUrls, // This should now contain the actual URLs
          photoFileUrl: photoFileUrl  // This should now contain the actual URL
        });
        console.log('✅ Google Sheets updated for multiple submissions:', submissionUuid);
      } catch (sheetError) {
        console.error('⚠️ Failed to add to Google Sheets:', sheetError);
      }

      try {
        // Send confirmation email in background
        await sendMultiplePoemsConfirmation(email, {
          name: firstName,
          poemTitles: titles,
          tier,
          submissionUuid
        });
        console.log('✅ Email sent for multiple submissions:', submissionUuid);
      } catch (emailError) {
        console.error('⚠️ Failed to send email:', emailError);
      }

      try {
        // Record coupon usage if coupon was used (for first submission only to avoid duplicates)
        const couponCode = req.body.couponCode;
        const couponDiscount = req.body.couponDiscount;

        if (couponCode && couponDiscount > 0 && submissions.length > 0) {
          await fetch(`${req.protocol}://${req.get('host')}/api/record-coupon-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: couponCode,
              uid: userId,
              email: email,
              submissionId: submissions[0].id, // Use first submission ID
              discountAmount: couponDiscount
            })
          });
          console.log('✅ Coupon usage recorded for multiple submissions:', submissionUuid);
        }
      } catch (couponError) {
        console.error('⚠️ Failed to record coupon usage:', couponError);
      }
    });

    // Clean up uploaded files
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Warning: Could not delete temp file:', file.path);
        }
      });
    }

    console.log('🎉 Multiple poems submission completed successfully!');

    res.json({
      success: true,
      message: `${titles.length} poems submitted successfully!`,
      submissionUuid,
      submissionIds: submissions.map(s => s.id),
      totalSubmissions: titles.length
    });

  } catch (error) {
    console.error('❌ Multiple poems submission error:', error);

    // Clean up files on error
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          // Ignore cleanup errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Multiple poems submission failed: ' + error.message
    });
  }
}));

// ===== LEGACY SUBMISSION ENDPOINTS (Backward Compatibility) =====

// Legacy single poem submission
router.post('/api/submit', safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📝 Legacy single poem submission received (redirecting to new endpoint)');

  // Just redirect to the new endpoint logic
  const {
    firstName,
    lastName,
    email,
    phone,
    age,
    poemTitle,
    tier = 'free', // Default to free for legacy submissions
    paymentId,
    paymentMethod = 'free'
  } = req.body;

  try {
    // Basic validation
    if (!firstName || !email || !poemTitle) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, email, poemTitle'
      });
    }

    // Find uploaded files
    let poemFile = null;
    let photoFile = null;

    if (req.files && Array.isArray(req.files)) {
      poemFile = req.files.find((f: any) => 
        f.fieldname === 'poemFile' || 
        f.fieldname === 'poems' || 
        f.originalname?.toLowerCase().includes('poem')
      );

      photoFile = req.files.find((f: any) => 
        f.fieldname === 'photoFile' || 
        f.fieldname === 'photo' || 
        f.mimetype?.startsWith('image/')
      );
    }

    // Upload files to Cloudinary
    let poemFileUrl = null;
    let photoFileUrl = null;

    if (poemFile) {
      try {
        poemFileUrl = await uploadPoemFileToCloudinary(poemFile.buffer, email, poemFile.originalname, poemTitle);
        console.log('✅ Poem file uploaded to Cloudinary:', poemFileUrl);
      } catch (error) {
        console.error('❌ Failed to upload poem file to Cloudinary:', error);
      }
    }

    if (photoFile) {
      try {
        photoFileUrl = await uploadPhotoFileToCloudinary(photoFile.buffer, email, photoFile.originalname);
        console.log('✅ Photo file uploaded to Cloudinary:', photoFileUrl);
      } catch (error) {
        console.error('❌ Failed to upload photo file to Cloudinary:', error);
      }
    }

    // Save to database (legacy endpoint but using persistent storage)
    const submissionData = {
      userId: null, // Legacy submissions don't have user links
      firstName,
      lastName: lastName || '',
      email,
      phone: phone || '',
      age: age ? parseInt(age) : null,
      poemTitle,
      tier,
      price: tier === 'free' ? 0 : TIER_PRICES[tier as keyof typeof TIER_PRICES] || 0,
      paymentId: paymentId || null,
      paymentMethod,
      poemFileUrl: poemFileUrl,
        photoFileUrl: photoFileUrl,
        submissionUuid: crypto.randomUUID(),
      poemIndex: 1,
      totalPoemsInSubmission: 1,
      submittedAt: new Date(),
      status: 'Pending',
      type: 'Human'
    };

    const submission = await storage.createSubmission(submissionData);

    // Add to Google Sheets with proper file URLs
    try {
      await addPoemSubmissionToSheet({
        ...submission,
        poemFileUrl: poemFileUrl, // Explicitly pass poem file URL
        photoFileUrl: photoFileUrl // Explicitly pass photo file URL
      });
    } catch (sheetError) {
      console.error('⚠️ Failed to add to Google Sheets:', sheetError);
    }

    // Send confirmation email
    try {
      await sendSubmissionConfirmation(email, {
        name: firstName,
        poemTitle,
        tier,
        submissionId: submission.id
      });
    } catch (emailError) {
      console.error('⚠️ Failed to send email:', emailError);
    }

    // Clean up uploaded files
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Warning: Could not delete temp file:', file.path);
        }
      });
    }

    res.json({
      success: true,
      message: 'Poem submitted successfully!',
      submissionId: submission.id
    });

  } catch (error) {
    console.error('❌ Legacy submission error:', error);

    // Clean up files on error
    if (req.files) {
      req.files.forEach((file: any) => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          // Ignore cleanup errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Submission failed: ' + error.message
    });
  }
}));

// ===== ADMIN/RESULTS ENDPOINTS =====

// Get all submissions (admin)
router.get('/api/submissions', asyncHandler(async (req: any, res: any) => {
  try {
    const submissions = await storage.getAllSubmissions();
    console.log(`✅ Retrieved ${submissions.length} total submissions`);

    // Transform submissions
    const transformedSubmissions = submissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName || ''}`.trim(),
      email: sub.email,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      price: parseFloat(sub.price?.toString() || '0'),
      submittedAt: sub.submittedAt,
      isWinner: sub.isWinner || false,
      winnerPosition: sub.winnerPosition,
      score: sub.score,
      type: sub.type || 'Human',
      status: sub.status || 'Pending',
      scoreBreakdown: sub.scoreBreakdown ? JSON.parse(sub.scoreBreakdown) : null
    }));

    res.json(transformedSubmissions);
  } catch (error) {
    console.error('❌ Error getting all submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
}));

// Get submission count from database
router.get('/api/submission-count', asyncHandler(async (req: any, res: any) => {
  try {
    // Get count from database instead of Google Sheets for real-time accuracy
    const submissions = await storage.getAllSubmissions();
    const count = submissions.length;
    res.json({ count });
  } catch (error) {
    console.error('❌ Error getting submission count:', error);
    res.status(500).json({ error: 'Failed to get submission count' });
  }
}));

// Contact form submission
router.post('/api/contact', asyncHandler(async (req: any, res: any) => {
  const { name, email, phone, message, timestamp } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required'
    });
  }

  try {
    // Store in database
    await storage.addContact({ name, email, phone, message });

    // Send to Google Sheets with phone number
    await addContactToSheet({ name, email, phone, message });

    res.json({
      success: true,
      message: 'Contact form submitted successfully'
    });
  } catch (error) {
    console.error('❌ Contact form submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form'
    });
  }
}));

// Get legacy submissions from database
router.get('/api/legacy-submissions', asyncHandler(async (req: any, res: any) => {
  try {
    const submissions = await storage.getAllSubmissions();
    // Transform to legacy format
    const legacySubmissions = submissions.map(sub => ({
      id: sub.id,
      firstName: sub.firstName,
      lastName: sub.lastName || '',
      email: sub.email,
      phone: sub.phone || '',
      age: sub.age?.toString() || '',
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      paymentId: sub.paymentId,
      paymentMethod: sub.paymentMethod || 'free',
      poemFileUrl: sub.poemFileUrl,
      photoFileUrl: sub.photoUrl,
      submittedAt: sub.submittedAt?.toISOString()
    }));
    res.json(legacySubmissions);
  } catch (error) {
    console.error('❌ Error getting legacy submissions:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
}));

// Admin CSV upload endpoint
router.post('/api/admin/upload-csv', requireAdmin, safeUploadAny, asyncHandler(async (req: any, res: any) => {
  console.log('📊 Admin CSV upload request received');

  const allowedMimeTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No CSV file uploaded'
    });
  }

  const uploadedFile = req.files[0];

  console.log('📁 Uploaded file info:', {
    mimetype: uploadedFile.mimetype,
    filename: uploadedFile.originalname,
    size: uploadedFile.size
  });

  if (!allowedMimeTypes.includes(uploadedFile.mimetype) && !uploadedFile.originalname?.endsWith('.csv')) {
    return res.status(400).json({
      success: false,
      error: `Invalid file type. Only CSV files are allowed. Received: ${uploadedFile.mimetype}`
    });
  }


  try {
    const csvContent = uploadedFile.buffer.toString('utf-8');   //Modified as upload middleware is removed
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty'
      });
    }

    // Expected header: email,poemtitle,score,type,originality,emotion,structure,language,theme,status
    const header = lines[0].toLowerCase();
    if (!header.includes('email') || !header.includes('poemtitle') || !header.includes('score')) {
      return res.status(400).json({
        success: false,
        error: 'CSV file must contain email, poemtitle, and score columns'
      });
    }

    let processed = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = line.split(',');
        if (values.length < 10) {
          errors.push(`Line ${i + 1}: Insufficient columns`);
          continue;
        }

        const [email, poemTitle, score, type, originality, emotion, structure, language, theme, status, winner] = values;

        // Find the submission to update
        const submissions = await storage.getSubmissionsByEmailAndTitle(email.trim(), poemTitle.trim());

        if (submissions.length === 0) {
          errors.push(`Line ${i + 1}: No submission found for ${email} - ${poemTitle}`);
          continue;
        }

        // Parse winner information
        const winnerValue = winner?.trim().toLowerCase();
        const isWinner = winnerValue === 'true' || winnerValue === '1' || winnerValue === 'yes' || winnerValue === 'winner';
        let winnerPosition = null;

        // Check if winner value is a position number (1, 2, 3)
        if (winnerValue && ['1', '2', '3'].includes(winnerValue)) {
          winnerPosition = parseInt(winnerValue);
        }

        // Update the submission
        for (const submission of submissions) {
          await storage.updateSubmissionEvaluation(submission.id, {
            score: parseInt(score) || 0,
            type: type.trim() || 'Human',
            scoreBreakdown: JSON.stringify({
              originality: parseInt(originality) || 0,
              emotion: parseInt(emotion) || 0,
              structure: parseInt(structure) || 0,
              language: parseInt(language) || 0
            }),
            status: status.trim() || 'Evaluated',
            isWinner: isWinner,
            winnerPosition: winnerPosition
          });
        }

        processed++;
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    // fs.unlinkSync(req.file.path);   //Modified as upload middleware is removed

    res.json({
      success: true,
      message: `Successfully processed ${processed} records`,
      processed,
      errors: errors.slice(0, 10) // Limit errors to first 10
    });

  } catch (error) {
    console.error('❌ CSV upload error:', error);

    // Clean up uploaded file
    // if (req.file) {    //Modified as upload middleware is removed
    //   try {
    //     fs.unlinkSync(req.file.path);
    //   } catch (cleanupError) {
    //     console.error('Failed to clean up file:', cleanupError);
    //   }
    // }

    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file: ' + error.message
    });
  }
}));

// Debug endpoint to manually trigger user-submission linking
router.post('/api/debug/fix-user-links', asyncHandler(async (req: any, res: any) => {
  try {
    console.log('🔧 Manual user-submission linking triggered...');

    // Get all submissions that don't have a user_id but have email addresses
    const unlinkedSubmissions = await client.query(`
      SELECT id, email, first_name, last_name 
      FROM submissions 
      WHERE user_id IS NULL AND email IS NOT NULL
      ORDER BY submitted_at DESC
    `);

    if (unlinkedSubmissions.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No unlinked submissions found',
        linked: 0,
        usersCreated: 0
      });
    }

    console.log(`🔍 Found ${unlinkedSubmissions.rows.length} unlinked submissions`);

    let linked = 0;
    let usersCreated = 0;

    for (const submission of unlinkedSubmissions.rows) {
      // Try to find a user with this email
      let userResult = await client.query(`
        SELECT id, email FROM users WHERE email = $1
      `, [submission.email]);

      let user;

      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
        console.log(`👤 Found existing user for ${submission.email}`);
      } else {
        // Create a user account for this submission
        console.log(`👤 Creating user account for ${submission.email}`);
        try {
          const newUserResult = await client.query(`
            INSERT INTO users (uid, email, name, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, email
          `, [
            `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique UID
            submission.email,
            `${submission.first_name} ${submission.last_name || ''}`.trim()
          ]);

          user = newUserResult.rows[0];
          usersCreated++;
          console.log(`✅ Created user account for ${submission.email}`);
        } catch (createError) {
          console.error(`❌ Failed to create user for ${submission.email}:`, createError.message);
          continue; // Skip this submission
        }
      }

      if (user) {
        // Link the submission to this user
        await client.query(`
          UPDATE submissions 
          SET user_id = $1 
          WHERE id = $2
        `, [user.id, submission.id]);

        console.log(`✅ Linked submission ${submission.id} to user ${user.email}`);
        linked++;
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${unlinkedSubmissions.rows.length} submissions!`,
      totalProcessed: unlinkedSubmissions.rows.length,
      usersCreated,
      linked
    });

  } catch (error) {
    console.error('❌ Manual linking failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Admin endpoint to update winner status
router.post('/api/admin/update-winner/:id', requireAdmin, asyncHandler(async (req: any, res: any) => {
  const submissionId = parseInt(req.params.id);
  const { isWinner, winnerPosition, winnerCategory } = req.body;

  try {
    console.log('🏆 Updating winner status for submission:', submissionId);

    await storage.updateSubmissionEvaluation(submissionId, {
      isWinner: isWinner || false,
      winnerPosition: winnerPosition || null,
      winnerCategory: winnerCategory || null
    });

    res.json({
      success: true,
      message: 'Winner status updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating winner status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update winner status'
    });
  }
}));

// Debug endpoint to check specific user admin status
router.get('/api/debug/check-admin/:email', asyncHandler(async (req: any, res: any) => {
  const { email } = req.params;

  try {
    console.log('🔍 Checking admin status for:', email);

    // Check hardcoded admins
    const hardcodedAdmins = [
      'shivaaymehra2@gmail.com',
      'bhavyaseth2005@gmail.com',
      'writorycontest@gmail.com',
      'admin@writory.com'
    ];

    const isHardcodedAdmin = hardcodedAdmins.includes(email);

    // Check database
    const isDatabaseAdmin = await isAdmin(email);

    // Check all admin users in database
    const allAdmins = await client.query('SELECT email, role, created_at FROM admin_users ORDER BY created_at DESC');

    res.json({
      success: true,
      email,
      isHardcodedAdmin,
      isDatabaseAdmin,
      overallAdminStatus: isHardcodedAdmin || isDatabaseAdmin,
      allDatabaseAdmins: allAdmins.rows,
      hardcodedAdmins
    });

  } catch (error) {
    console.error('❌ Admin check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Debug endpoint to check admin status
router.get('/api/debug/admin-status', asyncHandler(async (req: any, res: any) => {
  const userEmail = req.headers['x-user-email'];

  try {
    console.log('🔍 Debug admin status check for:', userEmail);

    if (!userEmail) {
      return res.json({
        success: false,
        error: 'No user email provided in headers',
        headers: req.headers
      });
    }

    // Check all admin users
    const allAdmins = await client.query('SELECT email, role, created_at FROM admin_users ORDER BY created_at DESC');

    // Check specific user
    const userAdmin = await client.query('SELECT * FROM admin_users WHERE email = $1', [userEmail]);

    const isAdminUser = await isAdmin(userEmail as string);

    res.json({
      success: true,
      userEmail,
      isAdmin: isAdminUser,
      userAdminRecord: userAdmin.rows[0] || null,
      allAdmins: allAdmins.rows,
      totalAdmins: allAdmins.rows.length
    });

  } catch (error) {
    console.error('❌ Admin status debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Debug endpoint to check Cloudinary and Sheets configuration
router.get('/api/debug/config', asyncHandler(async (req: any, res: any) => {
  try {
    console.log('🔍 Checking system configuration...');

    const config = {
      hasCloudinaryCredentials: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      hasGoogleSheetId: !!process.env.GOOGLE_SHEET_ID,
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || 'NOT_SET',
      googleSheetId: process.env.GOOGLE_SHEET_ID || 'NOT_SET',
      databaseUrl: process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT_SET'
    };

    // Test Cloudinary connection
    let cloudinaryTest = null;
    try {
      const { cloudinary } = await import('./cloudinary.js');
      cloudinaryTest = 'CONNECTION_READY';
    } catch (cloudinaryError) {
      cloudinaryTest = `ERROR: ${cloudinaryError.message}`;
    }

    // Test Google Sheets connection
    let sheetsTest = null;
    try {
      const { initializeSheetHeaders } = await import('./google-sheets.js');
      sheetsTest = 'CONNECTION_READY';
    } catch (sheetsError) {
      sheetsTest = `ERROR: ${sheetsError.message}`;
    }

    res.json({
      success: true,
      config,
      cloudinaryTest,
      sheetsTest,
      recommendations: [
        !config.hasCloudinaryCredentials && 'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Secrets',
        !config.hasGoogleSheetId && 'Set GOOGLE_SHEET_ID in Secrets',
        !config.databaseUrl && 'Set DATABASE_URL in Secrets',
      ].filter(Boolean)
    });
  } catch (error) {
    console.error('❌ Config debug error:', error);
    res.status(500).json({ error: error.message });
  }
}));

// Debug endpoint to check winner data
router.get('/api/debug/winners', asyncHandler(async (req: any, res: any) => {
  try {
    const { email } = req.query;

    let query = `
      SELECT id, email, first_name, last_name, poem_title, is_winner, winner_position, 
             score, status, submission_uuid, submitted_at
      FROM submissions 
    `;

    let params = [];

    if (email) {
      query += ` WHERE email = $1`;
      params.push(email);
    }

    query += ` ORDER BY submitted_at DESC`;

    const result = await client.query(query, params);

    const winners = result.rows.filter(row => row.is_winner);
    const totalWins = winners.length;

    res.json({
      success: true,
      totalSubmissions: result.rows.length,
      totalWinners: totalWins,
      winners: winners.map(w => ({
        id: w.id,
        email: w.email,
        name: `${w.first_name} ${w.last_name || ''}`.trim(),
        poemTitle: w.poem_title,
        isWinner: w.is_winner,
        winnerPosition: w.winner_position,
        score: w.score,
        submittedAt: w.submitted_at
      })),
      allSubmissions: result.rows.map(s => ({
        id: s.id,
        email: s.email,
        name: `${s.first_name} ${s.last_name || ''}`.trim(),
        poemTitle: s.poem_title,
        isWinner: s.is_winner,
        winnerPosition: s.winner_position,
        score: s.score,
        status: s.status,
        submittedAt: s.submitted_at
      }))
    });
  } catch (error) {
    console.error('❌ Winners debug endpoint error:', error);
    res.status(500).json({ error: 'Debug query failed' });
  }
}));

// Debug endpoint to check submission linking
router.get('/api/debug/submissions', asyncHandler(async (req: any, res: any) => {
  try {
    // Get total submissions count
    const totalResult = await storage.getAllSubmissions();
    const total = totalResult.length;

    // Get submissions with user links
    const linkedResult = await client.query(`
      SELECT COUNT(*) FROM submissions WHERE user_id IS NOT NULL
    `);
    const linked = parseInt(linkedResult.rows[0].count);

    // Get submissions without user links
    const unlinkedResult = await client.query(`
      SELECT COUNT(*) FROM submissions WHERE user_id IS NULL
    `);
    const unlinked = parseInt(unlinkedResult.rows[0].count);

    // Get recent submissions
    const recentResult = await client.query(`
      SELECT id, email, first_name, last_name, poem_title, user_id, submitted_at
      FROM submissions 
      ORDER BY submitted_at DESC 
      LIMIT 10
    `);

    // Get all users
    const usersResult = await client.query(`SELECT COUNT(*) FROM users`);
    const totalUsers = parseInt(usersResult.rows[0].count);

    res.json({
      success: true,
      summary: {
        totalSubmissions: total,
        linkedToUsers: linked,
        unlinkedSubmissions: unlinked,
        totalUsers: totalUsers
      },
      recentSubmissions: recentResult.rows.map(sub => ({
        id: sub.id,
        email: sub.email,
        name: `${sub.first_name} ${sub.last_name || ''}`.trim(),        poemTitle: sub.poem_title,
        userId: sub.user_id,
        hasUserLink: !!sub.user_id,
        submittedAt: sub.submitted_at
      }))
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug query failed' });
  }
}));

// This code updates the user profile to allow name changes and handles null values correctly.
router.put('/api/user/profile', asyncHandler(async (req: any, res: any) => {
  console.log('📝 Profile update request received');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { uid, name, email, profilePictureUrl } = req.body;

  if (!uid) {
    console.log('❌ No UID provided in profile update');
    return res.status(400).json({ 
      success: false, 
      error: 'User ID is required' 
    });
  }

  try {
    console.log(`🔍 Looking for user with UID: ${uid}`);

    // Ensure database connection
    await connectDatabase();

    // Get current user
    const currentUser = await client.query(
      'SELECT * FROM users WHERE uid = $1',
      [uid]
    );

    if (currentUser.rows.length === 0) {
      console.log('❌ User not found with UID:', uid);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ Current user found:', currentUser.rows[0].email);

    // Check if email is changing and if new email already exists
    if (email && email.trim() !== currentUser.rows[0].email) {
      console.log(`📧 Email change requested: ${currentUser.rows[0].email} → ${email.trim()}`);

      const emailExists = await client.query(
        'SELECT id FROM users WHERE email = $1 AND uid != $2',
        [email.trim(), uid]
      );

      if (emailExists.rows.length > 0) {
        console.log('❌ Email already exists:', email.trim());
        return res.status(400).json({
          success: false,
          error: 'Email already taken'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (name !== undefined && name !== null && name.trim() !== currentUser.rows[0].name) {
      updates.push(`name = $${valueIndex++}`);
      values.push(name.trim());
      console.log('📝 Name will be updated to:', name.trim());
    }

    if (email !== undefined && email !== null && email.trim() !== currentUser.rows[0].email) {
      updates.push(`email = $${valueIndex++}`);
      values.push(email.trim());
      console.log('📧 Email will be updated to:', email.trim());
    }

    if (profilePictureUrl !== undefined) {
      updates.push(`profile_picture_url = $${valueIndex++}`);
      values.push(profilePictureUrl);
      console.log('🖼️ Profile picture will be updated');
    }

    // Always update the timestamp
    updates.push(`updated_at = NOW()`);

    // Add the UID for WHERE clause
    values.push(uid);
    const whereIndex = valueIndex;

    if (updates.length === 1) { // Only timestamp update
      console.log('⚠️ No valid fields to update');
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE uid = $${whereIndex}
      RETURNING *
    `;

    console.log('🔄 Executing update query:', updateQuery);
    console.log('📊 Query values:', values);

    const result = await client.query(updateQuery, values);

    if (result.rows.length === 0) {
      console.log('❌ Update failed - no rows affected');
      return res.status(404).json({
        success: false,
        error: 'User not found or update failed'
      });
    }

    const updatedUser = result.rows[0];
    console.log('✅ User profile updated successfully');
    console.log('📊 Updated user data:', JSON.stringify(updatedUser, null, 2));

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        uid: updatedUser.uid,        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        profilePictureUrl: updatedUser.profile_picture_url,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Final error handler
router.use((error: any, req: any, res: any, next: any) => {
  console.error('🚨 Final error handler:', error);
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
});

// Register routes function
export function registerRoutes(app: any) {
  console.log('🛣️  Registering API routes...');
  app.use('/', router);
  console.log('✅ Routes registered successfully');
}

// Export router
export { router };



// Reset Google Sheets headers endpoint
router.post('/api/admin/reset-sheet-headers', requireAdmin, asyncHandler(async (req: any, res: any) => {
  console.log('🔄 Manually resetting Google Sheets headers...');

  try {
    const { initializeSheetHeaders } = await import('./google-sheets.js');
    await initializeSheetHeaders();

    console.log('✅ Google Sheets headers reset completed successfully');
    res.json({
      success: true,
      message: 'Google Sheets headers have been reset to the correct format.'
    });
  } catch (error) {
    console.error('❌ Error resetting Google Sheets headers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset Google Sheets headers: ' + error.message
    });
  }
}));

// Reset free tier submissions endpoint
router.post('/api/admin/reset-free-tier', requireAdmin, asyncHandler(async (req: any, res: any) => {
  console.log('🔄 Resetting free tier submissions...');

  try {
    const result = await resetFreeTierSubmissions();

    if (result) {
      console.log('✅ Free tier reset completed successfully');
      res.json({
        success: true,
        message: 'Free tier submissions have been reset. All users can now submit the form again once.'
      });
    } else {
      console.error('❌ Failed to reset free tier submissions');
      res.status(500).json({
        success: false,
        error: 'Failed to reset free tier submissions'
      });
    }
  } catch (error) {
    console.error('❌ Error resetting free tier submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset free tier submissions: ' + error.message
    });
  }
}));

// Updated free tier check logic to use reset timestamp and consistent formatting.
// This change ensures accurate determination of free tier availability after a reset.