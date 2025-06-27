import { users, submissions, contacts, userSubmissionCounts, type User, type InsertUser, type Submission, type InsertSubmission, type Contact, type InsertContact, type UserSubmissionCount } from "./schema.js";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionsByUser(userId: number): Promise<Submission[]>;
  getWinningSubmissions(): Promise<Submission[]>;
  getAllSubmissions(): Promise<Submission[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  getUserSubmissionCount(userId: number, contestMonth: string): Promise<UserSubmissionCount | undefined>;
  updateUserSubmissionCount(userId: number, contestMonth: string, freeUsed: boolean, totalCount: number): Promise<void>;
}

const DATA_FILE = './data.json';

interface StorageData {
  users: User[];
  submissions: Submission[];
  contacts: Contact[];
  submissionCounts: UserSubmissionCount[];
  counters: {
    userId: number;
    submissionId: number;
    contactId: number;
    countId: number;
  };
}

export class MemStorage implements IStorage {
  private data: StorageData;
  private initialized: boolean = false;

  constructor() {
    this.data = {
      users: [],
      submissions: [],
      contacts: [],
      submissionCounts: [],
      counters: {
        userId: 1,
        submissionId: 1,
        contactId: 1,
        countId: 1
      }
    };
  }

  private async loadData() {
    if (this.initialized) return;
    
    try {
      const fs = await import('fs/promises');
      const dataString = await fs.readFile(DATA_FILE, 'utf-8');
      const loadedData = JSON.parse(dataString);
      
      loadedData.users.forEach((user: any) => {
        user.createdAt = new Date(user.createdAt);
      });
      
      loadedData.submissions.forEach((submission: any) => {
        submission.submittedAt = new Date(submission.submittedAt);
      });
      
      loadedData.contacts.forEach((contact: any) => {
        contact.submittedAt = new Date(contact.submittedAt);
      });
      
      this.data = loadedData;
      console.log(`Loaded data: ${this.data.users.length} users, ${this.data.submissions.length} submissions`);
    } catch (error) {
      console.log('No existing data file found, starting with fresh data');
    }
    
    this.initialized = true;
  }

  private async saveData() {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(DATA_FILE, JSON.stringify(this.data, null, 2));
      console.log('Data saved to file');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    await this.loadData();
    return this.data.users.find(user => user.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.loadData();
    return this.data.users.find(user => user.email === email);
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    await this.loadData();
    const user = this.data.users.find(user => user.uid === uid);
    console.log(`Looking for user with UID: ${uid}, found:`, user ? `${user.email} (ID: ${user.id})` : 'none');
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.loadData();
    const id = this.data.counters.userId++;
    const user: User = { 
      ...insertUser, 
      id,
      name: insertUser.name || null,
      phone: insertUser.phone || null,
      createdAt: new Date()
    };
    this.data.users.push(user);
    await this.saveData();
    console.log(`Created and saved user: ${user.email} (ID: ${user.id})`);
    return user;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    await this.loadData();
    const id = this.data.counters.submissionId++;
    const submission: Submission = { 
      ...insertSubmission, 
      id,
      userId: insertSubmission.userId || null,
      lastName: insertSubmission.lastName || null,
      phone: insertSubmission.phone || null,
      age: insertSubmission.age || null,
      price: insertSubmission.price || 0,
      poemFileUrl: insertSubmission.poemFileUrl || null,
      photoUrl: insertSubmission.photoUrl || null,
      paymentId: insertSubmission.paymentId || null,
      paymentMethod: insertSubmission.paymentMethod || null,
      submittedAt: new Date(),
      isWinner: false,
      winnerPosition: null
    };
    this.data.submissions.push(submission);
    await this.saveData();
    console.log(`Created and saved submission ID ${id} for user ${submission.userId}`);
    return submission;
  }

  async getSubmissionsByUser(userId: number): Promise<Submission[]> {
    await this.loadData();
    const userSubmissions = this.data.submissions.filter(submission => submission.userId === userId);
    console.log(`Found ${userSubmissions.length} submissions for user ${userId}`);
    return userSubmissions;
  }

  async getWinningSubmissions(): Promise<Submission[]> {
    await this.loadData();
    return this.data.submissions.filter(s => s.isWinner);
  }

  async getAllSubmissions(): Promise<Submission[]> {
    await this.loadData();
    return this.data.submissions;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    await this.loadData();
    const id = this.data.counters.contactId++;
    const contact: Contact = { 
      ...insertContact, 
      id,
      subject: insertContact.subject || null,
      submittedAt: new Date()
    };
    this.data.contacts.push(contact);
    await this.saveData();
    return contact;
  }

  async getUserSubmissionCount(userId: number, contestMonth: string): Promise<UserSubmissionCount | undefined> {
    await this.loadData();
    const result = this.data.submissionCounts.find(count => 
      count.userId === userId && count.contestMonth === contestMonth
    );
    return result;
  }

  async updateUserSubmissionCount(userId: number, contestMonth: string, freeUsed: boolean, totalCount: number): Promise<void> {
    await this.loadData();
    
    const existingIndex = this.data.submissionCounts.findIndex(count => 
      count.userId === userId && count.contestMonth === contestMonth
    );
    
    if (existingIndex >= 0) {
      this.data.submissionCounts[existingIndex] = {
        ...this.data.submissionCounts[existingIndex],
        freeSubmissionUsed: freeUsed,
        totalSubmissions: totalCount
      };
    } else {
      const id = this.data.counters.countId++;
      this.data.submissionCounts.push({
        id,
        userId,
        contestMonth,
        freeSubmissionUsed: freeUsed,
        totalSubmissions: totalCount
      });
    }
    
    await this.saveData();
    console.log(`Updated and saved submission count for user ${userId}: free=${freeUsed}, total=${totalCount}`);
  }
}

export const storage = new MemStorage();
