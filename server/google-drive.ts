import { google } from 'googleapis';

// Google Drive folder ID from the provided link
const DRIVE_FOLDER_ID = '1kG8qdjMAmWKXiEKngr51jnUnyb2sEv4P';

// Decode base64-encoded service account JSON
const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, "base64").toString("utf-8"))
  : null;

if (!credentials) {
  console.log("❌ GOOGLE_SERVICE_ACCOUNT_JSON not loaded properly");
} else {
  console.log("✅ Google Drive service account credentials loaded.");
}

const auth = new google.auth.GoogleAuth({
  credentials: credentials || undefined,
  scopes: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive"
  ],
});

const drive = google.drive({ version: "v3", auth });

async function getAuthClient() {
  try {
    if (!credentials) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON in env");
    return await auth.getClient();
  } catch (error) {
    console.warn('Google Drive authentication not configured.');
    throw error;
  }
}

// Create or get folder by name
async function createOrGetFolder(folderName: string, parentFolderId: string): Promise<string> {
  try {
    const authClient = await getAuthClient();

    // Check if folder already exists
    const existingFolders = await drive.files.list({
      q: `name='${folderName}' and parents in '${parentFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      auth: authClient,
    });

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      const folderId = existingFolders.data.files[0].id!;
      console.log(`📁 Found existing folder: ${folderName} (${folderId})`);
      return folderId;
    }

    // Create new folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      auth: authClient,
    });

    const folderId = folder.data.id!;
    console.log(`📁 Created new folder: ${folderName} (${folderId})`);
    return folderId;
  } catch (error) {
    console.error(`❌ Error creating/getting folder ${folderName}:`, error);
    throw error;
  }
}

// Upload file to Google Drive
export async function uploadFileToDrive(
  file: Buffer, 
  fileName: string, 
  mimeType: string, 
  folderType: 'Photos' | 'Poems'
): Promise<string> {
  try {
    const authClient = await getAuthClient();

    // Get or create the specific folder (Photos or Poems)
    const folderName = folderType === 'Photos' ? 'Photos (Participants)' : 'Poems';
    const folderId = await createOrGetFolder(folderName, DRIVE_FOLDER_ID);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: file,
    };

    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      auth: authClient,
    });

    const fileId = uploadedFile.data.id!;
    
    // Make file viewable by anyone with the link
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      auth: authClient,
    });

    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
    console.log(`✅ File uploaded to Drive: ${fileName} -> ${fileUrl}`);
    
    return fileUrl;
  } catch (error) {
    console.error(`❌ Error uploading file to Drive:`, error);
    throw error;
  }
}

// Upload poem file (PDF/DOC/DOCX)
export async function uploadPoemFile(file: Buffer, email: string, originalFileName: string): Promise<string> {
  const fileExtension = originalFileName.split('.').pop() || 'pdf';
  const fileName = `${email}_poem.${fileExtension}`;
  const mimeType = getMimeType(fileExtension);
  
  return uploadFileToDrive(file, fileName, mimeType, 'Poems');
}

// Upload photo file (JPG/PNG)
export async function uploadPhotoFile(file: Buffer, email: string, originalFileName: string): Promise<string> {
  const fileExtension = originalFileName.split('.').pop() || 'jpg';
  const fileName = `${email}_photo.${fileExtension}`;
  const mimeType = getMimeType(fileExtension);
  
  return uploadFileToDrive(file, fileName, mimeType, 'Photos');
}

// Get MIME type based on file extension
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}