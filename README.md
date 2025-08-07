# AI E-Learning Platform

Transform text content into engaging AI-generated video lectures with this comprehensive e-learning platform.

## 🎯 Features

- **Text-to-Video Conversion**: Transform written content into AI-generated video lectures
- **Course Management**: Organize lectures into structured courses
- **Lecture Viewer**: Watch generated video lectures with detailed information
- **Interactive UI**: Modern, responsive React frontend
- **REST API**: Complete backend API for lecture and course management
- **Real-time Processing**: Track lecture generation status in real-time

## 🏗️ Architecture

### Frontend (React)
- **Upload Lecture**: Create new lectures with text content
- **Course Manager**: Organize and manage lectures and courses
- **Lecture Viewer**: Watch generated videos and view lecture details
- **Responsive Design**: Works on desktop and mobile devices

### Backend (Node.js/Express)
- **Lecture Processing API**: Handle lecture creation and AI video generation
- **Course Management**: Create and organize courses
- **File Storage**: Manage video files and assets
- **Statistics**: Track platform usage and metrics

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-elearning-platform
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm start
   ```
   Server will run on http://localhost:3001

2. **Start the frontend development server**
   ```bash
   cd client
   npm start
   ```
   Frontend will run on http://localhost:3000

## 📖 Usage

### Creating a Lecture
1. Navigate to the "Upload Lecture" page
2. Enter lecture title and subject
3. Write your content in the text area
4. Select desired video duration
5. Click "Generate AI Video Lecture"
6. Monitor processing status in the Course Manager

### Managing Courses
1. Go to "My Courses" to see all lectures and courses
2. Create new courses to organize related lectures
3. Assign lectures to courses using the dropdown
4. View statistics and manage content

### Viewing Lectures
1. Use the "Lecture Viewer" to watch generated videos
2. Select lectures from the sidebar
3. View original content and lecture details
4. Track processing status for new lectures

## 🛠️ API Endpoints

### Lectures
- `GET /api/lectures` - Get all lectures
- `POST /api/lectures` - Create new lecture
- `GET /api/lectures/:id` - Get lecture by ID
- `DELETE /api/lectures/:id` - Delete lecture

### Courses
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create new course
- `GET /api/courses/:courseId/lectures` - Get course lectures
- `POST /api/courses/:courseId/lectures/:lectureId` - Add lecture to course

### System
- `GET /api/health` - Health check
- `GET /api/stats` - Platform statistics

## 🎥 AI Video Generation

The platform simulates AI video generation with the following process:
1. **Text Analysis**: Content is analyzed for structure and key points
2. **Script Generation**: Text is formatted for video narration
3. **Visual Creation**: AI generates relevant visuals and animations
4. **Voice Synthesis**: Text-to-speech creates natural narration
5. **Video Assembly**: All components are combined into final video

*Note: Current implementation uses mock processing for demonstration. In production, integrate with actual AI video generation services.*

## 🔧 Configuration

### Environment Variables (Server)
```env
PORT=3001
NODE_ENV=development
```

### Environment Variables (Client)
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## 📊 Sample Data

The application includes sample content:
- **Sample Lecture**: "Introduction to Machine Learning"
- **Sample Course**: "AI Fundamentals"

## 🌟 Future Enhancements

- **Real AI Integration**: Connect with actual AI video generation services
- **User Authentication**: Add user accounts and permissions
- **Advanced Analytics**: Detailed usage statistics and insights
- **Interactive Elements**: Quizzes and assessments within videos
- **Mobile App**: Native mobile application
- **Live Streaming**: Real-time lecture broadcasting
- **Collaboration Tools**: Multi-user course creation

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or support, please create an issue in the repository.

---

**Built with ❤️ for the future of education**