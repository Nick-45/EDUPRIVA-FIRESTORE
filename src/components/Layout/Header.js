import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ title, subtitle, showVoice = false, onMenuClick }) => {
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <button className="menu-btn" onClick={onMenuClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        )}
        
        {/* Title Section */}
        <div className="header-title">
          <h1 className="title">{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        
        {/* Action Buttons */}
        <div className="header-actions">
          {showVoice && (
            <button className="action-btn voice-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <path d="M12 19v4M8 23h8"/>
              </svg>
            </button>
          )}
          
          <button className="action-btn logout-btn" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #ff6b00 0%, #e55a00 100%);
          color: white;
          z-index: 45;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          padding: 48px 20px 16px 20px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        @media (min-width: 768px) {
          .header-content {
            padding: 20px 24px;
            align-items: center;
          }
        }

        /* Menu Button (Mobile) */
        .menu-btn {
          display: none;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 12px;
          padding: 8px;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .menu-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.02);
        }

        @media (max-width: 768px) {
          .menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        /* Title Section */
        .header-title {
          flex: 1;
        }

        .title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 4px 0;
          letter-spacing: -0.3px;
        }

        .subtitle {
          font-size: 12px;
          opacity: 0.9;
          margin: 0;
        }

        @media (min-width: 768px) {
          .title {
            font-size: 24px;
          }
          
          .subtitle {
            font-size: 13px;
          }
        }

        /* Action Buttons */
        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .action-btn {
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.02);
        }

        @media (min-width: 768px) {
          .action-btn {
            width: 40px;
            height: 40px;
            border-radius: 14px;
          }
        }

        /* Voice button specific */
        .voice-btn {
          position: relative;
        }

        .voice-btn::after {
          content: '';
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
