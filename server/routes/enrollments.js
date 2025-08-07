const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { auth, authorize, checkEnrollment } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/enrollments/:courseId
// @desc    Enroll in a course
// @access  Private (Student only)
router.post('/:courseId', auth, authorize('student'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    // Check if course exists and is published
    const course = await Course.findOne({ _id: courseId, isPublished: true });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or not available for enrollment'
      });
    }

    // Check if student is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Create new enrollment
    const enrollment = new Enrollment({
      student: studentId,
      course: courseId,
      paymentStatus: course.price > 0 ? 'pending' : 'free',
      paymentAmount: course.price
    });

    await enrollment.save();

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrollmentCount: 1 }
    });

    // Populate course and student info
    await enrollment.populate([
      { path: 'course', select: 'title description thumbnail professor' },
      { path: 'student', select: 'fullName email avatar' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      data: enrollment
    });

  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during enrollment'
    });
  }
});

// @route   GET /api/enrollments/my-enrollments
// @desc    Get all enrollments for the authenticated student
// @access  Private (Student only)
router.get('/my-enrollments', auth, authorize('student'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = { student: req.user._id };
    if (status) query.status = status;

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'course',
        select: 'title description thumbnail professor category level rating duration',
        populate: {
          path: 'professor',
          select: 'fullName avatar'
        }
      })
      .sort({ enrolledAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Enrollment.countDocuments(query);

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching enrollments'
    });
  }
});

// @route   GET /api/enrollments/course/:courseId
// @desc    Get all enrollments for a specific course (Professor/Admin only)
// @access  Private (Professor who owns the course or Admin)
router.get('/course/:courseId', auth, authorize('professor', 'admin'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Check if user is the professor of this course (unless admin)
    if (req.user.role !== 'admin') {
      const course = await Course.findOne({ _id: courseId, professor: req.user._id });
      if (!course) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view enrollments for your own courses.'
        });
      }
    }

    let query = { course: courseId };
    if (status) query.status = status;

    const enrollments = await Enrollment.find(query)
      .populate('student', 'fullName email avatar')
      .sort({ enrolledAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Enrollment.countDocuments(query);

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get course enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course enrollments'
    });
  }
});

// @route   GET /api/enrollments/:enrollmentId
// @desc    Get specific enrollment details
// @access  Private (Student who owns enrollment, Professor of the course, or Admin)
router.get('/:enrollmentId', auth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId)
      .populate([
        {
          path: 'course',
          select: 'title description professor lectures',
          populate: [
            { path: 'professor', select: 'fullName avatar' },
            { path: 'lectures', select: 'title order duration contentType isPublished' }
          ]
        },
        { path: 'student', select: 'fullName email avatar' },
        { path: 'progress.completedLectures.lecture', select: 'title order duration' },
        { path: 'progress.lastAccessedLecture', select: 'title order' }
      ]);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check access permissions
    const isStudent = enrollment.student._id.toString() === req.user._id.toString();
    const isProfessor = enrollment.course.professor._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isStudent && !isProfessor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: enrollment
    });

  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching enrollment'
    });
  }
});

// @route   PUT /api/enrollments/:enrollmentId/progress
// @desc    Update learning progress
// @access  Private (Student who owns enrollment)
router.put('/:enrollmentId/progress', auth, authorize('student'), [
  body('lectureId').isMongoId().withMessage('Valid lecture ID is required'),
  body('watchTime').optional().isInt({ min: 0 }).withMessage('Watch time must be a positive integer'),
  body('completionPercentage').optional().isInt({ min: 0, max: 100 }).withMessage('Completion percentage must be between 0 and 100')
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

    const { lectureId, watchTime = 0, completionPercentage = 100 } = req.body;

    const enrollment = await Enrollment.findOne({
      _id: req.params.enrollmentId,
      student: req.user._id,
      status: 'active'
    }).populate('course');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found or not accessible'
      });
    }

    // Verify the lecture belongs to this course
    if (!enrollment.course.lectures.includes(lectureId)) {
      return res.status(400).json({
        success: false,
        message: 'Lecture does not belong to this course'
      });
    }

    // Update progress
    await enrollment.addCompletedLecture(lectureId, watchTime, completionPercentage);

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        overallProgress: enrollment.progress.overallProgress,
        totalWatchTime: enrollment.progress.totalWatchTime,
        completedLectures: enrollment.progress.completedLectures.length,
        status: enrollment.status
      }
    });

  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating progress'
    });
  }
});

// @route   POST /api/enrollments/:enrollmentId/rating
// @desc    Rate and review a course
// @access  Private (Student who owns enrollment)
router.post('/:enrollmentId/rating', auth, authorize('student'), [
  body('score').isInt({ min: 1, max: 5 }).withMessage('Rating score must be between 1 and 5'),
  body('review').optional().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters')
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

    const { score, review } = req.body;

    const enrollment = await Enrollment.findOne({
      _id: req.params.enrollmentId,
      student: req.user._id
    }).populate('course');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found or not accessible'
      });
    }

    // Check if already rated
    if (enrollment.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this course'
      });
    }

    // Update enrollment rating
    enrollment.rating = {
      score,
      review: review || '',
      reviewedAt: new Date()
    };
    await enrollment.save();

    // Update course rating
    const course = enrollment.course;
    const allRatings = await Enrollment.find({ 
      course: course._id, 
      'rating.score': { $exists: true } 
    }).select('rating.score');

    if (allRatings.length > 0) {
      const totalRating = allRatings.reduce((sum, enr) => sum + enr.rating.score, 0);
      const averageRating = totalRating / allRatings.length;

      await Course.findByIdAndUpdate(course._id, {
        'rating.average': Math.round(averageRating * 10) / 10,
        'rating.count': allRatings.length
      });
    }

    res.json({
      success: true,
      message: 'Course rated successfully',
      data: enrollment.rating
    });

  } catch (error) {
    console.error('Rate course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rating course'
    });
  }
});

// @route   DELETE /api/enrollments/:enrollmentId
// @desc    Cancel/drop enrollment
// @access  Private (Student who owns enrollment)
router.delete('/:enrollmentId', auth, authorize('student'), async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      _id: req.params.enrollmentId,
      student: req.user._id
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found or not accessible'
      });
    }

    // Check if enrollment can be cancelled
    if (enrollment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed course'
      });
    }

    // Update status to dropped
    enrollment.status = 'dropped';
    await enrollment.save();

    // Decrease course enrollment count
    await Course.findByIdAndUpdate(enrollment.course, {
      $inc: { enrollmentCount: -1 }
    });

    res.json({
      success: true,
      message: 'Enrollment cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling enrollment'
    });
  }
});

module.exports = router;