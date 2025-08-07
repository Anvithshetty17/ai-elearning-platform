import React from 'react';
import classNames from 'classnames';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  fullScreen = false,
  message = 'Loading...'
}) => {
  const spinnerClasses = classNames(
    'loading-spinner',
    `loading-spinner--${size}`,
    `loading-spinner--${color}`,
    {
      'loading-spinner--fullscreen': fullScreen
    }
  );

  const content = (
    <div className="loading-spinner-content">
      <div className="spinner" />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={spinnerClasses}>
        {content}
      </div>
    );
  }

  return <div className={spinnerClasses}>{content}</div>;
};

export default LoadingSpinner;