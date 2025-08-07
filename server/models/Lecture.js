const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lecture title is required'],
    trim: true,
    maxlength: [200, 'Lecture title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Lecture description cannot exceed 1000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  order: {
    type: Number,
    required: [true, 'Lecture order is required'],
    min: [1, 'Lecture order must be at least 1']
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  // Content types
  contentType: {
    type: String,
    enum: ['text', 'video', 'audio', 'ai-generated'],
    default: 'text'
  },
  textContent: {
    type: String,
    maxlength: [10000, 'Text content cannot exceed 10000 characters']
  },
  // AI Processing related fields
  aiProcessing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    errorMessage: String,
    processedAt: Date,
    voiceSettings: {
      voice: {
        type: String,
        enum: ['male', 'female', 'child'],
        default: 'female'
      },
      speed: {
        type: Number,
        default: 1.0,
        min: 0.5,
        max: 2.0
      },
      language: {
        type: String,
        default: 'en'
      }
    }
  },
  // File references
  files: {
    originalText: String,
    audioFile: String,
    videoFile: String,
    thumbnail: String,
    subtitles: String
  },
  // Cloud storage URLs
  cloudinaryUrls: {
    audio: String,
    video: String,
    thumbnail: String
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  averageCompletionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Indexes
lectureSchema.index({ course: 1, order: 1 });
lectureSchema.index({ 'aiProcessing.status': 1 });
lectureSchema.index({ contentType: 1 });
lectureSchema.index({ isPublished: 1 });

// Update publishedAt when isPublished changes to true
lectureSchema.pre('save', function(next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Virtual for processing completion percentage
lectureSchema.virtual('processingComplete').get(function() {
  return this.aiProcessing.status === 'completed';
});

module.exports = mongoose.model('Lecture', lectureSchema);