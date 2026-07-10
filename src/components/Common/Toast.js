import React, { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose, duration = 4000, position = 'bottom-right' }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 9v4M12 17h.01"/>
            <path d="M12 3L2 21h20L12 3z"/>
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
        );
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: '#10b981',
          border: '#10b981',
          icon: '#10b981'
        };
      case 'error':
        return {
          bg: '#ef4444',
          border: '#ef4444',
          icon: '#ef4444'
        };
      case 'warning':
        return {
          bg: '#f59e0b',
          border: '#f59e0b',
          icon: '#f59e0b'
        };
      default:
        return {
          bg: '#3b82f6',
          border: '#3b82f6',
          icon: '#3b82f6'
        };
    }
  };

  const getPositionClass = () => {
    switch (position) {
      case 'top-left':
        return { top: '20px', left: '20px', right: 'auto', bottom: 'auto' };
      case 'top-right':
        return { top: '20px', right: '20px', left: 'auto', bottom: 'auto' };
      case 'top-center':
        return { top: '20px', left: '50%', right: 'auto', bottom: 'auto', transform: 'translateX(-50%)' };
      case 'bottom-left':
        return { bottom: '20px', left: '20px', right: 'auto', top: 'auto' };
      case 'bottom-center':
        return { bottom: '20px', left: '50%', right: 'auto', top: 'auto', transform: 'translateX(-50%)' };
      default:
        return { bottom: '20px', right: '20px', left: 'auto', top: 'auto' };
    }
  };

  const colors = getColors();
  const positionStyle = getPositionClass();

  return (
    <div className="toast-container" style={positionStyle}>
      <div className={`toast toast-${type}`}>
        <div className="toast-icon" style={{ color: colors.icon }}>
          {getIcon()}
        </div>
        <div className="toast-content">
          <span className="toast-message">{message}</span>
        </div>
        <button onClick={onClose} className="toast-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .toast-container {
          position: fixed;
          z-index: 9999;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100px);
          }
        }

        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
          border-left: 4px solid ${colors.border};
          min-width: 280px;
          max-width: 420px;
          backdrop-filter: blur(10px);
        }

        .toast-success {
          border-left-color: #10b981;
        }

        .toast-error {
          border-left-color: #ef4444;
        }

        .toast-warning {
          border-left-color: #f59e0b;
        }

        .toast-info {
          border-left-color: #3b82f6;
        }

        .toast-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toast-content {
          flex: 1;
        }

        .toast-message {
          font-size: 14px;
          color: #1a202c;
          line-height: 1.4;
        }

        .toast-close {
          flex-shrink: 0;
          background: none;
          border: none;
          cursor: pointer;
          color: #a0aec0;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .toast-close:hover {
          background: #f7fafc;
          color: #1a202c;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .toast {
            min-width: 260px;
            max-width: calc(100vw - 40px);
            padding: 10px 14px;
          }

          .toast-message {
            font-size: 13px;
          }
        }

        /* Stacked toasts */
        .toast-container:not(:first-child) {
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
};

// Toast container for managing multiple toasts
export const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container-wrapper">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration}
          position={toast.position}
        />
      ))}
      <style jsx>{`
        .toast-container-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 9999;
        }
      `}</style>
    </div>
  );
};

export default Toast;
