
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertSubmissionSchema, insertContactSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { addContactToSheet, addPoemSubmissionToSheet, initializeSheetHeaders, getSubmissionCountFromSheet } from "./google-sheets";
import { uploadPoemFile, uploadPhotoFile } from "./google-drive";

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
        name: `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim(),
        contestMonth: getCurrentContestMonth()
      };

      console.log("📋 Processed form data:", formData);

      // Validate required fields
      if (!formData.email || !formData.tier) {
        console.error("❌ Missing required fields");
        return res.status(400).json({ error: "Email and tier are required" });
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
        console.error("❌ Error handling user:", userError);
        return res.status(500).json({ error: "Failed to process user data" });
      }

      // Check if free tier is already used before allowing submission
      if (formData.tier === 'free') {
        try {
          const contestMonth = getCurrentContestMonth();
          const currentCount = await storage.getUserSubmissionCount(user.id, contestMonth);
          
          if (currentCount?.freeSubmissionUsed === true) {
            console.log("❌ Free submission already used by user:", user.email);
            return res.status(400).json({ 
              error: "Free submission already used",
              message: "You have already used your free trial for this month." 
            });
          }
        } catch (countError) {
          console.error("❌ Error checking submission count:", countError);
          // Continue anyway for now
        }
      }

      // Upload files to Google Drive
      let poemUrl = '';
      let photoUrl = '';
      
      try {
        console.log("📤 Uploading files to Google Drive...");
        console.log("- Poem file:", poemFile.originalname, poemFile.size, "bytes");
        console.log("- Photo file:", photoFile.originalname, photoFile.size, "bytes");
        
        poemUrl = await uploadPoemFile(poemFile.buffer, formData.email, poemFile.originalname);
        photoUrl = await uploadPhotoFile(photoFile.buffer, formData.email, photoFile.originalname);
        
        console.log("✅ Files uploaded successfully:");
        console.log("- Poem:", poemUrl);
        console.log("- Photo:", photoUrl);
      } catch (driveError) {
        console.error("❌ Google Drive upload error:", driveError);
        return res.status(500).json({ error: "Failed to upload files to Google Drive" });
      }

      // Create submission in memory storage
      let submission = null;
      try {
        submission = await storage.createSubmission({
          ...formData,
          userId: user?.id,
          poemFile: poemUrl,
          photo: photoUrl,
          poemFileUrl: poemUrl,
          photoUrl: photoUrl
        });
        console.log("✅ Submission created with ID:", submission.id);
      } catch (submissionError) {
        console.error("❌ Error creating submission in storage:", submissionError);
        return res.status(500).json({ error: "Failed to create submission record" });
      }

      // Add to Google Sheets with Drive links
      try {
        await addPoemSubmissionToSheet({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          age: formData.age.toString(),
          poemTitle: formData.poemTitle,
          tier: formData.tier,
          amount: formData.amount.toString(),
          poemFile: poemUrl, // Google Drive link
          photo: photoUrl, // Google Drive link
          timestamp: new Date().toISOString()
        });
        console.log("📊 Added to Google Sheets successfully with Drive links");
        
        // Get updated count from sheets
        const newCount = await getSubmissionCountFromSheet();
        console.log("🎯 New total count from sheets:", newCount);
        
      } catch (sheetError) {
        console.error("❌ Google Sheets error:", sheetError);
        // Don't fail the submission if Google Sheets fails, just log it
        console.log("⚠️ Continuing with local storage only");
      }

      // Update submission count in memory
      if (user) {
        try {
          const contestMonth = getCurrentContestMonth();
          const currentCount = await storage.getUserSubmissionCount(user.id, contestMonth);
          
          // If user already used free OR this submission is free tier, mark as used
          const newFreeUsed = (currentCount?.freeSubmissionUsed === true) || (formData.tier === 'free');
          const newTotal = (currentCount?.totalSubmissions || 0) + 1;
          
          await storage.updateUserSubmissionCount(user.id, contestMonth, newFreeUsed, newTotal);
          console.log(`📈 Updated user submission count: total=${newTotal}, freeUsed=${newFreeUsed}, tier=${formData.tier}`);
        } catch (countError) {
          console.error("❌ Error updating submission count:", countError);
          // Continue anyway
        }
      }

      res.json({
        success: true,
        submission: submission,
        poemUrl,
        photoUrl,
        message: "Submission created successfully"
      });
    } catch (error) {
      console.error("❌ Error submitting poem with files:", error);
      res.status(500).json({ 
        error: "Failed to create submission with files",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Submit poem (original endpoint for backwards compatibility)
  app.post("/api/submissions", async (req, res) => {
    try {
      console.log("📝 New poem submission received (legacy endpoint)");
      
      const submissionData = insertSubmissionSchema.parse({
        ...req.body,
        contestMonth: getCurrentContestMonth()
      });

      console.log("📋 Submission data:", {
        name: submissionData.name,
        email: submissionData.email,
        tier: submissionData.tier
      });

      // Get user by email or create if needed
      let user = await storage.getUserByEmail(submissionData.email);
      if (!user && req.body.userUid) {
        user = await storage.getUserByUid(req.body.userUid);
      }
      
      // If no user found, create one
      if (!user) {
        user = await storage.createUser({
          uid: req.body.userUid || `user_${Date.now()}`,
          email: submissionData.email,
          name: submissionData.name
        });
        console.log("👤 Created new user for submission:", user.email);
      }

      // Check if free tier is already used before allowing submission
      if (submissionData.tier === 'free') {
        const contestMonth = getCurrentContestMonth();
        const currentCount = await storage.getUserSubmissionCount(user.id, contestMonth);
        
        if (currentCount?.freeSubmissionUsed === true) {
          console.log("❌ Free submission already used by user:", user.email);
          return res.status(400).json({ 
            error: "Free submission already used",
            message: "You have already used your free trial for this month." 
          });
        }
      }

      // Create submission in memory storage
      const submission = await storage.createSubmission({
        ...submissionData,
        userId: user?.id
      });

      console.log("✅ Submission created with ID:", submission.id);

      // Add to Google Sheets (this is the main source of truth)
      try {
        await addPoemSubmissionToSheet({
          name: submissionData.name,
          email: submissionData.email,
          phone: submissionData.phone || '',
          age: submissionData.age?.toString() || '',
          poemTitle: submissionData.poemTitle,
          tier: submissionData.tier,
          amount: submissionData.amount?.toString() || '0',
          poemFile: submissionData.poemFile || '',
          photo: submissionData.photo || '',
          timestamp: new Date().toISOString()
        });
        console.log("📊 Added to Google Sheets successfully");
        
        // Get updated count from sheets
        const newCount = await getSubmissionCountFromSheet();
        console.log("🎯 New total count from sheets:", newCount);
        
      } catch (sheetError) {
        console.error("❌ Google Sheets error:", sheetError);
        // Don't fail the submission if Google Sheets fails, just log it
        console.log("⚠️ Continuing with local storage only");
      }

      // Update submission count in memory
      if (user) {
        const contestMonth = getCurrentContestMonth();
        const currentCount = await storage.getUserSubmissionCount(user.id, contestMonth);
        
        // If user already used free OR this submission is free tier, mark as used
        const newFreeUsed = (currentCount?.freeSubmissionUsed === true) || (submissionData.tier === 'free');
        const newTotal = (currentCount?.totalSubmissions || 0) + 1;
        
        await storage.updateUserSubmissionCount(user.id, contestMonth, newFreeUsed, newTotal);
        console.log(`📈 Updated user submission count: total=${newTotal}, freeUsed=${newFreeUsed}, tier=${submissionData.tier}`);
      }

      res.json(submission);
    } catch (error) {
      console.error("❌ Error submitting poem:", error);
      res.status(400).json({ error: "Failed to create submission" });
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
      console.log(`📋 Found ${submissions.length} submissions for user ${user.email}`);
      
      // Transform submissions to match the frontend interface
      const transformedSubmissions = submissions.map(submission => ({
        id: submission.id,
        name: submission.name,
        poemTitle: submission.poemTitle,
        tier: submission.tier,
        amount: submission.amount || submission.price || 0,
        submittedAt: submission.submittedAt?.toISOString ? submission.submittedAt.toISOString() : new Date().toISOString(),
        isWinner: submission.isWinner || false,
        winnerPosition: submission.winnerPosition || null
      }));
      
      console.log(`📋 Transformed submissions:`, transformedSubmissions);
      res.json(transformedSubmissions);
    } catch (error) {
      console.error("❌ Error getting user submissions:", error);
      res.status(500).json({ error: "Failed to get submissions" });
    }
  });

  // Get winning submissions
  app.get("/api/submissions/winners", async (req, res) => {
    try {
      const winners = await storage.getWinningSubmissions();
      res.json(winners);
    } catch (error) {
      res.status(500).json({ error: "Failed to get winners" });
    }
  });

  // Submit contact form
  app.post("/api/contact", async (req, res) => {
    try {
      console.log("📞 Contact form submission received:");
      console.log("📋 Raw request body:", req.body);
      console.log("📞 Phone field specifically:", {
        phone: req.body.phone,
        phoneType: typeof req.body.phone,
        phoneLength: req.body.phone?.length || 0,
        phoneEmpty: !req.body.phone
      });
      
      const contactData = insertContactSchema.parse(req.body);
      console.log("📋 Parsed contact data:", {
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        phoneType: typeof contactData.phone,
        message: contactData.message?.substring(0, 50) + '...'
      });
      
      const contact = await storage.createContact(contactData);
      
      // Prepare data for Google Sheets with explicit phone handling
      const sheetData = {
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone || '', // Ensure phone is never undefined
        message: contactData.message,
        timestamp: new Date().toISOString()
      };
      
      console.log("📊 Data being sent to Google Sheets:", {
        ...sheetData,
        phoneValue: sheetData.phone,
        phoneLength: sheetData.phone.length
      });
      
      // Add to Google Sheets with phone number
      await addContactToSheet(sheetData);
      
      res.json(contact);
    } catch (error) {
      console.error("❌ Error submitting contact form:", error);
      res.status(400).json({ error: "Failed to submit contact form" });
    }
  });

  // File upload endpoint (placeholder - would integrate with cloud storage)
  app.post("/api/upload", async (req, res) => {
    try {
      // In production, this would upload to cloud storage and return URL
      // For now, return a placeholder URL
      const fileName = req.body.fileName || "uploaded-file";
      const fileType = req.body.fileType || "application/pdf";
      
      res.json({
        url: `https://storage.example.com/uploads/${Date.now()}-${fileName}`,
        fileName,
        fileType
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
