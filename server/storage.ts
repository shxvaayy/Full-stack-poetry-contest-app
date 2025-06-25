import { users, submissions, contacts, userSubmissionCounts, type User, type InsertUser, type Submission, type InsertSubmission, type Contact, type InsertContact, type UserSubmissionCount } from "@shared/schema";
import fs from 'fs/promises';
import path from 'path';

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

// File-based storage paths
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const SUBMISSION_COUNTS_FILE = path.join(DATA_DIR, 'submission_counts.json');

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private submissions: Map<number, Submission>;
  private contacts: Map<number, Contact>;
  private userSubmissionCounts: Map<string, UserSubmissionCount>;
  private currentUserId: number;
  private currentSubmissionId: number;
  private currentContactId: number;
  private currentCountId: number;
  private initialized: boolean = false;

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

  private async ensureDataDir() {
    try {
      await fs.access(DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
  }

  private async loadData() {
    if (this.initialized) return;
    
    await this.ensureDataDir();
    
    try {
      // Load users
      try {
        const usersData = await fs.readFile(USERS_FILE, 'utf-8');
        const usersArray = JSON.parse(usersData);
        usersArray.forEach((user: User) => {
          user.createdAt = new Date(user.createdAt);
          this.users.set(user.id, user);
          if (user.id >= this.currentUserId) {
            this.currentUserId = user.id + 1;
          }
        });
        console.log(`📁 Loaded ${usersArray.length} users from file`);
      } catch (error) {
        console.log('📁 No existing users file found, starting fresh');
      }

      // Load submissions
      try {
        const submissionsData = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
        const submissionsArray = JSON.parse(submissionsData);
        submissionsArray.forEach((submission: Submission) => {
          submission.submittedAt = new Date(submission.submittedAt);
          this.submissions.set(submission.id, submission);
          if (submission.id >= this.currentSubmissionId) {
            this.currentSubmissionId = submission.id + 1;
          }
        });
        console.log(`📁 Loaded ${submissionsArray.length} submissions from file`);
      } catch (error) {
        console.log('📁 No existing submissions file found, starting fresh');
      }

      // Load contacts
      try {
        const contactsData = await fs.readFile(CONTACTS_FILE, 'utf-8');
        const contactsArray = JSON.parse(contactsData);
        contactsArray.forEach((contact: Contact) => {
          contact.submittedAt = new Date(contact.submittedAt);
          this.contacts.set(contact.id, contact);
          if (contact.id >= this.currentContactId) {
            this.currentContactId = contact.id + 1;
          }
        });
        console.log(`📁 Loaded ${contactsArray.length} contacts from file`);
      } catch (error) {
        console.log('📁 No existing contacts file found, starting fresh');
      }

      // Load submission counts
      try {
        const countsData = await fs.readFile(SUBMISSION_COUNTS_FILE, 'utf-8');
        const countsArray = JSON.parse(countsData);
        countsArray.forEach((count: UserSubmissionCount) => {
          const key = `${count.userId}-${count.contestMonth}`;
          this.userSubmissionCounts.set(key, count);
          if (count.id >= this.currentCountId) {
            this.currentCountId = count.id + 1;
          }
        });
        console.log(`📁 Loaded ${countsArray.length} submission counts from file`);
      } catch (error) {
        console.log('📁 No existing submission counts file found, starting fresh');
      }

    } catch (error) {
      console.error('❌ Error loading data:', error);
    }
    
    this.initialized = true;
  }

  private async saveUsers() {
    await this.ensureDataDir();
    const usersArray = Array.from(this.users.values());
    await fs.writeFile(USERS_FILE, JSON.stringify(usersArray, null, 2));
  }

  private async saveSubmissions() {
    await this.ensureDataDir();
    const submissionsArray = Array.from(this.submissions.values());
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissionsArray, null, 2));
  }

  private async saveContacts() {
    await this.ensureDataDir();
    const contactsArray = Array.from(this.contacts.values());
    await fs.writeFile(CONTACTS_FILE, JSON.stringify(contactsArray, null, 2));
  }

  private async saveSubmissionCounts() {
    await this.ensureDataDir();
    const countsArray = Array.from(this.userSubmissionCounts.values());
    await fs.writeFile(SUBMISSION_COUNTS_FILE, JSON.stringify(countsArray, null, 2));
  }

  async getUser(id: number): Promise<User | undefined> {
    await this.loadData();
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.loadData();
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    await this.loadData();
    return Array.from(this.users.values()).find(user => user.uid === uid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.loadData();
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      name: insertUser.name || null,
      phone: insertUser.phone || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    await this.saveUsers();
    console.log(`💾 Created and saved user: ${user.email}`);
    return user;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    await this.loadData();
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
    await this.saveSubmissions();
    console.log(`💾 Created and saved submission ID ${id} for user ${submission.userId}`);
    return submission;
  }

  async getSubmissionsByUser(userId: number): Promise<Submission[]> {
    await this.loadData();
    console.log(`📋 Getting submissions for user ID: ${userId}`);
    
    const userSubmissions = Array.from(this.submissions.values()).filter(submission => submission.userId === userId);
    console.log(`📋 Found ${userSubmissions.length} submissions for user ${userId}`);
    
    return userSubmissions.map(submission => ({
      ...submission,
      submittedAt: submission.submittedAt || new Date()
    }));
  }

  async getWinningSubmissions(): Promise<Submission[]> {
    await this.loadData();
    return Array.from(this.submissions.values()).filter(s => s.isWinner);
  }

  async getAllSubmissions(): Promise<Submission[]> {
    await this.loadData();
    return Array.from(this.submissions.values());
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    await this.loadData();
    const id = this.currentContactId++;
    const contact: Contact = { 
      ...insertContact, 
      id,
      subject: insertContact.subject || null,
      submittedAt: new Date()
    };
    this.contacts.set(id, contact);
    await this.saveContacts();
    return contact;
  }

  async getUserSubmissionCount(userId: number, contestMonth: string): Promise<UserSubmissionCount | undefined> {
    await this.loadData();
    const key = `${userId}-${contestMonth}`;
    const result = this.userSubmissionCounts.get(key);
    console.log(`📊 Getting submission count for ${key}:`, result);
    return result;
  }

  async updateUserSubmissionCount(userId: number, contestMonth: string, freeUsed: boolean, totalCount: number): Promise<void> {
    await this.loadData();
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
    
    await this.saveSubmissionCounts();
    console.log(`📊 Updated and saved submission count for ${key}: free=${freeUsed}, total=${totalCount}`);
  }
}

export const storage = new MemStorage();