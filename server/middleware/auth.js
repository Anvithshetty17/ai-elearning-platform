const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this resource. Please login.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists. Please login again.'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this resource.'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

// Check if user owns the resource or is admin
const authorizeOwnerOrAdmin = (resourceField = 'user') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      
      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Get the resource to check ownership
      let resource;
      const modelName = req.baseUrl.split('/')[2]; // Extract model name from route
      
      switch (modelName) {
        case 'courses':
          const Course = require('../models/Course');
          resource = await Course.findById(resourceId);
          break;
        case 'lectures':
          const Lecture = require('../models/Lecture');
          resource = await Lecture.findById(resourceId);
          break;
        case 'enrollments':
          const Enrollment = require('../models/Enrollment');
          resource = await Enrollment.findById(resourceId);
          break;
        default:
          const User = require('../models/User');
          resource = await User.findById(resourceId);
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check ownership
      const ownerId = resource[resourceField] || resource.instructor || resource.student;
      
      if (ownerId && ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error in authorization'
      });
    }
  };
};

// Optional auth - doesn't require token but adds user if present
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Silently ignore token errors for optional auth
        console.log('Optional auth token error (ignored):', error.message);
      }
    }

    next();
  } catch (error) {
    // Continue without user for optional auth
    next();
  }
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (req, res, next) => {
  const rateLimit = require('express-rate-limit');
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for sensitive operations
    message: {
      success: false,
      message: 'Too many attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  limiter(req, res, next);
};

module.exports = {
  auth,
  authorize,
  authorizeOwnerOrAdmin,
  optionalAuth,
  sensitiveOperationLimit
};