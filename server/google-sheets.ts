import { google } from 'googleapis';
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

// Decode base64-encoded service account JSON (keeping your existing method)
const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, "base64").toString("utf-8"))
  : null;

if (!credentials) {
  console.log('⚠️ GOOGLE_SERVICE_ACCOUNT_JSON not configured - Google Sheets integration disabled');
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

export async function addContactToSheet(contactData: ContactData) {
  try {
    console.log('📝 Adding contact to Google Sheets:', {
      email: contactData.email,
      phone: contactData.phone || 'not provided',
      hasTimestamp: !!contactData.timestamp
    });

    const authClient = await getAuthClient();
    if (!authClient) {
      console.warn('⚠️ No Google Sheets auth client available - contact will not be saved to sheets');
      return;
    }

    const timestamp = contactData.timestamp || new Date().toISOString();

    const values = [
      [
        timestamp, // A: Timestamp
        contactData.name || '', // B: Name
        contactData.email || '', // C: Email
        contactData.phone || '', // D: Phone
        contactData.message || '' // E: Message
      ]
    ];

    console.log('📊 Contact data to append:', values[0]);

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Contacts!A:E',
      valueInputOption: 'RAW',
      auth: authClient,
      requestBody: {
        values: values
      }
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log('✅ Contact added to Google Sheets successfully:', response.data);
    return response;

  } catch (error) {
    console.error('❌ Error adding contact to Google Sheets:', error);
    console.error('Error details:', error.response?.data || error.message);
    // Don't throw error to prevent contact form failure
    console.warn('⚠️ Continuing with contact form despite Google Sheets error');
  }
}

// ✅ KEEP: Original function for single poem (backward compatibility)
export async function addPoemSubmissionToSheet(data: any): Promise<void> {
  try {
    console.log("📝 Adding poem submission to sheet:");
    console.log("📊 Raw input data:", JSON.stringify(data, null, 2));

    const authClient = await getAuthClient();
    if (!authClient) {
      console.warn('⚠️ No Google Sheets auth client available - data will not be saved to sheets');
      return;
    }

    // Handle both old and new data formats
    const timestamp = data.timestamp || data.submittedAt?.toISOString() || new Date().toISOString();
    const name = data.name || `${data.firstName} ${data.lastName || ''}`.trim();
    const amount = parseFloat(data.amount || data.price || '0');

    // FIXED: Properly extract file URLs with better fallback logic
    const poemFileUrl = data.poemFileUrl || data.poemFile || data.poem_file_url || data.fileUrl || '';
    const photoFileUrl = data.photoFileUrl || data.photo || data.photoUrl || data.photo_file_url || data.photoFile || '';

    // CRITICAL: Extract contest fields and poem text properly with better fallback logic
    const contestType = data.contestType || data.contest_type || 'Theme-Based';
    const challengeTitle = data.challengeTitle || data.challenge_title || data.poemTitle || '';
    const challengeDescription = data.challengeDescription || data.challenge_description || '';
    const poemText = data.poemText || data.poem_text || '';

    console.log('🔍 Contest fields being sent to sheets:', { 
      contestType, 
      challengeTitle, 
      challengeDescription: challengeDescription ? 'YES' : 'NO',
      poemText: poemText ? 'YES' : 'NO',
      allDataKeys: Object.keys(data)
    });

    console.log('🔍 File URLs being sent to sheets:', { 
      poemFileUrl: poemFileUrl || 'EMPTY', 
      photoFileUrl: photoFileUrl || 'EMPTY'
    });

    // Ensure all fields have valid values
    const safeString = (value: any) => value ? String(value).trim() : '';
    
    const rowData = [
      timestamp,                               // A - Timestamp
      safeString(name),                       // B - Name
      safeString(data.email),                 // C - Email
      safeString(data.phone),                 // D - Phone
      safeString(data.age),                   // E - Age
      safeString(data.poemTitle),             // F - Poem Title
      safeString(data.tier),                  // G - Tier
      amount.toString(),                      // H - Amount
      safeString(photoFileUrl),               // I - Photo Link (Photo URL)
      safeString(poemFileUrl),                // J - PDF Link (Poem File URL)
      safeString(data.submissionUuid),        // K - Submission UUID
      safeString(data.poemIndex || 1),        // L - Poem Index
      safeString(contestType),                // M - Contest Type
      safeString(challengeTitle),             // N - Challenge Title
      safeString(challengeDescription),       // O - Challenge Description
      safeString(poemText),                   // P - Poem Text
      safeString(data.instagramHandle),       // Q - Instagram Handle
    ];

    console.log('📊 Full row data being sent to Google Sheets:', rowData);

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:P',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {
        values: [rowData]
      }
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log('✅ Poem submission added to Google Sheets successfully:', response.data);

  } catch (error) {
    console.error('❌ Error adding poem submission to Google Sheets:', error);
    console.error('Error details:', error.response?.data || error.message);
    // Don't throw error to prevent submission failure
    console.warn('⚠️ Continuing with submission despite Google Sheets error');
  }
}

