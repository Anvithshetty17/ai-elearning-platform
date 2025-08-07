const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid or user is inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// Role-based Authorization Middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user is the owner of the resource
const checkOwnership = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // For courses, check if user is the professor
      if (resourceModel.modelName === 'Course') {
        if (resource.professor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only modify your own courses.'
          });
        }
      }

      // For enrollments, check if user is the student
      if (resourceModel.modelName === 'Enrollment') {
        if (resource.student.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own enrollments.'
          });
        }
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during ownership check'
      });
    }
  };
};

// Check if user is enrolled in a course
const checkEnrollment = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.params.id;
    const Enrollment = require('../models/Enrollment');
    
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      status: 'active'
    });

    if (!enrollment && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be enrolled in this course.'
      });
    }

    req.enrollment = enrollment;
    next();
  } catch (error) {
    console.error('Enrollment check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during enrollment check'
    });
  }
};

module.exports = {
  auth,
  authorize,
  checkOwnership,
  checkEnrollment
};