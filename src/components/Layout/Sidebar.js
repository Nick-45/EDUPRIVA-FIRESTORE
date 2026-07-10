import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LogOut, Menu, X } from 'lucide-react';

const navItems = [
  { path: 'overview', label: 'Live Overview', icon: 'dashboard' },
  { path: 'schools', label: 'Schools', icon: 'building' },
  { path: 'revenue', label: 'Revenue', icon: 'trending' },
  { path: 'wallet', label: 'Platform Wallet', icon: 'wallet' },
  { path: 'subscriptions', label: 'Subscriptions', icon: 'credit-card' },
  { path: 'audit', label: 'System Audit', icon: 'file-text' },
  { path: 'notifications', label: 'Notifications', icon: 'bell' },
  { path: 'live', label: 'Realtime Dashboard', icon: 'tower-broadcast' },
  { path: 'alerts', label: 'Alerts', icon: 'alert' }
];

const Sidebar = ({ isMobileOpen, onClose, schoolCount = 0, alertCount = 0 }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activePath, setActivePath] = useState(location.pathname);
  const [userProfile, setUserProfile] = useState({
    full_name: '',
    email: '',
    role: '',
    avatar_url: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location]);

  useEffect(() => {
    if (user?.uid) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      let fullName = '';
      let avatarUrl = null;
      let role = 'Platform Administrator';

      // 1. USERS COLLECTION
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        fullName = userData.full_name || userData.name || '';
        avatarUrl = userData.avatar_url || null;
        role = userData.role || role;
      }

      // 2. CHECK USER CONSENTS (fallback role)
      if (!fullName) {
        const consentRef = doc(db, 'user_consents', user.uid);
        const consentSnap = await getDoc(consentRef);

        if (consentSnap.exists()) {
          const consentData = consentSnap.data();

          if (consentData.school_id) {
            const schoolRef = doc(db, 'schools', consentData.school_id);
            const schoolSnap = await getDoc(schoolRef);

            if (schoolSnap.exists()) {
              const schoolData = schoolSnap.data();
              role = `School Admin - ${schoolData.name}`;
            }
          }
        }
      }

      // 3. FALLBACK NAME FROM EMAIL
      if (!fullName) {
        const userEmail = user.email;

        if (userEmail) {
          fullName = userEmail
            .split('@')[0]
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
        } else {
          fullName = 'Platform Admin';
        }
      }

      setUserProfile({
        full_name: fullName,
        email: user.email || '',
        role,
        avatar_url: avatarUrl
      });

    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile({
        full_name: 'Platform Admin',
        email: user?.email || '',
        role: 'Platform Administrator',
        avatar_url: null
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'PA';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#ff6b00', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
      '#06b6d4', '#f59e0b', '#ef4444', '#84cc16', '#6366f1'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'dashboard':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        );
      case 'building':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4v18"/>
            <path d="M19 21V11l-6-4"/>
            <path d="M9 9h1M9 13h1M9 17h1"/>
          </svg>
        );
      case 'trending':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M23 6l-7.5 7.5-5-5L2 17"/>
            <path d="M17 6h6v6"/>
          </svg>
        );
      case 'wallet':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
          </svg>
        );
      case 'credit-card':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <path d="M1 10h22"/>
          </svg>
        );
      case 'file-text':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13 2 13 9 20 9"/>
            <path d="M8 13h8M8 17h5"/>
          </svg>
        );
      case 'bell':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        );
      case 'tower-broadcast':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4a16 16 0 0 1 16 0"/>
            <path d="M8 8a8 8 0 0 1 8 0"/>
            <path d="M12 12v8"/>
            <path d="M12 20h.01"/>
            <circle cx="12" cy="16" r="1"/>
          </svg>
        );
      case 'alert':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 9v4M12 17h.01"/>
            <path d="M12 3L2 21h20L12 3z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const initials = getInitials(userProfile.full_name);
  const avatarColor = getAvatarColor(userProfile.full_name);

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <aside className={`sidebar ${isMobileOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <style jsx>{`
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px;
            background: #ffffff;
            border-right: 1px solid #e9ecef;
            z-index: 40;
            transition: transform 0.3s ease;
          }
          .sidebar-open { transform: translateX(0); }
          .sidebar-closed { transform: translateX(-100%); }
          @media (min-width: 768px) {
            .sidebar { transform: translateX(0); }
          }
        `}</style>
      </aside>
    );
  }

  return (
    <>
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Mobile Close Button */}
        <button className="mobile-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo">
            Edu<span style={{ color: '#ff6b00' }}>Priva</span>
          </div>
          <div className="logo-subtitle">Platform Admin</div>
        </div>

        {/* Live Indicator */}
        <div className="live-indicator">
          <div className="live-dot"></div>
          <span className="live-text">REALTIME CONNECTED</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Platform</div>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose?.()}
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <span className="nav-icon">{getIcon(item.icon)}</span>
                <span className="nav-label">{item.label}</span>
                {item.path === 'schools' && schoolCount > 0 && (
                  <span className="badge badge-schools">{schoolCount}</span>
                )}
                {item.path === 'alerts' && alertCount > 0 && (
                  <span className="badge badge-alert">{alertCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div 
              className="user-avatar"
              style={{ background: avatarColor }}
            >
              {userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.full_name} />
              ) : (
                initials
              )}
            </div>
            <div className="user-details">
              <div className="user-name" title={userProfile.full_name}>
                {userProfile.full_name}
              </div>
              <div className="user-email" title={userProfile.email}>
                {userProfile.email}
              </div>
              <div className="user-role">
                {userProfile.role}
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <style jsx>{`
        /* Overlay */
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 35;
        }
        @media (min-width: 768px) {
          .sidebar-overlay { display: none; }
        }

        /* Sidebar Container */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          background: #ffffff;
          border-right: 1px solid #e9ecef;
          z-index: 40;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
        }
        .sidebar-open { transform: translateX(0); }
        .sidebar-closed { transform: translateX(-100%); }
        @media (min-width: 768px) {
          .sidebar {
            position: sticky;
            transform: translateX(0);
            height: 100vh;
          }
        }

        /* Mobile Close Button */
        .mobile-close-btn {
          display: none;
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          color: #868e96;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .mobile-close-btn:hover {
          background: #f7fafc;
          color: #ff6b00;
        }
        @media (max-width: 768px) {
          .mobile-close-btn { display: block; }
        }

        /* Sidebar Header */
        .sidebar-header {
          padding: 20px 20px 16px;
          border-bottom: 1px solid #e9ecef;
        }
        .logo {
          font-size: 22px;
          font-weight: 700;
          color: #1a202c;
        }
        .logo-subtitle {
          font-size: 10px;
          color: #868e96;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Live Indicator */
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #f7fafc;
          border-bottom: 1px solid #e9ecef;
        }
        .live-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .live-text {
          font-size: 10px;
          font-weight: 600;
          color: #10b981;
          font-family: monospace;
          letter-spacing: 0.5px;
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 16px 12px;
        }
        .nav-section {
          margin-bottom: 20px;
        }
        .nav-section-title {
          font-size: 10px;
          font-weight: 600;
          color: #adb5bd;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          padding-left: 12px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          margin-bottom: 2px;
          text-decoration: none;
          transition: all 0.2s;
          color: #4a5568;
          font-size: 14px;
          font-weight: 500;
        }
        .nav-link:hover {
          background: #f7fafc;
          color: #1a202c;
        }
        .nav-link.active {
          background: #fff9f0;
          color: #ff6b00;
        }
        .nav-link.active .nav-icon {
          color: #ff6b00;
        }
        .nav-icon {
          color: #868e96;
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }
        .nav-link:hover .nav-icon {
          color: #ff6b00;
        }

        /* Badges */
        .badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
          margin-left: auto;
        }
        .badge-schools {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .badge-alert {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          animation: pulse 1.5s infinite;
        }

        /* Footer */
        .sidebar-footer {
          padding: 12px 16px;
          border-top: 1px solid #e9ecef;
          background: #fafbfc;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .user-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 12px;
          object-fit: cover;
        }
        .user-details {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: #1a202c;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-email {
          font-size: 11px;
          color: #868e96;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role {
          font-size: 10px;
          color: #ff6b00;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .logout-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #868e96;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logout-btn:hover {
          background: #fff5f5;
          color: #dc2626;
        }

        /* Scrollbar */
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-nav::-webkit-scrollbar-track {
          background: #f1f3f5;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: #dee2e6;
          border-radius: 4px;
        }
        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: #ff6b00;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
