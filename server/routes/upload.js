const express = require('express');
const router = express.Router();
const path = require('path');
const { auth } = require('../middleware/auth');
const { uploadMiddleware, uploadUtils } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// @desc    Upload single file
// @route   POST /api/upload/single
// @access  Private
router.post('/single', auth, uploadMiddleware.anyFiles, async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const file = req.files[0];
    let uploadResult;

    try {
      // Determine resource type based on file type
      let resourceType = 'auto';
      const fileExt = path.extname(file.originalname).toLowerCase();
      
      if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(fileExt)) {
        resourceType = 'video';
      } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(fileExt)) {
        resourceType = 'video'; // Cloudinary uses 'video' for audio files too
      }

      // Upload to cloudinary
      uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'ai-elearning/uploads',
        resource_type: resourceType,
        quality: 'auto',
        fetch_format: 'auto'
      });

      // Clean up local file
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
          originalName: file.originalname,
          size: uploadResult.bytes,
          format: uploadResult.format,
          resourceType: uploadResult.resource_type,
          ...(uploadResult.duration && { duration: uploadResult.duration }),
          ...(uploadResult.width && { width: uploadResult.width }),
          ...(uploadResult.height && { height: uploadResult.height })
        }
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      
      // Clean up local file on error
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to cloud storage'
      });
    }
  } catch (error) {
    // Clean up files on error
    if (req.files) {
      uploadUtils.cleanupFiles(req.files);
    }
    next(error);
  }
});

// @desc    Upload multiple files
// @route   POST /api/upload/multiple
// @access  Private
router.post('/multiple', auth, uploadMiddleware.anyFiles, async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    const uploadResults = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Determine resource type
        let resourceType = 'auto';
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(fileExt)) {
          resourceType = 'video';
        } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(fileExt)) {
          resourceType = 'video';
        }

        // Upload to cloudinary
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'ai-elearning/uploads',
          resource_type: resourceType,
          quality: 'auto',
          fetch_format: 'auto'
        });

        uploadResults.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
          originalName: file.originalname,
          size: uploadResult.bytes,
          format: uploadResult.format,
          resourceType: uploadResult.resource_type,
          ...(uploadResult.duration && { duration: uploadResult.duration }),
          ...(uploadResult.width && { width: uploadResult.width }),
          ...(uploadResult.height && { height: uploadResult.height })
        });

        // Clean up local file
        const fs = require('fs');
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (cloudinaryError) {
        console.error(`Error uploading ${file.originalname}:`, cloudinaryError);
        errors.push({
          filename: file.originalname,
          error: 'Failed to upload to cloud storage'
        });

        // Clean up local file on error
        const fs = require('fs');
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `${uploadResults.length} files uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      data: {
        uploaded: uploadResults,
        ...(errors.length > 0 && { errors })
      }
    });
  } catch (error) {
    // Clean up files on error
    if (req.files) {
      uploadUtils.cleanupFiles(req.files);
    }
    next(error);
  }
});

// @desc    Upload avatar
// @route   POST /api/upload/avatar
// @access  Private
router.post('/avatar', auth, uploadMiddleware.avatar, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file'
      });
    }

    try {
      // Upload to cloudinary with avatar-specific settings
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'ai-elearning/avatars',
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        fetch_format: 'auto'
      });

      // Clean up local file
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
          width: uploadResult.width,
          height: uploadResult.height
        }
      });
    } catch (cloudinaryError) {
      console.error('Avatar upload error:', cloudinaryError);
      
      // Clean up local file on error
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to upload avatar'
      });
    }
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      uploadUtils.cleanupFiles([req.file]);
    }
    next(error);
  }
});

// @desc    Upload course thumbnail
// @route   POST /api/upload/thumbnail
// @access  Private
router.post('/thumbnail', auth, uploadMiddleware.thumbnail, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file'
      });
    }

    try {
      // Upload to cloudinary with thumbnail-specific settings
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'ai-elearning/thumbnails',
        width: 800,
        height: 450,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto'
      });

      // Clean up local file
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(200).json({
        success: true,
        message: 'Thumbnail uploaded successfully',
        data: {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
          width: uploadResult.width,
          height: uploadResult.height
        }
      });
    } catch (cloudinaryError) {
      console.error('Thumbnail upload error:', cloudinaryError);
      
      // Clean up local file on error
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to upload thumbnail'
      });
    }
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      uploadUtils.cleanupFiles([req.file]);
    }
    next(error);
  }
});

// @desc    Upload video
// @route   POST /api/upload/video
// @access  Private
router.post('/video', auth, uploadMiddleware.video, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a video file'
      });
    }

    try {
      // Upload to cloudinary with video-specific settings
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'ai-elearning/videos',
        resource_type: 'video',
        quality: 'auto',
        format: 'mp4'
      });

      // Clean up local file
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(200).json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
          duration: uploadResult.duration,
          size: uploadResult.bytes,
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height
        }
      });
    } catch (cloudinaryError) {
      console.error('Video upload error:', cloudinaryError);
      
      // Clean up local file on error
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to upload video'
      });
    }
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      uploadUtils.cleanupFiles([req.file]);
    }
    next(error);
  }
});

// @desc    Delete file from cloudinary
// @route   DELETE /api/upload/:publicId
// @access  Private
router.delete('/:publicId', auth, async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    try {
      // Decode public ID (it might be URL encoded)
      const decodedPublicId = decodeURIComponent(publicId);
      
      // Delete from cloudinary
      const deleteResult = await cloudinary.uploader.destroy(decodedPublicId, {
        resource_type: resourceType
      });

      if (deleteResult.result === 'ok') {
        res.status(200).json({
          success: true,
          message: 'File deleted successfully'
        });
      } else if (deleteResult.result === 'not found') {
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to delete file'
        });
      }
    } catch (cloudinaryError) {
      console.error('File deletion error:', cloudinaryError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to delete file from cloud storage'
      });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Get upload signature for direct uploads
// @route   POST /api/upload/signature
// @access  Private
router.post('/signature', auth, async (req, res, next) => {
  try {
    const { folder = 'ai-elearning/uploads', resourceType = 'auto' } = req.body;

    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const params = {
      timestamp,
      folder,
      resource_type: resourceType,
      quality: 'auto',
      fetch_format: 'auto'
    };

    // Generate signature
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

    res.status(200).json({
      success: true,
      data: {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
        resourceType
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get file info
// @route   GET /api/upload/info/:publicId
// @access  Private
router.get('/info/:publicId', auth, async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    try {
      const decodedPublicId = decodeURIComponent(publicId);
      
      // Get resource info from cloudinary
      const resourceInfo = await cloudinary.api.resource(decodedPublicId, {
        resource_type: resourceType
      });

      res.status(200).json({
        success: true,
        data: {
          public_id: resourceInfo.public_id,
          url: resourceInfo.secure_url,
          format: resourceInfo.format,
          size: resourceInfo.bytes,
          width: resourceInfo.width,
          height: resourceInfo.height,
          duration: resourceInfo.duration,
          createdAt: resourceInfo.created_at,
          resourceType: resourceInfo.resource_type
        }
      });
    } catch (cloudinaryError) {
      console.error('Get file info error:', cloudinaryError);
      
      if (cloudinaryError.http_code === 404) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to get file information'
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;