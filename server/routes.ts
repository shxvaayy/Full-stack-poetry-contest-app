
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubmissionSchema, insertContactSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { addContactToSheet, addPoemSubmissionToSheet, initializeSheetHeaders } from "./google-sheets";

const getCurrentContestMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Google Sheets headers
  await initializeSheetHeaders();
  
  // Create or get user by Firebase UID
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      let user = await storage.getUserByUid(userData.uid);
      
      if (!user) {
        user = await storage.createUser(userData);
      }
      
      res.json(user);
    } catch (error) {
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
      
      res.json({
        freeSubmissionUsed: submissionCount?.freeSubmissionUsed || false,
        totalSubmissions: submissionCount?.totalSubmissions || 0,
        contestMonth
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get submission status" });
    }
  });

  // Submit poem
  app.post("/api/submissions", async (req, res) => {
    try {
      const submissionData = insertSubmissionSchema.parse({
        ...req.body,
        contestMonth: getCurrentContestMonth()
      });

      // Get user by email or create if needed
      let user = await storage.getUserByEmail(submissionData.email);
      if (!user && req.body.userUid) {
        user = await storage.getUserByUid(req.body.userUid);
      }

      const submission = await storage.createSubmission({
        ...submissionData,
        userId: user?.id
      });

      // Add to Google Sheets
      await addPoemSubmissionToSheet({
        name: submissionData.name,
        email: submissionData.email,
        phone: submissionData.phone,
        age: submissionData.age?.toString() || '',
        city: submissionData.city,
        state: submissionData.state,
        poemTitle: submissionData.poemTitle,
        tier: submissionData.tier,
        amount: submissionData.amount?.toString() || '0',
        paymentScreenshot: submissionData.paymentScreenshot || '',
        poemFile: submissionData.poemFile,
        photo: submissionData.photo,
        timestamp: new Date().toISOString()
      });

      // Update submission count
      if (user) {
        const contestMonth = getCurrentContestMonth();
        const currentCount = await storage.getUserSubmissionCount(user.id, contestMonth);
        const newFreeUsed = currentCount?.freeSubmissionUsed || submissionData.tier === 'free';
        const newTotal = (currentCount?.totalSubmissions || 0) + 1;
        
        await storage.updateUserSubmissionCount(user.id, contestMonth, newFreeUsed, newTotal);
      }

      res.json(submission);
    } catch (error) {
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
