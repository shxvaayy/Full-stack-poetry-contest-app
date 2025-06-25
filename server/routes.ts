import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubmissionSchema, insertContactSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { addContactToSheet, addPoemSubmissionToSheet, initializeSheetHeaders, getSubmissionCountFromSheet } from "./google-sheets";

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

  // Submit poem
  app.post("/api/submissions", async (req, res) => {
    try {
      console.log("📝 New poem submission received");
      
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
          city: submissionData.city || '',
          state: submissionData.state || '',
          poemTitle: submissionData.poemTitle,
          tier: submissionData.tier,
          amount: submissionData.amount?.toString() || '0',
          paymentScreenshot: submissionData.paymentScreenshot || '',
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
      res.json(submissions);
    } catch (error) {
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
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      
      // Add to Google Sheets
      await addContactToSheet({
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone || '',
        message: contactData.message,
        timestamp: new Date().toISOString()
      });
      
      res.json(contact);
    } catch (error) {
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