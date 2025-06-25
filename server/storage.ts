import { users, submissions, contacts, userSubmissionCounts, type User, type InsertUser, type Submission, type InsertSubmission, type Contact, type InsertContact, type UserSubmissionCount } from "@shared/schema";

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
    console.log(`💾 Stored submission ID ${id} for user ${submission.userId}`);
    return submission;
  }

  async getSubmissionsByUser(userId: number): Promise<Submission[]> {
    console.log(`📋 Getting submissions for user ID: ${userId}`);
    
    const userSubmissions = Array.from(this.submissions.values()).filter(submission => submission.userId === userId);
    console.log(`📋 Found ${userSubmissions.length} submissions for user ${userId}`);
    
    return userSubmissions.map(submission => ({
      ...submission,
      submittedAt: submission.submittedAt || new Date()
    }));
  }

  async getWinningSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter(s => s.isWinner);
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values());
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
    const result = this.userSubmissionCounts.get(key);
    console.log(`📊 Getting submission count for ${key}:`, result);
    return result;
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
    console.log(`📊 Updated submission count for ${key}: free=${freeUsed}, total=${totalCount}`);
  }
}

export const storage = new MemStorage();