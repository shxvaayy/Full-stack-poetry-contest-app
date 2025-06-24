# Google Sheets Integration Setup

## Overview
The WRITORY POETRY CONTEST platform now automatically saves all form submissions to your Google Sheets document at:
https://docs.google.com/spreadsheets/d/1XCVQsAs4nxBA1QmzTtV4Mlh3L-Ds7YuwLbMAw923OoE/edit

## Data Storage
- **Contact Form**: Data goes to "contacts" sheet
- **Poem Submissions**: Data goes to "Poems" sheet

## For Development/Testing
The platform works without Google authentication - data is stored locally and Google Sheets integration will be skipped gracefully.

## For Production Setup

### Option 1: Service Account (Recommended)
1. Go to Google Cloud Console
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create Service Account credentials
5. Download the JSON key file
6. Set environment variable: `GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/keyfile.json`
7. Share your spreadsheet with the service account email

### Option 2: API Key (Simple but Limited)
1. Go to Google Cloud Console
2. Enable Google Sheets API
3. Create API Key
4. Set environment variable: `GOOGLE_SHEETS_API_KEY=your_api_key`
5. Make spreadsheet publicly readable

## Sheet Structure

### Contacts Sheet Columns:
- A: Timestamp
- B: Name
- C: Email
- D: Phone
- E: Message

### Poems Sheet Columns:
- A: Timestamp
- B: Name
- C: Email
- D: Phone
- E: Age
- F: City
- G: State
- H: Poem Title
- I: Tier
- J: Amount
- K: Payment Screenshot
- L: Poem File
- M: Photo

## Features
- Automatic header initialization
- Real-time data sync
- Graceful fallback if authentication fails
- Local storage backup always maintained

The integration works seamlessly - users fill forms on your website and data appears instantly in your Google Sheets for easy management and analysis.