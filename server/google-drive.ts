import { google } from 'googleapis';
import { Readable } from 'stream';

// Google Drive folder ID from the provided link
const DRIVE_FOLDER_ID = '1kG8qdjMAmWKXiEKngr51jnUnyb2sEv4P';

// Decode base64-encoded service account JSON
let credentials = null;
try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, "base64").toString("utf-8"));
    console.log("✅ Google Drive service account credentials loaded.");
    console.log("🔍 Credentials info:", {
      type: credentials.type,
      project_id: credentials.project_id,
      client_email: credentials.client_email ? 'present' : 'missing'
    });
  } else {
    console.log("❌ GOOGLE_SERVICE_ACCOUNT_JSON environment variable not found");
  }
} catch (error) {
  console.error("❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", error.message);
  credentials = null;
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
    if (!credentials) {
      console.error("❌ No Google Drive credentials available");
      throw new Error("Google Drive not configured - missing GOOGLE_SERVICE_ACCOUNT_JSON");
    }
    
    console.log("🔐 Attempting to get auth client...");
    const client = await auth.getClient();
    console.log("✅ Google Drive auth client obtained successfully");
    return client;
  } catch (error) {
    console.error('❌ Google Drive authentication failed:', error.message);
    throw new Error(`Google Drive auth failed: ${error.message}`);
  }
}

// Create or get folder by name
async function createOrGetFolder(folderName: string, parentFolderId: string): Promise<string> {
  try {
    console.log(`📁 Looking for folder: ${folderName} in parent: ${parentFolderId}`);
    const authClient = await getAuthClient();

    // Check if folder already exists
    console.log(`🔍 Searching for existing folder: ${folderName}`);
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
    console.log(`📁 Creating new folder: ${folderName}`);
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      auth: authClient,
    });

    if (!folder.data.id) {
      throw new Error("Folder creation succeeded but no folder ID returned");
    }

    const folderId = folder.data.id;
    console.log(`📁 Created new folder: ${folderName} (${folderId})`);
    return folderId;
  } catch (error) {
    console.error(`❌ Error creating/getting folder ${folderName}:`, error);
    console.error(`❌ Parent folder ID: ${parentFolderId}`);
    console.error(`❌ Error details:`, {
      message: error.message,
      code: error.code,
      status: error.status
    });
    throw new Error(`Failed to create/get folder ${folderName}: ${error.message}`);
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
    console.log(`📤 Starting upload to Drive: ${fileName} (${file.length} bytes, type: ${mimeType})`);
    
    const authClient = await getAuthClient();
    console.log("✅ Auth client ready for file upload");

    // Get or create the specific folder (Photos or Poems)
    const folderName = folderType === 'Photos' ? 'Photos (Participants)' : 'Poems';
    console.log(`📁 Getting/creating folder: ${folderName}`);
    const folderId = await createOrGetFolder(folderName, DRIVE_FOLDER_ID);
    console.log(`📁 Using folder ID: ${folderId}`);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    // Convert Buffer to readable stream
    const stream = new Readable();
    stream.push(file);
    stream.push(null); // End the stream

    const media = {
      mimeType: mimeType,
      body: stream,
    };

    console.log(`☁️ Uploading file to Google Drive...`);
    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      auth: authClient,
    });

    if (!uploadedFile.data.id) {
      throw new Error("Upload succeeded but no file ID returned");
    }

    const fileId = uploadedFile.data.id;
    console.log(`✅ File uploaded successfully with ID: ${fileId}`);
    
    // Make file viewable by anyone with the link
    console.log(`🔐 Setting file permissions...`);
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      auth: authClient,
    });

    // Generate shareable link
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    console.log(`✅ File uploaded to Drive: ${fileName} -> ${fileUrl}`);
    console.log(`📁 File ID: ${fileId}, Folder: ${folderType}`);
    console.log(`🔗 Returning shareable URL: ${fileUrl}`);
    
    return fileUrl;
  } catch (error) {
    console.error(`❌ Error uploading file ${fileName} to Drive:`, error);
    console.error(`❌ Error details:`, {
      message: error.message,
      code: error.code,
      status: error.status
    });
    throw new Error(`Failed to upload ${fileName} to Google Drive: ${error.message}`);
  }
}

