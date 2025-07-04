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

// Get submissions by user ID
export async function getSubmissionsByUser(userId: number) {
  try {
    return await db.select({
      id: submissions.id,
      firstName: submissions.firstName,
      lastName: submissions.lastName,
      email: submissions.email,
      phone: submissions.phone,
      age: submissions.age,
      poemTitle: submissions.poemTitle,
      poemContent: submissions.poemContent,
      tier: submissions.tier,
      price: submissions.price,
      paymentId: submissions.paymentId,
      paymentMethod: submissions.paymentMethod,
      paymentStatus: submissions.paymentStatus,
      sessionId: submissions.sessionId,
      termsAccepted: submissions.termsAccepted,
      poemFileUrl: submissions.poemFileUrl,
      photoFileUrl: submissions.photoFileUrl,
      driveFileId: submissions.driveFileId,
      drivePhotoId: submissions.drivePhotoId,
      poemIndex: submissions.poemIndex,
      submissionUuid: submissions.submissionUuid,
      totalPoemsInSubmission: submissions.totalPoemsInSubmission,
      score: submissions.score,
      type: submissions.type,
      status: submissions.status,
      scoreBreakdown: submissions.scoreBreakdown,
      isWinner: submissions.isWinner,
      winnerPosition: submissions.winnerPosition,
      winnerCategory: submissions.winnerCategory,
      contestMonth: submissions.contestMonth,
      contestYear: submissions.contestYear,
      submittedAt: submissions.submittedAt,
      evaluatedAt: submissions.evaluatedAt,
      createdAt: submissions.createdAt,
      updatedAt: submissions.updatedAt,
      userId: submissions.userId
    }).from(submissions).where(eq(submissions.userId, userId));
  } catch (error) {
    console.error('❌ Error getting submissions by user ID:', error);
    throw error;
  }
}

export async function getSubmissionCountByUser(userId: number): Promise<number> {
  try {
    console.log('🔍 Counting submissions for user ID:', userId);
    const result = await db.select()
      .from(submissions)
      .where(eq(submissions.userId, userId));

    const count = result.length;
    console.log(`✅ Found ${count} submissions for user ${userId}`);
    return count;
  } catch (error) {
    console.error('❌ Error counting submissions:', error);
    return 0;
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
  winnerCategory: string | null;
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
        winnerCategory: evaluationData.winnerCategory,
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

// Get submissions by email (for legacy support)
export async function getSubmissionsByEmail(email: string) {
  try {
    console.log('🔍 Getting submissions for email:', email);
    const result = await db.select()
      .from(submissions)
      .where(eq(submissions.email, email))
      .orderBy(desc(submissions.submittedAt));

    console.log(`✅ Found ${result.length} submissions for email ${email}`);
    return result;
  } catch (error) {
    console.error('❌ Error getting submissions by email:', error);
    throw error;
  }
}

export async function getAllSubmissions() {
  try {
    console.log('🔍 Getting all submissions');
    const result = await db.select({
      id: submissions.id,
      firstName: submissions.firstName,
      lastName: submissions.lastName,
      email: submissions.email,
      phone: submissions.phone,
      age: submissions.age,
      poemTitle: submissions.poemTitle,
      poemContent: submissions.poemContent,
      tier: submissions.tier,
      price: submissions.price,
      paymentId: submissions.paymentId,
      paymentMethod: submissions.paymentMethod,
      paymentStatus: submissions.paymentStatus,
      sessionId: submissions.sessionId,
      termsAccepted: submissions.termsAccepted,
      poemFileUrl: submissions.poemFileUrl,
      photoFileUrl: submissions.photoFileUrl,
      driveFileId: submissions.driveFileId,
      drivePhotoId: submissions.drivePhotoId,
      poemIndex: submissions.poemIndex,
      submissionUuid: submissions.submissionUuid,
      totalPoemsInSubmission: submissions.totalPoemsInSubmission,
      score: submissions.score,
      type: submissions.type,
      status: submissions.status,
      scoreBreakdown: submissions.scoreBreakdown,
      isWinner: submissions.isWinner,
      winnerPosition: submissions.winnerPosition,
      winnerCategory: submissions.winnerCategory,
      contestMonth: submissions.contestMonth,
      contestYear: submissions.contestYear,
      submittedAt: submissions.submittedAt,
      evaluatedAt: submissions.evaluatedAt,
      createdAt: submissions.createdAt,
      updatedAt: submissions.updatedAt,
      userId: submissions.userId
    }).from(submissions).orderBy(desc(submissions.submittedAt));

    console.log(`✅ Found ${result.length} total submissions`);
    return result;
  } catch (error) {
    console.error('❌ Error getting all submissions:', error);
    throw error;
  }
}

export async function updateSubmission(id: number, data: any) {
  try {
    console.log('🔄 Updating submission:', id, data);

    const result = await db.update(submissions)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(submissions.id, id))
      .returning();

    console.log('✅ Submission updated:', id);
    return result[0];
  } catch (error) {
    console.error('❌ Error updating submission:', error);
    throw error;
  }
}

export async function getSubmissionsByEmailAndTitle(email: string, poemTitle: string) {
  try {
    console.log('🔍 Getting submissions by email and title:', { email, poemTitle });

    const result = await db.select()
      .from(submissions)
      .where(
        and(
          eq(submissions.email, email),
          eq(submissions.poemTitle, poemTitle)
        )
      );

    console.log(`✅ Found ${result.length} submissions`);
    return result;
  } catch (error) {
    console.error('❌ Error getting submissions by email and title:', error);
    throw error;
  }
}

export async function getAllUsers() {
  try {
    console.log('🔍 Getting all users');
    const result = await db.select().from(users);
    console.log(`✅ Found ${result.length} total users`);
    return result;
  } catch (error) {
    console.error('❌ Error getting all users:', error);
    throw error;
  }
}

export async function addContact(contactData: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  try {
    console.log('🔄 Adding contact to database:', contactData.email);

    // For now, we'll just log the contact data since there's no contacts table in the schema
    // In a production environment, you would create a contacts table and insert the data
    console.log('📧 Contact form submission:', {
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone || 'not provided',
      message: contactData.message,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Contact data logged successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error adding contact:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  try {
    console.log('🔍 Getting user by email:', email);
    const result = await db.select().from(users).where(eq(users.email, email));

    if (result.length === 0) {
      console.log('❌ No user found with email:', email);
      return null;
    }

    console.log('✅ Found user:', result[0].email, 'ID:', result[0].id);
    return result[0];
  } catch (error) {
    console.error('❌ Error getting user by email:', error);
    return null;
  }
}

// Export all storage functions
export const storage = {
  getUserByUid,
  getSubmissionsByUser,
  getSubmissionByEmailAndTitle,
  getSubmissionsByEmailAndTitle,
  updateSubmissionEvaluation,
  createUser,
  createSubmission,
  updateUser,
  getAllUsers,
  getAllSubmissions,
  updateSubmission,
  addContact,
  getSubmissionsByEmail,
  getUserByEmail,
};