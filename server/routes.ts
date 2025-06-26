import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertSubmissionSchema, insertContactSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { addContactToSheet, addPoemSubmissionToSheet, initializeSheetHeaders, getSubmissionCountFromSheet } from "./google-sheets";
import { uploadPoemFile, uploadPhotoFile } from "./google-drive";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("📁 File received:", file.fieldname, file.originalname, file.mimetype);
    
    if (file.fieldname === 'poemFile') {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid poem file type. Only PDF, DOC, DOCX allowed.'));
      }
    } else if (file.fieldname === 'photoFile') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid photo file type. Only images allowed.'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

const getCurrentContestMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Google Sheets headers
  await initializeSheetHeaders();
  
  // Create payment intent for paid tiers
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, tier, email } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: 'inr', // Indian Rupees
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          tier,
          email,
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      console.error("❌ Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Verify payment status
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      res.json({
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      });
    } catch (error) {
      console.error("❌ Error verifying payment:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });
  
  // Get submission statistics - READ FROM GOOGLE SHEETS with NO CACHE
  app.get("/api/stats/submissions", async (req, res) => {
    try {
      console.log("📊 Stats endpoint called - checking Google Sheets");
      
      // Set headers to prevent caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // Try to get count from Google Sheets first
      let totalPoets = 0;
      let source = 'memory';
      
      try {
        totalPoets = await getSubmissionCountFromSheet();
        source = 'google_sheets';
        console.log(`📈 Total submissions from Google Sheets: ${totalPoets}`);
      } catch (sheetError) {
        console.warn("⚠️ Could not read from Google Sheets, falling back to memory:", sheetError);
        // Fallback to memory storage
        const allSubmissions = await storage.getAllSubmissions();
        totalPoets = allSubmissions.length;
        source = 'memory';
        console.log(`📈 Total submissions from memory: ${totalPoets}`);
      }
      
      const response = {
        totalPoets,
        totalSubmissions: totalPoets,
        lastUpdated: new Date().toISOString(),
        source,
        timestamp: Date.now() // Add timestamp to ensure unique responses
      };
      
      res.json(response);
      console.log("✅ Stats response sent:", response);
    } catch (error) {
      console.error("❌ Error getting stats:", error);
      res.status(500).json({ error: "Failed to get stats", totalPoets: 0 });
    }
  });
  
  // Create or get user by Firebase UID
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      let user = await storage.getUserByUid(userData.uid);
      
      if (!user) {
        user = await storage.createUser(userData);
        console.log("👤 New user created:", user.email);
      }
      
      res.json(user);
    } catch (error) {
      console.error("❌ Error creating/getting user:", error);
      res.status(400).json({ error: "Failed to create/get user" });
    }
  });

  // Get user by UID
  app.get("/api/users/:uid", async (req, res) => {
    try {
      const user = await storage.getUserByUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Check user submission status for current month
  app.get("/api/users/:uid/submission-status", async (req, res) => {
    try {
      const user = await storage.getUserByUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const contestMonth = getCurrentContestMonth();
      const submissionCount = await storage.getUserSubmissionCount(user.id, contestMonth);
      
      console.log(`📊 Submission status for user ${user.email}: freeUsed=${submissionCount?.freeSubmissionUsed || false}`);
      
      res.json({
        freeSubmissionUsed: submissionCount?.freeSubmissionUsed || false,
        totalSubmissions: submissionCount?.totalSubmissions || 0,
        contestMonth
      });
    } catch (error) {
      console.error("❌ Error getting submission status:", error);
      res.status(500).json({ error: "Failed to get submission status" });
    }
  });

  // NEW: Submit poem with files (Google Drive integration)
  app.post("/api/submissions-with-files", upload.fields([
    { name: 'poemFile', maxCount: 1 },
    { name: 'photoFile', maxCount: 1 }
  ]), async (req, res) => {
    try {
      console.log("📝 New poem submission with files received");
      console.log("📋 Request body:", req.body);
      console.log("📁 Files received:", Object.keys(req.files || {}));
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const poemFile = files.poemFile?.[0];
      const photoFile = files.photoFile?.[0];
      
      if (!poemFile) {
        console.error("❌ Missing poem file");
        return res.status(400).json({ error: "Poem file is required" });
      }
      
      if (!photoFile) {
        console.error("❌ Missing photo file");
        return res.status(400).json({ error: "Photo file is required" });
      }

      const formData = {
        firstName: req.body.firstName || '',
        lastName: req.body.lastName || '',
        email: req.body.email,
        phone: req.body.phone || '',
        age: req.body.age ? parseInt(req.body.age) : 0,
        poemTitle: req.body.poemTitle || 'Untitled',
        tier: req.body.tier,
        amount: req.body.amount ? parseInt(req.body.amount) : 0,
        userUid: req.body.userUid,
        paymentId: req.body.paymentId || null,
        name: `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim(),
        contestMonth: getCurrentContestMonth()
      };

      console.log("📋 Processed form data:", formData);

      // Validate required fields
      if (!formData.email || !formData.tier) {
        console.error("❌ Missing required fields");
        return res.status(400).json({ error: "Email and tier are required" });
      }

      // For paid tiers, verify payment if paymentId is provided and not manual
      if (formData.amount > 0 && formData.paymentId && formData.paymentId !== 'manual_payment' && formData.paymentId !== 'free_submission') {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(formData.paymentId);
          if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: "Payment not completed" });
          }
          console.log("✅ Payment verified:", paymentIntent.id);
        } catch (paymentError) {
          console.error("❌ Payment verification failed:", paymentError);
          return res.status(400).json({ error: "Invalid payment" });
        }
      }

      // Get user by email or create if needed
      let user = null;
      try {
        user = await storage.getUserByEmail(formData.email);
        if (!user && formData.userUid) {
          user = await storage.getUserByUid(formData.userUid);
        }
        
        // If no user found, create one
        if (!user) {
          user = await storage.createUser({
            uid: formData.userUid || `user_${Date.now()}`,
            email: formData.email,
            name: formData.name || formData.email
          });
          console.log("👤 Created new user for submission:", user.email);
        }
      } catch (userError) {
        console.error("❌ Error with user creation/retrieval:", userError);
        return res.status(500).json({ error: "Failed to process user data" });
      }

      // Check if free tier is being used and if it's already been used
      if (formData.tier === 'free') {
        const submissionCount = await storage.getUserSubmissionCount(user.id, formData.contestMonth);
        if (submissionCount?.freeSubmissionUsed) {
          console.error("❌ Free submission already used for this month");
          return res.status(400).json({ error: "Free submission already used this month" });
        }
      }

      // Upload files to Google Drive
      console.log("📤 Uploading files to Google Drive...");
      let poemFileUrl = '';
      let photoFileUrl = '';

      try {
        poemFileUrl = await uploadPoemFile(poemFile.buffer, formData.email, poemFile.originalname);
        console.log("✅ Poem file uploaded:", poemFileUrl);
      } catch (uploadError) {
        console.error("❌ Failed to upload poem file:", uploadError);
        return res.status(500).json({ error: "Failed to upload poem file" });
      }

      try {
        photoFileUrl = await uploadPhotoFile(photoFile.buffer, formData.email, photoFile.originalname);
        console.log("✅ Photo file uploaded:", photoFileUrl);
      } catch (uploadError) {
        console.error("❌ Failed to upload photo file:", uploadError);
        return res.status(500).json({ error: "Failed to upload photo file" });
      }

      // Create submission record
      try {
        const submissionData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          age: formData.age,
          poemTitle: formData.poemTitle,
          tier: formData.tier,
          price: formData.amount,
          paymentId: formData.paymentId,
          userId: user.id,
          contestMonth: formData.contestMonth
        };

        const submission = await storage.createSubmission(submissionData);
        console.log("✅ Submission created in storage:", submission.id);

        // Update user submission count
        const currentCount = await storage.getUserSubmissionCount(user.id, formData.contestMonth);
        const newTotalCount = (currentCount?.totalSubmissions || 0) + 1;
        const isFreeUsed = (currentCount?.freeSubmissionUsed || false) || (formData.tier === 'free');
        
        await storage.updateUserSubmissionCount(user.id, formData.contestMonth, isFreeUsed, newTotalCount);
        console.log(`✅ Updated submission count: total=${newTotalCount}, freeUsed=${isFreeUsed}`);

        // Add to Google Sheets
        try {
          const sheetData = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            age: formData.age.toString(),
            poemTitle: formData.poemTitle,
            tier: formData.tier,
            amount: formData.amount.toString(),
            poemFile: poemFileUrl,
            photo: photoFileUrl,
            timestamp: new Date().toISOString()
          };

          await addPoemSubmissionToSheet(sheetData);
          console.log("✅ Data added to Google Sheets");
        } catch (sheetError) {
          console.error("⚠️ Failed to add to Google Sheets (but submission saved):", sheetError);
          // Don't fail the entire submission if Google Sheets fails
        }

        res.json({
          success: true,
          submissionId: submission.id,
          poemFileUrl,
          photoFileUrl,
          message: "Poem submitted successfully!"
        });

      } catch (dbError) {
        console.error("❌ Database error:", dbError);
        res.status(500).json({ error: "Failed to save submission" });
      }

    } catch (error) {
      console.error("❌ Submission error:", error);
      res.status(500).json({ error: "Failed to process submission" });
    }
  });

  // Get user submissions
  app.get("/api/users/:uid/submissions", async (req, res) => {
    try {
      const user = await storage.getUserByUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const submissions = await storage.getSubmissionsByUser(user.id);
      console.log(`📋 Retrieved ${submissions.length} submissions for user ${user.email}`);
      
      res.json(submissions);
    } catch (error) {
      console.error("❌ Error getting user submissions:", error);
      res.status(500).json({ error: "Failed to get submissions" });
    }
  });

  // Submit contact form
  app.post("/api/contact", async (req, res) => {
    try {
      console.log('📞 Contact form submission received:', {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        phoneLength: req.body.phone?.length,
        phoneType: typeof req.body.phone,
        messageLength: req.body.message?.length
      });

      const contactData = insertContactSchema.parse({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone || '', // Ensure phone is included, default to empty string
        message: req.body.message
      });

      // Save to local storage
      const contact = await storage.createContact(contactData);
      console.log('💾 Contact saved to local storage:', contact.id);

      // Add to Google Sheets
      try {
        const sheetData = {
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone || '', // Ensure phone field is included
          message: contactData.message,
          timestamp: new Date().toISOString()
        };

        console.log('📊 Sending to Google Sheets:', {
          name: sheetData.name,
          email: sheetData.email,
          phone: sheetData.phone,
          phoneLength: sheetData.phone?.length,
          messageLength: sheetData.message?.length
        });

        await addContactToSheet(sheetData);
        console.log('✅ Contact added to Google Sheets successfully');
      } catch (sheetError) {
        console.error('⚠️ Failed to add contact to Google Sheets:', sheetError);
        // Don't fail the entire request if Google Sheets fails
      }

      res.json({ 
        success: true, 
        message: "Contact form submitted successfully",
        id: contact.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Validation error:', error.errors);
        res.status(400).json({ 
          error: "Invalid form data", 
          details: error.errors 
        });
      } else {
        console.error('❌ Contact form error:', error);
        res.status(500).json({ error: "Failed to submit contact form" });
      }
    }
  });

  const server = createServer(app);
  return server;
}