const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const { auth, authorize, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateCourse = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Course title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Course description must be between 10 and 2000 characters'),
  body('category')
    .isIn(['Technology', 'Business', 'Science', 'Mathematics', 'Arts', 'Languages', 'Health', 'Engineering', 'Social Sciences', 'Philosophy', 'Other'])
    .withMessage('Invalid course category'),
  body('level')
    .isIn(['Beginner', 'Intermediate', 'Advanced'])
    .withMessage('Course level must be Beginner, Intermediate, or Advanced'),
  body('language')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Language must be between 2 and 50 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('prerequisites')
    .optional()
    .isArray()
    .withMessage('Prerequisites must be an array'),
  body('learningOutcomes')
    .optional()
    .isArray()
    .withMessage('Learning outcomes must be an array')
];

// @route   GET /api/courses
// @desc    Get all published courses with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().trim(),
  query('level').optional().isIn(['Beginner', 'Intermediate', 'Advanced']),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['title', 'createdAt', 'rating', 'enrollmentCount']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 10,
      category,
      level,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isPublished: true };

    if (category) {
      query.category = category;
    }

    if (level) {
      query.level = level;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const courses = await Course.find(query)
      .populate('professor', 'fullName avatar')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching courses'
    });
  }
});

// @route   GET /api/courses/my-courses
// @desc    Get courses created by the authenticated professor
// @access  Private (Professor only)
router.get('/my-courses', auth, authorize('professor', 'admin'), async (req, res) => {
  try {
    const courses = await Course.find({ professor: req.user._id })
      .populate('lectures')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: courses
    });

  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your courses'
    });
  }
});

// @route   GET /api/courses/:id
// @desc    Get single course by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('professor', 'fullName avatar bio expertise')
      .populate({
        path: 'lectures',
        select: 'title description order duration contentType isPublished',
        match: { isPublished: true },
        options: { sort: { order: 1 } }
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // If course is not published, only allow professor and admin to view
    if (!course.isPublished) {
      if (!req.user || (course.professor._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    res.json({
      success: true,
      data: course
    });

  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course'
    });
  }
});

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Professor only)
router.post('/', auth, authorize('professor', 'admin'), validateCourse, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const courseData = {
      ...req.body,
      professor: req.user._id
    };

    const course = new Course(courseData);
    await course.save();

    // Populate professor info
    await course.populate('professor', 'fullName avatar');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating course'
    });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Private (Professor who created the course or Admin)
router.put('/:id', auth, authorize('professor', 'admin'), checkOwnership(Course), validateCourse, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('professor', 'fullName avatar');

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating course'
    });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete a course
// @access  Private (Professor who created the course or Admin)
router.delete('/:id', auth, authorize('professor', 'admin'), checkOwnership(Course), async (req, res) => {
  try {
    const course = req.resource;

    // Check if course has any enrollments
    const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
    if (enrollmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with active enrollments'
      });
    }

    // Delete associated lectures
    await Lecture.deleteMany({ course: course._id });

    // Delete the course
    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting course'
    });
  }
});

// @route   PUT /api/courses/:id/publish
// @desc    Publish/unpublish a course
// @access  Private (Professor who created the course or Admin)
router.put('/:id/publish', auth, authorize('professor', 'admin'), checkOwnership(Course), async (req, res) => {
  try {
    const { isPublished } = req.body;
    
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isPublished must be a boolean value'
      });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isPublished },
      { new: true }
    ).populate('professor', 'fullName avatar');

    const message = isPublished ? 'Course published successfully' : 'Course unpublished successfully';

    res.json({
      success: true,
      message,
      data: course
    });

  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error publishing course'
    });
  }
});

// @route   GET /api/courses/:id/stats
// @desc    Get course statistics
// @access  Private (Professor who created the course or Admin)
router.get('/:id/stats', auth, authorize('professor', 'admin'), checkOwnership(Course), async (req, res) => {
  try {
    const course = req.resource;

    // Get enrollment statistics
    const totalEnrollments = await Enrollment.countDocuments({ course: course._id });
    const activeEnrollments = await Enrollment.countDocuments({ course: course._id, status: 'active' });
    const completedEnrollments = await Enrollment.countDocuments({ course: course._id, status: 'completed' });

    // Get average progress
    const enrollments = await Enrollment.find({ course: course._id });
    const avgProgress = enrollments.length > 0 
      ? enrollments.reduce((sum, enrollment) => sum + enrollment.progress.overallProgress, 0) / enrollments.length
      : 0;

    // Get lecture count
    const totalLectures = await Lecture.countDocuments({ course: course._id });
    const publishedLectures = await Lecture.countDocuments({ course: course._id, isPublished: true });

    res.json({
      success: true,
      data: {
        enrollments: {
          total: totalEnrollments,
          active: activeEnrollments,
          completed: completedEnrollments,
          averageProgress: Math.round(avgProgress)
        },
        lectures: {
          total: totalLectures,
          published: publishedLectures
        },
        course: {
          rating: course.rating,
          publishedAt: course.publishedAt,
          createdAt: course.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course statistics'
    });
  }
});

module.exports = router;