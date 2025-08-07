const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'dropped', 'suspended'],
    default: 'active'
  },
  progress: {
    completedLectures: [{
      lecture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture'
      },
      completedAt: {
        type: Date,
        default: Date.now
      },
      watchTime: {
        type: Number, // in seconds
        default: 0
      },
      completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    }],
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAccessedLecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture'
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    },
    totalWatchTime: {
      type: Number, // in seconds
      default: 0
    }
  },
  completedAt: Date,
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateIssuedAt: Date,
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    reviewedAt: Date
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'free'],
    default: 'free'
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  paymentDate: Date
}, {
  timestamps: true
});

// Compound index to ensure unique enrollment per student-course pair
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Other indexes for performance
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ enrolledAt: -1 });
enrollmentSchema.index({ 'progress.overallProgress': -1 });

// Virtual to calculate completion status
enrollmentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed' || this.progress.overallProgress >= 100;
});

// Method to update overall progress based on completed lectures
enrollmentSchema.methods.updateProgress = async function() {
  if (!this.populated('course')) {
    await this.populate('course');
  }
  
  const totalLectures = this.course.lectures.length;
  const completedLectures = this.progress.completedLectures.length;
  
  if (totalLectures > 0) {
    this.progress.overallProgress = Math.round((completedLectures / totalLectures) * 100);
    
    // Mark as completed if 100% progress
    if (this.progress.overallProgress >= 100 && this.status === 'active') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
  
  return this.save();
};

// Method to add completed lecture
enrollmentSchema.methods.addCompletedLecture = function(lectureId, watchTime = 0, completionPercentage = 100) {
  // Check if lecture is already completed
  const existingIndex = this.progress.completedLectures.findIndex(
    cl => cl.lecture.toString() === lectureId.toString()
  );
  
  if (existingIndex === -1) {
    this.progress.completedLectures.push({
      lecture: lectureId,
      completedAt: new Date(),
      watchTime,
      completionPercentage
    });
  } else {
    // Update existing completion record
    this.progress.completedLectures[existingIndex].watchTime = Math.max(
      this.progress.completedLectures[existingIndex].watchTime, 
      watchTime
    );
    this.progress.completedLectures[existingIndex].completionPercentage = Math.max(
      this.progress.completedLectures[existingIndex].completionPercentage,
      completionPercentage
    );
  }
  
  // Update total watch time
  this.progress.totalWatchTime += watchTime;
  this.progress.lastAccessedLecture = lectureId;
  this.progress.lastAccessedAt = new Date();
  
  return this.updateProgress();
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);