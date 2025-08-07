const express = require('express');
const router = express.Router();
const Lecture = require('../models/Lecture');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { validate, lectureValidation, generalValidation } = require('../utils/validators');
const { uploadMiddleware } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

// @desc    Get lectures for a course
// @route   GET /api/lectures/course/:courseId
// @access  Public (with enrollment check for paid courses)
router.get('/course/:courseId', optionalAuth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { includeUnpublished = false } = req.query;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user can access course content
    let canAccessAll = false;
    
    if (req.user) {
      // Check if user is course instructor or admin
      if (course.instructor.toString() === req.user._id.toString() || req.user.role === 'admin') {
        canAccessAll = true;
      } else {
        // Check if user is enrolled
        const Enrollment = require('../models/Enrollment');
        const enrollment = await Enrollment.findOne({
          student: req.user._id,
          course: courseId,
          status: 'active'
        });
        
        if (enrollment) {
          canAccessAll = true;
        }
      }
    }

    const options = {
      includeUnpublished: canAccessAll && includeUnpublished === 'true'
    };

    const lectures = await Lecture.findByCourse(courseId, options);

    // Filter lectures based on access rights
    const accessibleLectures = lectures.map(lecture => {
      const lectureObj = lecture.toObject();
      
      // If user can't access all and lecture is not preview/free, hide video details
      if (!canAccessAll && !lecture.isPreview && !lecture.isFree && course.price > 0) {
        delete lectureObj.video;
        delete lectureObj.audio;
        delete lectureObj.resources;
        delete lectureObj.transcript;
        lectureObj.locked = true;
      }
      
      return lectureObj;
    });

    res.status(200).json({
      success: true,
      count: accessibleLectures.length,
      data: accessibleLectures,
      courseInfo: {
        title: course.title,
        price: course.price,
        canAccessAll
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single lecture
// @route   GET /api/lectures/:id
// @access  Private (with enrollment check)
router.get('/:id', optionalAuth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('instructor', 'name avatar')
      .populate('course', 'title price instructor');

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if lecture is published (unless user is instructor or admin)
    if (!lecture.isPublished && 
        (!req.user || (req.user._id.toString() !== lecture.instructor._id.toString() && req.user.role !== 'admin'))) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check access rights
    let hasAccess = false;
    let userProgress = null;

    if (req.user) {
      // Check if user is course instructor or admin
      if (lecture.course.instructor.toString() === req.user._id.toString() || req.user.role === 'admin') {
        hasAccess = true;
      } else {
        // Check if lecture is free or preview
        if (lecture.isFree || lecture.isPreview) {
          hasAccess = true;
        } else {
          // Check if user is enrolled in the course
          const Enrollment = require('../models/Enrollment');
          const enrollment = await Enrollment.findOne({
            student: req.user._id,
            course: lecture.course._id,
            status: 'active'
          });
          
          if (enrollment) {
            hasAccess = true;
            
            // Get user progress for this lecture
            userProgress = await Progress.findOne({
              user: req.user._id,
              course: lecture.course._id,
              lecture: lecture._id
            });
          }
        }
      }
    } else {
      // Non-authenticated users can only access free/preview lectures
      hasAccess = lecture.isFree || lecture.isPreview;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Please enroll in the course to access this lecture'
      });
    }

    // Increment view count
    if (req.user && hasAccess) {
      await lecture.incrementViews();
    }

    res.status(200).json({
      success: true,
      data: {
        ...lecture.toJSON(),
        userProgress
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create lecture
// @route   POST /api/lectures
// @access  Private (Course Instructor or Admin)
router.post('/', auth, authorize('professor', 'admin'), validate(lectureValidation.create), async (req, res, next) => {
  try {
    const { course: courseId } = req.body;

    // Check if course exists and user has permission
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check authorization
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add lectures to this course'
      });
    }

    // Add instructor to lecture data
    req.body.instructor = req.user._id;

    // Create lecture
    const lecture = await Lecture.create(req.body);
    
    // Add lecture to course
    await Course.findByIdAndUpdate(courseId, {
      $push: { lectures: lecture._id }
    });

    // Populate lecture data
    await lecture.populate('instructor', 'name avatar');
    await lecture.populate('course', 'title');

    res.status(201).json({
      success: true,
      message: 'Lecture created successfully',
      data: lecture
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update lecture
// @route   PUT /api/lectures/:id
// @access  Private (Lecture Instructor or Admin)
router.put('/:id', auth, validate(generalValidation.mongoId, 'params'), validate(lectureValidation.update), async (req, res, next) => {
  try {
    let lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check authorization
    if (lecture.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lecture'
      });
    }

    // Update lecture
    lecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('instructor', 'name avatar').populate('course', 'title');

    res.status(200).json({
      success: true,
      message: 'Lecture updated successfully',
      data: lecture
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete lecture
// @route   DELETE /api/lectures/:id
// @access  Private (Lecture Instructor or Admin)
router.delete('/:id', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check authorization
    if (lecture.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this lecture'
      });
    }

    // Delete video from cloudinary if exists
    if (lecture.video && lecture.video.public_id) {
      try {
        await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: 'video' });
      } catch (error) {
        console.error('Error deleting video from cloudinary:', error);
      }
    }

    // Delete audio from cloudinary if exists
    if (lecture.audio && lecture.audio.public_id) {
      try {
        await cloudinary.uploader.destroy(lecture.audio.public_id, { resource_type: 'video' });
      } catch (error) {
        console.error('Error deleting audio from cloudinary:', error);
      }
    }

    // Remove lecture from course
    await Course.findByIdAndUpdate(lecture.course, {
      $pull: { lectures: lecture._id }
    });

    // Delete all progress records for this lecture
    await Progress.deleteMany({ lecture: lecture._id });

    await lecture.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Lecture deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload lecture video
// @route   PUT /api/lectures/:id/video
// @access  Private (Lecture Instructor or Admin)
router.put('/:id/video', auth, validate(generalValidation.mongoId, 'params'), uploadMiddleware.video, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a video file'
      });
    }

    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check authorization
    if (lecture.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lecture'
      });
    }

    // Delete old video from cloudinary if exists
    if (lecture.video && lecture.video.public_id) {
      try {
        await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: 'video' });
      } catch (error) {
        console.error('Error deleting old video:', error);
      }
    }

    // Upload new video to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'ai-elearning/lectures',
      resource_type: 'video',
      quality: 'auto',
      format: 'mp4'
    });

    // Update lecture video
    lecture.video = {
      public_id: result.public_id,
      url: result.secure_url,
      duration: result.duration,
      size: result.bytes
    };

    // Update lecture duration if not set
    if (!lecture.duration && result.duration) {
      lecture.duration = Math.round(result.duration);
    }

    await lecture.save({ validateBeforeSave: false });

    // Clean up local file
    const fs = require('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        video: lecture.video
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Generate AI lecture from text
// @route   POST /api/lectures/:id/generate-ai
// @access  Private (Lecture Instructor or Admin)
router.post('/:id/generate-ai', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { sourceText, voice = 'default', speed = 1.0, language = 'en', videoStyle = 'presentation' } = req.body;

    if (!sourceText || sourceText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Source text is required for AI lecture generation'
      });
    }

    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check authorization
    if (lecture.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lecture'
      });
    }

    // Update lecture with AI generation settings
    lecture.aiGenerated = {
      isGenerated: true,
      sourceText,
      generationSettings: {
        voice,
        speed,
        language,
        videoStyle
      },
      processingStatus: 'pending',
      processingJobId: null,
      generatedAt: new Date(),
      processingLog: ['AI lecture generation initiated']
    };

    await lecture.save({ validateBeforeSave: false });

    // Call ML service for AI generation
    try {
      const mlServiceResponse = await axios.post(`${process.env.ML_SERVICE_URL}/api/generate-lecture`, {
        lectureId: lecture._id,
        sourceText,
        settings: {
          voice,
          speed,
          language,
          videoStyle
        }
      }, {
        timeout: 5000 // 5 second timeout for the initial request
      });

      // Update processing status and job ID
      lecture.aiGenerated.processingStatus = 'processing';
      lecture.aiGenerated.processingJobId = mlServiceResponse.data.jobId;
      lecture.aiGenerated.processingLog.push('Processing started with ML service');
      
      await lecture.save({ validateBeforeSave: false });

      res.status(202).json({
        success: true,
        message: 'AI lecture generation started',
        data: {
          jobId: mlServiceResponse.data.jobId,
          status: 'processing',
          estimatedTime: mlServiceResponse.data.estimatedTime || '5-10 minutes'
        }
      });
    } catch (mlError) {
      console.error('ML Service error:', mlError.message);
      
      // Update processing status to failed
      lecture.aiGenerated.processingStatus = 'failed';
      lecture.aiGenerated.processingLog.push(`Processing failed: ${mlError.message}`);
      await lecture.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'AI lecture generation service is currently unavailable. Please try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Get AI lecture generation status
// @route   GET /api/lectures/:id/ai-status
// @access  Private (Lecture Instructor or Admin)
router.get('/:id/ai-status', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check authorization
    if (lecture.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this lecture'
      });
    }

    if (!lecture.aiGenerated || !lecture.aiGenerated.isGenerated) {
      return res.status(404).json({
        success: false,
        message: 'No AI generation found for this lecture'
      });
    }

    // If processing, check status with ML service
    if (lecture.aiGenerated.processingStatus === 'processing' && lecture.aiGenerated.processingJobId) {
      try {
        const statusResponse = await axios.get(
          `${process.env.ML_SERVICE_URL}/api/processing-status/${lecture.aiGenerated.processingJobId}`,
          { timeout: 3000 }
        );

        const mlStatus = statusResponse.data;
        
        // Update lecture status if it has changed
        if (mlStatus.status !== lecture.aiGenerated.processingStatus) {
          lecture.aiGenerated.processingStatus = mlStatus.status;
          lecture.aiGenerated.processingLog.push(`Status updated: ${mlStatus.status}`);
          
          // If completed, update video information
          if (mlStatus.status === 'completed' && mlStatus.videoUrl) {
            lecture.video = {
              public_id: mlStatus.publicId,
              url: mlStatus.videoUrl,
              duration: mlStatus.duration,
              size: mlStatus.fileSize
            };
            
            if (mlStatus.audioUrl) {
              lecture.audio = {
                public_id: mlStatus.audioPublicId,
                url: mlStatus.audioUrl,
                size: mlStatus.audioSize
              };
            }
            
            if (mlStatus.transcript) {
              lecture.transcript = mlStatus.transcript;
            }
            
            lecture.aiGenerated.processingLog.push('AI lecture generation completed successfully');
          } else if (mlStatus.status === 'failed') {
            lecture.aiGenerated.processingLog.push(`Generation failed: ${mlStatus.error || 'Unknown error'}`);
          }
          
          await lecture.save({ validateBeforeSave: false });
        }
        
        res.status(200).json({
          success: true,
          data: {
            status: lecture.aiGenerated.processingStatus,
            jobId: lecture.aiGenerated.processingJobId,
            progress: mlStatus.progress || 0,
            estimatedTimeRemaining: mlStatus.estimatedTimeRemaining,
            log: lecture.aiGenerated.processingLog,
            generatedAt: lecture.aiGenerated.generatedAt,
            ...(lecture.aiGenerated.processingStatus === 'completed' && {
              videoUrl: lecture.video?.url,
              audioUrl: lecture.audio?.url,
              hasTranscript: !!lecture.transcript
            })
          }
        });
      } catch (mlError) {
        console.error('Error checking ML service status:', mlError.message);
        
        res.status(200).json({
          success: true,
          data: {
            status: lecture.aiGenerated.processingStatus,
            jobId: lecture.aiGenerated.processingJobId,
            progress: 0,
            log: lecture.aiGenerated.processingLog,
            generatedAt: lecture.aiGenerated.generatedAt,
            error: 'Unable to fetch current status from processing service'
          }
        });
      }
    } else {
      res.status(200).json({
        success: true,
        data: {
          status: lecture.aiGenerated.processingStatus,
          jobId: lecture.aiGenerated.processingJobId,
          log: lecture.aiGenerated.processingLog,
          generatedAt: lecture.aiGenerated.generatedAt,
          ...(lecture.aiGenerated.processingStatus === 'completed' && {
            videoUrl: lecture.video?.url,
            audioUrl: lecture.audio?.url,
            hasTranscript: !!lecture.transcript
          })
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Like/Unlike lecture
// @route   PUT /api/lectures/:id/like
// @access  Private
router.put('/:id/like', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check if user already liked the lecture
    const isLiked = lecture.likes.includes(req.user._id);

    if (isLiked) {
      await lecture.removeLike(req.user._id);
    } else {
      await lecture.addLike(req.user._id);
    }

    res.status(200).json({
      success: true,
      message: isLiked ? 'Like removed' : 'Lecture liked',
      data: {
        isLiked: !isLiked,
        likeCount: lecture.likeCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get lecture analytics
// @route   GET /api/lectures/:id/analytics
// @access  Private (Lecture Instructor or Admin)
router.get('/:id/analytics', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.id).populate('course', 'title');

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found'
      });
    }

    // Check authorization
    if (lecture.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view lecture analytics'
      });
    }

    // Get lecture analytics
    const analyticsData = await Progress.getLectureAnalytics(lecture._id);

    res.status(200).json({
      success: true,
      data: {
        lecture: {
          title: lecture.title,
          course: lecture.course.title,
          duration: lecture.duration,
          views: lecture.views,
          likes: lecture.likeCount,
          comments: lecture.commentCount
        },
        analytics: analyticsData[0] || {}
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;