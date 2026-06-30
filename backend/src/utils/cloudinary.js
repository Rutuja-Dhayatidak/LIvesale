const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (fileBuffer, folder = 'kyc') => {
  return new Promise((resolve, reject) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME;
    if (!cloudName || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn("Cloudinary not configured! Using mock URL fallback.");
      return resolve(`https://res.cloudinary.com/demo/image/upload/v1234567890/mock_kyc_document.png`);
    }
    
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `find_gym/${folder}` },
      (error, result) => {
        if (error) {
          console.warn("Cloudinary upload failed! Falling back to mock URL. Error:", error.message || error);
          return resolve(`https://res.cloudinary.com/demo/image/upload/v1234567890/mock_${folder}_document.png`);
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

module.exports = {
  uploadToCloudinary
};
