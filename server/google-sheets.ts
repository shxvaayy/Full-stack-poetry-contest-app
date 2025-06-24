import { google } from 'googleapis';
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

// Decode base64-encoded service account JSON
const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, "base64").toString("utf-8"))
  : null;

if (!credentials) {
  console.log("❌ GOOGLE_SERVICE_ACCOUNT_JSON not loaded properly");
} else {
  console.log("✅ Service account credentials loaded.");
}
  
const auth = new google.auth.GoogleAuth({
  credentials: credentials || undefined,
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

async function getAuthClient() {
  try {
    if (!credentials) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON in env");
    return await auth.getClient();
  } catch (error) {
    console.warn('Google Sheets authentication not configured. Data will be stored locally only.');
    return null;
  }
}

// NEW FUNCTION - Get submission count from Google Sheets
export async function getSubmissionCountFromSheet(): Promise<number> {
  try {
    const authClient = await getAuthClient();
    if (!authClient) {
      throw new Error("No auth client available");
    }

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:A', // Get all rows in column A (timestamps)
      auth: authClient,
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];
    
    // Subtract 1 for the header row, ensure minimum 0
    const count = Math.max(0, rows.length - 1);
    console.log(`📊 Read ${count} submissions from Google Sheets (${rows.length} total rows including header)`);
    
    return count;
  } catch (error) {
    console.error('❌ Error reading submission count from Google Sheets:', error);
    throw error;
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
    console.log('✅ Contact data added to Google Sheets');
  } catch (error) {
    console.error('❌ Error adding contact to Google Sheets:', error);
  }
}

export async function addPoemSubmissionToSheet(data: PoemSubmissionData): Promise<void> {
  try {
    console.log("📝 Adding poem submission to sheet:", data.name, data.tier);
    const authClient = await getAuthClient();
    if (!authClient) {
      throw new Error("No auth client available");
    }

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
          data.phone || '',
          data.age || '',
          data.city || '',
          data.state || '',
          data.poemTitle,
          data.tier,
          data.amount,
          data.paymentScreenshot || '',
          data.poemFile || '',
          data.photo || ''
        ]]
      }
    };

    await sheets.spreadsheets.values.append(request);
    console.log('✅ Poem submission added to Google Sheets');
    
    // Get updated count after adding
    const newCount = await getSubmissionCountFromSheet();
    console.log(`🎯 Updated count after submission: ${newCount}`);
    
  } catch (error) {
    console.error('❌ Error adding poem submission to Google Sheets:', error);
    throw error; // Re-throw so the calling function knows it failed
  }
}

export async function initializeSheetHeaders(): Promise<void> {
  try {
    const authClient = await getAuthClient();
    if (!authClient) return;

    // Check if headers already exist before creating them
    try {
      const existingContacts = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Contacts!A1:E1',
        auth: authClient,
      });

      const existingPoetry = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Poetry!A1:M1',
        auth: authClient,
      });

      // Only update if headers don't exist
      if (!existingContacts.data.values || existingContacts.data.values.length === 0) {
        const contactsRequest = {
          spreadsheetId: SPREADSHEET_ID,
          range: 'Contacts!A1:E1',
          valueInputOption: 'USER_ENTERED',
          auth: authClient,
          requestBody: {
            values: [['Timestamp', 'Name', 'Email', 'Phone', 'Message']]
          }
        };
        await sheets.spreadsheets.values.update(contactsRequest);
        console.log('✅ Contacts sheet headers initialized');
      }

      if (!existingPoetry.data.values || existingPoetry.data.values.length === 0) {
        const poemsRequest = {
          spreadsheetId: SPREADSHEET_ID,
          range: 'Poetry!A1:M1',
          valueInputOption: 'USER_ENTERED',
          auth: authClient,
          requestBody: {
            values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'City', 'State', 'Poem Title', 'Tier', 'Amount', 'Payment Screenshot', 'Poem File', 'Photo']]
          }
        };
        await sheets.spreadsheets.values.update(poemsRequest);
        console.log('✅ Poetry sheet headers initialized');
      }
    } catch (error) {
      // If sheets don't exist, create them with headers
      console.log('📋 Creating new sheets with headers...');
      const contactsRequest = {
        spreadsheetId: SPREADSHEET_ID,
        range: 'Contacts!A1:E1',
        valueInputOption: 'USER_ENTERED',
        auth: authClient,
        requestBody: {
          values: [['Timestamp', 'Name', 'Email', 'Phone', 'Message']]
        }
      };

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
      console.log('✅ Sheet headers created');
    }
  } catch (error) {
    console.error('❌ Error initializing sheet headers:', error);
  }
}