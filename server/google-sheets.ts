
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
  poemTitle: string;
  tier: string;
  amount: string;
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

// Get submission count from Google Sheets
export async function getSubmissionCountFromSheet(): Promise<number> {
  try {
    const authClient = await getAuthClient();
    if (!authClient) {
      throw new Error("No auth client available");
    }

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:A',
      auth: authClient,
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values || [];

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

    const rowData = [
      data.timestamp,
      data.name,
      data.email,
      data.phone,
      data.message
    ];

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Contacts!A:E',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {
        values: [rowData]
      }
    };

    console.log('📋 Final Google Sheets request:', {
      range: request.range,
      values: request.requestBody.values,
      phonePosition: 'Column D (index 3)',
      phoneValue: rowData[3]
    });

    await sheets.spreadsheets.values.append(request);
    console.log('✅ Contact data added to Google Sheets');
  } catch (error) {
    console.error('❌ Error adding contact to Google Sheets:', error);
  }
}

export async function addPoemSubmissionToSheet(data: PoemSubmissionData): Promise<void> {
  try {
    console.log("📝 Adding poem submission to sheet:", data.name, data.tier);
    console.log("📁 File links - Poem:", data.poemFile, "Photo:", data.photo);

    const authClient = await getAuthClient();
    if (!authClient) {
      throw new Error("No auth client available");
    }

    // Calculate amount based on tier
    const tierAmounts = {
      'free': 0,
      'single': 50,
      'double': 100,
      'bulk': 480
    };
    const amount = tierAmounts[data.tier as keyof typeof tierAmounts] || 0;

    // FIXED: Ensure correct column mapping
    // A=Timestamp, B=Name, C=Email, D=Phone, E=Age, F=Poem Title, G=Tier, H=Amount, I=Poem File, J=Photo
    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:J', // Updated range to match actual columns
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {
        values: [[
          data.timestamp,                    // A - Timestamp
          data.name,                        // B - Name (firstName + lastName)
          data.email,                       // C - Email
          data.phone || '',                 // D - Phone
          data.age || '',                   // E - Age
          data.poemTitle,                   // F - Poem Title
          data.tier,                        // G - Tier
          amount.toString(),                // H - Amount
          data.poemFile || '',              // I - Poem File (Google Drive link)
          data.photo || ''                  // J - Photo (Google Drive link)
        ]]
      }
    };

    await sheets.spreadsheets.values.append(request);
    console.log('✅ Poem submission added to Google Sheets with correct column mapping');
    console.log('✅ Poem file link placed in column I (Poem File)');
    console.log('✅ Photo link placed in column J (Photo)');

    const newCount = await getSubmissionCountFromSheet();
    console.log(`🎯 Updated count after submission: ${newCount}`);

  } catch (error) {
    console.error('❌ Error adding poem submission to Google Sheets:', error);
    throw error;
  }
}

export async function initializeSheetHeaders(): Promise<void> {
  try {
    const authClient = await getAuthClient();
    if (!authClient) return;

    try {
      const existingContacts = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Contacts!A1:E1',
        auth: authClient,
      });

      const existingPoetry = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Poetry!A1:J1', // Updated range to match actual columns
        auth: authClient,
      });

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
          range: 'Poetry!A1:J1', // Updated range and headers to match actual columns
          valueInputOption: 'USER_ENTERED',
          auth: authClient,
          requestBody: {
            values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Poem File', 'Photo']]
          }
        };
        await sheets.spreadsheets.values.update(poemsRequest);
        console.log('✅ Poetry sheet headers initialized with correct column mapping');
      }
    } catch (error) {
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
        range: 'Poetry!A1:J1', // Updated range to match actual columns
        valueInputOption: 'USER_ENTERED',
        auth: authClient,
        requestBody: {
          values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Poem File', 'Photo']]
        }
      };

      await sheets.spreadsheets.values.update(contactsRequest);
      await sheets.spreadsheets.values.update(poemsRequest);
      console.log('✅ Sheet headers created with correct column mapping');
    }
  } catch (error) {
    console.error('❌ Error initializing sheet headers:', error);
  }
}