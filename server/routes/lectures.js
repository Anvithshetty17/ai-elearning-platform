const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const { auth, authorize, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'textFile') {
      if (file.mimetype === 'text/plain' || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only text and PDF files are allowed for text content'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Validation middleware
const validateLecture = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Lecture title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Lecture description cannot exceed 1000 characters'),
  body('order')
    .isInt({ min: 1 })
    .withMessage('Lecture order must be a positive integer'),
  body('contentType')
    .isIn(['text', 'video', 'audio', 'ai-generated'])
    .withMessage('Invalid content type'),
  body('textContent')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Text content cannot exceed 10000 characters')
];

// @route   GET /api/lectures/course/:courseId
// @desc    Get all lectures for a course
// @access  Public (for published lectures) / Private (for all lectures if professor/admin)
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    let query = { course: courseId };

    // If not authenticated or not the professor/admin, only show published lectures
    if (!req.user || (course.professor.toString() !== req.user._id.toString() && req.user.role !== 'admin')) {
      query.isPublished = true;
    }

    const lectures = await Lecture.find(query)
      .select('title description order duration contentType isPublished aiProcessing cloudinaryUrls viewCount createdAt')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: lectures
    });

  } catch (error) {
    console.error('Get course lectures error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching lectures'
    });
  }
});

// @route   GET /api/lectures/:id
// @desc    Get single lecture by ID
// @access  Public (for published) / Private (for own lectures)
router.get('/:id', async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('course', 'title professor');

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check access permissions
    const isPublished = lecture.isPublished;
    const isProfessor = req.user && lecture.course.professor.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isPublished && !isProfessor && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Increment view count for published lectures
    if (isPublished && req.user) {
      await Lecture.findByIdAndUpdate(req.params.id, {
        $inc: { viewCount: 1 }
      });
    }

    res.json({
      success: true,
      data: lecture
    });

  } catch (error) {
    console.error('Get lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching lecture'
    });
  }
});

// @route   POST /api/lectures
// @desc    Create a new lecture
// @access  Private (Professor only)
router.post('/', auth, authorize('professor', 'admin'), upload.single('textFile'), validateLecture, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { courseId, title, description, order, contentType, textContent, voiceSettings } = req.body;

    // Check if course exists and user is the professor
    const course = await Course.findOne({
      _id: courseId,
      professor: req.user._id
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or access denied'
      });
    }

    // Check if order is already taken
    const existingLecture = await Lecture.findOne({ course: courseId, order });
    if (existingLecture) {
      return res.status(400).json({
        success: false,
        message: 'A lecture with this order already exists in the course'
      });
    }

    let finalTextContent = textContent;

    // Handle file upload for text content
    if (req.file && contentType === 'text') {
      finalTextContent = req.file.buffer.toString('utf8');
    }

    const lectureData = {
      title,
      description,
      course: courseId,
      order: parseInt(order),
      contentType,
      textContent: finalTextContent
    };

    // Set up AI processing if it's AI-generated content
    if (contentType === 'ai-generated' && finalTextContent) {
      lectureData.aiProcessing = {
        status: 'pending',
        progress: 0,
        voiceSettings: voiceSettings ? JSON.parse(voiceSettings) : undefined
      };
    }

    const lecture = new Lecture(lectureData);
    await lecture.save();

    // Add lecture to course
    await Course.findByIdAndUpdate(courseId, {
      $push: { lectures: lecture._id }
    });

    // Trigger AI processing if needed
    if (contentType === 'ai-generated' && finalTextContent) {
      try {
        // Call ML service to process the lecture
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
        await axios.post(`${mlServiceUrl}/api/ml/process-lecture`, {
          lectureId: lecture._id,
          textContent: finalTextContent,
          voiceSettings: lecture.aiProcessing.voiceSettings
        });
        
        lecture.aiProcessing.status = 'processing';
        await lecture.save();
      } catch (error) {
        console.error('Error starting AI processing:', error);
        lecture.aiProcessing.status = 'failed';
        lecture.aiProcessing.errorMessage = 'Failed to start AI processing';
        await lecture.save();
      }
    }

    await lecture.populate('course', 'title');

    res.status(201).json({
      success: true,
      message: 'Lecture created successfully',
      data: lecture
    });

  } catch (error) {
    console.error('Create lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating lecture'
    });
  }
});

