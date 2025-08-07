import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Courses from './pages/Courses/Courses';
import CourseDetail from './pages/Courses/CourseDetail';
import CreateCourse from './pages/Courses/CreateCourse';
import EditCourse from './pages/Courses/EditCourse';
import MyCourses from './pages/Courses/MyCourses';
import UploadLecture from './pages/UploadLecture';
import LectureViewer from './pages/Lectures/LectureViewer';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Profile/Settings';
import NotFound from './pages/NotFound';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route 
            path="login" 
            element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="register" 
            element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
          />
          
          {/* Protected Routes */}
          <Route path="dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="my-courses" element={
            <ProtectedRoute roles={['professor', 'admin']}>
              <MyCourses />
            </ProtectedRoute>
          } />
          
          <Route path="create-course" element={
            <ProtectedRoute roles={['professor', 'admin']}>
              <CreateCourse />
            </ProtectedRoute>
          } />
          
          <Route path="edit-course/:id" element={
            <ProtectedRoute roles={['professor', 'admin']}>
              <EditCourse />
            </ProtectedRoute>
          } />
          
          <Route path="upload-lecture/:courseId" element={
            <ProtectedRoute roles={['professor', 'admin']}>
              <UploadLecture />
            </ProtectedRoute>
          } />
          
          <Route path="lecture/:id" element={
            <ProtectedRoute>
              <LectureViewer />
            </ProtectedRoute>
          } />
          
          <Route path="profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;