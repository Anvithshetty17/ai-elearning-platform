const express = require('express');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { validate, generalValidation } = require('../utils/validators');
const emailService = require('../services/emailService');

// @desc    Enroll in a course
// @route   POST /api/enrollments
// @access  Private
router.post('/', auth, async (req, res, next) => {
  try {
    const { courseId, paymentMethod = 'free' } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    // Check if course exists and is published
    const course = await Course.findById(courseId).populate('instructor', 'name email');
    if (!course || !course.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or not available'
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    // Check if user is the course instructor
    if (course.instructor._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot enroll in your own course'
      });
    }

    // Create enrollment
    const enrollmentData = {
      student: req.user._id,
      course: courseId,
      payment: {
        amount: course.price,
        currency: course.currency || 'USD',
        paymentMethod,
        paymentStatus: course.price === 0 ? 'completed' : 'pending',
        paidAt: course.price === 0 ? new Date() : undefined
      }
    };

    // For free courses, complete enrollment immediately
    if (course.price === 0) {
      enrollmentData.payment.paymentStatus = 'completed';
    }

    const enrollment = await Enrollment.create(enrollmentData);

    // If enrollment is successful, update course enrollment count
    if (enrollment.payment.paymentStatus === 'completed') {
      await Course.findByIdAndUpdate(courseId, {
        $inc: { enrollmentCount: 1 }
      });

      // Add course to user's enrolled courses
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { enrolledCourses: courseId }
      });

      // Log enrollment activity
      enrollment.activityLog.push({
        action: 'enrolled',
        details: 'Successfully enrolled in course'
      });
      await enrollment.save();

      // Send enrollment confirmation email
      try {
        await emailService.sendEnrollmentConfirmation(req.user, course);
      } catch (error) {
        console.error('Error sending enrollment confirmation email:', error);
      }
    }

    // Populate enrollment data
    await enrollment.populate('course', 'title thumbnail instructor duration');
    await enrollment.populate('course.instructor', 'name avatar');

    res.status(201).json({
      success: true,
      message: course.price === 0 ? 'Successfully enrolled in course' : 'Enrollment created, pending payment',
      data: enrollment
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's enrollments
// @route   GET /api/enrollments
// @access  Private
router.get('/', auth, validate(generalValidation.pagination, 'query'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = 'active', sort = '-enrolledAt' } = req.query;

    const enrollments = await Enrollment.getStudentEnrollments(req.user._id, status)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Enrollment.countDocuments({
      student: req.user._id,
      status
    });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: enrollments
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single enrollment
// @route   GET /api/enrollments/:id
// @access  Private
router.get('/:id', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('course', 'title thumbnail instructor duration lectures')
      .populate('course.instructor', 'name avatar')
      .populate('course.lectures', 'title duration order isPublished');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this enrollment'
      });
    }

    res.status(200).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update enrollment progress
// @route   PUT /api/enrollments/:id/progress
// @access  Private
router.put('/:id/progress', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { lectureId, watchTime = 0, isCompleted = false } = req.body;

    if (!lectureId) {
      return res.status(400).json({
        success: false,
        message: 'Lecture ID is required'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this enrollment'
      });
    }

    // Update progress
    await enrollment.updateProgress(lectureId, watchTime, isCompleted);

    res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        overallProgress: enrollment.progress.overallProgress,
        completedLectures: enrollment.progress.completedLectures.length,
        currentLecture: enrollment.progress.currentLecture
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add note to enrollment
// @route   POST /api/enrollments/:id/notes
// @access  Private
router.post('/:id/notes', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { lectureId, content, timestamp = 0 } = req.body;

    if (!lectureId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Lecture ID and note content are required'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this enrollment'
      });
    }

    // Add note
    await enrollment.addNote(lectureId, content, timestamp);

    res.status(201).json({
      success: true,
      message: 'Note added successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add bookmark to enrollment
// @route   POST /api/enrollments/:id/bookmarks
// @access  Private
router.post('/:id/bookmarks', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { lectureId, timestamp, note = '' } = req.body;

    if (!lectureId || timestamp === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Lecture ID and timestamp are required'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this enrollment'
      });
    }

    // Add bookmark
    await enrollment.addBookmark(lectureId, timestamp, note);

    res.status(201).json({
      success: true,
      message: 'Bookmark added successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Submit quiz for enrollment
// @route   POST /api/enrollments/:id/quiz
// @access  Private
router.post('/:id/quiz', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { lectureId, answers, timeSpent } = req.body;

    if (!lectureId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Lecture ID and answers array are required'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this enrollment'
      });
    }

    // Submit quiz
    await enrollment.submitQuiz(lectureId, answers, timeSpent);

    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Rate and review course
// @route   POST /api/enrollments/:id/review
// @access  Private
router.post('/:id/review', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const enrollment = await Enrollment.findById(req.params.id).populate('course');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this course'
      });
    }

    // Check if user has already reviewed
    if (enrollment.rating && enrollment.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course'
      });
    }

    // Add rating and review
    enrollment.rating = {
      score: rating,
      review,
      reviewedAt: new Date()
    };

    await enrollment.save();

    // Update course rating
    const course = enrollment.course;
    const allEnrollments = await Enrollment.find({
      course: course._id,
      'rating.score': { $exists: true }
    });

    const totalRatings = allEnrollments.length;
    const averageRating = allEnrollments.reduce((sum, enroll) => sum + enroll.rating.score, 0) / totalRatings;

    await Course.findByIdAndUpdate(course._id, {
      'rating.average': Math.round(averageRating * 10) / 10,
      'rating.count': totalRatings
    });

    res.status(200).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        rating: enrollment.rating,
        courseRating: {
          average: Math.round(averageRating * 10) / 10,
          count: totalRatings
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Drop from course
// @route   PUT /api/enrollments/:id/drop
// @access  Private
router.put('/:id/drop', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { reason } = req.body;

    const enrollment = await Enrollment.findById(req.params.id).populate('course');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check authorization
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to drop this enrollment'
      });
    }

    // Check if already dropped
    if (enrollment.status === 'dropped') {
      return res.status(400).json({
        success: false,
        message: 'Already dropped from this course'
      });
    }

    // Update enrollment status
    enrollment.status = 'dropped';
    enrollment.droppedAt = new Date();
    enrollment.dropReason = reason;

    // Log activity
    enrollment.activityLog.push({
      action: 'dropped_course',
      details: reason || 'Course dropped by student'
    });

    await enrollment.save();

    // Update course enrollment count
    await Course.findByIdAndUpdate(enrollment.course._id, {
      $inc: { enrollmentCount: -1 }
    });

    // Remove course from user's enrolled courses
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { enrolledCourses: enrollment.course._id }
    });

    res.status(200).json({
      success: true,
      message: 'Successfully dropped from course'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get course enrollments (for instructors/admins)
// @route   GET /api/enrollments/course/:courseId
// @access  Private (Course Instructor or Admin)
router.get('/course/:courseId', auth, validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { status, page = 1, limit = 10, sort = '-enrolledAt' } = req.query;

    // Check if course exists
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
        message: 'Not authorized to view course enrollments'
      });
    }

    // Get enrollments
    const enrollments = await Enrollment.getCourseEnrollments(courseId, status)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Enrollment.countDocuments({
      course: courseId,
      ...(status && { status })
    });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: enrollments
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get enrollment analytics
// @route   GET /api/enrollments/analytics
// @access  Private (Admin)
router.get('/analytics/overview', auth, authorize('admin'), async (req, res, next) => {
  try {
    const totalEnrollments = await Enrollment.countDocuments();
    const activeEnrollments = await Enrollment.countDocuments({ status: 'active' });
    const completedEnrollments = await Enrollment.countDocuments({ status: 'completed' });
    const droppedEnrollments = await Enrollment.countDocuments({ status: 'dropped' });

    // Recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEnrollments = await Enrollment.countDocuments({
      enrolledAt: { $gte: thirtyDaysAgo }
    });

    // Enrollment growth by month (last 12 months)
    const twelveMonthsAgo = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000);
    const enrollmentGrowth = await Enrollment.aggregate([
      {
        $match: {
          enrolledAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$enrolledAt' },
            month: { $month: '$enrolledAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Average progress
    const progressStats = await Enrollment.aggregate([
      {
        $group: {
          _id: null,
          avgProgress: { $avg: '$progress.overallProgress' },
          avgTimeSpent: { $avg: '$progress.timeSpent' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          droppedEnrollments,
          recentEnrollments,
          completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0
        },
        growth: enrollmentGrowth,
        progress: progressStats[0] || { avgProgress: 0, avgTimeSpent: 0 }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;