// @route   PUT /api/lectures/:id
// @desc    Update a lecture
// @access  Private (Professor who owns the course or Admin)
router.put('/:id', auth, authorize('professor', 'admin'), upload.single('textFile'), validateLecture, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const lecture = await Lecture.findById(req.params.id).populate('course');
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if user is the professor of the course
    if (req.user.role !== 'admin' && lecture.course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own course lectures.'
      });
    }

    const { title, description, order, contentType, textContent, voiceSettings } = req.body;

    // Check if new order conflicts with other lectures (excluding current one)
    if (order && parseInt(order) !== lecture.order) {
      const existingLecture = await Lecture.findOne({
        course: lecture.course._id,
        order: parseInt(order),
        _id: { $ne: lecture._id }
      });

      if (existingLecture) {
        return res.status(400).json({
          success: false,
          message: 'A lecture with this order already exists in the course'
        });
      }
    }

    // Update basic fields
    lecture.title = title;
    lecture.description = description || lecture.description;
    lecture.order = parseInt(order);
    lecture.contentType = contentType;

    // Handle text content update
    let finalTextContent = textContent;
    if (req.file && contentType === 'text') {
      finalTextContent = req.file.buffer.toString('utf8');
    }

    if (finalTextContent) {
      lecture.textContent = finalTextContent;
    }

    // If content type changed to AI-generated or text content changed, reset AI processing
    if (contentType === 'ai-generated' && (lecture.textContent !== textContent || contentType !== lecture.contentType)) {
      lecture.aiProcessing = {
        status: 'pending',
        progress: 0,
        voiceSettings: voiceSettings ? JSON.parse(voiceSettings) : lecture.aiProcessing.voiceSettings
      };
      
      // Clear previous files
      lecture.files = {};
      lecture.cloudinaryUrls = {};

      // Trigger reprocessing
      try {
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
        await axios.post(`${mlServiceUrl}/api/ml/process-lecture`, {
          lectureId: lecture._id,
          textContent: lecture.textContent,
          voiceSettings: lecture.aiProcessing.voiceSettings
        });
        
        lecture.aiProcessing.status = 'processing';
      } catch (error) {
        console.error('Error restarting AI processing:', error);
        lecture.aiProcessing.status = 'failed';
        lecture.aiProcessing.errorMessage = 'Failed to restart AI processing';
      }
    }

    await lecture.save();

    res.json({
      success: true,
      message: 'Lecture updated successfully',
      data: lecture
    });

  } catch (error) {
    console.error('Update lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating lecture'
    });
  }
});

// @route   DELETE /api/lectures/:id
// @desc    Delete a lecture
// @access  Private (Professor who owns the course or Admin)
router.delete('/:id', auth, authorize('professor', 'admin'), async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id).populate('course');
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if user is the professor of the course
    if (req.user.role !== 'admin' && lecture.course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own course lectures.'
      });
    }

    // Remove lecture from course
    await Course.findByIdAndUpdate(lecture.course._id, {
      $pull: { lectures: lecture._id }
    });

    // Delete the lecture
    await Lecture.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Lecture deleted successfully'
    });

  } catch (error) {
    console.error('Delete lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting lecture'
    });
  }
});

// @route   PUT /api/lectures/:id/publish
// @desc    Publish/unpublish a lecture
// @access  Private (Professor who owns the course or Admin)
router.put('/:id/publish', auth, authorize('professor', 'admin'), async (req, res) => {
  try {
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isPublished must be a boolean value'
      });
    }

    const lecture = await Lecture.findById(req.params.id).populate('course');
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if user is the professor of the course
    if (req.user.role !== 'admin' && lecture.course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only publish your own course lectures.'
      });
    }

    // For AI-generated content, ensure processing is complete before publishing
    if (isPublished && lecture.contentType === 'ai-generated' && lecture.aiProcessing.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish AI-generated lecture until processing is complete'
      });
    }

    lecture.isPublished = isPublished;
    await lecture.save();

    const message = isPublished ? 'Lecture published successfully' : 'Lecture unpublished successfully';

    res.json({
      success: true,
      message,
      data: lecture
    });

  } catch (error) {
    console.error('Publish lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error publishing lecture'
    });
  }
});

// @route   GET /api/lectures/:id/processing-status
// @desc    Get AI processing status for a lecture
// @access  Private (Professor who owns the course or Admin)
router.get('/:id/processing-status', auth, authorize('professor', 'admin'), async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id).populate('course');
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if user is the professor of the course
    if (req.user.role !== 'admin' && lecture.course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        status: lecture.aiProcessing.status,
        progress: lecture.aiProcessing.progress,
        errorMessage: lecture.aiProcessing.errorMessage,
        processedAt: lecture.aiProcessing.processedAt,
        voiceSettings: lecture.aiProcessing.voiceSettings,
        cloudinaryUrls: lecture.cloudinaryUrls
      }
    });

  } catch (error) {
    console.error('Get processing status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching processing status'
    });
  }
});

// @route   POST /api/lectures/:id/reprocess
// @desc    Restart AI processing for a lecture
// @access  Private (Professor who owns the course or Admin)
router.post('/:id/reprocess', auth, authorize('professor', 'admin'), async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id).populate('course');
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if user is the professor of the course
    if (req.user.role !== 'admin' && lecture.course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (lecture.contentType !== 'ai-generated') {
      return res.status(400).json({
        success: false,
        message: 'Only AI-generated lectures can be reprocessed'
      });
    }

    if (!lecture.textContent) {
      return res.status(400).json({
        success: false,
        message: 'No text content available for processing'
      });
    }

    // Reset processing status
    lecture.aiProcessing.status = 'pending';
    lecture.aiProcessing.progress = 0;
    lecture.aiProcessing.errorMessage = '';
    lecture.files = {};
    lecture.cloudinaryUrls = {};
    
    await lecture.save();

    // Trigger reprocessing
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
      await axios.post(`${mlServiceUrl}/api/ml/process-lecture`, {
        lectureId: lecture._id,
        textContent: lecture.textContent,
        voiceSettings: lecture.aiProcessing.voiceSettings
      });
      
      lecture.aiProcessing.status = 'processing';
      await lecture.save();
    } catch (error) {
      console.error('Error restarting AI processing:', error);
      lecture.aiProcessing.status = 'failed';
      lecture.aiProcessing.errorMessage = 'Failed to restart AI processing';
      await lecture.save();
    }

    res.json({
      success: true,
      message: 'AI processing restarted successfully',
      data: {
        status: lecture.aiProcessing.status,
        progress: lecture.aiProcessing.progress
      }
    });

  } catch (error) {
    console.error('Reprocess lecture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error reprocessing lecture'
    });
  }
});

module.exports = router;