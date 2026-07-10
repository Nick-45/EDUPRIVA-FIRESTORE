import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firestore';

import { doc, getDoc } from 'firebase/firestore';

const navItems = [
  { path: 'overview', label: 'Live Overview', icon: 'dashboard' },
  { path: 'schools', label: 'Schools', icon: 'building' },
  { path: 'revenue', label: 'Revenue', icon: 'trending' },
  { path: 'wallet', label: 'Platform Wallet', icon: 'wallet' },
  { path: 'subscriptions', label: 'Subscriptions', icon: 'credit-card' },
  { path: 'audit', label: 'System Audit', icon: 'file-text' },
  { path: 'notifications', label: 'Notifications', icon: 'bell' },
  { path: 'overview', label: 'Realtime Dashboard', icon: 'tower-broadcast' },
  { path: 'alerts', label: 'Alerts', icon: 'alert' }
];

const Sidebar = ({ isMobileOpen, onClose, schoolCount = 0, alertCount = 0 }) => {
  const location = useLocation();
  const { user } = useAuth();

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

      // 🔥 1. USERS COLLECTION
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        fullName = userData.full_name;
        avatarUrl = userData.avatar_url;
        role = userData.role || role;
      }

      // 🔥 2. CHECK USER CONSENTS (fallback role)
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

      // 🔥 3. FALLBACK NAME FROM EMAIL
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
        return <svg width="18" height="18"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
      case 'building':
        return <svg width="18" height="18"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>;
      case 'trending':
        return <svg width="18" height="18"><path d="M23 6l-7.5 7.5-5-5L2 17"/></svg>;
      case 'wallet':
        return <svg width="18" height="18"><path d="M21 12V7H5"/></svg>;
      case 'credit-card':
        return <svg width="18" height="18"><rect x="1" y="4" width="22" height="16"/></svg>;
      case 'file-text':
        return <svg width="18" height="18"><path d="M13 2H6v20h12V9z"/></svg>;
      case 'bell':
        return <svg width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8"/></svg>;
      case 'tower-broadcast':
        return <svg width="18" height="18"><path d="M4 4a16 16 0 0 1 16 0"/></svg>;
      case 'alert':
        return <svg width="18" height="18"><path d="M12 3L2 21h20z"/></svg>;
      default:
        return null;
    }
  };

  const initials = getInitials(userProfile.full_name);
  const avatarColor = getAvatarColor(userProfile.full_name);

  if (loading) {
    return <aside className="sidebar"><div style={{ padding: 20 }}>Loading...</div></aside>;
  }

  return (
    <aside className={`sidebar ${isMobileOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-header">
        <div className="logo">Edu<span style={{ color: '#ff6b00' }}>Priva</span></div>
      </div>

      <nav>
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path}>
            {getIcon(item.icon)} {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>{initials}</div>
        <div>{userProfile.full_name}</div>
        <div>{userProfile.email}</div>
        <div>{userProfile.role}</div>
      </div>
    </aside>
  );
};

export default Sidebar;
