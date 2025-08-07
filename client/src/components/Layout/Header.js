import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiX, FiUser, FiBookOpen, FiPlusCircle, FiSettings, FiLogOut } from 'react-icons/fi';
import './Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isAuthenticated, isProfessor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo */}
        <Link to="/" className="logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">AI E-Learning</span>
        </Link>

        {/* Navigation */}
        <nav className={`nav ${isMenuOpen ? 'nav--open' : ''}`}>
          <ul className="nav-list">
            <li className="nav-item">
              <Link 
                to="/" 
                className={`nav-link ${isActive('/') ? 'nav-link--active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/courses" 
                className={`nav-link ${isActive('/courses') ? 'nav-link--active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Courses
              </Link>
            </li>

            {isAuthenticated && (
              <>
                <li className="nav-item">
                  <Link 
                    to="/dashboard" 
                    className={`nav-link ${isActive('/dashboard') ? 'nav-link--active' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                </li>

                {isProfessor() && (
                  <>
                    <li className="nav-item">
                      <Link 
                        to="/my-courses" 
                        className={`nav-link ${isActive('/my-courses') ? 'nav-link--active' : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <FiBookOpen /> My Courses
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link 
                        to="/create-course" 
                        className={`nav-link ${isActive('/create-course') ? 'nav-link--active' : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <FiPlusCircle /> Create Course
                      </Link>
                    </li>
                  </>
                )}
              </>
            )}
          </ul>
        </nav>

        {/* User Menu */}
        <div className="header-actions">
          {isAuthenticated ? (
            <div className="user-menu">
              <button className="user-menu-button" onClick={toggleMenu}>
                <div className="user-avatar">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.fullName} />
                  ) : (
                    <FiUser />
                  )}
                </div>
                <span className="user-name">{user?.fullName}</span>
              </button>

              {isMenuOpen && (
                <div className="user-menu-dropdown">
                  <Link 
                    to="/profile" 
                    className="dropdown-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <FiUser /> Profile
                  </Link>
                  <Link 
                    to="/settings" 
                    className="dropdown-item"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <FiSettings /> Settings
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="dropdown-item dropdown-item--logout"
                  >
                    <FiLogOut /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn--outline">
                Login
              </Link>
              <Link to="/register" className="btn btn--primary">
                Register
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={toggleMenu}
            aria-label="Toggle mobile menu"
          >
            {isMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;