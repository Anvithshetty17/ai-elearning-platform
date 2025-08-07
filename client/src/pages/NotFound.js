import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiArrowLeft } from 'react-icons/fi';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found">
      <div className="container">
        <div className="not-found-content">
          <div className="not-found-visual">
            <div className="error-code">404</div>
            <div className="error-illustration">
              <div className="floating-element element-1">🎓</div>
              <div className="floating-element element-2">📚</div>
              <div className="floating-element element-3">🖥️</div>
              <div className="floating-element element-4">✨</div>
            </div>
          </div>
          
          <div className="not-found-text">
            <h1 className="error-title">Page Not Found</h1>
            <p className="error-description">
              Oops! The page you're looking for doesn't exist. It might have been moved, 
              deleted, or you entered the wrong URL.
            </p>
            
            <div className="error-actions">
              <Link to="/" className="btn btn--primary">
                <FiHome /> Go Home
              </Link>
              <button 
                onClick={() => window.history.back()} 
                className="btn btn--outline"
              >
                <FiArrowLeft /> Go Back
              </button>
            </div>
            
            <div className="help-links">
              <h3>Looking for something specific?</h3>
              <ul>
                <li><Link to="/courses">Browse Courses</Link></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/profile">Profile</Link></li>
                <li><Link to="/help">Help Center</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;