import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from 'react-query';
import { FiBook, FiUsers, FiPlay, FiTrendingUp, FiCalendar, FiPlus } from 'react-icons/fi';
import courseService from '../../services/courseService';
import enrollmentService from '../../services/enrollmentService';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isProfessor, isStudent } = useAuth();
  
  // Fetch data based on user role
  const { data: coursesData, isLoading: coursesLoading } = useQuery(
    ['dashboard-courses'],
    () => isProfessor() ? courseService.getMyCourses() : enrollmentService.getMyEnrollments(),
    { enabled: !!user }
  );

  const getDashboardStats = () => {
    if (!coursesData?.data) return { total: 0, active: 0, completed: 0 };
    
    if (isProfessor()) {
      const courses = coursesData.data;
      return {
        total: courses.length,
        active: courses.filter(c => c.isPublished).length,
        drafts: courses.filter(c => !c.isPublished).length
      };
    } else {
      const enrollments = coursesData.data;
      return {
        total: enrollments.length,
        active: enrollments.filter(e => e.status === 'active').length,
        completed: enrollments.filter(e => e.status === 'completed').length
      };
    }
  };

  const getRecentActivity = () => {
    if (!coursesData?.data) return [];
    
    if (isProfessor()) {
      return coursesData.data
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5);
    } else {
      return coursesData.data
        .sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt))
        .slice(0, 5);
    }
  };

  const stats = getDashboardStats();
  const recentActivity = getRecentActivity();

  if (coursesLoading) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  return (
    <div className="dashboard">
      <div className="container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Welcome back, {user?.fullName}!</h1>
            <p className="welcome-text">
              {isProfessor() 
                ? "Ready to create some amazing courses?"
                : "Continue your learning journey"
              }
            </p>
          </div>
          
          <div className="quick-actions">
            {isProfessor() ? (
              <>
                <Link to="/create-course" className="btn btn--primary">
                  <FiPlus /> Create Course
                </Link>
                <Link to="/my-courses" className="btn btn--outline">
                  <FiBook /> My Courses
                </Link>
              </>
            ) : (
              <>
                <Link to="/courses" className="btn btn--primary">
                  <FiBook /> Browse Courses
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          {isProfessor() ? (
            <>
              <div className="stat-card">
                <div className="stat-icon">
                  <FiBook />
                </div>
                <div className="stat-content">
                  <h3>{stats.total}</h3>
                  <p>Total Courses</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FiPlay />
                </div>
                <div className="stat-content">
                  <h3>{stats.active}</h3>
                  <p>Published Courses</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FiTrendingUp />
                </div>
                <div className="stat-content">
                  <h3>{stats.drafts}</h3>
                  <p>Draft Courses</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="stat-card">
                <div className="stat-icon">
                  <FiBook />
                </div>
                <div className="stat-content">
                  <h3>{stats.total}</h3>
                  <p>Enrolled Courses</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FiPlay />
                </div>
                <div className="stat-content">
                  <h3>{stats.active}</h3>
                  <p>In Progress</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <FiTrendingUp />
                </div>
                <div className="stat-content">
                  <h3>{stats.completed}</h3>
                  <p>Completed</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main Content */}
        <div className="dashboard-content">
          {/* Recent Activity */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                {isProfessor() ? 'Recent Courses' : 'Recent Enrollments'}
              </h2>
              <Link 
                to={isProfessor() ? '/my-courses' : '/dashboard'} 
                className="view-all-link"
              >
                View All
              </Link>
            </div>
            
            <div className="activity-list">
              {recentActivity.length > 0 ? (
                recentActivity.map((item, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      <FiBook />
                    </div>
                    
                    <div className="activity-content">
                      {isProfessor() ? (
                        <>
                          <h4>{item.title}</h4>
                          <p className="activity-meta">
                            {item.isPublished ? 'Published' : 'Draft'} • 
                            {item.category} • 
                            {item.enrollmentCount} students
                          </p>
                          <div className="activity-actions">
                            <Link 
                              to={`/edit-course/${item._id}`}
                              className="btn btn--small btn--outline"
                            >
                              Edit Course
                            </Link>
                          </div>
                        </>
                      ) : (
                        <>
                          <h4>{item.course?.title}</h4>
                          <p className="activity-meta">
                            Progress: {item.progress?.overallProgress || 0}% • 
                            Status: {item.status}
                          </p>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${item.progress?.overallProgress || 0}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="activity-date">
                      <FiCalendar />
                      <span>
                        {new Date(
                          isProfessor() ? item.updatedAt : item.enrolledAt
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <FiBook className="empty-icon" />
                  <h3>
                    {isProfessor() 
                      ? 'No courses created yet' 
                      : 'No courses enrolled yet'
                    }
                  </h3>
                  <p>
                    {isProfessor() 
                      ? 'Create your first course to get started'
                      : 'Browse and enroll in courses to begin learning'
                    }
                  </p>
                  <Link 
                    to={isProfessor() ? '/create-course' : '/courses'}
                    className="btn btn--primary mt-4"
                  >
                    {isProfessor() ? 'Create Course' : 'Browse Courses'}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="dashboard-sidebar">
            <div className="sidebar-section">
              <h3>Quick Links</h3>
              <div className="quick-links">
                <Link to="/profile" className="quick-link">
                  <FiUsers />
                  <span>Edit Profile</span>
                </Link>
                
                <Link to="/settings" className="quick-link">
                  <FiTrendingUp />
                  <span>Settings</span>
                </Link>
                
                {isProfessor() && (
                  <Link to="/upload-lecture" className="quick-link">
                    <FiPlus />
                    <span>Add Lecture</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="sidebar-section">
              <h3>Getting Started</h3>
              <div className="tips-list">
                {isProfessor() ? (
                  <>
                    <div className="tip-item">
                      <p>Create your first course with our AI-powered tools</p>
                    </div>
                    <div className="tip-item">
                      <p>Upload text content and let AI generate video lectures</p>
                    </div>
                    <div className="tip-item">
                      <p>Track student progress and engagement</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="tip-item">
                      <p>Explore courses in your areas of interest</p>
                    </div>
                    <div className="tip-item">
                      <p>Track your learning progress</p>
                    </div>
                    <div className="tip-item">
                      <p>Complete courses to earn certificates</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;