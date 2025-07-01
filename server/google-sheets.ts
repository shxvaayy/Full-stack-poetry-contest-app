import { google } from 'googleapis';
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

// Decode base64-encoded service account JSON (keeping your existing method)
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
  submissionUuid?: string; // Add UUID for grouping multiple poems
  poemIndex?: number; // Add poem index for multiple poems
}

// ✅ NEW: Interface for multiple poems submission
interface MultiplePomsSubmissionData {
  name: string;
  email: string;
  phone: string;
  age: string;
  tier: string;
  amount: string;
  photo: string;
  timestamp: string;
  submissionUuid: string;
  poems: Array<{
    title: string;
    fileUrl: string;
    index: number;
  }>;
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

// ✅ KEEP: Original function for single poem (backward compatibility)
export async function addPoemSubmissionToSheet(data: PoemSubmissionData): Promise<void> {
  try {
    console.log("📝 Adding single poem submission to sheet:", data.name, data.tier);
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

    // Extended sheet structure (A through L)
    // A=Timestamp, B=Name, C=Email, D=Phone, E=Age, F=Poem Title, G=Tier, H=Amount, I=Poem File, J=Photo, K=Submission UUID, L=Poem Index
    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:L', // Extended range
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {
        values: [[
          data.timestamp,                           // A - Timestamp
          data.name,                               // B - Name (full name)
          data.email,                              // C - Email
          data.phone || '',                        // D - Phone
          data.age || '',                          // E - Age
          data.poemTitle,                          // F - Poem Title
          data.tier,                               // G - Tier
          amount.toString(),                       // H - Amount
          data.poemFile || '',                     // I - Poem File (Google Drive link)
          data.photo || '',                        // J - Photo (Google Drive link)
          data.submissionUuid || '',               // K - Submission UUID (for grouping)
          (data.poemIndex !== undefined ? data.poemIndex + 1 : 1).toString() // L - Poem Index
        ]]
      }
    };

    console.log('📊 Sending to Google Sheets (A-L columns):', request.requestBody.values[0]);

    await sheets.spreadsheets.values.append(request);
    console.log('✅ Single poem submission added to Google Sheets');

  } catch (error) {
    console.error('❌ Error adding poem submission to Google Sheets:', error);
    console.error('Error details:', error);
    throw error;
  }
}

// ✅ NEW: Function for multiple poems submission
export async function addMultiplePoemsToSheet(data: MultiplePomsSubmissionData): Promise<void> {
  try {
    console.log(`📝 Adding ${data.poems.length} poems to sheet for:`, data.name, data.tier);
    console.log("📁 Photo link:", data.photo);
    console.log("📁 Poem files:", data.poems.map(p => p.fileUrl));

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

    // ✅ CREATE MULTIPLE ROWS - One for each poem
    const rowsToAdd = data.poems.map(poem => [
      data.timestamp,                              // A - Timestamp
      data.name,                                   // B - Name (full name)
      data.email,                                  // C - Email
      data.phone || '',                            // D - Phone
      data.age || '',                              // E - Age
      poem.title,                                  // F - Poem Title (DIFFERENT for each row)
      data.tier,                                   // G - Tier (SAME for all)
      amount.toString(),                           // H - Amount (SAME for all)
      poem.fileUrl,                                // I - Poem File (DIFFERENT for each row)
      data.photo,                                  // J - Photo (SAME for all)
      data.submissionUuid,                         // K - Submission UUID (SAME for all - groups them)
      (poem.index + 1).toString()                  // L - Poem Index (1, 2, 3, 4, 5)
    ]);

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:L', // Extended range A-L
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {
        values: rowsToAdd
      }
    };

    console.log(`📊 Sending ${rowsToAdd.length} rows to Google Sheets:`, rowsToAdd);

    await sheets.spreadsheets.values.append(request);
    console.log(`✅ Successfully added ${rowsToAdd.length} poem rows to Google Sheets`);
    console.log('✅ Data structure for multiple poems:', {
      timestamp: data.timestamp,
      name: data.name,
      email: data.email,
      phone: data.phone,
      tier: data.tier,
      amount: amount,
      photo: data.photo,
      submissionUuid: data.submissionUuid,
      poemCount: data.poems.length,
      poems: data.poems.map(p => ({ title: p.title, fileUrl: p.fileUrl, index: p.index }))
    });

    const newCount = await getSubmissionCountFromSheet();
    console.log(`🎯 Updated count after submission: ${newCount}`);

  } catch (error) {
    console.error('❌ Error adding multiple poems to Google Sheets:', error);
    console.error('Error details:', error);
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
        range: 'Poetry!A1:L1', // Updated range A-L
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
          range: 'Poetry!A1:L1', // Updated range A-L
          valueInputOption: 'USER_ENTERED',
          auth: authClient,
          requestBody: {
            values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Poem File', 'Photo', 'Submission UUID', 'Poem Index']]
          }
        };
        await sheets.spreadsheets.values.update(poemsRequest);
        console.log('✅ Poetry sheet headers initialized with correct A-L column mapping');
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
        range: 'Poetry!A1:L1', // Updated range A-L
        valueInputOption: 'USER_ENTERED',
        auth: authClient,
        requestBody: {
          values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Poem File', 'Photo', 'Submission UUID', 'Poem Index']]
        }
      };

      await sheets.spreadsheets.values.update(contactsRequest);
      await sheets.spreadsheets.values.update(poemsRequest);
      console.log('✅ Sheet headers created with correct A-L column mapping');
    }
  } catch (error) {
    console.error('❌ Error initializing sheet headers:', error);
  }
}