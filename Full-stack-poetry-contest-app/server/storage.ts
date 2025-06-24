import { users, submissions, contacts, userSubmissionCounts, type User, type InsertUser, type Submission, type InsertSubmission, type Contact, type InsertContact, type UserSubmissionCount } from "@shared/schema";
import { getPoetrySheetRowCount } from "./google-sheets";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Submission methods
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionsByUser(userId: number): Promise<Submission[]>;
  getWinningSubmissions(): Promise<Submission[]>;
  getAllSubmissions(): Promise<Submission[]>;
  getTotalUniquePoets(): Promise<number>;
  
  // Contact methods
  createContact(contact: InsertContact): Promise<Contact>;
  
  // Submission count methods
  getUserSubmissionCount(userId: number, contestMonth: string): Promise<UserSubmissionCount | undefined>;
  updateUserSubmissionCount(userId: number, contestMonth: string, freeUsed: boolean, totalCount: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private submissions: Map<number, Submission>;
  private contacts: Map<number, Contact>;
  private userSubmissionCounts: Map<string, UserSubmissionCount>;
  private currentUserId: number;
  private currentSubmissionId: number;
  private currentContactId: number;
  private currentCountId: number;

  constructor() {
    this.users = new Map();
    this.submissions = new Map();
    this.contacts = new Map();
    this.userSubmissionCounts = new Map();
    this.currentUserId = 1;
    this.currentSubmissionId = 1;
    this.currentContactId = 1;
    this.currentCountId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uid === uid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      name: insertUser.name || null,
      phone: insertUser.phone || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const id = this.currentSubmissionId++;
    const submission: Submission = { 
      ...insertSubmission, 
      id,
      userId: insertSubmission.userId || null,
      lastName: insertSubmission.lastName || null,
      phone: insertSubmission.phone || null,
      price: insertSubmission.price || 0,
      paymentScreenshotUrl: insertSubmission.paymentScreenshotUrl || null,
      paymentId: insertSubmission.paymentId || null,
      submittedAt: new Date(),
      isWinner: false,
      winnerPosition: null
    };
    this.submissions.set(id, submission);
    return submission;
  }

  async getSubmissionsByUser(userId: number): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter(s => s.userId === userId);
  }

  async getWinningSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter(s => s.isWinner);
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values());
  }

  async getTotalUniquePoets(): Promise<number> {
    try {
      // Get count from Google Sheets Poetry sheet
      const sheetRowCount = await getPoetrySheetRowCount();
      return sheetRowCount;
    } catch (error) {
      console.error("Error getting poetry sheet count:", error);
      
      // Fallback to in-memory count if Google Sheets fails
      const uniqueEmails = new Set<string>();
      Array.from(this.submissions.values()).forEach(submission => {
        if (submission.email) {
          uniqueEmails.add(submission.email.toLowerCase());
        }
      });
      return uniqueEmails.size;
    }
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const contact: Contact = { 
      ...insertContact, 
      id,
      subject: insertContact.subject || null,
      submittedAt: new Date()
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async getUserSubmissionCount(userId: number, contestMonth: string): Promise<UserSubmissionCount | undefined> {
    const key = `${userId}-${contestMonth}`;
    return this.userSubmissionCounts.get(key);
  }

  async updateUserSubmissionCount(userId: number, contestMonth: string, freeUsed: boolean, totalCount: number): Promise<void> {
    const key = `${userId}-${contestMonth}`;
    const existing = this.userSubmissionCounts.get(key);
    
    if (existing) {
      this.userSubmissionCounts.set(key, {
        ...existing,
        freeSubmissionUsed: freeUsed,
        totalSubmissions: totalCount
      });
    } else {
      const id = this.currentCountId++;
      this.userSubmissionCounts.set(key, {
        id,
        userId,
        contestMonth,
        freeSubmissionUsed: freeUsed,
        totalSubmissions: totalCount
      });
    }
  }
}

export const storage = new MemStorage();