// ✅ FIXED: Upload poem file with proper naming for multiple poems
export async function uploadPoemFile(
  file: Buffer, 
  email: string, 
  originalFileName: string, 
  poemIndex?: number,
  poemTitle?: string
): Promise<string> {
  try {
    console.log(`📤 Starting poem file upload for email: ${email}`);
    console.log(`📄 Original filename: ${originalFileName}`);
    console.log(`📝 Poem title: ${poemTitle}`);
    
    if (!file || file.length === 0) {
      throw new Error('File buffer is empty or undefined');
    }
    
    const fileExtension = originalFileName.split('.').pop() || 'pdf';
    
    // ✅ NEW: Create filename in format email_poemtitle.pdf
    let fileName: string;
    if (poemTitle && poemTitle.trim()) {
      // Sanitize poem title for filename use
      const sanitizedTitle = poemTitle.trim()
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters except spaces
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit title length
      
      fileName = `${email}_${sanitizedTitle}.${fileExtension}`;
    } else {
      // Fallback if no poem title provided
      if (poemIndex !== undefined && poemIndex >= 0) {
        fileName = `${email}_poem_${poemIndex + 1}.${fileExtension}`;
      } else {
        fileName = `${email}_poem.${fileExtension}`;
      }
    }
    
    const mimeType = getMimeType(fileExtension);
    
    console.log(`📤 Uploading poem file: ${fileName}`);
    console.log(`📝 File size: ${file.length} bytes`);
    console.log(`📝 MIME type: ${mimeType}`);
    console.log(`📝 Using poem title: "${poemTitle}" -> sanitized: "${fileName}"`);
    
    const uploadedUrl = await uploadFileToDrive(file, fileName, mimeType, 'Poems');
    console.log(`✅ Poem file uploaded successfully: ${uploadedUrl}`);
    return uploadedUrl;
  } catch (error) {
    console.error(`❌ Error uploading poem file for ${email}:`, error);
    throw new Error(`Failed to upload poem file: ${error.message}`);
  }
}

// ✅ FIXED: Upload multiple poem files with proper naming
export async function uploadMultiplePoemFiles(
  files: Buffer[], 
  email: string, 
  originalFileNames: string[],
  poemTitles: string[]
): Promise<string[]> {
  const uploadPromises = files.map(async (file, index) => {
    const originalFileName = originalFileNames[index] || `poem_${index + 1}.pdf`;
    const poemTitle = poemTitles[index] || `poem_${index + 1}`;
    
    return uploadPoemFile(file, email, originalFileName, index, poemTitle);
  });
  
  const results = await Promise.all(uploadPromises);
  console.log(`✅ Uploaded ${results.length} poem files for ${email}`);
  return results;
}

// Upload photo file (JPG/PNG) - Keep existing functionality
export async function uploadPhotoFile(file: Buffer, email: string, originalFileName: string): Promise<string> {
  try {
    console.log(`📸 Starting photo file upload for email: ${email}`);
    console.log(`📄 Original filename: ${originalFileName}`);
    
    if (!file || file.length === 0) {
      throw new Error('Photo file buffer is empty or undefined');
    }
    
    const fileExtension = originalFileName.split('.').pop() || 'jpg';
    const fileName = `${email}_photo.${fileExtension}`;
    const mimeType = getMimeType(fileExtension);
    
    console.log(`📸 Uploading photo file: ${fileName}`);
    console.log(`📝 File size: ${file.length} bytes`);
    console.log(`📝 MIME type: ${mimeType}`);
    
    const uploadedUrl = await uploadFileToDrive(file, fileName, mimeType, 'Photos');
    console.log(`✅ Photo file uploaded successfully: ${uploadedUrl}`);
    return uploadedUrl;
  } catch (error) {
    console.error(`❌ Error uploading photo file for ${email}:`, error);
    throw new Error(`Failed to upload photo file: ${error.message}`);
  }
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