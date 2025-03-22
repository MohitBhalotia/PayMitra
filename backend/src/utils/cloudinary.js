const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: 'auto',
      folder: 'resumes'
    });
    return result.secure_url;
  } catch (error) {
    throw new Error('Failed to upload file to Cloudinary');
  }
};

module.exports = { uploadToCloudinary }; 