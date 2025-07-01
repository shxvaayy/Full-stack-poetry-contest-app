import { pgTable, serial, text, timestamp, boolean, integer, varchar, json, decimal } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow()
});

// ✅ UPDATED: Submissions table - Enhanced for multiple poems
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  age: varchar('age', { length: 3 }),
  poemTitle: varchar('poem_title', { length: 255 }).notNull(),
  tier: varchar('tier', { length: 50 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  poemFileUrl: text('poem_file_url'),
  photoUrl: text('photo_url'),
  paymentId: varchar('payment_id', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  // ✅ NEW: Fields for multiple poems support
  submissionUuid: varchar('submission_uuid', { length: 255 }).notNull(), // Groups related poems
  poemIndex: integer('poem_index').default(0).notNull(), // 0, 1, 2, 3, 4 for poem position
  totalPoemsInSubmission: integer('total_poems').default(1).notNull(), // Total poems in this submission
  // ✅ EXISTING: Keep all current fields
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  isWinner: boolean('is_winner').default(false),
  winnerPosition: integer('winner_position'),
  score: integer('score').default(0),
  type: varchar('type', { length: 50 }).default('Human'),
  status: varchar('status', { length: 50 }).default('Pending'),
  scoreBreakdown: json('score_breakdown').$type<{
    originality: number;
    emotion: number;
    structure: number;
    language: number;
    theme: number;
  }>(),
});

// Contacts table (no changes needed)
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  message: text('message').notNull(),
  subject: text('subject'),
  submittedAt: timestamp('submitted_at').defaultNow()
});

// ✅ UPDATED: Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ✅ NEW: Helper type for multiple poems submission
export interface MultiPoemSubmissionData {
  // Personal info (same for all poems)
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  age?: string;
  tier: string;
  price: number;
  photoUrl?: string;
  paymentId?: string;
  paymentMethod?: string;
  userId?: number;
  submissionUuid: string;
  
  // Poem-specific data (different for each poem)
  poems: Array<{
    title: string;
    fileUrl: string;
    index: number;
  }>;
}

// ✅ NEW: Validation helpers
export const VALID_TIERS = ['free', 'single', 'double', 'bulk'] as const;
export type ValidTier = typeof VALID_TIERS[number];

export const TIER_POEM_COUNTS: Record<ValidTier, number> = {
  'free': 1,
  'single': 1,
  'double': 2,
  'bulk': 5
};

export const TIER_PRICES: Record<ValidTier, number> = {
  'free': 0,
  'single': 50,
  'double': 100,
  'bulk': 480
};

// Validation function
export function validateTierPoemCount(tier: string, poemCount: number): boolean {
  if (!VALID_TIERS.includes(tier as ValidTier)) {
    return false;
  }
  
  const expectedCount = TIER_POEM_COUNTS[tier as ValidTier];
  return poemCount === expectedCount;
}
} as const;

export const TIER_PRICES: Record<ValidTier, number> = {
  'free': 0,
  'single': 50,
  'double': 100,
  'bulk': 480
} as const;

// ✅ NEW: Helper function to validate tier and poem count
export function validateTierPoemCount(tier: string, poemCount: number): boolean {
  if (!VALID_TIERS.includes(tier as ValidTier)) {
    return false;
  }
  
  const expectedCount = TIER_POEM_COUNTS[tier as ValidTier];
  return poemCount === expectedCount;
}