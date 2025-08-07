const Joi = require('joi');

// User validation schemas
const userValidation = {
  register: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    
    email: Joi.string()
      .email()
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required'
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      }),
    
    role: Joi.string()
      .valid('student', 'professor')
      .default('student'),
    
    phone: Joi.string()
      .pattern(/^\d{10,15}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number (10-15 digits)'
      }),
    
    dateOfBirth: Joi.date()
      .max('now')
      .optional()
      .messages({
        'date.max': 'Date of birth cannot be in the future'
      })
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      }),
    
    rememberMe: Joi.boolean().optional()
  }),

  updateProfile: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .optional(),
    
    bio: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    
    phone: Joi.string()
      .pattern(/^\d{10,15}$/)
      .optional()
      .allow(''),
    
    dateOfBirth: Joi.date()
      .max('now')
      .optional(),
    
    address: Joi.object({
      street: Joi.string().max(200).optional().allow(''),
      city: Joi.string().max(100).optional().allow(''),
      state: Joi.string().max(100).optional().allow(''),
      zipCode: Joi.string().max(20).optional().allow(''),
      country: Joi.string().max(100).optional().allow('')
    }).optional(),
    
    socialLinks: Joi.object({
      linkedin: Joi.string().uri().optional().allow(''),
      twitter: Joi.string().uri().optional().allow(''),
      github: Joi.string().uri().optional().allow(''),
      website: Joi.string().uri().optional().allow('')
    }).optional(),
    
    preferences: Joi.object({
      emailNotifications: Joi.boolean().optional(),
      pushNotifications: Joi.boolean().optional(),
      theme: Joi.string().valid('light', 'dark').optional(),
      language: Joi.string().max(5).optional()
    }).optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    
    newPassword: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'New password must be at least 6 characters long',
        'string.max': 'New password cannot exceed 128 characters',
        'any.required': 'New password is required'
      }),
    
    confirmNewPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'New passwords do not match',
        'any.required': 'New password confirmation is required'
      })
  }),

  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  }),

  resetPassword: Joi.object({
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required'
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      })
  })
};

// Course validation schemas
const courseValidation = {
  create: Joi.object({
    title: Joi.string()
      .min(5)
      .max(100)
      .trim()
      .required()
      .messages({
        'string.min': 'Course title must be at least 5 characters long',
        'string.max': 'Course title cannot exceed 100 characters',
        'any.required': 'Course title is required'
      }),
    
    description: Joi.string()
      .min(20)
      .max(2000)
      .required()
      .messages({
        'string.min': 'Course description must be at least 20 characters long',
        'string.max': 'Course description cannot exceed 2000 characters',
        'any.required': 'Course description is required'
      }),
    
    shortDescription: Joi.string()
      .min(10)
      .max(200)
      .required()
      .messages({
        'string.min': 'Short description must be at least 10 characters long',
        'string.max': 'Short description cannot exceed 200 characters',
        'any.required': 'Short description is required'
      }),
    
    category: Joi.string()
      .valid(
        'Technology', 'Business', 'Arts & Design', 'Science', 
        'Mathematics', 'Language', 'Health & Fitness', 'Music', 
        'Photography', 'Marketing', 'Personal Development', 'Other'
      )
      .required()
      .messages({
        'any.only': 'Please select a valid category',
        'any.required': 'Course category is required'
      }),
    
    level: Joi.string()
      .valid('Beginner', 'Intermediate', 'Advanced')
      .required()
      .messages({
        'any.only': 'Please select a valid difficulty level',
        'any.required': 'Course level is required'
      }),
    
    language: Joi.string()
      .min(2)
      .max(50)
      .default('English')
      .optional(),
    
    price: Joi.number()
      .min(0)
      .precision(2)
      .required()
      .messages({
        'number.min': 'Price cannot be negative',
        'any.required': 'Course price is required'
      }),
    
    originalPrice: Joi.number()
      .min(0)
      .precision(2)
      .greater(Joi.ref('price'))
      .optional()
      .messages({
        'number.min': 'Original price cannot be negative',
        'number.greater': 'Original price must be greater than current price'
      }),
    
    currency: Joi.string()
      .valid('USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD')
      .default('USD')
      .optional(),
    
    duration: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.min': 'Duration must be at least 1 minute',
        'any.required': 'Course duration is required'
      }),
    
    prerequisites: Joi.array()
      .items(Joi.string().trim())
      .optional(),
    
    learningOutcomes: Joi.array()
      .items(Joi.string().min(10).max(200))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one learning outcome is required',
        'any.required': 'Learning outcomes are required'
      }),
    
    tags: Joi.array()
      .items(Joi.string().trim().lowercase())
      .optional(),
    
    difficulty: Joi.string()
      .valid('Easy', 'Medium', 'Hard')
      .required()
      .messages({
        'any.only': 'Please select a valid difficulty',
        'any.required': 'Difficulty is required'
      }),
    
    faq: Joi.array()
      .items(
        Joi.object({
          question: Joi.string().min(10).max(200).required(),
          answer: Joi.string().min(10).max(500).required()
        })
      )
      .optional()
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(100).trim().optional(),
    description: Joi.string().min(20).max(2000).optional(),
    shortDescription: Joi.string().min(10).max(200).optional(),
    category: Joi.string().valid(
      'Technology', 'Business', 'Arts & Design', 'Science', 
      'Mathematics', 'Language', 'Health & Fitness', 'Music', 
      'Photography', 'Marketing', 'Personal Development', 'Other'
    ).optional(),
    level: Joi.string().valid('Beginner', 'Intermediate', 'Advanced').optional(),
    language: Joi.string().min(2).max(50).optional(),
    price: Joi.number().min(0).precision(2).optional(),
    originalPrice: Joi.number().min(0).precision(2).optional(),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD').optional(),
    duration: Joi.number().integer().min(1).optional(),
    prerequisites: Joi.array().items(Joi.string().trim()).optional(),
    learningOutcomes: Joi.array().items(Joi.string().min(10).max(200)).optional(),
    tags: Joi.array().items(Joi.string().trim().lowercase()).optional(),
    difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').optional(),
    isPublished: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    faq: Joi.array().items(
      Joi.object({
        question: Joi.string().min(10).max(200).required(),
        answer: Joi.string().min(10).max(500).required()
      })
    ).optional()
  })
};

