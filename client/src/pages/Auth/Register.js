import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus } from 'react-icons/fi';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './Auth.css';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      const result = await registerUser(data);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError('root', { message: result.message });
      }
    } catch (error) {
      setError('root', { message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join AI E-Learning and start your journey</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {errors.root && (
              <div className="error-banner">
                {errors.root.message}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                <FiUser className="label-icon" />
                Full Name
              </label>
              <input
                type="text"
                className={`form-input ${errors.fullName ? 'form-input--error' : ''}`}
                placeholder="Enter your full name"
                {...register('fullName', {
                  required: 'Full name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters'
                  }
                })}
              />
              {errors.fullName && (
                <span className="form-error">{errors.fullName.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiMail className="label-icon" />
                Email Address
              </label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                placeholder="Enter your email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                    message: 'Please enter a valid email address'
                  }
                })}
              />
              {errors.email && (
                <span className="form-error">{errors.email.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiLock className="label-icon" />
                Password
              </label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  placeholder="Create a password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && (
                <span className="form-error">{errors.password.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiLock className="label-icon" />
                Confirm Password
              </label>
              <input
                type="password"
                className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
                placeholder="Confirm your password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value =>
                    value === password || 'Passwords do not match'
                })}
              />
              {errors.confirmPassword && (
                <span className="form-error">{errors.confirmPassword.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Account Type</label>
              <div className="role-selection">
                <label className="role-option">
                  <input
                    type="radio"
                    value="student"
                    {...register('role', { required: 'Please select account type' })}
                  />
                  <div className="role-card">
                    <h4>Student</h4>
                    <p>Learn from AI-generated courses</p>
                  </div>
                </label>
                <label className="role-option">
                  <input
                    type="radio"
                    value="professor"
                    {...register('role', { required: 'Please select account type' })}
                  />
                  <div className="role-card">
                    <h4>Professor</h4>
                    <p>Create and manage courses</p>
                  </div>
                </label>
              </div>
              {errors.role && (
                <span className="form-error">{errors.role.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  {...register('acceptTerms', {
                    required: 'You must accept the terms and conditions'
                  })}
                />
                <span>
                  I agree to the{' '}
                  <Link to="/terms" className="auth-link">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="auth-link">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.acceptTerms && (
                <span className="form-error">{errors.acceptTerms.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn--primary btn--full"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" />
                  Creating Account...
                </>
              ) : (
                <>
                  <FiUserPlus />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;