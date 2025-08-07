import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiPlay, FiBook, FiUsers, FiArrowRight, FiCheck } from 'react-icons/fi';
import './Home.css';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  const features = [
    {
      icon: <FiPlay />,
      title: 'AI-Powered Video Generation',
      description: 'Transform your text content into engaging video lectures with AI voices and animations.'
    },
    {
      icon: <FiBook />,
      title: 'Course Management',
      description: 'Create, organize, and manage your courses with our intuitive course builder.'
    },
    {
      icon: <FiUsers />,
      title: 'Student Engagement',
      description: 'Track student progress, provide feedback, and build learning communities.'
    }
  ];

  const benefits = [
    'Convert text to professional video lectures',
    'Multiple AI voices and languages',
    'Responsive video player with progress tracking',
    'Cloud storage and delivery',
    'Analytics and student insights',
    'Mobile-friendly platform'
  ];

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Create Amazing
                <span className="hero-highlight"> AI Video Lectures</span>
                <br />
                From Your Text Content
              </h1>
              <p className="hero-description">
                Transform your educational content into engaging video lectures with our AI-powered platform. 
                Generate professional videos with synthetic voices, animations, and interactive elements.
              </p>
              
              <div className="hero-actions">
                {isAuthenticated ? (
                  <Link to="/dashboard" className="btn btn--primary btn--large">
                    Go to Dashboard <FiArrowRight />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="btn btn--primary btn--large">
                      Get Started Free <FiArrowRight />
                    </Link>
                    <Link to="/courses" className="btn btn--outline btn--large">
                      Browse Courses
                    </Link>
                  </>
                )}
              </div>
              
              <div className="hero-stats">
                <div className="stat">
                  <span className="stat-number">500+</span>
                  <span className="stat-label">Courses Created</span>
                </div>
                <div className="stat">
                  <span className="stat-number">10K+</span>
                  <span className="stat-label">Students Enrolled</span>
                </div>
                <div className="stat">
                  <span className="stat-number">50+</span>
                  <span className="stat-label">Languages Supported</span>
                </div>
              </div>
            </div>
            
            <div className="hero-visual">
              <div className="hero-card">
                <div className="hero-card-header">
                  <div className="card-controls">
                    <span className="control red"></span>
                    <span className="control yellow"></span>
                    <span className="control green"></span>
                  </div>
                  <span className="card-title">AI Lecture Generator</span>
                </div>
                <div className="hero-card-content">
                  <div className="demo-input">
                    <label>Text Content:</label>
                    <div className="demo-text">
                      "Welcome to Introduction to Machine Learning..."
                    </div>
                  </div>
                  <div className="demo-arrow">↓</div>
                  <div className="demo-output">
                    <div className="video-preview">
                      <div className="video-thumbnail">
                        <FiPlay className="play-icon" />
                      </div>
                      <span>Generated Video Lecture</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Powerful Features for Modern Education</h2>
            <p className="section-description">
              Everything you need to create, manage, and deliver exceptional online learning experiences.
            </p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <div className="container">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2 className="benefits-title">Why Choose Our Platform?</h2>
              <p className="benefits-description">
                Our AI-powered platform makes it easy to create professional video lectures 
                without any technical expertise or expensive equipment.
              </p>
              
              <ul className="benefits-list">
                {benefits.map((benefit, index) => (
                  <li key={index} className="benefit-item">
                    <FiCheck className="check-icon" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              
              {!isAuthenticated && (
                <div className="benefits-action">
                  <Link to="/register" className="btn btn--primary">
                    Start Creating Today <FiArrowRight />
                  </Link>
                </div>
              )}
            </div>
            
            <div className="benefits-visual">
              <div className="process-steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Upload Text</h4>
                    <p>Paste or upload your lecture content</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Choose AI Voice</h4>
                    <p>Select from multiple voices and languages</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Generate Video</h4>
                    <p>AI creates your professional video lecture</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Share & Teach</h4>
                    <p>Publish and track student progress</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Teaching?</h2>
            <p className="cta-description">
              Join thousands of educators who are already using AI to create better learning experiences.
            </p>
            
            <div className="cta-actions">
              {isAuthenticated ? (
                user?.role === 'professor' ? (
                  <Link to="/create-course" className="btn btn--primary btn--large">
                    Create Your First Course <FiArrowRight />
                  </Link>
                ) : (
                  <Link to="/courses" className="btn btn--primary btn--large">
                    Explore Courses <FiArrowRight />
                  </Link>
                )
              ) : (
                <>
                  <Link to="/register" className="btn btn--primary btn--large">
                    Get Started Free
                  </Link>
                  <Link to="/login" className="btn btn--outline btn--large">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;