// Lecture validation schemas
const lectureValidation = {
  create: Joi.object({
    title: Joi.string()
      .min(5)
      .max(100)
      .trim()
      .required()
      .messages({
        'string.min': 'Lecture title must be at least 5 characters long',
        'string.max': 'Lecture title cannot exceed 100 characters',
        'any.required': 'Lecture title is required'
      }),
    
    description: Joi.string()
      .max(1000)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Lecture description cannot exceed 1000 characters'
      }),
    
    course: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid course ID',
        'any.required': 'Course ID is required'
      }),
    
    order: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.min': 'Lecture order must be at least 1',
        'any.required': 'Lecture order is required'
      }),
    
    duration: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.min': 'Duration must be at least 1 second',
        'any.required': 'Lecture duration is required'
      }),
    
    transcript: Joi.string()
      .max(10000)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Transcript cannot exceed 10000 characters'
      }),
    
    isPreview: Joi.boolean().optional(),
    isFree: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
    
    metadata: Joi.object({
      language: Joi.string().max(10).optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').optional(),
      estimatedStudyTime: Joi.number().integer().min(1).optional(),
      prerequisites: Joi.array().items(Joi.string()).optional()
    }).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(100).trim().optional(),
    description: Joi.string().max(1000).optional().allow(''),
    order: Joi.number().integer().min(1).optional(),
    duration: Joi.number().integer().min(1).optional(),
    transcript: Joi.string().max(10000).optional().allow(''),
    isPreview: Joi.boolean().optional(),
    isFree: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
    metadata: Joi.object({
      language: Joi.string().max(10).optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').optional(),
      estimatedStudyTime: Joi.number().integer().min(1).optional(),
      prerequisites: Joi.array().items(Joi.string()).optional()
    }).optional()
  })
};

// Progress validation schema
const progressValidation = {
  update: Joi.object({
    watchTime: Joi.number()
      .min(0)
      .optional()
      .messages({
        'number.min': 'Watch time cannot be negative'
      }),
    
    isCompleted: Joi.boolean().optional(),
    
    playbackSettings: Joi.object({
      speed: Joi.number().min(0.25).max(2.0).optional(),
      quality: Joi.string().valid('auto', '360p', '480p', '720p', '1080p').optional(),
      volume: Joi.number().min(0).max(1).optional(),
      autoplay: Joi.boolean().optional(),
      subtitles: Joi.object({
        enabled: Joi.boolean().optional(),
        language: Joi.string().max(5).optional()
      }).optional()
    }).optional()
  }),

  addNote: Joi.object({
    timestamp: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.min': 'Timestamp cannot be negative',
        'any.required': 'Timestamp is required'
      }),
    
    content: Joi.string()
      .min(1)
      .max(1000)
      .required()
      .messages({
        'string.min': 'Note content is required',
        'string.max': 'Note cannot exceed 1000 characters',
        'any.required': 'Note content is required'
      })
  }),

  addBookmark: Joi.object({
    timestamp: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.min': 'Timestamp cannot be negative',
        'any.required': 'Timestamp is required'
      }),
    
    note: Joi.string()
      .max(200)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Bookmark note cannot exceed 200 characters'
      })
  })
};

// General validation schemas
const generalValidation = {
  mongoId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ID format',
      'any.required': 'ID is required'
    }),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    fields: Joi.string().optional()
  }),
  
  search: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    category: Joi.string().optional(),
    level: Joi.string().valid('Beginner', 'Intermediate', 'Advanced').optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    language: Joi.string().optional(),
    rating: Joi.number().min(0).max(5).optional()
  })
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = {
  userValidation,
  courseValidation,
  lectureValidation,
  progressValidation,
  generalValidation,
  validate
};