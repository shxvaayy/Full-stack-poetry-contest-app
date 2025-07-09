
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Token storage path (for development)
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Google Drive folder ID from environment
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// OAuth 2.0 credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Scopes for Google Drive API
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

// OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// In-memory token storage (fallback)
let accessToken: string | null = null;
let refreshToken: string | null = null;

/**
 * Generate authorization URL for OAuth flow
 */
export function getAuthUrl(): string {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('OAuth credentials not configured. Please set CLIENT_ID, CLIENT_SECRET, and REDIRECT_URI environment variables.');
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('🔐 Generated OAuth URL for Google Drive access');
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<any> {
  try {
    console.log('🔄 Exchanging authorization code for tokens...');
    
    const { tokens } = await oauth2Client.getAccessToken(code);
    console.log('✅ Tokens received successfully');

    // Save tokens
    await saveTokens(tokens);
    
    // Set credentials for future API calls
    oauth2Client.setCredentials(tokens);
    
    return tokens;
  } catch (error) {
    console.error('❌ Error exchanging code for tokens:', error);
    throw new Error(`OAuth token exchange failed: ${error.message}`);
  }
}

/**
 * Save tokens to file and memory
 */
async function saveTokens(tokens: any): Promise<void> {
  try {
    // Save to memory
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;

    // Save to file (for persistence in development)
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
      saved_at: new Date().toISOString()
    };

    await fs.promises.writeFile(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
    console.log('💾 Tokens saved to file and memory');
  } catch (error) {
    console.error('⚠️ Warning: Could not save tokens to file:', error.message);
    console.log('📝 Tokens saved to memory only');
  }
}

/**
 * Load tokens from file or memory
 */
async function loadTokens(): Promise<any> {
  try {
    // Try loading from file first
    if (fs.existsSync(TOKEN_PATH)) {
      const tokenData = await fs.promises.readFile(TOKEN_PATH, 'utf8');
      const tokens = JSON.parse(tokenData);
      
      // Update memory cache
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;
      
      console.log('✅ Tokens loaded from file');
      return tokens;
    }
  } catch (error) {
    console.log('⚠️ Could not load tokens from file:', error.message);
  }

  // Fallback to memory
  if (accessToken) {
    console.log('✅ Tokens loaded from memory');
    return {
      access_token: accessToken,
      refresh_token: refreshToken
    };
  }

  throw new Error('No tokens available. Please complete OAuth authorization first.');
}

/**
 * Get authenticated Google Drive client
 */
async function getAuthenticatedDriveClient() {
  try {
    const tokens = await loadTokens();
    
    oauth2Client.setCredentials(tokens);
    
    // Create Drive API client
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    console.log('✅ Authenticated Google Drive client created');
    return drive;
  } catch (error) {
    console.error('❌ Failed to get authenticated Drive client:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Upload file to Google Drive using OAuth
 */
export async function uploadFileToDriveOAuth(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderType: 'Photos' | 'Poems'
): Promise<string> {
  try {
    console.log(`📤 Starting OAuth Drive upload: ${fileName} (${fileBuffer.length} bytes)`);

    if (!DRIVE_FOLDER_ID) {
      throw new Error('DRIVE_FOLDER_ID environment variable not configured');
    }

    const drive = await getAuthenticatedDriveClient();

    // Create or get subfolder
    const folderName = folderType === 'Photos' ? 'Photos (Participants)' : 'Poems';
    const folderId = await createOrGetFolder(drive, folderName, DRIVE_FOLDER_ID);

    // Upload file
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: mimeType,
      body: require('stream').Readable.from(fileBuffer)
    };

    console.log('☁️ Uploading to Google Drive...');
    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });

    if (!uploadedFile.data.id) {
      throw new Error('Upload succeeded but no file ID returned');
    }

    const fileId = uploadedFile.data.id;
    console.log(`✅ File uploaded with ID: ${fileId}`);

    // Make file viewable by anyone with the link
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const fileUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    console.log(`✅ File URL: ${fileUrl}`);

    return fileUrl;
  } catch (error) {
    console.error('❌ OAuth Drive upload failed:', error);
    throw new Error(`Drive upload failed: ${error.message}`);
  }
}

/**
 * Create or get folder by name
 */
async function createOrGetFolder(drive: any, folderName: string, parentFolderId: string): Promise<string> {
  try {
    console.log(`📁 Looking for folder: ${folderName} in parent: ${parentFolderId}`);

    // Check if folder exists
    const existingFolders = await drive.files.list({
      q: `name='${folderName}' and parents in '${parentFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      const folderId = existingFolders.data.files[0].id;
      console.log(`📁 Found existing folder: ${folderName} (${folderId})`);
      return folderId;
    }

    // Create new folder
    console.log(`📁 Creating new folder: ${folderName}`);
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    if (!folder.data.id) {
      throw new Error('Folder creation succeeded but no folder ID returned');
    }

    const folderId = folder.data.id;
    console.log(`📁 Created new folder: ${folderName} (${folderId})`);
    return folderId;
  } catch (error) {
    console.error(`❌ Error creating/getting folder ${folderName}:`, error);
    throw new Error(`Failed to create/get folder ${folderName}: ${error.message}`);
  }
}

/**
 * Upload poem file with OAuth
 */
export async function uploadPoemFileOAuth(
  file: Buffer,
  email: string,
  originalFileName: string,
  poemIndex?: number,
  poemTitle?: string
): Promise<string> {
  try {
    console.log(`📤 Starting OAuth poem file upload for email: ${email}`);

    if (!file || file.length === 0) {
      throw new Error('File buffer is empty');
    }

    const fileExtension = originalFileName.split('.').pop() || 'pdf';
    
    // Create filename
    let fileName: string;
    if (poemTitle && poemTitle.trim()) {
      const sanitizedTitle = poemTitle.trim()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      
      fileName = `${email.split('@')[0]}_${sanitizedTitle}.${fileExtension}`;
    } else {
      fileName = `${email.split('@')[0]}_poem${poemIndex ? `_${poemIndex + 1}` : ''}.${fileExtension}`;
    }

    const mimeType = getMimeType(fileExtension);
    
    return await uploadFileToDriveOAuth(file, fileName, mimeType, 'Poems');
  } catch (error) {
    console.error(`❌ Error uploading poem file for ${email}:`, error);
    throw new Error(`Failed to upload poem file: ${error.message}`);
  }
}

/**
 * Upload photo file with OAuth
 */
export async function uploadPhotoFileOAuth(
  file: Buffer,
  email: string,
  originalFileName: string
): Promise<string> {
  try {
    console.log(`📸 Starting OAuth photo file upload for email: ${email}`);

    if (!file || file.length === 0) {
      throw new Error('Photo file buffer is empty');
    }

    const fileExtension = originalFileName.split('.').pop() || 'jpg';
    const fileName = `${email.split('@')[0]}_photo.${fileExtension}`;
    const mimeType = getMimeType(fileExtension);
    
    return await uploadFileToDriveOAuth(file, fileName, mimeType, 'Photos');
  } catch (error) {
    console.error(`❌ Error uploading photo file for ${email}:`, error);
    throw new Error(`Failed to upload photo file: ${error.message}`);
  }
}

/**
 * Upload multiple poem files with OAuth
 */
export async function uploadMultiplePoemFilesOAuth(
  files: Buffer[],
  email: string,
  originalFileNames: string[],
  poemTitles: string[]
): Promise<string[]> {
  const uploadPromises = files.map(async (file, index) => {
    const originalFileName = originalFileNames[index] || `poem_${index + 1}.pdf`;
    const poemTitle = poemTitles[index] || `poem_${index + 1}`;
    
    return uploadPoemFileOAuth(file, email, originalFileName, index, poemTitle);
  });
  
  const results = await Promise.all(uploadPromises);
  console.log(`✅ Uploaded ${results.length} poem files for ${email}`);
  return results;
}

/**
 * Get MIME type based on file extension
 */
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

/**
 * Check if tokens are valid and available
 */
export async function checkAuthStatus(): Promise<boolean> {
  try {
    await loadTokens();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear saved tokens (for logout)
 */
export async function clearTokens(): Promise<void> {
  try {
    // Clear memory
    accessToken = null;
    refreshToken = null;
    
    // Clear file
    if (fs.existsSync(TOKEN_PATH)) {
      await fs.promises.unlink(TOKEN_PATH);
    }
    
    console.log('🗑️ Tokens cleared successfully');
  } catch (error) {
    console.error('⚠️ Warning: Could not clear token file:', error.message);
  }
}
