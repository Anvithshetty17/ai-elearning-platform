# AI E-Learning Platform

A comprehensive full-stack AI-powered e-learning platform that transforms text content into engaging video lectures using artificial intelligence.

## Features

### 🎯 Core Functionality
- **AI Video Generation**: Convert text content to professional video lectures with AI voices
- **Multi-language Support**: Support for multiple languages and voice types
- **Course Management**: Complete CRUD operations for courses and lectures
- **Student Enrollment**: Track student progress and engagement
- **Role-based Access**: Separate interfaces for students, professors, and admins
- **Responsive Design**: Mobile-friendly interface

### 🚀 AI Capabilities
- **Text-to-Speech**: High-quality AI voice generation
- **Video Creation**: Automated video generation with animations
- **Voice Customization**: Multiple voice types, speeds, and languages
- **Audio Optimization**: Automatic audio processing and enhancement
- **Cloud Storage**: Seamless integration with Cloudinary

### 📚 Learning Management
- **Progress Tracking**: Real-time student progress monitoring
- **Interactive Player**: Custom video player with progress tracking
- **Course Analytics**: Detailed statistics for professors
- **Certificate Generation**: Automatic certificate issuance
- **Rating System**: Student feedback and course ratings

## Tech Stack

### Backend (Node.js/Express)
- **Framework**: Express.js with comprehensive middleware
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication with role management
- **File Upload**: Multer integration for file handling
- **Validation**: Express-validator for input validation
- **Security**: Helmet, CORS, rate limiting

### ML Services (Python/Flask)
- **Framework**: Flask with async processing
- **TTS Engine**: gTTS and pyttsx3 for text-to-speech
- **Video Processing**: MoviePy for video generation
- **Image Processing**: OpenCV and Pillow
- **Cloud Storage**: Cloudinary integration
- **Audio Processing**: Librosa and Pydub

### Frontend (React)
- **Framework**: React 18 with modern hooks
- **Routing**: React Router v6
- **State Management**: React Query for server state
- **Forms**: React Hook Form with validation
- **UI Components**: Custom component library
- **Styling**: Modern CSS with responsive design
- **File Upload**: React Dropzone integration

## Project Structure

```
├── server/              # Backend API server
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── middleware/     # Custom middleware
│   ├── controllers/    # Route controllers
│   └── utils/          # Utility functions
├── ml-services/        # Python ML processing services
│   ├── services/       # Core ML services
│   ├── utils/          # Helper utilities
│   └── uploads/        # Temporary file storage
├── client/             # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   ├── context/    # React context providers
│   │   ├── hooks/      # Custom hooks
│   │   └── styles/     # CSS styles
│   └── public/         # Static assets
└── docs/               # Documentation
```

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+ and pip
- MongoDB instance
- Cloudinary account (optional, for file storage)

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Server**
   ```bash
   npm run dev
   ```

The API server will run on `http://localhost:5000`

### ML Services Setup

1. **Install Dependencies**
   ```bash
   cd ml-services
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Configure ML service settings
   ```

3. **Start ML Services**
   ```bash
   python app.py
   ```

The ML service will run on `http://localhost:5001`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd client
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

## Environment Variables

### Server (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-elearning
JWT_SECRET=your-super-secret-jwt-key
CLIENT_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:5001
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### ML Services (.env)
```env
FLASK_ENV=development
ML_SERVICE_PORT=5001
BACKEND_API_URL=http://localhost:5000
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Course Endpoints
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create course
- `GET /api/courses/:id` - Get course by ID
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Lecture Endpoints
- `GET /api/lectures/course/:courseId` - Get course lectures
- `POST /api/lectures` - Create lecture
- `PUT /api/lectures/:id` - Update lecture
- `DELETE /api/lectures/:id` - Delete lecture

### ML Service Endpoints
- `POST /api/ml/text-to-speech` - Generate speech from text
- `POST /api/ml/generate-video` - Create video lecture
- `POST /api/ml/process-lecture` - Process complete lecture

## Deployment

### Production Build

1. **Frontend Build**
   ```bash
   cd client
   npm run build
   ```

2. **Backend Production**
   ```bash
   cd server
   NODE_ENV=production npm start
   ```

3. **ML Services Production**
   ```bash
   cd ml-services
   FLASK_ENV=production python app.py
   ```

### Docker Deployment
Coming soon - Docker configuration for containerized deployment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Security Features

- JWT authentication with refresh tokens
- Rate limiting and request validation
- CORS protection
- Helmet security headers
- Input sanitization and validation
- Role-based access control
- Secure file upload handling

## Performance Optimizations

- Database indexing and query optimization
- Image and video optimization
- CDN integration with Cloudinary
- Lazy loading and code splitting
- Caching strategies
- Async processing for AI operations

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Contact the development team

---

**Built with ❤️ for modern education**