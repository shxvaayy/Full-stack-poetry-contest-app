import { db } from './db.js';
import { users, submissions, contacts, couponUsage, type User, type NewUser, type Submission, type NewSubmission, type Contact, type NewContact, type NewCouponUsage } from './schema.js';
import { eq, and, desc, gte, lt, sql } from 'drizzle-orm';

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

// FIXED: Enhanced coupon tracking with database transactions
export async function trackCouponUsage(usageData: {
  couponCode: string;
  userUid: string;
  submissionId: number;
  discountAmount: number;
}) {
  try {
    console.log('🎫 Tracking coupon usage:', usageData);

    const upperCode = usageData.couponCode.toUpperCase();

    // CRITICAL: Use database transaction to prevent race conditions
    const result = await db.transaction(async (tx) => {
      // Double-check if already used within transaction - STRICT CHECK
      const existingUsage = await tx
        .select()
        .from(couponUsage)
        .where(
          and(
            eq(couponUsage.couponCode, upperCode),
            eq(couponUsage.userUid, usageData.userUid)
          )
        )
        .limit(1);

      if (existingUsage.length > 0) {
        console.log('❌ Coupon already used by this user during transaction check');
        throw new Error('Coupon code has already been used by this user');
      }

      // Get user ID if exists (within transaction)
      let userId = null;
      try {
        const userResult = await tx.select().from(users).where(eq(users.uid, usageData.userUid)).limit(1);
        userId = userResult.length > 0 ? userResult[0].id : null;
      } catch (error) {
        console.log('User not found in transaction, continuing without userId');
      }

      // Create usage record with current timestamp
      const newUsageData = {
        couponCode: upperCode,
        userUid: usageData.userUid,
        userId: userId,
        submissionId: usageData.submissionId,
        discountAmount: usageData.discountAmount.toString(),
        usedAt: new Date()
      };

      const [usageRecord] = await tx
        .insert(couponUsage)
        .values(newUsageData)
        .returning();

      console.log('✅ Coupon usage tracked in database with transaction:', usageRecord.id);
      return usageRecord;
    });

    return result;
  } catch (error) {
    console.error('❌ Error tracking coupon usage:', error);
    // Don't allow submission to continue if coupon tracking fails and a discount was applied
    if (usageData.discountAmount > 0) {
      throw new Error('Failed to track coupon usage. Submission blocked to prevent duplicate usage.');
    }
    throw error;
  }
}

// FIXED: Enhanced coupon usage checking
export async function checkCouponUsage(couponCode: string, userUid: string): Promise<boolean> {
  try {
    const upperCode = couponCode.toUpperCase();

    console.log('🔍 Checking coupon usage for:', { upperCode, userUid });

    const existingUsage = await db
      .select()
      .from(couponUsage)
      .where(
        and(
          eq(couponUsage.couponCode, upperCode),
          eq(couponUsage.userUid, userUid)
        )
      )
      .limit(1);

    const hasUsed = existingUsage.length > 0;
    console.log('📋 Coupon usage check result:', { hasUsed, foundRecords: existingUsage.length });

    return hasUsed;
  } catch (error) {
    console.error('❌ Error checking coupon usage:', error);
    // In case of error, don't allow usage to prevent abuse
    throw error;
  }
}

// ADDED: Delete submission function for coupon validation failures
export async function deleteSubmission(submissionId: number) {
  try {
    console.log('🗑️ Deleting submission:', submissionId);

    const result = await db.delete(submissions)
      .where(eq(submissions.id, submissionId))
      .returning();

    console.log('✅ Submission deleted:', submissionId);
    return result[0];
  } catch (error) {
    console.error('❌ Error deleting submission:', error);
    throw error;
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
  getAllSubmissions,
  updateSubmission,
  trackCouponUsage,
  checkCouponUsage,
  deleteSubmission
};