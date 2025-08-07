import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import UploadLecture from './pages/UploadLecture';
import LectureViewer from './pages/LectureViewer';
import CourseManager from './pages/CourseManager';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="header">
          <div className="container">
            <h1>AI E-Learning Platform</h1>
            <p>Transform Text into Interactive Video Lectures</p>
          </div>
        </header>
        
        <nav className="nav">
          <div className="container">
            <ul>
              <li><NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Upload Lecture</NavLink></li>
              <li><NavLink to="/courses" className={({ isActive }) => isActive ? 'active' : ''}>My Courses</NavLink></li>
              <li><NavLink to="/viewer" className={({ isActive }) => isActive ? 'active' : ''}>Lecture Viewer</NavLink></li>
            </ul>
          </div>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/" element={<UploadLecture />} />
            <Route path="/courses" element={<CourseManager />} />
            <Route path="/viewer/:id?" element={<LectureViewer />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;