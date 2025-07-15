import { pgTable, serial, varchar, text, integer, boolean, timestamp, decimal, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ✅ TIER CONFIGURATIONS - Add these exports
export const TIER_POEM_COUNTS = {
  free: 1,
  single: 1,
  double: 2,
  bulk: 5
} as const;

export const TIER_PRICES = {
  free: 0,
  single: 50,
  double: 90,
  bulk: 230
} as const;

// ✅ VALIDATION FUNCTION
export function validateTierPoemCount(tier: string, poemCount: number): boolean {
  const expectedCount = TIER_POEM_COUNTS[tier as keyof typeof TIER_POEM_COUNTS];
  return expectedCount === poemCount;
}

// ✅ Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  profilePictureUrl: text('profile_picture_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Submissions table - Complete with all evaluation fields
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),

  // User relationship
  userId: integer('user_id').references(() => users.id),

  // Basic submission info
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  age: integer('age'),
  instagramHandle: varchar('instagram_handle', { length: 255 }),

  // Poem details
  poemTitle: varchar('poem_title', { length: 255 }).notNull(),
  poemContent: text('poem_content'), // Store actual poem text if needed

  // Submission tier and pricing
  tier: varchar('tier', { length: 50 }).notNull(), // free, single, double, bulk
  price: decimal('price', { precision: 10, scale: 2 }),

  // Payment information
  paymentId: varchar('payment_id', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 50 }), // razorpay, paypal, stripe
  paymentStatus: varchar('payment_status', { length: 50 }), // pending, completed, failed
  sessionId: varchar('session_id', { length: 255 }), // Stripe session ID

  // Terms and conditions
  termsAccepted: boolean('terms_accepted').default(false).notNull(),

  // File storage
  poemFileUrl: varchar('poem_file_url', { length: 500 }), // Google Drive URL
  photoFileUrl: varchar('photo_file_url', { length: 500 }), // Google Drive URL
  driveFileId: varchar('drive_file_id', { length: 255 }), // Google Drive file ID
  drivePhotoId: varchar('drive_photo_id', { length: 255 }), // Google Drive photo ID

  // Multi-poem support
  poemIndex: integer('poem_index').default(1).notNull(), // Which poem in the submission (1, 2, 3, etc.)
  submissionUuid: varchar('submission_uuid', { length: 255 }), // Groups multiple poems together
  totalPoemsInSubmission: integer('total_poems_in_submission').default(1).notNull(),

  // ✅ EVALUATION FIELDS - Added by admin CSV upload
  score: integer('score'), // Overall score (0-100)
  type: varchar('type', { length: 50 }).default('Human'), // Human, AI, Copied
  status: varchar('status', { length: 50 }).default('Pending'), // Pending, Evaluated, Rejected

  // Detailed score breakdown (JSON string)
  scoreBreakdown: text('score_breakdown'), // JSON: {originality: 25, emotion: 25, structure: 20, language: 20, theme: 10}

  // Winner information
  isWinner: boolean('is_winner').default(false).notNull(),
  winnerPosition: integer('winner_position'), // 1st, 2nd, 3rd place
  winnerCategory: varchar('winner_category', { length: 100 }), // Overall, Free Category, etc.

  // Contest information
  contestMonth: varchar('contest_month', { length: 7 }), // YYYY-MM format
  contestYear: integer('contest_year'),

  // Timestamps
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  evaluatedAt: timestamp('evaluated_at'), // When evaluation was completed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Contacts table - For contact form submissions
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  message: text('message').notNull(),
  status: varchar('status', { length: 50 }).default('new'), // new, read, replied
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Coupons table - For discount codes
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // percentage, fixed
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0).notNull(),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  applicableTiers: varchar('applicable_tiers', { length: 255 }), // JSON array: ["single", "double"]
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Coupon usage tracking
export const couponUsage = pgTable('coupon_usage', {
  id: serial('id').primaryKey(),
  couponId: integer('coupon_id').references(() => coupons.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  submissionId: integer('submission_id').references(() => submissions.id),
  userUid: varchar('user_uid', { length: 255 }), // For tracking without user account
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull()
});

// ✅ Contest settings - For managing contest parameters
export const contestSettings = pgTable('contest_settings', {
  id: serial('id').primaryKey(),
  contestMonth: varchar('contest_month', { length: 7 }).notNull(), // YYYY-MM
  contestYear: integer('contest_year').notNull(),
  theme: varchar('theme', { length: 255 }), // Monthly theme
  isActive: boolean('is_active').default(true).notNull(),
  submissionDeadline: timestamp('submission_deadline'),
  resultsAnnouncementDate: timestamp('results_announcement_date'),
  maxSubmissionsPerUser: integer('max_submissions_per_user').default(10),
  freeSubmissionLimit: integer('free_submission_limit').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Admin logs - Track admin actions
export const adminLogs = pgTable('admin_logs', {
  id: serial('id').primaryKey(),
  adminEmail: varchar('admin_email', { length: 255 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(), // csv_upload, winner_selection, etc.
  description: text('description'),
  affectedRecords: integer('affected_records'),
  metadata: text('metadata'), // JSON string with additional data
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ✅ Admin settings - Store toggle settings
export const adminSettings = pgTable('admin_settings', {
  id: serial('id').primaryKey(),
  settingKey: varchar('setting_key', { length: 100 }).notNull().unique(),
  settingValue: text('setting_value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Admin users - Store admin user access
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).default('admin').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Winner photos - Store winner photos for results and past winners pages
export const winnerPhotos = pgTable('winner_photos', {
  id: serial('id').primaryKey(),
  position: integer('position').notNull(), // 1, 2, 3 for 1st, 2nd, 3rd place
  contestMonth: varchar('contest_month', { length: 7 }).notNull(), // YYYY-MM format
  contestYear: integer('contest_year').notNull(),
  photoUrl: varchar('photo_url', { length: 500 }).notNull(), // Cloudinary URL
  winnerName: varchar('winner_name', { length: 255 }), // Optional: winner's name
  score: integer('score'), // Score out of 100
  isActive: boolean('is_active').default(true).notNull(), // For soft deletion
  uploadedBy: varchar('uploaded_by', { length: 255 }).notNull(), // Admin email
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Writory Wall posts - For the public wall feature
export const wallPosts = pgTable('wall_posts', {
  id: serial('id').primaryKey(),
  
  // User relationship
  userId: integer('user_id').references(() => users.id).notNull(),
  userUid: varchar('user_uid', { length: 255 }).notNull(), // Firebase UID for quick lookups
  
  // Post content
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }), // Optional category/channel
  
  // User info (cached for performance)
  authorName: varchar('author_name', { length: 255 }).notNull(),
  authorInstagram: varchar('author_instagram', { length: 255 }),
  authorProfilePicture: varchar('author_profile_picture', { length: 500 }),
  
  // Moderation
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, approved, rejected
  moderatedBy: varchar('moderated_by', { length: 255 }), // Admin email who moderated
  moderatedAt: timestamp('moderated_at'),
  moderationNotes: text('moderation_notes'),
  
  // Engagement
  likes: integer('likes').default(0).notNull(),
  likedBy: text('liked_by'), // JSON array of user UIDs who liked
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
  couponUsage: many(couponUsage)
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id]
  }),
  couponUsage: many(couponUsage)
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  usage: many(couponUsage)
}));

export const couponUsageRelations = relations(couponUsage, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUsage.couponId],
    references: [coupons.id]
  }),
  user: one(users, {
    fields: [couponUsage.userId],
    references: [users.id]
  }),
  submission: one(submissions, {
    fields: [couponUsage.submissionId],
    references: [submissions.id]
  })
}));

