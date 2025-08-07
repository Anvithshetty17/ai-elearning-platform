const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = uploadDir;
    
    // Create subdirectories based on file type
    switch (file.fieldname) {
      case 'avatar':
      case 'thumbnail':
        uploadPath = path.join(uploadDir, 'images');
        break;
      case 'video':
        uploadPath = path.join(uploadDir, 'videos');
        break;
      case 'audio':
        uploadPath = path.join(uploadDir, 'audio');
        break;
      case 'document':
      case 'resource':
        uploadPath = path.join(uploadDir, 'documents');
        break;
      default:
        uploadPath = path.join(uploadDir, 'misc');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    avatar: /jpeg|jpg|png|gif|webp/,
    thumbnail: /jpeg|jpg|png|gif|webp/,
    video: /mp4|avi|mov|wmv|flv|webm|mkv/,
    audio: /mp3|wav|ogg|m4a|aac|flac/,
    document: /pdf|doc|docx|txt|rtf|ppt|pptx|xls|xlsx/,
    resource: /pdf|doc|docx|txt|rtf|ppt|pptx|xls|xlsx|zip|rar|7z/
  };

  const fieldType = file.fieldname;
  const ext = path.extname(file.originalname).toLowerCase().substring(1);

  // Check if field type is allowed
  if (!allowedTypes[fieldType]) {
    return cb(new Error(`Upload field '${fieldType}' is not supported`), false);
  }

  // Check if file extension is allowed for this field
  if (!allowedTypes[fieldType].test(ext)) {
    return cb(new Error(`File type '${ext}' is not allowed for ${fieldType} uploads`), false);
  }

  cb(null, true);
};

// File size limits (in bytes)
const fileSizeLimits = {
  avatar: 5 * 1024 * 1024, // 5MB
  thumbnail: 5 * 1024 * 1024, // 5MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 50 * 1024 * 1024, // 50MB
  document: 10 * 1024 * 1024, // 10MB
  resource: 50 * 1024 * 1024 // 50MB
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
    fieldSize: 10 * 1024 * 1024, // 10MB max field size
    fields: 20, // Max number of non-file fields
    files: 10 // Max number of files
  }
});

// Custom middleware for field-specific size limits
const checkFileSize = (req, res, next) => {
  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    
    for (const file of files) {
      const limit = fileSizeLimits[file.fieldname];
      if (limit && file.size > limit) {
        // Clean up uploaded file
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting oversized file:', err);
        });
        
        return res.status(400).json({
          success: false,
          message: `File '${file.originalname}' exceeds size limit for ${file.fieldname} (${Math.round(limit / 1024 / 1024)}MB)`
        });
      }
    }
  }
  
  next();
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 500MB.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum is 10 files.';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields in the form.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field: ${error.field}`;
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in the multipart form.';
        break;
      default:
        message = error.message;
    }
    
    return res.status(400).json({
      success: false,
      message: message,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
  
  if (error.message.includes('not allowed') || error.message.includes('not supported')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Predefined upload configurations
const uploadConfigs = {
  // Single file uploads
  single: (fieldName) => [
    upload.single(fieldName),
    checkFileSize,
    handleUploadError
  ],
  
  // Multiple files with same field name
  array: (fieldName, maxCount = 5) => [
    upload.array(fieldName, maxCount),
    checkFileSize,
    handleUploadError
  ],
  
  // Multiple files with different field names
  fields: (fields) => [
    upload.fields(fields),
    checkFileSize,
    handleUploadError
  ],
  
  // Any files
  any: () => [
    upload.any(),
    checkFileSize,
    handleUploadError
  ],
  
  // No files (for text-only forms that might have files)
  none: () => [
    upload.none(),
    handleUploadError
  ]
};

// Specific configurations for common use cases
const uploadMiddleware = {
  avatar: uploadConfigs.single('avatar'),
  thumbnail: uploadConfigs.single('thumbnail'),
  video: uploadConfigs.single('video'),
  audio: uploadConfigs.single('audio'),
  document: uploadConfigs.single('document'),
  
  courseFiles: uploadConfigs.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'resources', maxCount: 10 }
  ]),
  
  lectureFiles: uploadConfigs.fields([
    { name: 'video', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
    { name: 'resources', maxCount: 5 }
  ]),
  
  userFiles: uploadConfigs.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'documents', maxCount: 5 }
  ]),
  
  multipleDocuments: uploadConfigs.array('documents', 10),
  multipleResources: uploadConfigs.array('resources', 10),
  
  anyFiles: uploadConfigs.any(),
  noFiles: uploadConfigs.none()
};

// Utility functions
const uploadUtils = {
  // Clean up files in case of error
  cleanupFiles: (files) => {
    if (!files) return;
    
    const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
    
    fileArray.forEach(file => {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error cleaning up file:', file.path, err);
        });
      }
    });
  },
  
  // Get file info for response
  getFileInfo: (file) => {
    if (!file) return null;
    
    return {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path.replace(uploadDir, '').replace(/\\/g, '/'), // Relative path
      url: `/uploads${file.path.replace(uploadDir, '').replace(/\\/g, '/')}` // URL path
    };
  },
  
  // Get multiple files info
  getFilesInfo: (files) => {
    if (!files) return [];
    
    const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
    return fileArray.map(uploadUtils.getFileInfo);
  }
};

module.exports = {
  upload,
  uploadMiddleware,
  uploadUtils,
  handleUploadError,
  storage,
  fileFilter
};