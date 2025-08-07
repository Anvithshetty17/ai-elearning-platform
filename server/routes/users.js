const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { auth, authorize, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { validate, userValidation, generalValidation } = require('../utils/validators');
const { uploadMiddleware } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', auth, authorize('admin'), validate(generalValidation.pagination, 'query'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', role, search } = req.query;

    // Build query
    let query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query
    const users = await User.find(query)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('enrollmentCount')
      .exec();

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Owner or Admin)
router.get('/:id', auth, authorizeOwnerOrAdmin(), validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .populate('enrolledCourses', 'title thumbnail progress')
      .populate('createdCourses', 'title thumbnail enrollmentCount rating')
      .populate('enrollmentCount');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user.getPublicProfile()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Owner or Admin)
router.put('/:id', auth, authorizeOwnerOrAdmin(), validate(generalValidation.mongoId, 'params'), validate(userValidation.updateProfile), async (req, res, next) => {
  try {
    const fieldsToUpdate = { ...req.body };
    
    // Only admins can change role and active status
    if (req.user.role !== 'admin') {
      delete fieldsToUpdate.role;
      delete fieldsToUpdate.isActive;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).select('-password -emailVerificationToken -resetPasswordToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user.getPublicProfile()
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('admin'), validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow admin to delete themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Delete user's avatar from cloudinary if exists
    if (user.avatar && user.avatar.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch (error) {
        console.error('Error deleting avatar from cloudinary:', error);
      }
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload/Update user avatar
// @route   PUT /api/users/:id/avatar
// @access  Private (Owner or Admin)
router.put('/:id/avatar', auth, authorizeOwnerOrAdmin(), validate(generalValidation.mongoId, 'params'), uploadMiddleware.avatar, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old avatar from cloudinary if exists
    if (user.avatar && user.avatar.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch (error) {
        console.error('Error deleting old avatar:', error);
      }
    }

    // Upload new avatar to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'ai-elearning/avatars',
      width: 200,
      height: 200,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto'
    });

    // Update user avatar
    user.avatar = {
      public_id: result.public_id,
      url: result.secure_url
    };

    await user.save({ validateBeforeSave: false });

    // Clean up local file
    const fs = require('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's enrolled courses
// @route   GET /api/users/:id/enrollments
// @access  Private (Owner or Admin)
router.get('/:id/enrollments', auth, authorizeOwnerOrAdmin(), validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const { status = 'active', page = 1, limit = 10 } = req.query;

    const enrollments = await Enrollment.getStudentEnrollments(req.params.id, status)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Enrollment.countDocuments({
      student: req.params.id,
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

// @desc    Get user's created courses (professors only)
// @route   GET /api/users/:id/courses
// @access  Private (Owner or Admin)
router.get('/:id/courses', auth, authorizeOwnerOrAdmin(), validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only professors and admins can have created courses
    if (user.role !== 'professor' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only professors can create courses'
      });
    }

    const { status, page = 1, limit = 10 } = req.query;

    let query = { instructor: req.params.id };
    if (status) {
      query.status = status;
    }

    const courses = await Course.find(query)
      .populate('instructor', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

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

// @desc    Get user analytics (admin only)
// @route   GET /api/users/analytics
// @access  Private (Admin)
router.get('/analytics/overview', auth, authorize('admin'), async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const studentCount = await User.countDocuments({ role: 'student' });
    const professorCount = await User.countDocuments({ role: 'professor' });
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // User growth by month (last 12 months)
    const twelveMonthsAgo = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000);
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          recentRegistrations,
          roleDistribution: {
            students: studentCount,
            professors: professorCount,
            admins: adminCount
          }
        },
        growth: userGrowth
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Deactivate user account
// @route   PUT /api/users/:id/deactivate
// @access  Private (Admin)
router.put('/:id/deactivate', auth, authorize('admin'), validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow admin to deactivate themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'User account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Reactivate user account
// @route   PUT /api/users/:id/reactivate
// @access  Private (Admin)
router.put('/:id/reactivate', auth, authorize('admin'), validate(generalValidation.mongoId, 'params'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = true;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'User account reactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;