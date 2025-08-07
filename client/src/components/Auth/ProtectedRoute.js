import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (roles.length > 0 && user) {
    const hasRequiredRole = roles.includes(user.role);
    
    if (!hasRequiredRole) {
      // User doesn't have required role
      return (
        <div className="access-denied">
          <div className="access-denied-content">
            <h2>Access Denied</h2>
            <p>You don't have permission to access this page.</p>
            <p>Required roles: {roles.join(', ')}</p>
            <p>Your role: {user.role}</p>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;