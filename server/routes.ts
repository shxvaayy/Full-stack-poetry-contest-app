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

const router = Router();
const upload = multer({ dest: 'uploads/' });
const submissions: any[] = [];

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

router.use('/', paypalRouter);

// Submit poem with proper storage sync
router.post('/api/submit-poem', upload.fields([
  { name: 'poem', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, age, poemTitle, tier, amount,
      paymentId, paymentMethod, userUid
    } = req.body;

    if (!firstName || !email || !poemTitle || !tier) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let poemFileUrl = '';
    let photoFileUrl = '';

    try {
      if (files?.poem && files.poem[0]) {
        const poemFile = files.poem[0];
        const poemBuffer = fs.readFileSync(poemFile.path);
        poemFileUrl = await uploadPoemFile(poemBuffer, email, poemFile.originalname);
        try { fs.unlinkSync(poemFile.path); } catch {}
      }

      if (files?.photo && files.photo[0]) {
        const photoFile = files.photo[0];
        const photoBuffer = fs.readFileSync(photoFile.path);
        photoFileUrl = await uploadPhotoFile(photoBuffer, email, photoFile.originalname);
        try { fs.unlinkSync(photoFile.path); } catch {}
      }
    } catch (uploadError) {
      console.error('File upload warning:', uploadError);
    }

    // Ensure user exists in storage
    let user;
    try {
      user = await storage.getUserByUid(userUid);
      if (!user) {
        user = await storage.createUser({
          uid: userUid,
          email: email,
          name: `${firstName}${lastName ? ' ' + lastName : ''}`,
          phone: phone || null
        });
      }
    } catch (userError) {
      return res.status(500).json({
        error: 'Failed to process user data'
      });
    }

    // Save to local storage (primary)
    let localSubmission;
    try {
      localSubmission = await storage.createSubmission({
        userId: user.id,
        firstName: firstName,
        lastName: lastName || null,
        email: email,
        phone: phone || null,
        age: age || null,
        poemTitle: poemTitle,
        tier: tier,
        price: parseFloat(amount) || 0,
        poemFileUrl: poemFileUrl || null,
        photoUrl: photoFileUrl || null,
        paymentId: paymentId || null,
        paymentMethod: paymentMethod || null
      });
      
      // Update submission count
      const now = new Date();
      const contestMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentCount = await storage.getUserSubmissionCount(user.id, contestMonth);
      const isFreeSubmission = tier === 'free';
      const newTotalCount = (currentCount?.totalSubmissions || 0) + 1;
      const freeUsed = currentCount?.freeSubmissionUsed || isFreeSubmission;
      
      await storage.updateUserSubmissionCount(user.id, contestMonth, freeUsed, newTotalCount);
      
    } catch (storageError) {
      return res.status(500).json({
        error: 'Failed to save submission'
      });
    }

    // Backup to Google Sheets
    try {
      const submissionData = {
        timestamp: new Date().toISOString(),
        name: `${firstName}${lastName ? ' ' + lastName : ''}`,
        email, phone: phone || '', age: age || '', poemTitle, tier,
        amount: amount || '0', poemFile: poemFileUrl, photo: photoFileUrl
      };
      await addPoemSubmissionToSheet(submissionData);
    } catch (sheetsError) {
      console.error('Google Sheets warning:', sheetsError);
    }

    res.json({
      success: true,
      submissionId: localSubmission.id,
      message: 'Poem submitted successfully!',
      poemFileUrl, photoFileUrl
    });

  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to submit poem'
    });
  }
});

// API endpoints for user management
router.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await storage.getUserByUid(uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.post('/api/users', async (req, res) => {
  try {
    const { uid, email, name, phone } = req.body;
    const user = await storage.createUser({
      uid, email, name: name || null, phone: phone || null
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/api/users/:uid/submissions', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await storage.getUserByUid(uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userSubmissions = await storage.getSubmissionsByUser(user.id);
    const formattedSubmissions = userSubmissions.map(sub => ({
      id: sub.id,
      name: `${sub.firstName}${sub.lastName ? ' ' + sub.lastName : ''}`,
      poemTitle: sub.poemTitle,
      tier: sub.tier,
      amount: sub.price,
      submittedAt: sub.submittedAt.toISOString(),
      isWinner: sub.isWinner || false,
      winnerPosition: sub.winnerPosition || null
    }));
    
    res.json(formattedSubmissions);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

router.get('/api/users/:uid/submission-status', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await storage.getUserByUid(uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const now = new Date();
    const contestMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const submissionCount = await storage.getUserSubmissionCount(user.id, contestMonth);
    
    res.json({
      freeSubmissionUsed: submissionCount?.freeSubmissionUsed || false,
      totalSubmissions: submissionCount?.totalSubmissions || 0,
      contestMonth: contestMonth
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get submission status' });
  }
});

// Statistics endpoint for home page
router.get('/api/stats/submissions', async (req, res) => {
  try {
    const allSubmissions = await storage.getAllSubmissions();
    const totalPoets = allSubmissions.length;
    
    let sheetsCount = 0;
    try {
      sheetsCount = await getSubmissionCountFromSheet();
    } catch (sheetsError) {
      console.warn('Could not get Google Sheets count:', sheetsError.message);
    }
    
    const finalCount = Math.max(totalPoets, sheetsCount);
    
    res.json({
      totalPoets: finalCount,
      localCount: totalPoets,
      sheetsCount: sheetsCount
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export function registerRoutes(app: any) {
  app.use('/', router);
}

export default router;
