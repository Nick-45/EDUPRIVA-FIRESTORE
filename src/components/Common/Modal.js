import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, size = 'md', showCloseButton = true, closeOnBackdropClick = true }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Handle escape key
      const handleEsc = (e) => {
        if (e.key === 'Escape' && onClose) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    xl: 'modal-xl',
    full: 'modal-full'
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className={`modal-container ${sizeClasses[size]}`}>
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          {showCloseButton && (
            <button onClick={onClose} className="modal-close-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
        
        {/* Body */}
        <div className="modal-body">
          {children}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-container {
          background: white;
          border-radius: 20px;
          width: 90%;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        /* Size variants */
        .modal-sm {
          max-width: 400px;
        }

        .modal-md {
          max-width: 500px;
        }

        .modal-lg {
          max-width: 700px;
        }

        .modal-xl {
          max-width: 900px;
        }

        .modal-full {
          max-width: 95%;
          width: 1200px;
        }

        /* Header */
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #fafbfc;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .modal-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #718096;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .modal-close-btn:hover {
          background: #edf2f7;
          color: #ff6b00;
        }

        /* Body */
        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        /* Custom scrollbar for modal body */
        .modal-body::-webkit-scrollbar {
          width: 6px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: #edf2f7;
          border-radius: 3px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }

        .modal-body::-webkit-scrollbar-thumb:hover {
          background: #ff6b00;
        }

        /* Footer (if needed) */
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          background: #fafbfc;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .modal-container {
            width: 95%;
            max-height: 90vh;
          }

          .modal-header {
            padding: 16px 20px;
          }

          .modal-title {
            font-size: 16px;
          }

          .modal-body {
            padding: 20px;
          }

          .modal-sm,
          .modal-md,
          .modal-lg,
          .modal-xl {
            max-width: 95%;
          }
        }

        /* Mobile fullscreen option */
        @media (max-width: 640px) {
          .modal-container.mobile-full {
            width: 100%;
            max-width: 100%;
            height: 100%;
            max-height: 100%;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Modal Footer component for convenience
export const ModalFooter = ({ children, className = '' }) => {
  return (
    <div className={`modal-footer ${className}`}>
      {children}
      <style jsx>{`
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          background: #fafbfc;
        }

        @media (max-width: 640px) {
          .modal-footer {
            padding: 12px 20px;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default Modal;
