const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;

    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// @route   GET /api/users/professors
// @desc    Get all professors
// @access  Public
router.get('/professors', async (req, res) => {
  try {
    const professors = await User.find({ role: 'professor', isActive: true })
      .select('fullName avatar bio expertise')
      .sort({ createdAt: -1 });

    // Get course count for each professor
    const professorsWithStats = await Promise.all(
      professors.map(async (professor) => {
        const courseCount = await Course.countDocuments({ 
          professor: professor._id, 
          isPublished: true 
        });
        
        return {
          ...professor.toJSON(),
          courseCount
        };
      })
    );

    res.json({
      success: true,
      data: professorsWithStats
    });

  } catch (error) {
    console.error('Get professors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching professors'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public (limited info) / Private (full info for own profile or admin)
router.get('/:id', async (req, res) => {
  try {
    let selectFields = 'fullName avatar bio expertise createdAt';
    
    // If authenticated user is viewing their own profile or admin
    if (req.user && (req.user._id.toString() === req.params.id || req.user.role === 'admin')) {
      selectFields = '-password';
    }

    const user = await User.findById(req.params.id).select(selectFields);

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add additional stats for public profile
    let additionalData = {};
    if (user.role === 'professor') {
      const courseCount = await Course.countDocuments({ 
        professor: user._id, 
        isPublished: true 
      });
      const totalEnrollments = await Enrollment.countDocuments({
        course: { $in: await Course.find({ professor: user._id }).distinct('_id') }
      });
      
      additionalData = {
        courseCount,
        totalStudents: totalEnrollments
      };
    }

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        ...additionalData
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin only)
router.put('/:id/status', auth, authorize('admin'), [
  body('isActive').isBoolean().withMessage('isActive must be a boolean value')
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

    const { isActive } = req.body;
    
    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === req.params.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const message = isActive ? 'User activated successfully' : 'User deactivated successfully';

    res.json({
      success: true,
      message,
      data: user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user status'
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private (Admin only)
router.put('/:id/role', auth, authorize('admin'), [
  body('role').isIn(['student', 'professor', 'admin']).withMessage('Invalid role')
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

    const { role } = req.body;
    
    // Prevent admin from changing their own role
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user role'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user account
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user is a professor, check for active courses
    if (user.role === 'professor') {
      const activeCourses = await Course.countDocuments({ 
        professor: user._id, 
        isPublished: true 
      });
      
      if (activeCourses > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete professor with active published courses'
        });
      }
    }

    // If user is a student, check for active enrollments
    if (user.role === 'student') {
      const activeEnrollments = await Enrollment.countDocuments({ 
        student: user._id, 
        status: 'active' 
      });
      
      if (activeEnrollments > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete student with active enrollments'
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
});

module.exports = router;