// ✅ Export all tables and types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponUsage = typeof couponUsage.$inferSelect;
export type NewCouponUsage = typeof couponUsage.$inferInsert;
export type ContestSettings = typeof contestSettings.$inferSelect;
export type NewContestSettings = typeof contestSettings.$inferInsert;
export type AdminLog = typeof adminLogs.$inferSelect;
export type NewAdminLog = typeof adminLogs.$inferInsert;
export type AdminSettings = typeof adminSettings.$inferSelect;
export type NewAdminSettings = typeof adminSettings.$inferInsert;
export type AdminUsers = typeof adminUsers.$inferSelect;
export type NewAdminUsers = typeof adminUsers.$inferInsert;
export type WinnerPhoto = typeof winnerPhotos.$inferSelect;
export type NewWinnerPhoto = typeof winnerPhotos.$inferInsert;
export type WallPost = typeof wallPosts.$inferSelect;
export type NewWallPost = typeof wallPosts.$inferInsert;

// ✅ Export database schema
export const schema = {
  users,
  submissions,
  contacts,
  coupons,
  couponUsage,
  contestSettings,
  adminLogs,
  adminSettings,
  adminUsers,
  winnerPhotos,
  wallPosts,
  usersRelations,
  submissionsRelations,
  couponsRelations,
  couponUsageRelations
};

export default schema;