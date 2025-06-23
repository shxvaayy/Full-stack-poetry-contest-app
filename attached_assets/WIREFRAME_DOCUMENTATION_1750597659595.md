# WRITORY POETRY CONTEST Platform - Complete Wireframe Documentation

## Platform Overview
A comprehensive poetry contest platform featuring authentication, multi-tier submissions, payment processing, and winner announcements with monthly contest cycles.

---

## 1. AUTHENTICATION PAGE (ChatGPT-style)

```
┌─────────────────────────────────────────────────────────┐
│                    WRITORY LOGO                         │
│                Poetry Contest Platform                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                                                         │
│                 WELCOME BACK                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Email address                                  │   │
│  │  [________________________] (blue border)      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           [ Continue ] (black button)           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                       OR                                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📱  Continue with Phone                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🔵  Continue with Google                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│         Don't have an account? [Sign up]               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Clean, minimal design similar to ChatGPT
- Blue border on email input field
- Black "Continue" button
- Alternative auth options with icons
- Session persistence
- Auto-login for returning users

---

## 2. HOMEPAGE LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│ [🌿 Writory] [HOME] [SUBMIT POEM] [RESULTS] [PAST WINNERS] [ABOUT US] [CONTACT US] │
│                        (Green Header Bar)                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 HERO SECTION                            │
│         (Library Background Image with Overlay)         │
│                                                         │
│          WRITORY POETRY CONTEST                         │
│                                                         │
│    ┌─────────────────────────────────────────────┐     │
│    │  🔄 Moving Tagline Animation:               │     │
│    │  "Participate Now • Open to All Ages •     │     │
│    │   Free Entry • Cash Prizes • Certificates  │     │
│    │   • Recognition"                            │     │
│    └─────────────────────────────────────────────┘     │
│                                                         │
│    [Submit Your Poem] [View Winners]                    │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            WHAT OUR WINNERS RECEIVE                     │
│                                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │ 🏆  │ │ 📱  │ │ 🌐  │ │ ⭐  │ │ 💰  │               │
│ │Cert │ │Soc  │ │Web  │ │Plat │ │Cash │               │
│ │ifi  │ │ial │ │Pub  │ │form │ │Prize│               │
│ │cate │ │Rec  │ │li   │ │Show │ │     │               │
│ │     │ │og   │ │ca   │ │case │ │     │               │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              CURRENT CONTEST STATUS                     │
│                                                         │
│         December 2024 Poetry Contest                   │
│              Theme: "Winter Reflections"                │
│                                                         │
│         Results will be announced in:                   │
│     ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │
│     │ 05 │ │ 12 │ │ 34 │ │ 26 │                       │
│     │Days│ │Hrs │ │Min │ │Sec │                       │
│     └────┘ └────┘ └────┘ └────┘                       │
│                                                         │
│             [Submit Your Entry]                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Elegant library background with overlay
- Moving tagline with smooth transitions
- 5 winner benefit cards with gradients
- Real-time countdown timer
- Contest theme display

---

## 3. SUBMISSION WORKFLOW

### Step 1: Choose Submission Tier

```
┌─────────────────────────────────────────────────────────┐
│         STEP INDICATOR                                  │
│  (1)────────(2)────────(3)                             │
│ Choose    Payment   Submit                              │
│  Plan               Poem                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 SUBMIT YOUR POEM                        │
│                                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │  FREE   │ │ Single  │ │ Double  │ │POPULAR │ │  Bulk   │ │
│ │         │ │ Entry   │ │ Entry   │ │ Triple  │ │ Entry   │ │
│ │   ₹0    │ │  ₹50    │ │  ₹100   │ │  ₹250   │ │  ₹480   │ │
│ │         │ │         │ │         │ │         │ │         │ │
│ │• 1 poem │ │• 1 poem │ │• 2 poems│ │• 3 poems│ │• 5 poems│ │
│ │• All    │ │• All    │ │• All    │ │• All    │ │• All    │ │
│ │  benefits│ │  benefits│ │  benefits│ │  benefits│ │  benefits│ │
│ │• Once/  │ │• No     │ │• Better │ │• Maximum│ │• Best   │ │
│ │  month  │ │  limit  │ │  chances│ │  chances│ │  value  │ │
│ │         │ │         │ │         │ │         │ │         │ │
│ │[Submit  │ │[Submit 1│ │[Submit 2│ │[Submit 3│ │[Submit 5│ │
│ │for FREE]│ │ Poem]   │ │ Poems]  │ │ Poems]  │ │ Poems]  │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│                                                         │
│ Note: Free submission disappears after first use       │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Payment Page (For Paid Tiers)

