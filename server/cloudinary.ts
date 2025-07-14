
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload profile photo to Cloudinary
export const uploadProfilePhotoToCloudinary = async (
  fileBuffer: Buffer,
  userId: string,
  originalName: string
): Promise<string> => {
  try {
    console.log('📸 Uploading profile photo to Cloudinary for user:', userId);

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = originalName.split('.').pop() || 'jpg';
    const publicId = `writory/profile_photos/${userId}_${timestamp}`;

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: 'writory/profile_photos',
          resource_type: 'image',
          format: fileExtension,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload successful:', result?.secure_url);
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });

    return (result as any).secure_url;
  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', error);
    throw error;
  }
};

// Upload poem file to Cloudinary
export const uploadPoemFileToCloudinary = async (
  fileBuffer: Buffer,
  email: string,
  originalName: string,
  poemTitle?: string
): Promise<string> => {
  try {
    console.log('📄 Uploading poem file to Cloudinary for email:', email);

    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty');
    }

    // Validate file type (PDF, DOC, DOCX allowed for poems)
    const fileExtension = originalName.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(fileExtension || '')) {
      throw new Error('Upload failed: Only PDF, DOC, DOCX for poems');
    }

    // Generate a unique filename in format: email_poemtitle_timestamp
    const timestamp = Date.now();
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9@.]/g, '_'); // Keep full email with @ and .
    const sanitizedTitle = poemTitle 
      ? poemTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30)
      : 'poem';
    
    const publicId = `writory_uploads/poems/${sanitizedEmail}_${sanitizedTitle}_${timestamp}`;

    console.log('📤 Uploading poem file with public ID:', publicId);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: 'writory_uploads/poems',
          resource_type: 'raw', // For non-image files like PDF, DOC, DOCX
          format: fileExtension
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary poem upload error:', error);
            reject(error);
          } else {
            console.log('✅ Poem file uploaded successfully:', result?.secure_url);
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });

    return (result as any).secure_url;
  } catch (error) {
    console.error('❌ Error uploading poem file to Cloudinary:', error);
    throw error;
  }
};

// Upload photo file to Cloudinary
export const uploadPhotoFileToCloudinary = async (
  fileBuffer: Buffer,
  email: string,
  originalName: string
): Promise<string> => {
  try {
    console.log('📸 Uploading photo file to Cloudinary for email:', email);

    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Photo file buffer is empty');
    }

    // Validate file type (only images allowed)
    const fileExtension = originalName.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(fileExtension || '')) {
      throw new Error('Upload failed: Only JPG, PNG for images are allowed');
    }

    // Generate a unique filename in format: email_photo_timestamp
    const timestamp = Date.now();
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9@.]/g, '_'); // Keep full email with @ and .
    const publicId = `writory_uploads/photos/${sanitizedEmail}_photo_${timestamp}`;

    console.log('📤 Uploading photo file with public ID:', publicId);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: 'writory_uploads/photos',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary photo upload error:', error);
            reject(error);
          } else {
            console.log('✅ Photo file uploaded successfully:', result?.secure_url);
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });

    return (result as any).secure_url;
  } catch (error) {
    console.error('❌ Error uploading photo file to Cloudinary:', error);
    throw error;
  }
};

// Delete file from Cloudinary
export const deleteFileFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting file from Cloudinary:', publicId);
    await cloudinary.uploader.destroy(publicId);
    console.log('✅ File deleted from Cloudinary');
  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Upload winner photo to Cloudinary
export const uploadWinnerPhotoToCloudinary = async (
  fileBuffer: Buffer,
  position: number,
  contestMonth: string,
  originalName: string
): Promise<string> => {
  try {
    console.log('🏆 Uploading winner photo to Cloudinary for position:', position, 'contest:', contestMonth);

    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Winner photo file buffer is empty');
    }

    // Validate file type (only images allowed)
    const fileExtension = originalName.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(fileExtension || '')) {
      throw new Error('Only JPG, JPEG, and PNG files are allowed for winner photos');
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const sanitizedMonth = contestMonth.replace(/[^a-zA-Z0-9-]/g, '_');
    const publicId = `writory/winner_photos/${sanitizedMonth}_position_${position}_${timestamp}`;

    console.log('📤 Uploading winner photo with public ID:', publicId);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: 'writory/winner_photos',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary winner photo upload error:', error);
            reject(error);
          } else {
            console.log('✅ Winner photo uploaded successfully:', result?.secure_url);
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });

    return (result as any).secure_url;
  } catch (error) {
    console.error('❌ Error uploading winner photo to Cloudinary:', error);
    throw error;
  }
};

export { cloudinary };
