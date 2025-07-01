// storage.ts
import { db } from './db.js';
import { users, submissions, contacts, type User, type InsertUser, type Submission, type InsertSubmission, type Contact, type InsertContact } from './schema.js';
import { eq } from 'drizzle-orm';

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
  updateSubmissionEvaluation(id: number, evaluation: {
    score: number;
    type: string;
    status: string;
    scoreBreakdown: any;
  }): Promise<Submission | undefined>;
}

export class PostgreSQLStorage implements IStorage {

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      console.log(`🔍 Looking for user ID ${id}:`, user ? `Found ${user.email}` : 'Not found');
      return user;
    } catch (error) {
      console.error('❌ Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      console.log(`🔍 Looking for user email ${email}:`, user ? `Found ID ${user.id}` : 'Not found');
      return user;
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.uid, uid));
      console.log(`🔍 Looking for user UID ${uid}:`, user ? `Found ${user.email} (ID: ${user.id})` : 'Not found');
      return user;
    } catch (error) {
      console.error('❌ Error getting user by UID:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      console.log(`✅ Created user: ${user.email} (ID: ${user.id})`);
      return user;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    try {
      console.log('📝 Creating submission with data:', {
        title: insertSubmission.poemTitle,
        tier: insertSubmission.tier,
        index: insertSubmission.poemIndex,
        total: insertSubmission.totalPoemsInSubmission,
        uuid: insertSubmission.submissionUuid,
        email: insertSubmission.email
      });

      // Ensure all required fields have default values
      const submissionData = {
        ...insertSubmission,
        submissionUuid: insertSubmission.submissionUuid || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        poemIndex: insertSubmission.poemIndex ?? 0,
        totalPoemsInSubmission: insertSubmission.totalPoemsInSubmission ?? 1,
        status: insertSubmission.status || 'pending',
        type: insertSubmission.type || 'Human'
      };

      const [submission] = await db.insert(submissions).values(submissionData).returning();
      console.log(`✅ Created submission ID ${submission.id}: "${submission.poemTitle}" (${submission.tier} tier)`);
      return submission;
    } catch (error) {
      console.error('❌ Error creating submission:', error);
      console.error('❌ Failed submission data:', {
        title: insertSubmission.poemTitle,
        tier: insertSubmission.tier,
        email: insertSubmission.email,
        uuid: insertSubmission.submissionUuid,
        index: insertSubmission.poemIndex
      });
      throw error;
    }
  }

  async getSubmissionsByUser(userId: number): Promise<Submission[]> {
    try {
      const userSubmissions = await db.select().from(submissions).where(eq(submissions.userId, userId));
      console.log(`📝 Found ${userSubmissions.length} submissions for user ${userId}`);
      return userSubmissions;
    } catch (error) {
      console.error('❌ Error getting user submissions:', error);
      return [];
    }
  }

  async getWinningSubmissions(): Promise<Submission[]> {
    try {
      const winners = await db.select().from(submissions).where(eq(submissions.isWinner, true));
      console.log(`🏆 Found ${winners.length} winning submissions`);
      return winners;
    } catch (error) {
      console.error('❌ Error getting winners:', error);
      return [];
    }
  }

  async getAllSubmissions(): Promise<Submission[]> {
    try {
      const allSubmissions = await db.select().from(submissions);
      console.log(`📊 Returning ${allSubmissions.length} total submissions`);
      return allSubmissions;
    } catch (error) {
      console.error('❌ Error getting all submissions:', error);
      return [];
    }
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    try {
      const [contact] = await db.insert(contacts).values(insertContact).returning();
      console.log(`✅ Created contact: ${contact.email} (ID: ${contact.id})`);
      return contact;
    } catch (error) {
      console.error('❌ Error creating contact:', error);
      throw error;
    }
  }

  async updateSubmissionEvaluation(id: number, evaluation: {
    score: number;
    type: string;
    status: string;
    scoreBreakdown: any;
  }): Promise<Submission | undefined> {
    try {
      const [submission] = await db.update(submissions)
        .set({
          score: evaluation.score,
          type: evaluation.type,
          status: evaluation.status,
          scoreBreakdown: JSON.stringify(evaluation.scoreBreakdown)
        })
        .where(eq(submissions.id, id))
        .returning();
      
      console.log(`✅ Updated submission ${id} evaluation`);
      return submission;
    } catch (error) {
      console.error('❌ Error updating submission evaluation:', error);
      return undefined;
    }
  }
}

export const storage = new PostgreSQLStorage();