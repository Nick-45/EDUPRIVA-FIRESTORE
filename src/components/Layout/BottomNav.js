import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const BottomNav = ({ role }) => {
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Close more menu when location changes
  useEffect(() => {
    setShowMoreMenu(false);
  }, [location]);

  const getNavItems = () => {
    switch (role) {
      case 'parent':
        return [
          { path: '/parent', label: 'Home', icon: 'home' },
          { path: '/parent/payments', label: 'Payments', icon: 'wallet' },
          { path: '/parent/analytics', label: 'Analytics', icon: 'chart' },
          { path: '/parent/profile', label: 'Profile', icon: 'user' }
        ];
        
      case 'teacher':
        return [
          { path: '/teacher', label: 'Home', icon: 'home' },
          { path: '/teacher/students', label: 'Students', icon: 'users' },
          { path: '/teacher/assessments', label: 'Assessments', icon: 'book' },
          { path: '/teacher/profile', label: 'Profile', icon: 'user' }
        ];
        
      case 'student':
        return [
          { path: '/student', label: 'Home', icon: 'home' },
          { path: '/student/results', label: 'Results', icon: 'book' },
          { path: '/student/progress', label: 'Progress', icon: 'chart' },
          { path: '/student/profile', label: 'Profile', icon: 'user' }
        ];

      case 'accountant':
        return [
          { path: '/accountant', label: 'Home', icon: 'home' },
          { path: '/accountant/payments', label: 'Payments', icon: 'wallet' },
          { path: '/accountant/wallet', label: 'Wallet', icon: 'wallet' },
          { path: '/accountant/profile', label: 'Profile', icon: 'user' }
        ];
      
      default:
        return [
          { path: '/', label: 'Home', icon: 'home' },
          { path: '/settings', label: 'Settings', icon: 'settings' },
          { path: '/profile', label: 'Profile', icon: 'user' }
        ];
    }
  };

  const navItems = getNavItems();
  
  // For platform admin on desktop, hide bottom nav (sidebar handles navigation)
  const isPlatformAdmin = role === 'platform_admin';
  
  // Limit number of items for better mobile display
  const displayItems = isPlatformAdmin ? navItems.slice(0, 4) : navItems.slice(0, 4);
  const moreItems = navItems.slice(4);

  const getIconSvg = (iconName, isActive = false) => {
    const strokeWidth = isActive ? 2 : 1.8;
    const color = isActive ? '#ff6b00' : '#718096';
    
    switch (iconName) {
      case 'home':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-5v-7H9v7H5a2 2 0 0 1-2-2z"/>
          </svg>
        );
      case 'wallet':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
          </svg>
        );
      case 'chart':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2"/>
            <path d="M7 10l3-3 3 3 4-4"/>
            <path d="M17 10V4h-6"/>
          </svg>
        );
      case 'user':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        );
      case 'users':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        );
      case 'book':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        );
      case 'settings':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.9.9a1.65 1.65 0 0 0 1.38.45h9.03a1.65 1.65 0 0 0 1.38-.45z"/>
            <path d="M5.78 9a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.9.9a1.65 1.65 0 0 0 1.38.45h9.03a1.65 1.65 0 0 0 1.38-.45l.9-.9a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1z"/>
          </svg>
        );
      case 'building':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4v18"/>
            <path d="M19 21V11l-6-4"/>
            <path d="M9 9h1"/>
            <path d="M9 13h1"/>
            <path d="M9 17h1"/>
          </svg>
        );
      case 'trending':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 6l-7.5 7.5-5-5L2 17"/>
            <path d="M17 6h6v6"/>
          </svg>
        );
      case 'credit-card':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <path d="M1 10h22"/>
          </svg>
        );
      case 'bell':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        );
      case 'file':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13 2 13 9 20 9"/>
          </svg>
        );
      case 'menu':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="19" cy="12" r="1"/>
            <circle cx="5" cy="12" r="1"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="bottom-nav">
        <div className="bottom-nav-container">
          {displayItems.map((item, index) => {
            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) => 
                  `bottom-nav-link ${isActive ? 'active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    {getIconSvg(item.icon, isActive)}
                    <span className="bottom-nav-label">{item.label}</span>
                    {item.label === 'Alerts' && (
                      <span className="notification-dot"></span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
          
          {moreItems.length > 0 && (
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="bottom-nav-link"
            >
              {getIconSvg('menu')}
              <span className="bottom-nav-label">More</span>
            </button>
          )}
        </div>
      </div>

      {/* More Menu Drawer */}
      {showMoreMenu && moreItems.length > 0 && (
        <>
          <div className="more-menu-overlay" onClick={() => setShowMoreMenu(false)} />
          <div className="more-menu-drawer">
            <div className="more-menu-header">
              <h3 className="more-menu-title">More Options</h3>
              <button onClick={() => setShowMoreMenu(false)} className="more-menu-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="more-menu-items">
              {moreItems.map((item, index) => (
                <NavLink
                  key={index}
                  to={item.path}
                  className={({ isActive }) => 
                    `more-menu-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setShowMoreMenu(false)}
                >
                  {getIconSvg(item.icon)}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e2e8f0;
          z-index: 40;
          display: block;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
        }

        @media (min-width: 768px) {
          .bottom-nav {
            display: none;
          }
        }

        .bottom-nav-container {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 8px 12px;
          max-width: 500px;
          margin: 0 auto;
        }

        .bottom-nav-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
          cursor: pointer;
          background: none;
          border: none;
        }

        .bottom-nav-link.active {
          background: rgba(255, 107, 0, 0.1);
        }

        .bottom-nav-label {
          font-size: 10px;
          font-weight: 500;
          color: #718096;
          transition: color 0.2s;
        }

        .bottom-nav-link.active .bottom-nav-label {
          color: #ff6b00;
        }

        .notification-dot {
          position: absolute;
          top: 4px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        /* More Menu Styles */
        .more-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 45;
          animation: fadeIn 0.2s ease;
        }

        .more-menu-drawer {
          position: fixed;
          bottom: 70px;
          left: 16px;
          right: 16px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          z-index: 46;
          animation: slideUp 0.3s ease;
          overflow: hidden;
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

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .more-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .more-menu-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .more-menu-close {
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

        .more-menu-close:hover {
          background: #f7fafc;
          color: #1a202c;
        }

        .more-menu-items {
          padding: 8px;
        }

        .more-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          text-decoration: none;
          color: #4a5568;
          transition: all 0.2s;
          margin-bottom: 4px;
        }

        .more-menu-item:hover {
          background: #f7fafc;
        }

        .more-menu-item.active {
          background: rgba(255, 107, 0, 0.1);
          color: #ff6b00;
        }

        /* Safe area for iOS */
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
};

export default BottomNav;