// ✅ NEW: Function for multiple poems submission - FIXED
export async function addMultiplePoemsToSheet(data: {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  age?: string;
  tier: string;
  price?: number;
  paymentId?: string;
  paymentMethod?: string;
  titles: string[];
  submissionUuid: string;
  submissionIds: number[];
  poemFileUrls?: string[];
  photoFileUrl?: string;
  contestType?: string;
  challengeTitles?: string[];
  challengeDescriptions?: string[];
  poemTexts?: string[];
}): Promise<void> {
  try {
    console.log(`📝 Adding ${data.titles.length} poems to sheet for:`, data.firstName, data.tier);
    console.log('🔍 File URLs received:', { poemFileUrls: data.poemFileUrls, photoFileUrl: data.photoFileUrl });

    const authClient = await getAuthClient();
    if (!authClient) {
      console.warn('⚠️ No Google Sheets auth client available - data will not be saved to sheets');
      return;
    }

    const timestamp = new Date().toISOString();
    const name = `${data.firstName} ${data.lastName || ''}`.trim();

    // Create rows for each poem
    const rowsToAdd = data.titles.map((title, index) => {
      const poemFileUrl = data.poemFileUrls?.[index] || '';
      const photoFileUrl = data.photoFileUrl || '';
      const challengeTitle = data.challengeTitles?.[index] || title;
      const challengeDescription = data.challengeDescriptions?.[index] || '';
      const poemText = data.poemTexts?.[index] || '';

      console.log(`📄 Row ${index + 1}: ${title} - Poem: ${poemFileUrl ? 'YES' : 'NO'}, Photo: ${photoFileUrl ? 'YES' : 'NO'}`);

      return [
        timestamp,                                           // A - Timestamp
        name,                                               // B - Name
        data.email || '',                                   // C - Email
        data.phone || '',                                   // D - Phone
        data.age || '',                                     // E - Age
        title || '',                                        // F - Poem Title
        data.tier || '',                                    // G - Tier
        parseFloat(data.price || '0').toString(),           // H - Amount (same for all poems in submission)
        photoFileUrl,                                       // I - Photo (same for all poems)
        poemFileUrl,                                        // J - Poem File URL
        data.submissionUuid || '',                          // K - Submission UUID
        (index + 1).toString(),                             // L - Poem Index
        data.contestType || 'Theme-Based',                  // M - Contest Type
        challengeTitle,                                     // N - Challenge Title
        challengeDescription,                               // O - Challenge Description
        poemText                                            // P - Poem Text
      ];
    });

    console.log(`📊 Adding ${rowsToAdd.length} rows to Google Sheets:`, rowsToAdd);

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:P',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {
        values: rowsToAdd
      }
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log(`✅ Successfully added ${rowsToAdd.length} poem rows to Google Sheets:`, response.data);

  } catch (error) {
    console.error('❌ Error adding multiple poems to Google Sheets:', error);
    console.error('Error details:', error.response?.data || error.message);
    // Don't throw error to prevent submission failure
    console.warn('⚠️ Continuing with submission despite Google Sheets error');
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
        range: 'Poetry!A1:P1', // Updated range A-P
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
          range: 'Poetry!A1:P1', // Updated range A-P
          valueInputOption: 'USER_ENTERED',
          auth: authClient,
          requestBody: {
            values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Photo', 'Poem File', 'Submission UUID', 'Poem Index', 'Contest Type', 'Challenge Title', 'Challenge Description', 'Poem Text', 'Instagram Handle']]
          }
        };
        await sheets.spreadsheets.values.update(poemsRequest);
        console.log('✅ Poetry sheet headers initialized with correct A-P column mapping');
      } else {
        // Check if headers need to be updated to correct format
        const currentHeaders = existingPoetry.data.values[0];
        const expectedHeaders = ['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Photo', 'Poem File', 'Submission UUID', 'Poem Index', 'Contest Type', 'Challenge Title', 'Challenge Description', 'Poem Text', 'Instagram Handle'];

        // If headers don't match, update them
        if (JSON.stringify(currentHeaders) !== JSON.stringify(expectedHeaders)) {
          console.log('🔄 Updating sheet headers to correct format...');
          const updateRequest = {
            spreadsheetId: SPREADSHEET_ID,
            range: 'Poetry!A1:P1',
            valueInputOption: 'USER_ENTERED',
            auth: authClient,
            requestBody: {
              values: [expectedHeaders]
            }
          };
          await sheets.spreadsheets.values.update(updateRequest);
          console.log('✅ Poetry sheet headers updated to correct format');
        }
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
        range: 'Poetry!A1:P1', // Updated range A-P
        valueInputOption: 'USER_ENTERED',
        auth: authClient,
        requestBody: {
          values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Photo', 'Poem File', 'Submission UUID', 'Poem Index', 'Contest Type', 'Challenge Title', 'Challenge Description', 'Poem Text', 'Instagram Handle']]
        }
      };

      await sheets.spreadsheets.values.update(contactsRequest);
      await sheets.spreadsheets.values.update(poemsRequest);
      console.log('✅ Sheet headers created with correct A-P column mapping');
    }
  } catch (error) {
    console.error('❌ Error initializing sheet headers:', error);
  }
}