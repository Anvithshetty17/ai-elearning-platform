# AI E-Learning Platform

A comprehensive full-stack AI-powered E-Learning Platform that enables automated lecture generation from text using AI technologies including text-to-speech conversion and video generation.

## 🚀 Features

### Core Functionality
- **AI Lecture Generation**: Convert text content into engaging video lectures with AI-powered text-to-speech
- **User Authentication**: JWT-based authentication with role-based access control (Students/Professors)
- **Course Management**: Complete CRUD operations for courses with multimedia support
- **Progress Tracking**: Real-time learning progress and analytics
- **Responsive Design**: Modern, mobile-first UI/UX design

### AI-Powered Services
- **Text-to-Speech**: Multiple voice options and language support
- **Video Generation**: Automated video creation from text content
- **Audio Processing**: Advanced audio enhancement and processing
- **Cloud Integration**: Seamless cloud storage for media files

### Technical Features
- **Real-time Updates**: Live processing status and notifications
- **File Upload**: Multi-format file support with progress tracking
- **Security**: Comprehensive security measures and input validation
- **Scalability**: Microservices architecture for optimal performance

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **File Storage**: Cloudinary integration
- **Security**: Helmet, CORS, Rate Limiting

### AI/ML Services
- **Framework**: Python Flask
- **Text-to-Speech**: Advanced TTS engines
- **Video Processing**: AI-powered video generation
- **Audio Processing**: Custom audio enhancement utilities

### Frontend
- **Framework**: React.js with modern hooks
- **Styling**: CSS3 with responsive design
- **State Management**: Context API
- **HTTP Client**: Axios for API communication

### Infrastructure
- **Containerization**: Docker with docker-compose
- **Process Management**: PM2 for production deployment
- **Environment**: Environment-specific configurations

## 📁 Project Structure

```
ai-elearning-platform/
├── server/                 # Backend API server
│   ├── config/            # Configuration files
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── services/          # Business logic services
│   └── utils/             # Utility functions
├── ml-services/           # AI/ML microservices
│   ├── services/          # Core AI services
│   ├── routes/            # ML API endpoints
│   └── utils/             # ML utilities
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Frontend utilities
│   └── public/            # Static assets
└── docker-compose.yml     # Container orchestration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16.0 or higher
- Python 3.8 or higher
- MongoDB database
- Cloudinary account (for media storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Anvithshetty17/ai-elearning-platform.git
   cd ai-elearning-platform
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   
   Create `.env` files in each service directory:
   
   **Server (.env)**
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ai-elearning
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=30d
   CLOUDINARY_CLOUD_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-cloudinary-key
   CLOUDINARY_API_SECRET=your-cloudinary-secret
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ML_SERVICE_URL=http://localhost:5001
   ```

   **ML Services (.env)**
   ```env
   FLASK_ENV=development
   FLASK_PORT=5001
   CLOUDINARY_CLOUD_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-cloudinary-key
   CLOUDINARY_API_SECRET=your-cloudinary-secret
   TTS_API_KEY=your-tts-api-key
   ```

   **Client (.env)**
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_ML_API_URL=http://localhost:5001/api
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - ML services on http://localhost:5001
   - React app on http://localhost:3000

### Production Deployment

**Using Docker:**
```bash
npm run docker:build
npm run docker:up
```

**Manual Deployment:**
```bash
npm run build:server
npm run build:client
npm run build:ml
npm start
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Course Management
- `GET /api/courses` - List all courses
- `POST /api/courses` - Create new course
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Lecture Management
- `GET /api/lectures/:courseId` - Get course lectures
- `POST /api/lectures` - Create new lecture
- `PUT /api/lectures/:id` - Update lecture
- `DELETE /api/lectures/:id` - Delete lecture

### AI Services
- `POST /api/ml/generate-lecture` - Generate AI lecture from text
- `POST /api/ml/text-to-speech` - Convert text to speech
- `GET /api/ml/processing-status/:jobId` - Check processing status

## 🔧 Configuration

### Database Configuration
The platform uses MongoDB for data storage. Configure connection in `server/config/database.js`.

### Cloud Storage
Cloudinary is used for media file storage. Configure credentials in environment variables.

### AI Services
ML services require API keys for TTS and video generation services. Set up credentials in ML service environment.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run server tests only
cd server && npm test

# Run client tests only
cd client && npm test
```

## 🔒 Security Features

- JWT authentication with secure token handling
- Password hashing using bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- Environment-based configuration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Anvith Shetty**
- GitHub: [@Anvithshetty17](https://github.com/Anvithshetty17)

## 🙏 Acknowledgments

- OpenAI for AI technology inspiration
- MongoDB for database solutions
- Cloudinary for media management
- The React and Node.js communities

---

**Note**: This platform is designed for educational purposes and includes AI-powered features that require appropriate API keys and configurations for full functionality.