
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

// Delete profile photo from Cloudinary
export const deleteProfilePhotoFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting profile photo from Cloudinary:', publicId);
    await cloudinary.uploader.destroy(publicId);
    console.log('✅ Profile photo deleted from Cloudinary');
  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error);
    throw error;
  }
};

export { cloudinary };
