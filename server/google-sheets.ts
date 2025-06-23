import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDS_JSON as string),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

interface ContactData {
  name: string;
  email: string;
  phone: string;
  message: string;
  timestamp: string;
}

interface PoemSubmissionData {
  name: string;
  email: string;
  phone: string;
  age: string;
  city: string;
  state: string;
  poemTitle: string;
  tier: string;
  amount: string;
  paymentScreenshot: string;
  poemFile: string;
  photo: string;
  timestamp: string;
}

// Simple authentication using API key (if available)



async function getAuthClient() {
  try {
    return await auth.getClient();
  } catch (error) {
    console.warn('Google Sheets authentication not configured. Data will be stored locally only.');
    return null;
  }
}

export async function addContactToSheet(data: ContactData): Promise<void> {
  try {
    const authClient = await getAuthClient();
    if (!authClient) return;

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Contacts!A:E',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {
        values: [[
          data.timestamp,
          data.name,
          data.email,
          data.phone,
          data.message
        ]]
      }
    };

    await sheets.spreadsheets.values.append(request);
    console.log('Contact data added to Google Sheets');
  } catch (error) {
    console.error('Error adding contact to Google Sheets:', error);
    // Continue operation even if sheets update fails
  }
}

export async function addPoemSubmissionToSheet(data: PoemSubmissionData): Promise<void> {
  try {
    const authClient = await getAuthClient();
    if (!authClient) return;

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:M',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {
        values: [[
          data.timestamp,
          data.name,
          data.email,
          data.phone,
          data.age,
          data.city,
          data.state,
          data.poemTitle,
          data.tier,
          data.amount,
          data.paymentScreenshot,
          data.poemFile,
          data.photo
        ]]
      }
    };

    await sheets.spreadsheets.values.append(request);
    console.log('Poem submission data added to Google Sheets');
  } catch (error) {
    console.error('Error adding poem submission to Google Sheets:', error);
    // Continue operation even if sheets update fails
  }
}

// Initialize sheet headers if they don't exist
export async function initializeSheetHeaders(): Promise<void> {
  try {
    const authClient = await getAuthClient();
    if (!authClient) return;

    // Initialize contacts sheet headers
    const contactsRequest = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Contacts!A1:E1',
      valueInputOption: 'USER_ENTERED',
      auth: authClient,
      requestBody: {
        values: [['Timestamp', 'Name', 'Email', 'Phone', 'Message']]
      }
    };

    // Initialize poems sheet headers
    const poemsRequest = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A1:M1',
      valueInputOption: 'USER_ENTERED',
      auth: authClient,
      requestBody: {
        values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'City', 'State', 'Poem Title', 'Tier', 'Amount', 'Payment Screenshot', 'Poem File', 'Photo']]
      }
    };

    await sheets.spreadsheets.values.update(contactsRequest);
    await sheets.spreadsheets.values.update(poemsRequest);
    console.log('Sheet headers initialized');
  } catch (error) {
    console.error('Error initializing sheet headers:', error);
  }
}