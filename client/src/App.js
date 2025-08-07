import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import { Helmet } from 'react-helmet-async';

// Components
import LoadingSpinner from './components/LoadingSpinner';
import Navbar from './components/Navbar';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Courses = lazy(() => import('./pages/Courses'));
const BrowseCourses = lazy(() => import('./pages/BrowseCourses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const CreateCourse = lazy(() => import('./pages/CreateCourse'));
const UploadLecture = lazy(() => import('./pages/UploadLecture'));
const LecturePlayer = lazy(() => import('./pages/LecturePlayer'));
const Profile = lazy(() => import('./pages/Profile'));

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route wrapper (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4
};

function App() {
  return (
    <div className="App">
      <Helmet>
        <title>AI E-Learning Platform - Learn with AI-Powered Courses</title>
        <meta 
          name="description" 
          content="Experience the future of learning with our AI-powered e-learning platform. Create and access interactive courses with automated lecture generation." 
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <main className="min-h-screen">
          <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes */}
                <Route 
                  path="/" 
                  element={
                    <motion.div
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                    >
                      <BrowseCourses />
                    </motion.div>
                  } 
                />
                <Route 
                  path="/courses" 
                  element={
                    <motion.div
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                    >
                      <BrowseCourses />
                    </motion.div>
                  } 
                />
                <Route 
                  path="/course/:id" 
                  element={
                    <motion.div
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                    >
                      <CourseDetail />
                    </motion.div>
                  } 
                />
                
                {/* Authentication Routes */}
                <Route 
                  path="/login" 
                  element={
                    <PublicRoute>
                      <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                      >
                        <Login />
                      </motion.div>
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    <PublicRoute>
                      <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                      >
                        <Register />
                      </motion.div>
                    </PublicRoute>
                  } 
                />
                
                {/* Protected Routes */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                      >
                        <Dashboard />
                      </motion.div>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/my-courses" 
                  element={
                    <ProtectedRoute>
                      <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                      >
                        <Courses />
                      </motion.div>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/create-course" 
                  element={
                    <ProtectedRoute>
                      <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                      >
                        <CreateCourse />
                      </motion.div>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/upload-lecture/:courseId" 
                  element={
                    <ProtectedRoute>
                      <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                      >
                        <UploadLecture />
                      </motion.div>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/lecture/:id" 
                  element={
                    <ProtectedRoute>
                      <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                      >
                        <LecturePlayer />
                      </motion.div>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                      >
                        <Profile />
                      </motion.div>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Catch all route - 404 */}
                <Route 
                  path="*" 
                  element={
                    <motion.div
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="min-h-screen flex items-center justify-center bg-gray-50"
                    >
                      <div className="text-center">
                        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                        <p className="text-xl text-gray-600 mb-8">Oops! Page not found.</p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => window.history.back()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                          Go Back
                        </motion.button>
                      </div>
                    </motion.div>
                  } 
                />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;