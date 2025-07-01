// schema.ts
import { pgTable, serial, text, timestamp, boolean, integer, varchar, decimal } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow()
});

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  age: varchar('age', { length: 10 }),
  poemTitle: varchar('poem_title', { length: 255 }).notNull(),
  tier: varchar('tier', { length: 50 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).default('0.00'),
  poemFileUrl: text('poem_file_url'),
  photoUrl: text('photo_url'),
  paymentId: varchar('payment_id', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  submissionUuid: varchar('submission_uuid', { length: 255 }).notNull(),
  poemIndex: integer('poem_index').default(0).notNull(),
  totalPoemsInSubmission: integer('total_poems_in_submission').default(1).notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  score: integer('score'),
  type: varchar('type', { length: 50 }).default('Human'),
  scoreBreakdown: text('score_breakdown'),
  isWinner: boolean('is_winner').default(false),
  winnerPosition: integer('winner_position')
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  message: text('message').notNull(),
  subject: text('subject'),
  submittedAt: timestamp('submitted_at').defaultNow()
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

export const VALID_TIERS = ['free', 'single', 'double', 'bulk'] as const;
export type ValidTier = typeof VALID_TIERS[number];

export const TIER_POEM_COUNTS: Record<ValidTier, number> = {
  'free': 1,
  'single': 1,
  'double': 2,
  'bulk': 5
} as const;

export const TIER_PRICES: Record<ValidTier, number> = {
  'free': 0,
  'single': 50,
  'double': 100,
  'bulk': 480
} as const;

export function validateTierPoemCount(tier: string, poemCount: number): boolean {
  if (!VALID_TIERS.includes(tier as ValidTier)) {
    return false;
  }
  const expectedCount = TIER_POEM_COUNTS[tier as ValidTier];
  return poemCount === expectedCount;
}