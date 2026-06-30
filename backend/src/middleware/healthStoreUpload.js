const multer = require('multer');
const { uploadToCloudinary } = require('../utils/cloudinary');

// Use memory storage — upload buffer to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedDocs = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const isDocumentField = ['documents', 'pdfFile', 'idProof'].includes(file.fieldname);
  const allowed = isDocumentField ? allowedDocs : allowedImages;

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter,
});

/**
 * Middleware to upload all files to Cloudinary after multer processes them.
 * Attaches cloudinary URLs to req.uploadedFiles = { fieldname: url or [urls] }
 */
const uploadToCloudinaryMiddleware = (folder = 'health-store') => async (req, res, next) => {
  try {
    if (!req.files && !req.file) return next();

    req.uploadedFiles = {};

    // Handle req.files (fields)
    if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      for (const fieldname of Object.keys(req.files)) {
        const files = req.files[fieldname];
        if (!files || files.length === 0) continue;

        if (files.length === 1) {
          const url = await uploadToCloudinary(files[0].buffer, folder);
          req.uploadedFiles[fieldname] = url;
        } else {
          const urls = await Promise.all(files.map(f => uploadToCloudinary(f.buffer, folder)));
          req.uploadedFiles[fieldname] = urls;
        }
      }
    }

    // Handle req.file (single)
    if (req.file) {
      const url = await uploadToCloudinary(req.file.buffer, folder);
      req.uploadedFiles[req.file.fieldname] = url;
    }

    next();
  } catch (err) {
    console.error('Cloudinary upload middleware error:', err);
    return res.status(500).json({ success: false, message: 'File upload failed', error: err.message });
  }
};

module.exports = { upload, uploadToCloudinaryMiddleware };
