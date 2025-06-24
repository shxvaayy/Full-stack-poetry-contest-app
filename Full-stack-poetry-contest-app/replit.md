# WRITORY POETRY CONTEST Application

## Overview

WRITORY POETRY CONTEST is a full-stack web application for managing poetry contest submissions. The platform allows users to submit poems, select entry tiers with different pricing, and participate in monthly competitions. Built with React, Express, and PostgreSQL, it features Firebase authentication and a modern UI using shadcn/ui components.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for development and building

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for PostgreSQL
- **Authentication**: Firebase Auth integration
- **File Handling**: Support for poem files, photos, and payment screenshots
- **API Design**: RESTful API with Express routes

### Database Design
- **Primary Database**: PostgreSQL (configured for production)
- **Development Storage**: In-memory storage implementation for development
- **Schema Management**: Drizzle migrations

## Key Components

### Authentication System
- Firebase Authentication for user management
- Support for Google OAuth and email/password authentication
- User profile synchronization between Firebase and application database
- Protected routes using AuthGuard component

### Submission System
- Multi-tier entry system (Free, Single, Double, Bulk)
- File upload capabilities for poems, photos, and payment screenshots
- Monthly contest tracking with submission limits
- Payment verification workflow

### User Interface
- Responsive design with mobile-first approach
- Component-based architecture using shadcn/ui
- Dark/light theme support
- Countdown timers for contest deadlines
- Toast notifications for user feedback

### Database Schema
- **Users**: Firebase UID mapping, profile information
- **Submissions**: Contest entries with tier pricing and file references
- **Contacts**: Contact form submissions
- **User Submission Counts**: Monthly submission tracking per user

## Data Flow

1. **User Authentication**: Firebase handles authentication, user data synced to PostgreSQL
2. **Submission Flow**: Users select tier → upload files → submit entry → payment verification
3. **Contest Management**: Monthly contest cycles with automatic deadline tracking
4. **File Storage**: File uploads handled through form submissions (URLs stored in database)

## External Dependencies

### Authentication
- Firebase SDK for authentication services
- Google OAuth provider integration

### UI Framework
- Radix UI primitives for accessible components
- Tailwind CSS for styling
- Lucide React for icons

### Database & ORM
- PostgreSQL for production database
- Drizzle ORM for type-safe database operations
- @neondatabase/serverless for PostgreSQL connectivity

### Development Tools
- TypeScript for type safety
- ESBuild for server-side bundling
- Vite for frontend development and building

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

### Development Environment
- Node.js 20 runtime
- PostgreSQL 16 database
- Hot reload with Vite dev server on port 5000

### Production Build
- Frontend built to `dist/public` directory
- Server bundled with ESBuild to `dist/index.js`
- Static file serving from Express server

### Environment Configuration
- Database URL configuration through environment variables
- Firebase configuration through environment variables
- Autoscale deployment target for production

## Changelog

```
Changelog:
- June 22, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```