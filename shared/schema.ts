import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  uid: text("uid").notNull().unique(), // Firebase UID
  createdAt: timestamp("created_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  age: integer("age").notNull(),
  authorBio: text("author_bio").notNull(),
  poemTitle: text("poem_title").notNull(),
  poemFileUrl: text("poem_file_url").notNull(),
  photoUrl: text("photo_url").notNull(),
  tier: text("tier").notNull(), // 'free', 'single', 'double', 'triple', 'bulk'
  price: integer("price").default(0),
  paymentScreenshotUrl: text("payment_screenshot_url"),
  paymentId: text("payment_id"),
  contestMonth: text("contest_month").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  isWinner: boolean("is_winner").default(false),
  winnerPosition: integer("winner_position"), // 1, 2, 3
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const userSubmissionCounts = pgTable("user_submission_counts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  contestMonth: text("contest_month").notNull(),
  freeSubmissionUsed: boolean("free_submission_used").default(false),
  totalSubmissions: integer("total_submissions").default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  phone: true,
  uid: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  userId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  age: true,
  authorBio: true,
  poemTitle: true,
  poemFileUrl: true,
  photoUrl: true,
  tier: true,
  price: true,
  paymentScreenshotUrl: true,
  paymentId: true,
  contestMonth: true,
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  name: true,
  email: true,
  subject: true,
  message: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type UserSubmissionCount = typeof userSubmissionCounts.$inferSelect;