```
┌─────────────────────────────────────────────────────────┐
│                COMPLETE PAYMENT                         │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Order Summary                                       │ │
│ │ Triple Entry - 3 Poems                      ₹250   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📱 UPI PAYMENT                                      │ │
│ │                                                     │ │
│ │ ┌─────────────┐ ┌─────────────────────────────────┐ │ │
│ │ │             │ │ UPI ID: 9667102405@pthdfc       │ │ │
│ │ │ ░░░░░░░░░░░ │ │ [________________________] [📋] │ │ │
│ │ │ ░QR CODE░░ │ │                                 │ │ │
│ │ │ ░░░░░░░░░░░ │ │ Amount: ₹250                    │ │ │
│ │ │ ░░░░░░░░░░░ │ │ [________________________] [📋] │ │ │
│ │ └─────────────┘ └─────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ Payment Instructions:                               │ │
│ │ 1. Pay using UPI ID: 9667102405@pthdfc             │ │
│ │ 2. Amount: As shown above                          │ │
│ │ 3. Take screenshot of payment                      │ │
│ │ 4. Upload screenshot below                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📤 UPLOAD PAYMENT SCREENSHOT                        │ │
│ │                                                     │ │
│ │     ┌─────────────────────────────┐                 │ │
│ │     │         📷                  │                 │ │
│ │     │ Upload Payment Screenshot   │                 │ │
│ │     │ PNG, JPG or PDF up to 5MB   │                 │ │
│ │     │    [Choose File]            │                 │ │
│ │     └─────────────────────────────┘                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│           [Verify Payment & Continue]                   │
│         (Leads to Poem Submission Form)                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Payment Flow:**
- User selects paid tier → Payment page → Poem submission form
- Free tier → Direct to poem submission form  
- Both workflows end at the same poem submission form

---

## Footer Section

```
┌─────────────────────────────────────────────────────────┐
│                        FOOTER                           │
│ Background Color: #2D5D31 (Dark Green)                 │
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│ │ WRITORY POETRY  │ │ Quick Links     │ │ Additional  │ │
│ │ CONTEST         │ │                 │ │ Competitions│ │
│ │                 │ │ • Submit Your   │ │             │ │
│ │ Celebrating     │ │   Poem          │ │ • Regional  │ │
│ │ literary        │ │ • About Us      │ │   Languages │ │
│ │ excellence and  │ │ • Past Winners  │ │   Competition│ │
│ │ nurturing       │ │ • Contact       │ │ • Junior    │ │
│ │ emerging voices.│ │                 │ │   Competition│ │
│ │ Join our        │ │                 │ │ • Contact Us│ │
│ │ community of    │ │                 │ │             │ │
│ │ poets and share │ │                 │ │             │ │
│ │ your unique     │ │                 │ │             │ │
│ │ stories with    │ │                 │ │             │ │
│ │ the world.      │ │                 │ │             │ │
│ └─────────────────┘ └─────────────────┘ └─────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Social Media Icons & Copyright                      │ │
│ │                                                     │ │
│ │ [🐦] [📘] [📷] [💼]    © 2025 WRITORY POETRY CONTEST│ │
│ │                        All rights reserved.         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Footer Features:**
- Dark green background (#2D5D31) matching the image provided
- Three-column layout with responsive design
- All Quick Links navigate to respective pages
- Social media icons (Twitter, Facebook, Instagram, LinkedIn)
- Copyright notice for 2025
- Proper spacing and typography hierarchy

---

## Updated Platform Summary

**Complete WRITORY POETRY CONTEST Platform Features:**

1. **Header Navigation**: Logo + "Write Your Own Victory" moving tagline + green menu
2. **Homepage**: Library background with contest information and countdown
3. **Submission Tiers**: Free + 4 paid options (₹50, ₹100, ₹250, ₹500)
4. **Payment Integration**: UPI 9667102405@pthdfc with QR code and screenshot upload
5. **Poem Submission**: Name, email, file upload (all tiers use same form)
6. **Winners Page**: Contest results with countdown timer
7. **About/Contact Pages**: Mission, WhatsApp integration
8. **Footer**: Complete navigation and social media links
9. **Color Scheme**: Updated to #2D5D31 green throughout
10. **File Upload**: Working for both payment proofs and poem submissions

**Key Workflow**: Submit → Choose Tier → (Pay if paid tier) → Fill poem form → Success

All navigation links work properly, file uploads are functional, and the platform maintains a consistent green color scheme matching the provided footer design.

---

## FINAL UPDATED WIREFRAME - ALL CHANGES COMPLETE

### Header Section (Fixed)
```
┌─────────────────────────────────────────────────────────┐
│ HEADER - Background: #2D5D31 (Dark Green)              │
│                                                         │
│ [LOGO] WRITORY POETRY CONTEST    [HOME] [SUBMIT POEM]   │
│                                  [RESULTS] [PAST] │
│                                  [ABOUT US] [CONTACT]   │
│                                                         │
│ ✓ Static "Write Your Own Victory" text REMOVED         │
│ ✓ Clean header with just logo and title                │
│ ✓ Fully responsive navigation with mobile menu         │
└─────────────────────────────────────────────────────────┘
```

### Homepage Hero (Updated)
```
┌─────────────────────────────────────────────────────────┐
│ HOMEPAGE - Library Background                           │
│                                                         │
│        WRITORY POETRY CONTEST                           │
│        (Large centered title)                           │
│                                                         │
│    ←←← Write Your Own Victory →→→                      │
│    (Moving animated tagline)                            │
│                                                         │
│        [Submit Your Poem] [View Winners]               │
│                                                         │
│ ✓ Static text removed from header                      │
│ ✓ Moving tagline kept on homepage                      │
│ ✓ Responsive design for all devices                    │
└─────────────────────────────────────────────────────────┘
```

### Payment Page (Enhanced with QR)
```
┌─────────────────────────────────────────────────────────┐
│                COMPLETE PAYMENT                         │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Order Summary                                       │ │
│ │ Triple Entry - 3 Poems                      ₹250   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📱 UPI PAYMENT                                      │ │
│ │                                                     │ │
│ │ ┌─────────────┐ ┌─────────────────────────────────┐ │ │
│ │ │ ███████████ │ │ UPI ID: 9667102405@pthdfc       │ │ │
│ │ │ █ ACTUAL  █ │ │ [________________________] [📋] │ │ │
│ │ │ █ QR CODE █ │ │                                 │ │ │
│ │ │ █ WORKING █ │ │ Amount: ₹250                    │ │ │
│ │ │ ██████████ │ │ [________________________] [📋] │ │ │
│ │ └─────────────┘ └─────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ Payment Instructions:                               │ │
│ │ 1. Pay using UPI ID: 9667102405@pthdfc             │ │
│ │ 2. Amount: As shown above                          │ │
│ │ 3. Take screenshot of payment                      │ │
│ │ 4. Upload screenshot below                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📤 UPLOAD PAYMENT SCREENSHOT                        │ │
│ │     [Choose File] [Upload]                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│     [Verify Payment & Continue to Poem Form]           │
│                                                         │
│ ✓ Real QR code generated for UPI payments              │
│ ✓ Automatic redirect to poem form after payment        │
│ ✓ Responsive design for mobile/tablet/desktop          │
└─────────────────────────────────────────────────────────┘
```

### Complete Workflow Confirmation
```
FREE TIER:
Submit → Poem Form (Name, Email, File Upload) → Success

PAID TIERS:
Submit → Payment (UPI QR + Screenshot) → Poem Form (Name, Email, File Upload) → Success

✓ ALL TIERS end at the same poem submission form
✓ Payment redirects automatically to poem form
✓ File uploads working for both payment proofs and poems
✓ QR code functional with UPI deep linking
✓ Fully responsive across all device sizes
```

### Footer Section (Complete)
```
┌─────────────────────────────────────────────────────────┐
│                     FOOTER - #2D5D31                   │
│                                                         │
│ WRITORY POETRY     Quick Links        Additional        │
│ CONTEST            • Submit Poem      Competitions      │
│                    • About Us         • Regional Lang   │
│ Celebrating        • Past Winners     • Junior Contest  │
│ literary excellence• Contact          • Contact Us      │
│ and nurturing                                           │
│ emerging voices.                                        │
│                                                         │
│ [🐦] [📘] [📷] [💼]    © 2025 WRITORY POETRY CONTEST   │
│                        All rights reserved.             │
│                                                         │
│ ✓ All footer links navigate to correct pages           │
│ ✓ Social media icons ready for your URLs               │
│ ✓ Responsive three-column layout                       │
└─────────────────────────────────────────────────────────┘
```

**FINAL STATUS - ALL REQUESTED CHANGES COMPLETE:**
✅ Removed static "Write Your Own Victory" text from header 
✅ Kept moving "Write Your Own Victory" animation on homepage
✅ Added functional QR code for UPI payments
✅ Fixed paid tier workflow to lead to poem submission form
✅ All file uploads working (payment + poems)
✅ Fully responsive design for all device sizes
✅ Complete footer with navigation and social links
✅ Consistent #2D5D31 green color scheme throughout

### Step 3: Poem Submission Form

```
┌─────────────────────────────────────────────────────────┐
│                SUBMIT YOUR POEM                         │
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐               │
│ │ First Name *    │ │ Last Name       │               │
│ │ [_____________] │ │ [_____________] │               │
│ └─────────────────┘ └─────────────────┘               │
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐               │
│ │ Email *         │ │ Phone           │               │
│ │ [_____________] │ │ [_____________] │               │
│ └─────────────────┘ └─────────────────┘               │
│                                                         │
│ ┌─────────────────┐                                    │
│ │ Age *           │                                    │
│ │ [_____________] │                                    │
│ └─────────────────┘                                    │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Author Bio * (max 500 chars)                       │ │
│ │ [_____________________________________________]     │ │
│ │ [_____________________________________________]     │ │
│ │ [_____________________________________________]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Poem Title *                                        │ │
│ │ [_____________________________________________]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │              📄                                     │ │
│ │         Upload Your Poem                            │ │
│ │    DOCX or PDF file, maximum 5MB                    │ │
│ │         [Choose File]                               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ☐ I agree to Terms and Conditions                      │
│ ☐ I declare this is my original work                   │
│                                                         │
│                [Submit Poem]                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. WINNERS PAGE

```
┌─────────────────────────────────────────────────────────┐
│                 CONTEST WINNERS                         │
│                                                         │
│           December 2024 Contest Winners                 │
│                                                         │
│     ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│     │    2    │ │   👑1   │ │    3    │               │
│     │ SILVER  │ │  GOLD   │ │ BRONZE  │               │
│     │         │ │         │ │         │               │
│     │ Emma W. │ │ John S. │ │ Raj K.  │               │
│     │"Dreams" │ │"Autumn" │ │"Colors" │               │
│     │2nd Place│ │🏆Winner │ │3rd Place│               │
│     └─────────┘ └─────────┘ └─────────┘               │
│                                                         │
│                 OR (if no winners yet)                  │
│                                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │              🏆                             │     │
│     │      Winners Yet to Be Announced           │     │ 
│     │  Contest is active or results being        │     │
│     │  finalized. Winners announced soon!        │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              PAST CONTEST WINNERS                       │
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│ │🏆 John Smith│ │🏆 Emma Wilson│ │🏆 Raj Kumar │       │
│ │November 2024│ │October 2024 │ │September 24 │       │
│ │             │ │             │ │             │       │
│ │"Autumn's    │ │"Digital     │ │"Colors of   │       │
│ │Last Breath" │ │Dreams"      │ │Home"        │       │
│ │             │ │             │ │             │       │
│ │Theme:       │ │Theme:       │ │Theme:       │       │
│ │Seasons of   │ │Technology   │ │Heritage &   │       │
│ │Change       │ │& Soul       │ │Identity     │       │
│ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
```

**Timer Logic:**
- Before deadline: Normal submission
- After deadline: 5-day countdown to results
- During countdown: "Winners Yet to Be Announced"
- After timer: Display actual winners

---

## 5. CONTACT US PAGE

```
┌─────────────────────────────────────────────────────────┐
│                    CONTACT US                           │
│                                                         │
│ ┌─────────────────────┐ ┌─────────────────────┐       │
│ │  SEND MESSAGE       │ │    GET IN TOUCH     │       │
│ │                     │ │                     │       │
│ │ Name *              │ │ 📧 Email            │       │
│ │ [________________]  │ │ writorycontest@     │       │
│ │                     │ │ gmail.com           │       │
│ │ Email *             │ │                     │       │
│ │ [________________]  │ │ 💬 WhatsApp         │       │
│ │                     │ │ +91 96671 02405     │       │
│ │ Subject             │ │ +91 98186 91695     │       │
│ │ [________________]  │ │                     │       │
│ │                     │ │ ⏰ Response Time    │       │
│ │ Message *           │ │ Within 24-48 hours  │       │
│ │ [________________]  │ │                     │       │
│ │ [________________]  │ └─────────────────────┘       │
│ │ [________________]  │                               │
│ │ [________________]  │ ┌─────────────────────┐       │
│ │                     │ │        FAQ          │       │
│ │  [Send Message]     │ │                     │       │
│ │                     │ │ Q: When are results │       │
│ └─────────────────────┘ │    announced?       │       │
│                         │ A: 5 days after     │       │
│                         │    deadline         │       │
│                         │                     │       │
│                         │ Q: Multiple poems?  │       │
│                         │ A: Yes, via paid    │       │
│                         │    tiers            │       │
│                         │                     │       │
│                         │ Q: File formats?    │       │
│                         │ A: DOCX, PDF up     │       │
│                         │    to 5MB           │       │
│                         └─────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 6. ABOUT US PAGE

Based on the screenshots provided, the About Us page should include:

```
┌─────────────────────────────────────────────────────────┐
│               ABOUT WRITORY POETRY CONTEST              │
│          Celebrating the art of poetry and              │
│              nurturing emerging voices                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    OUR MISSION                          │
│                                                         │
│ Writory Poetry Prize is an exceptional opportunity for  │
│ aspiring writers to showcase their talents and          │
│ creativity. In the inaugural year of the competition,   │
│ Writory will award certificates, recognition and cash   │
│ prize to the prizewinners in 2025.                     │
│                                                         │
│ Our mission is to encourage emerging voices from        │
│ diverse backgrounds. Everybody has something to say.    │
│ By making the pen an instrument for personal           │
│ expression, we can share our unique stories with the   │
│ world!                                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                NO BARRIERS OR BOUNDARIES                │
│                                                         │
│ Whether you're a beginner or a seasoned poet, 13 or    │
│ 63, from a small town or a big city — your words       │
│ matter. We believe that creativity knows no limits,    │
│ and every voice deserves to be heard. No fancy         │
│ degrees, no prior publications — just pure passion     │
│ and honest expression. So come as you are, write       │
│ what you feel, and let the world hear your story.      │
│ Because here, your pen holds the power, and your       │
│ story knows no borders.                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  AWARD CEREMONY                         │
│               Celebrating Literary Excellence           │
│                                                         │
│ ┌─────────────────┐  Our annual award ceremony brings  │
│ │                 │  together poets, literary           │
│ │ [Award Ceremony │  enthusiasts, and supporters of     │
│ │  Venue Image]   │  creative expression. Winners       │
│ │                 │  receive their certificates and     │
│ │                 │  cash prizes in a celebration of    │
│ └─────────────────┘  literary achievement.              │
│                                                         │
│ The ceremony features poetry readings, networking       │
│ opportunities, and recognition of the diverse voices    │
│ that make our competition special.                      │
│                                                         │
│              [View Past Winners]                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                        NEWS                             │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Inaugural Competition Now Open                      │ │
│ │ We are excited to launch the first-ever Writory    │ │
│ │ Poetry Contest in 2025! Submit your original poems │ │
│ │ in English for a chance to win certificates,       │ │
│ │ recognition, and cash prizes.                       │ │
│ │ Published: January 1, 2025                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Welcome to WRITORY POETRY CONTEST                   │ │
│ │ Celebrating the art of poetry and nurturing         │ │
│ │ emerging voices. Our inaugural competition welcomes │ │
│ │ poets of all backgrounds to share their unique      │ │
│ │ stories with the world.                             │ │
│ │ Published: January 15, 2025                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Free First Submission                               │ │
│ │ Every participant gets their first poem submission  │ │
│ │ absolutely free! Additional entries are available   │ │
│ │ at affordable rates to encourage multiple           │ │
│ │ submissions.                                        │ │
│ │ Published: February 1, 2025                         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 7. FOOTER LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│ WRITORY POETRY CONTEST     Quick Links        Additional│
│                                              Competitions│
│ Celebrating literary       Submit Your Poem    Regional │
│ excellence and nurturing   About Us            Languages│
│ emerging voices. Join our  Past Winners        Competition│
│ community of poets and     Contact             Junior   │
│ share your unique stories                      Competition│
│ with the world.                                Contact Us│
│                                                         │
│ [Twitter] [Facebook] [Instagram] [LinkedIn]             │
│                                                         │
│           © 2025 WRITORY POETRY CONTEST.               │
│                All rights reserved.                     │
└─────────────────────────────────────────────────────────┘
```

---

## 8. MOBILE RESPONSIVENESS

### Mobile Navigation
```
┌─────────────────────────┐
│ [🌿 Writory]        [☰] │
├─────────────────────────┤
│ Menu (when expanded):   │
│ • HOME                  │
│ • SUBMIT POEM          │
│ • RESULTS        │
│ • PAST WINNERS         │
│ • ABOUT US             │
│ • CONTACT US           │
└─────────────────────────┘
```

### Mobile Submission Flow
- Simplified card layouts
- Touch-friendly buttons
- Optimized file upload
- Easy payment interface
- Responsive forms

---

## 9. MONTHLY CONTEST LOGIC

### Auto-Reset Features:
1. **Monthly Deadline**: End of each month
2. **Results Timer**: 5-day countdown after deadline
3. **Free Submission Reset**: Restored monthly for all users
4. **Contest Data**: New theme, reset submission counters
5. **Winner Display**: Previous winners move to "Past Winners"

### Contest States:
- **Active**: Accept submissions, show deadline
- **Judging**: Show countdown timer to results
- **Completed**: Display winners, start new contest

---

## 10. TECHNICAL FEATURES

### Authentication
- Email/phone/Google login options
- Session persistence
- Auto-registration for new users
- Secure password handling

### Payment System
- UPI/QR code integration
- Payment proof upload
- Verification workflow
- Multiple submission tiers

### File Management
- DOCX/PDF upload (max 5MB)
- Cloud storage integration
- File validation
- Secure file handling

### Data Management
- User profiles and submissions
- Contest management
- Winner tracking
- Contact message handling

---

This wireframe documentation provides a complete visual and functional specification for the WRITORY POETRY CONTEST platform, ensuring all features from the requirements are properly mapped and designed for optimal user experience.