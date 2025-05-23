const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const fs = require('fs');
const util = require('util');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tickets',
    resource_type: 'raw',
    format: 'pdf',
    public_id: (req, file) => `ticket-${Date.now()}`
  }
});

// Configure multer for PDF uploads
const pdfUpload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * Upload a PDF buffer to Cloudinary
 * @param {Buffer} buffer - PDF buffer to upload
 * @param {String} publicId - Public ID for the PDF
 * @returns {Promise<Object>} Upload result
 */
const uploadPdfBuffer = async (buffer, publicId) => {
  try {
    // Create a temporary file
    const tempFilePath = path.join(__dirname, '../temp', `${publicId}.pdf`);
    const tempDir = path.dirname(tempFilePath);
    
    // Make sure the temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, buffer);
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(tempFilePath, {
      resource_type: 'raw',
      public_id: publicId,
      folder: 'tickets',
      format: 'pdf'
    });
    
    // Remove temporary file
    fs.unlinkSync(tempFilePath);
    
    return result;
  } catch (error) {
    console.error('Error uploading PDF to Cloudinary:', error);
    throw new Error('Failed to upload PDF to Cloudinary');
  }
};

/**
 * Delete a PDF from Cloudinary
 * @param {String} publicId - Public ID of the PDF to delete
 * @returns {Promise<Object>} Deletion result
 */
const deletePdf = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw'
    });
    return result;
  } catch (error) {
    console.error('Error deleting PDF from Cloudinary:', error);
    throw new Error('Failed to delete PDF from Cloudinary');
  }
};

module.exports = {
  cloudinary,
  pdfUpload,
  uploadPdfBuffer,
  deletePdf
}; 