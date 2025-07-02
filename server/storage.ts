import { db } from './db.js';
import { users, submissions } from './schema.js';
import { eq, and, desc } from 'drizzle-orm';

export async function getUserByUid(uid: string) {
  try {
    console.log('🔍 Getting user by UID:', uid);
    const result = await db.select().from(users).where(eq(users.uid, uid));

    if (result.length === 0) {
      console.log('❌ No user found with UID:', uid);
      return null;
    }

    console.log('✅ Found user:', result[0].email);
    return result[0];
  } catch (error) {
    console.error('❌ Error getting user by UID:', error);
    throw error;
  }
}

export async function getSubmissionsByUser(userId: number) {
  try {
    console.log('🔍 Getting submissions for user ID:', userId);
    const result = await db.select()
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.submittedAt));

    console.log(`✅ Found ${result.length} submissions for user ${userId}`);
    return result;
  } catch (error) {
    console.error('❌ Error getting submissions by user:', error);
    throw error;
  }
}

export async function getSubmissionByEmailAndTitle(email: string, poemTitle: string) {
  try {
    console.log('🔍 Getting submission by email and title:', { email, poemTitle });

    // First get user by email
    const user = await db.select().from(users).where(eq(users.email, email));

    if (user.length === 0) {
      console.log('❌ No user found with email:', email);
      return null;
    }

    // Then get submission by user ID and poem title
    const result = await db.select()
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, user[0].id),
          eq(submissions.poemTitle, poemTitle)
        )
      );

    if (result.length === 0) {
      console.log('❌ No submission found for:', { email, poemTitle });
      return null;
    }

    console.log('✅ Found submission:', result[0].id);
    return result[0];
  } catch (error) {
    console.error('❌ Error getting submission by email and title:', error);
    throw error;
  }
}

export async function updateSubmissionEvaluation(submissionId: number, evaluationData: {
  score: number;
  type: string;
  status: string;
  scoreBreakdown: string;
  isWinner: boolean;
  winnerPosition: number | null;
}) {
  try {
    console.log('🔄 Updating submission evaluation:', submissionId, evaluationData);

    const result = await db.update(submissions)
      .set({
        score: evaluationData.score,
        type: evaluationData.type,
        status: evaluationData.status,
        scoreBreakdown: evaluationData.scoreBreakdown,
        isWinner: evaluationData.isWinner,
        winnerPosition: evaluationData.winnerPosition,
        evaluatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(submissions.id, submissionId))
      .returning();

    console.log('✅ Submission evaluation updated:', submissionId);
    return result[0];
  } catch (error) {
    console.error('❌ Error updating submission evaluation:', error);
    throw error;
  }
}

export async function createUser(userData: {
  uid: string;
  email: string;
  name: string | null;
  phone: string | null;
}) {
  try {
    console.log('🔄 Creating new user:', userData.email);

    const result = await db.insert(users).values({
      uid: userData.uid,
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ User created:', result[0].email);
    return result[0];
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
}

export async function createSubmission(submissionData: any) {
  try {
    console.log('🔄 Creating new submission:', submissionData.poemTitle);

    const result = await db.insert(submissions).values({
      ...submissionData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ Submission created:', result[0].id);
    return result[0];
  } catch (error) {
    console.error('❌ Error creating submission:', error);
    throw error;
  }
}

export async function updateUser(uid: string, userData: any) {
  try {
    console.log('🔄 Updating user:', uid);

    const result = await db.update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.uid, uid))
      .returning();

    console.log('✅ User updated:', uid);
    return result[0];
  } catch (error) {
    console.error('❌ Error updating user:', error);
    throw error;
  }
}

export async function getAllSubmissions() {
  try {
    console.log('🔍 Getting all submissions');
    const result = await db.select()
      .from(submissions)
      .orderBy(desc(submissions.submittedAt));

    console.log(`✅ Found ${result.length} total submissions`);
    return result;
  } catch (error) {
    console.error('❌ Error getting all submissions:', error);
    throw error;
  }
}

async updateSubmission(id: number, data: Partial<Submission>) {
    const [updated] = await this.db
      .update(submissions)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(submissions.id, id))
      .returning();

    return updated;
  }

  async getSubmissionsByEmailAndTitle(email: string, poemTitle: string) {
    return await this.db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.email, email),
          eq(submissions.poemTitle, poemTitle)
        )
      );
  }

  async updateSubmissionEvaluation(id: number, data: {
    score?: number;
    type?: string;
    scoreBreakdown?: string;
    status?: string;
  }) {
    const [updated] = await this.db
      .update(submissions)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(submissions.id, id))
      .returning();

    return updated;
  }

// Export all storage functions
export const storage = {
  getUserByUid,
  getSubmissionsByUser,
  getSubmissionByEmailAndTitle,
  updateSubmissionEvaluation,
  createUser,
  createSubmission,
  updateUser,
  getAllSubmissions
};