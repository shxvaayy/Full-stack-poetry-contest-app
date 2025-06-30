
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

// Submissions table - Updated with all required columns
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
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  score: integer('score'),
  type: varchar('type', { length: 50 }),
  scoreBreakdown: json('score_breakdown'),
  isWinner: boolean('is_winner').default(false),
  winnerPosition: integer('winner_position')
});

// Contacts table
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  message: text('message').notNull(),
  subject: text('subject'),
  submittedAt: timestamp('submitted_at').defaultNow()
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
