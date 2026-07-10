import React from 'react';

const LoadingSpinner = ({ fullScreen = true, size = 'md', message = 'Loading...' }) => {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4',
    xl: 'w-24 h-24 border-4'
  };

  const sizeClass = sizes[size] || sizes.md;

  return (
    <div className={`loading-container ${fullScreen ? 'fullscreen' : 'inline'}`}>
      <div className="loading-content">
        <div className={`spinner ${sizeClass}`}></div>
        {message && <p className="loading-message">{message}</p>}
      </div>

      <style jsx>{`
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .loading-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          min-height: 100vh;
          z-index: 9999;
        }

        .loading-container.inline {
          min-height: auto;
          padding: 40px;
        }

        .loading-content {
          text-align: center;
        }

        /* Spinner Animation */
        .spinner {
          border-color: rgba(255, 107, 0, 0.15);
          border-top-color: #ff6b00;
          border-style: solid;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Loading Message */
        .loading-message {
          margin-top: 16px;
          font-size: 14px;
          color: #718096;
          font-weight: 500;
        }

        /* Optional: Add a subtle pulse effect to the container */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .loading-container {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
