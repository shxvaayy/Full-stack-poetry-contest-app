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

    const timestamp = contactData.timestamp || new Date().toISOString();

    const values = [
      [
        timestamp, // A: Timestamp
        contactData.name, // B: Name
        contactData.email, // C: Email
        contactData.phone || '', // D: Phone
        contactData.message // E: Message
      ]
    ];

    console.log('📊 Contact data to append:', values[0]);

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Contacts!A:E',
      valueInputOption: 'RAW',
      resource: {
        values: values
      }
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log('✅ Contact added to Google Sheets successfully');
    return response;

  } catch (error) {
    console.error('❌ Error adding contact to Google Sheets:', error);
    throw error;
  }
}

// ✅ KEEP: Original function for single poem (backward compatibility)
export async function addPoemSubmissionToSheet(data: any): Promise<void> {
  try {
    console.log("📝 Adding poem submission to sheet:", data);

    const authClient = await getAuthClient();
    if (!authClient) {
      throw new Error("No auth client available");
    }

    // Handle both old and new data formats
    const timestamp = data.timestamp || data.submittedAt?.toISOString() || new Date().toISOString();
    const name = data.name || `${data.firstName} ${data.lastName || ''}`.trim();
    const amount = data.amount || data.price || 0;

    // FIXED: Properly extract file URLs with better fallback logic
    const poemFileUrl = data.poemFileUrl || data.poemFile || data.poem_file_url || data.fileUrl || '';
    const photoFileUrl = data.photoFileUrl || data.photo || data.photoUrl || data.photo_file_url || data.photoFile || '';

    console.log('🔍 File URLs being sent to sheets:', { 
      poemFileUrl: poemFileUrl || 'EMPTY', 
      photoFileUrl: photoFileUrl || 'EMPTY',
      allDataKeys: Object.keys(data)
    });

    // Validate URLs before sending to sheets
    if (poemFileUrl && !poemFileUrl.startsWith('https://res.cloudinary.com/')) {
      console.warn('⚠️ Poem file URL does not look like a Cloudinary link:', poemFileUrl);
    }
    if (photoFileUrl && !photoFileUrl.startsWith('https://res.cloudinary.com/')) {
      console.warn('⚠️ Photo file URL does not look like a Cloudinary link:', photoFileUrl);
    }

    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:L',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {
        values: [[
          timestamp,                               // A - Timestamp
          name,                                   // B - Name
          data.email,                             // C - Email
          data.phone || '',                       // D - Phone
          data.age || '',                         // E - Age
          data.poemTitle,                         // F - Poem Title
          data.tier,                              // G - Tier
          amount.toString(),                      // H - Amount
          photoFileUrl,                           // I - Photo Link (Photo URL)
          poemFileUrl,                            // J - PDF Link (Poem File URL)
          data.submissionUuid || '',              // K - Submission UUID
          (data.poemIndex || 1).toString()        // L - Poem Index
        ]]
      }
    };

    console.log('📊 Sending to Google Sheets:', request.requestBody.values[0]);

    await sheets.spreadsheets.values.append(request);
    console.log('✅ Poem submission added to Google Sheets');

  } catch (error) {
    console.error('❌ Error adding poem submission to Google Sheets:', error);
    throw error;
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
  photoFileUrl?: string; // Add photo file URL
}): Promise<void> {
  try {
    console.log(`📝 Adding ${data.titles.length} poems to sheet for:`, data.firstName, data.tier);
    console.log('🔍 File URLs received:', { poemFileUrls: data.poemFileUrls, photoFileUrl: data.photoFileUrl });

    const authClient = await getAuthClient();
    if (!authClient) {
      throw new Error("No auth client available");
    }

    const timestamp = new Date().toISOString();
    const name = `${data.firstName} ${data.lastName || ''}`.trim();

    // Create rows for each poem
    const rowsToAdd = data.titles.map((title, index) => {
      const poemFileUrl = data.poemFileUrls?.[index] || '';
      const photoFileUrl = data.photoFileUrl || '';

      console.log(`📄 Row ${index + 1}: ${title} - Poem: ${poemFileUrl ? 'YES' : 'NO'}, Photo: ${photoFileUrl ? 'YES' : 'NO'}`);

      // Validate URLs before sending to sheets
    if (poemFileUrls && Array.isArray(poemFileUrls)) {
      poemFileUrls.forEach((url, index) => {
        if (url && !url.startsWith('https://res.cloudinary.com/')) {
          console.warn(`⚠️ Poem file URL ${index + 1} does not look like a Cloudinary link:`, url);
        }
      });
    }
    if (photoFileUrl && !photoFileUrl.startsWith('https://res.cloudinary.com/')) {
      console.warn('⚠️ Photo file URL does not look like a Cloudinary link:', photoFileUrl);
    }

      return [
        timestamp,                                           // A - Timestamp
        name,                                               // B - Name
        data.email,                                         // C - Email
        data.phone || '',                                   // D - Phone
        data.age || '',                                     // E - Age
        title,                                              // F - Poem Title
        data.tier,                                          // G - Tier
        (data.price || 0).toString(),                       // H - Amount (same for all poems in submission)
        photoFileUrl,                                       // I - Photo (same for all poems)
        poemFileUrl,                                        // J - Poem File URL
        data.submissionUuid,                                // K - Submission UUID
        (index + 1).toString()                              // L - Poem Index
      ];
    });

    // Use the correct Google Sheets API structure
    const request = {
      spreadsheetId: SPREADSHEET_ID,
      range: 'Poetry!A:L',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      auth: authClient,
      requestBody: {  // Use requestBody instead of resource
        values: rowsToAdd
      }
    };

    console.log(`📊 Adding ${rowsToAdd.length} rows to Google Sheets with file URLs`);

    await sheets.spreadsheets.values.append(request);
    console.log(`✅ Successfully added ${rowsToAdd.length} poem rows to Google Sheets`);

  } catch (error) {
    console.error('❌ Error adding multiple poems to Google Sheets:', error);
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
            values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Photo', 'Poem File', 'Submission UUID', 'Poem Index']]
          }
        };
        await sheets.spreadsheets.values.update(poemsRequest);
        console.log('✅ Poetry sheet headers initialized with correct A-L column mapping');
      } else {
        // Check if headers need to be updated to correct format
        const currentHeaders = existingPoetry.data.values[0];
        const expectedHeaders = ['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Photo', 'Poem File', 'Submission UUID', 'Poem Index'];

        // If headers don't match, update them
        if (JSON.stringify(currentHeaders) !== JSON.stringify(expectedHeaders)) {
          console.log('🔄 Updating sheet headers to correct format...');
          const updateRequest = {
            spreadsheetId: SPREADSHEET_ID,
            range: 'Poetry!A1:L1',
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
        range: 'Poetry!A1:L1', // Updated range A-L
        valueInputOption: 'USER_ENTERED',
        auth: authClient,
        requestBody: {
          values: [['Timestamp', 'Name', 'Email', 'Phone', 'Age', 'Poem Title', 'Tier', 'Amount', 'Photo', 'Poem File', 'Submission UUID', 'Poem Index']]
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