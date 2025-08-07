const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const { auth, authorize, authorizeOwnerOrAdmin, optionalAuth } = require('../middleware/auth');
const { validate, courseValidation, generalValidation } = require('../utils/validators');
const { uploadMiddleware } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
router.get('/', optionalAuth, validate(generalValidation.pagination, 'query'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      category,
      level,
      language,
      minPrice,
      maxPrice,
      search,
      instructor,
      featured,
      published = true
    } = req.query;

    // Build query
    let query = {};
    
    if (published && req.user?.role !== 'admin') {
      query.isPublished = true;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (level) {
      query.level = level;
    }
    
    if (language) {
      query.language = new RegExp(language, 'i');
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) query.price.$lte = parseFloat(maxPrice);
    }
    
    if (instructor) {
      query.instructor = instructor;
    }
    
    if (featured === 'true') {
      query.isFeatured = true;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Execute query
    const courses = await Course.find(query)
      .populate('instructor', 'name avatar')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Get total count for pagination
    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: courses
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
router.get('/:id', optionalAuth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name avatar bio')
      .populate('lectures', 'title duration order isPreview isFree')
      .populate('reviews', 'user rating review createdAt', null, { limit: 10, sort: { createdAt: -1 } });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is published (unless user is instructor or admin)
    if (!course.isPublished && 
        (!req.user || (req.user._id.toString() !== course.instructor._id.toString() && req.user.role !== 'admin'))) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled
    let isEnrolled = false;
    let enrollment = null;
    
    if (req.user) {
      enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: course._id
      });
      isEnrolled = !!enrollment;
    }

    res.status(200).json({
      success: true,
      data: {
        ...course.toJSON(),
        isEnrolled,
        enrollment
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create course
// @route   POST /api/courses
// @access  Private (Professor/Admin)
router.post('/', auth, authorize('professor', 'admin'), validate(courseValidation.create), async (req, res, next) => {
  try {
    // Add instructor to course data
    req.body.instructor = req.user._id;

    const course = await Course.create(req.body);
    
    // Add course to user's created courses
    await User.findByIdAndUpdate(req.user._id, {
      $push: { createdCourses: course._id }
    });

    // Populate instructor info
    await course.populate('instructor', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Course Instructor or Admin)
router.put('/:id', auth, validate(generalValidation.mongoId, 'params'), validate(courseValidation.update), async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);

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
        message: 'Not authorized to update this course'
      });
    }

    // Update course
    course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('instructor', 'name avatar');

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Course Instructor or Admin)
router.delete('/:id', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

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
        message: 'Not authorized to delete this course'
      });
    }

    // Delete course thumbnail from cloudinary if exists
    if (course.thumbnail && course.thumbnail.public_id) {
      try {
        await cloudinary.uploader.destroy(course.thumbnail.public_id);
      } catch (error) {
        console.error('Error deleting thumbnail from cloudinary:', error);
      }
    }

    // Delete course images from cloudinary if exist
    if (course.images && course.images.length > 0) {
      for (const image of course.images) {
        if (image.public_id) {
          try {
            await cloudinary.uploader.destroy(image.public_id);
          } catch (error) {
            console.error('Error deleting image from cloudinary:', error);
          }
        }
      }
    }

    // Delete course video from cloudinary if exists
    if (course.video && course.video.public_id) {
      try {
        await cloudinary.uploader.destroy(course.video.public_id, { resource_type: 'video' });
      } catch (error) {
        console.error('Error deleting video from cloudinary:', error);
      }
    }

    // Delete all lectures associated with this course
    const lectures = await Lecture.find({ course: course._id });
    for (const lecture of lectures) {
      // Delete lecture videos/audios from cloudinary
      if (lecture.video && lecture.video.public_id) {
        try {
          await cloudinary.uploader.destroy(lecture.video.public_id, { resource_type: 'video' });
        } catch (error) {
          console.error('Error deleting lecture video from cloudinary:', error);
        }
      }
      if (lecture.audio && lecture.audio.public_id) {
        try {
          await cloudinary.uploader.destroy(lecture.audio.public_id, { resource_type: 'video' });
        } catch (error) {
          console.error('Error deleting lecture audio from cloudinary:', error);
        }
      }
    }
    await Lecture.deleteMany({ course: course._id });

    // Delete all enrollments for this course
    await Enrollment.deleteMany({ course: course._id });

    // Remove course from user's created courses
    await User.findByIdAndUpdate(course.instructor, {
      $pull: { createdCourses: course._id }
    });

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload course thumbnail
// @route   PUT /api/courses/:id/thumbnail
// @access  Private (Course Instructor or Admin)
router.put('/:id/thumbnail', auth, validate(generalValidation.mongoId, 'params'), uploadMiddleware.thumbnail, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file'
      });
    }

    const course = await Course.findById(req.params.id);

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
        message: 'Not authorized to update this course'
      });
    }

    // Delete old thumbnail from cloudinary if exists
    if (course.thumbnail && course.thumbnail.public_id) {
      try {
        await cloudinary.uploader.destroy(course.thumbnail.public_id);
      } catch (error) {
        console.error('Error deleting old thumbnail:', error);
      }
    }

    // Upload new thumbnail to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'ai-elearning/course-thumbnails',
      width: 800,
      height: 450,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto'
    });

    // Update course thumbnail
    course.thumbnail = {
      public_id: result.public_id,
      url: result.secure_url
    };

    await course.save({ validateBeforeSave: false });

    // Clean up local file
    const fs = require('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({
      success: true,
      message: 'Thumbnail updated successfully',
      data: {
        thumbnail: course.thumbnail
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Publish/Unpublish course
// @route   PUT /api/courses/:id/publish
// @access  Private (Course Instructor or Admin)
router.put('/:id/publish', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

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
        message: 'Not authorized to update this course'
      });
    }

    // Toggle publish status
    course.isPublished = !course.isPublished;
    course.status = course.isPublished ? 'published' : 'draft';
    
    if (course.isPublished && !course.publishedAt) {
      course.publishedAt = new Date();
    }

    await course.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`,
      data: {
        isPublished: course.isPublished,
        status: course.status,
        publishedAt: course.publishedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get course analytics
// @route   GET /api/courses/:id/analytics
// @access  Private (Course Instructor or Admin)
router.get('/:id/analytics', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

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
        message: 'Not authorized to view course analytics'
      });
    }

    // Get enrollment statistics
    const enrollmentStats = await Enrollment.getEnrollmentStats(course._id);
    
    // Get course progress analytics
    const Progress = require('../models/Progress');
    const progressAnalytics = await Progress.getCourseAnalytics(course._id);

    // Get recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEnrollments = await Enrollment.countDocuments({
      course: course._id,
      enrolledAt: { $gte: thirtyDaysAgo }
    });

    // Revenue calculation (if course is paid)
    const totalRevenue = course.price * course.enrollmentCount;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalEnrollments: course.enrollmentCount,
          rating: course.rating,
          totalRevenue: course.price > 0 ? totalRevenue : 0,
          recentEnrollments
        },
        enrollmentStats: enrollmentStats[0] || {},
        progressAnalytics: progressAnalytics[0] || {},
        course: {
          title: course.title,
          createdAt: course.createdAt,
          publishedAt: course.publishedAt,
          lastUpdated: course.lastUpdated
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get popular courses
// @route   GET /api/courses/popular
// @access  Public
router.get('/filter/popular', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const courses = await Course.getPopularCourses(parseInt(limit));

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get featured courses
// @route   GET /api/courses/featured
// @access  Public
router.get('/filter/featured', async (req, res, next) => {
  try {
    const { limit = 6 } = req.query;
    
    const courses = await Course.getFeaturedCourses(parseInt(limit));

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Search courses
// @route   GET /api/courses/search
// @access  Public
router.get('/search/query', validate(generalValidation.search, 'query'), async (req, res, next) => {
  try {
    const { q, ...filters } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const courses = await Course.searchCourses(q, filters);

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;