const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Storage configuration for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// In-memory storage for demo (in production, use a database)
let lectures = [];
let courses = [];

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI E-Learning Platform API is running' });
});

// Get all lectures
app.get('/api/lectures', (req, res) => {
  res.json(lectures);
});

// Create new lecture
app.post('/api/lectures', (req, res) => {
  const { title, subject, content, duration } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const lecture = {
    id: uuidv4(),
    title,
    subject: subject || 'General',
    content,
    duration: parseInt(duration) || 5,
    status: 'processing',
    videoUrl: null,
    createdAt: new Date().toISOString(),
    generatedAt: null
  };

  lectures.push(lecture);

  // Simulate AI video generation process
  setTimeout(() => {
    const lectureIndex = lectures.findIndex(l => l.id === lecture.id);
    if (lectureIndex !== -1) {
      lectures[lectureIndex] = {
        ...lectures[lectureIndex],
        status: 'completed',
        videoUrl: '/api/videos/sample.mp4',
        generatedAt: new Date().toISOString()
      };
      console.log(`Lecture "${title}" processing completed`);
    }
  }, 10000); // 10 seconds processing simulation

  res.status(201).json(lecture);
});

// Get lecture by ID
app.get('/api/lectures/:id', (req, res) => {
  const lecture = lectures.find(l => l.id === req.params.id);
  if (!lecture) {
    return res.status(404).json({ error: 'Lecture not found' });
  }
  res.json(lecture);
});

// Delete lecture
app.delete('/api/lectures/:id', (req, res) => {
  const index = lectures.findIndex(l => l.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Lecture not found' });
  }
  
  lectures.splice(index, 1);
  res.json({ message: 'Lecture deleted successfully' });
});

// Get all courses
app.get('/api/courses', (req, res) => {
  res.json(courses);
});

// Create new course
app.post('/api/courses', (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Course name is required' });
  }

  const course = {
    id: uuidv4(),
    name,
    description: description || '',
    createdAt: new Date().toISOString(),
    lectureIds: []
  };

  courses.push(course);
  res.status(201).json(course);
});

// Add lecture to course
app.post('/api/courses/:courseId/lectures/:lectureId', (req, res) => {
  const course = courses.find(c => c.id === req.params.courseId);
  const lecture = lectures.find(l => l.id === req.params.lectureId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (!lecture) {
    return res.status(404).json({ error: 'Lecture not found' });
  }

  if (!course.lectureIds.includes(req.params.lectureId)) {
    course.lectureIds.push(req.params.lectureId);
  }

  res.json({ message: 'Lecture added to course successfully' });
});

// Get course lectures
app.get('/api/courses/:courseId/lectures', (req, res) => {
  const course = courses.find(c => c.id === req.params.courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const courseLectures = lectures.filter(l => course.lectureIds.includes(l.id));
  res.json(courseLectures);
});

// Serve sample video (for demo purposes)
app.get('/api/videos/:filename', (req, res) => {
  // In production, this would serve actual generated videos
  // For demo, we'll return a placeholder response
  res.json({ 
    message: 'Video streaming would be implemented here',
    filename: req.params.filename,
    note: 'In a real implementation, this would stream the actual video file'
  });
});

// Get platform statistics
app.get('/api/stats', (req, res) => {
  const stats = {
    totalLectures: lectures.length,
    completedLectures: lectures.filter(l => l.status === 'completed').length,
    processingLectures: lectures.filter(l => l.status === 'processing').length,
    totalCourses: courses.length,
    subjects: [...new Set(lectures.map(l => l.subject))].filter(Boolean)
  };
  res.json(stats);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI E-Learning Platform API running on http://localhost:${PORT}`);
  console.log(`📚 Ready to transform text into video lectures!`);
  
  // Sample data for demo
  const sampleLecture = {
    id: 'sample-' + uuidv4(),
    title: 'Introduction to Machine Learning',
    subject: 'Computer Science',
    content: `Machine Learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed.

Key Concepts:
1. Supervised Learning - Learning with labeled examples
2. Unsupervised Learning - Finding patterns in data without labels
3. Neural Networks - Computing systems inspired by biological neural networks
4. Deep Learning - Advanced neural networks with multiple layers

Applications:
- Image Recognition
- Natural Language Processing
- Recommendation Systems
- Autonomous Vehicles

Machine learning has revolutionized how we process information and make predictions, becoming essential in modern technology.`,
    duration: 10,
    status: 'completed',
    videoUrl: '/api/videos/ml-intro.mp4',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    generatedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
  };

  const sampleCourse = {
    id: 'course-' + uuidv4(),
    name: 'AI Fundamentals',
    description: 'Complete introduction to Artificial Intelligence and Machine Learning concepts',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lectureIds: [sampleLecture.id]
  };

  lectures.push(sampleLecture);
  courses.push(sampleCourse);
  
  console.log(`📝 Sample data loaded: 1 lecture, 1 course`);
});