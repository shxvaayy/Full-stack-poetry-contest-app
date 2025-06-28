import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow()
});

// Submissions table
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  email: text('email').notNull(),
  phone: text('phone'),
  age: text('age'),
  poemTitle: text('poem_title').notNull(),
  tier: text('tier').notNull(),
  price: integer('price').default(0),
  poemFileUrl: text('poem_file_url'),
  photoUrl: text('photo_url'),
  paymentId: text('payment_id'),
  paymentMethod: text('payment_method'),
  submittedAt: timestamp('submitted_at').defaultNow(),
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

// TypeScript interfaces
export interface User {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: Date;
}

export interface InsertUser {
  uid: string;
  email: string;
  name?: string | null;
  phone?: string | null;
}

export interface Submission {
  id: number;
  userId: number | null;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  age: string | null;
  poemTitle: string;
  tier: string;
  price: number;
  poemFileUrl: string | null;
  photoUrl: string | null;
  paymentId: string | null;
  paymentMethod: string | null;
  submittedAt: Date;
  isWinner: boolean;
  winnerPosition: number | null;
}

export interface InsertSubmission {
  userId?: number | null;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  age?: string | null;
  poemTitle: string;
  tier: string;
  price?: number;
  poemFileUrl?: string | null;
  photoUrl?: string | null;
  paymentId?: string | null;
  paymentMethod?: string | null;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  subject: string | null;
  submittedAt: Date;
}

export interface InsertContact {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  subject?: string | null;
}