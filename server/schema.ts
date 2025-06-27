// Database schema definitions for the poetry submission platform

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
  phone: string;
  message: string;
  subject: string | null;
  submittedAt: Date;
}

export interface InsertContact {
  name: string;
  email: string;
  phone: string;
  message: string;
  subject?: string | null;
}

export interface UserSubmissionCount {
  id: number;
  userId: number;
  contestMonth: string;
  freeSubmissionUsed: boolean;
  totalSubmissions: number;
}

// Export objects for compatibility with original import pattern
export const users = {};
export const submissions = {};
export const contacts = {};
export const userSubmissionCounts = {};
