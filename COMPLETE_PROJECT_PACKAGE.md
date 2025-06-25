# WRITORY POETRY CONTEST - Complete Project Package

## 🎯 Demo Access
**Click the blue "Enter Demo Mode" button on the authentication page to see the complete platform without Firebase setup.**

## What You'll See After Login
//
https://drive.google.com/drive/u/1/folders/1KKh4ixlEyp8GTDNPneGW-Dn4EGVNd-vO
drive
https://docs.google.com/spreadsheets/d/1XCVQsAs4nxBA1QmzTtV4Mlh3L-Ds7YuwLbMAw923OoE/edit?pli=1&gid=873342294#gid=873342294
sheet
//

### 1. Homepage Features
- ✅ Library background hero section with Writory logo
- ✅ Moving tagline: "Write Your Own Victory"
- ✅ "What Our Winners Receive" section (5 award cards)
- ✅ Complete competition rules (12 detailed rules)
- ✅ Award ceremony information
- ✅ Responsive design for all devices

### 2. Submission System
- ✅ Multi-tier pricing structure:
  - **Free Entry**: ₹0 (1 poem per month)
  - **Single Entry**: ₹50 (1 additional poem)
  - **Double Entry**: ₹100 (2 additional poems)
  - **Bulk Entry**: ₹480 (5 additional poems)
- ✅ UPI payment integration (9667102405@pthdfc)
- ✅ QR code for payments
- ✅ File upload for poems (.docx/.pdf, max 5MB)
- ✅ Photo upload requirement (max 2MB)
- ✅ Payment screenshot verification for paid tiers

### 3. Navigation Pages
- ✅ **About Us**: Mission, latest news, contest information
- ✅ **Past Winners**: Inaugural year messaging with future plans
- ✅ **RESULTS**: Countdown timer for results announcement
- ✅ **Contact Us**: Form with validation + contact details

### 4. Technical Features
- ✅ Firebase authentication (Google OAuth + Email/Password)
- ✅ Real-time form validation
- ✅ Toast notifications for user feedback
- ✅ Loading states and error handling
- ✅ Protected routes and session management
- ✅ Mobile-responsive design

## Project Structure
```
writory-poetry-contest/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   └── assets/         # Static assets
├── server/                 # Express backend
├── shared/                 # Shared types and schemas
├── attached_assets/        # Project assets (logos, QR codes)
└── Documentation files
```

## Quick Setup Instructions

### Prerequisites
- Node.js 20+
- Firebase account (for production authentication)

### Installation
1. Extract project files
2. Run `npm install`
3. For demo: `npm run dev` and click "Enter Demo Mode"
4. For production: Add Firebase keys and `npm run dev`

### Firebase Configuration (Production)
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## Key Features Implemented

### Authentication System
- ChatGPT-style login interface
- Multiple authentication methods
- Demo mode for testing
- Session persistence

### Content Management
- Competition rules display
- Award information
- Winner showcase system
- Contact form handling

### Payment Processing
- UPI integration with QR code
- Multiple pricing tiers
- Payment verification workflow
- File upload handling

### User Experience
- Responsive design
- Form validation
- Error handling
- Loading states
- Toast notifications

## Database Schema
- **Users**: Firebase UID mapping, profile information
- **Submissions**: Contest entries with tier pricing and file references
- **Contacts**: Contact form submissions
- **User Submission Counts**: Monthly submission tracking per user

## Production Deployment
1. Set up PostgreSQL database
2. Configure Firebase authentication
3. Add environment variables
4. Deploy to hosting platform
5. Set up domain and SSL

## Support
- Demo mode works immediately
- Firebase keys required for production
- All features fully implemented
- Complete documentation included

## Files Included
- Complete source code
- All UI components
- Authentication system
- Payment integration
- Asset files (logos, QR codes)
- Setup documentation
- Architecture documentation

The platform is ready for immediate testing in demo mode and production deployment with Firebase configuration.