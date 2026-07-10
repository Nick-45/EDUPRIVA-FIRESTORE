import React, { useState, useEffect, useMemo, useCallback, Component, useRef } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Overview from './Overview';
import Schools from './Schools';
import Revenue from './Revenue';
import Wallet from './Wallet';
import Subscriptions from './Subscriptions';
import Audit from './Audit';
import Notifications from './Notifications';
import Live from '../PlatformAdminLive/LiveDashboard';
import Sidebar from '../Layout/Sidebar';

// Font Awesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faBell,
  faSignOutAlt,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

// Custom Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <div className="error-content">
            <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
            <h2 className="error-title">Something went wrong</h2>
            <p className="error-message">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button 
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }} 
              className="error-button"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Dashboard Skeleton Component
const DashboardSkeleton = () => {
  return (
    <div className="skeleton-dashboard">
      <div className="skeleton-header"></div>
      <div className="skeleton-layout">
        <div className="skeleton-sidebar"></div>
        <div className="skeleton-main">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
      <style jsx>{`
        .skeleton-dashboard {
          min-height: 100vh;
          background: #f7fafc;
        }
        .skeleton-header {
          height: 64px;
          background: #ffffff;
          border-bottom: 2px solid #ff6b00;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .skeleton-layout {
          display: flex;
          padding-top: 64px;
        }
        .skeleton-sidebar {
          width: 280px;
          background: #ffffff;
          height: calc(100vh - 64px);
          animation: pulse 1.5s ease-in-out infinite;
        }
        .skeleton-main {
          flex: 1;
          padding: 24px;
          display: flex;
          gap: 24px;
        }
        .skeleton-card {
          flex: 1;
          background: #ffffff;
          border-radius: 12px;
          height: 300px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 768px) {
          .skeleton-sidebar {
            display: none;
          }
          .skeleton-main {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

const PlatformAdminDashboard = () => {
  const { userData, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  
  // Refs for realtime subscriptions (Firestore)
  const schoolsUnsubscribeRef = useRef(null);
  const paymentsUnsubscribeRef = useRef(null);
  const subscriptionsUnsubscribeRef = useRef(null);
  const auditUnsubscribeRef = useRef(null);
  const isMounted = useRef(true);

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const paymentsCollection = collection(db, 'payments');
  const subscriptionsCollection = collection(db, 'subscriptions');
  const auditLogsCollection = collection(db, 'audit_logs');

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Handle initial load and setup subscriptions
  useEffect(() => {
    if (userData) {
      const timer = setTimeout(() => setIsInitialLoad(false), 300);
      setupRealtimeSubscriptions();
      
      return () => {
        clearTimeout(timer);
        cleanupSubscriptions();
      };
    }
  }, [userData]);

  // Cleanup function for subscriptions
  const cleanupSubscriptions = () => {
    if (schoolsUnsubscribeRef.current) {
      schoolsUnsubscribeRef.current();
    }
    if (paymentsUnsubscribeRef.current) {
      paymentsUnsubscribeRef.current();
    }
    if (subscriptionsUnsubscribeRef.current) {
      subscriptionsUnsubscribeRef.current();
    }
    if (auditUnsubscribeRef.current) {
      auditUnsubscribeRef.current();
    }
  };

  // Setup realtime subscriptions using Firestore onSnapshot
  const setupRealtimeSubscriptions = () => {
    // Subscribe to schools changes
    const schoolsUnsubscribe = onSnapshot(schoolsCollection, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          const docData = change.doc.data();
          const action = change.type;
          const message = action === 'added' ? 'New school registered' :
                        action === 'modified' ? 'School information updated' :
                        'School removed';
          addNotification(message, 'school', { id: change.doc.id, ...docData });
        });
      }
    }, (error) => {
      console.error('Schools subscription error:', error);
    });
    schoolsUnsubscribeRef.current = schoolsUnsubscribe;

    // Subscribe to payments changes
    const paymentsQuery = query(
      paymentsCollection,
      orderBy('created_at', 'desc')
    );
    const paymentsUnsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const docData = change.doc.data();
            addNotification(
              `Payment received: KES ${docData.amount?.toLocaleString()}`,
              'payment',
              { id: change.doc.id, ...docData }
            );
          }
        });
      }
    }, (error) => {
      console.error('Payments subscription error:', error);
    });
    paymentsUnsubscribeRef.current = paymentsUnsubscribe;

    // Subscribe to subscription changes
    const subscriptionsUnsubscribe = onSnapshot(subscriptionsCollection, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'modified') {
            const docData = change.doc.data();
            if (docData.expiry_date) {
              const expiryDate = docData.expiry_date.toDate ? docData.expiry_date.toDate() : new Date(docData.expiry_date);
              const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 30 && daysLeft > 0) {
                addNotification(
                  `Subscription expiring in ${daysLeft} days`,
                  'warning',
                  { id: change.doc.id, ...docData }
                );
              }
            }
          }
        });
      }
    }, (error) => {
      console.error('Subscriptions subscription error:', error);
    });
    subscriptionsUnsubscribeRef.current = subscriptionsUnsubscribe;

    // Subscribe to audit logs
    const auditQuery = query(
      auditLogsCollection,
      orderBy('created_at', 'desc'),
      limit(10)
    );
    const auditUnsubscribe = onSnapshot(auditQuery, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const docData = change.doc.data();
            addNotification(
              `New activity: ${docData.action}`,
              'audit',
              { id: change.doc.id, ...docData }
            );
          }
        });
      }
    }, (error) => {
      console.error('Audit subscription error:', error);
    });
    auditUnsubscribeRef.current = auditUnsubscribe;
  };

  // Add notification
  const addNotification = (message, type, data) => {
    if (isMounted.current) {
      setNotifications(prev => {
        const newNotifications = [
          {
            id: Date.now(),
            message,
            type,
            data,
            timestamp: new Date(),
            read: false
          },
          ...prev
        ].slice(0, 50); // Keep last 50 notifications
        
        setHasNewNotifications(true);
        
        // Auto-hide new notification indicator after 5 seconds
        setTimeout(() => {
          if (isMounted.current) {
            setHasNewNotifications(false);
          }
        }, 5000);
        
        return newNotifications;
      });
    }
  };

  // Mark notifications as read
  const markNotificationsAsRead = () => {
    if (isMounted.current) {
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setHasNewNotifications(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.altKey && e.key === 'm') {
        setMobileMenuOpen(prev => !prev);
      }
      if (e.altKey && e.key === 'l') {
        handleLogout();
      }
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
      if (e.key === 'n' && e.ctrlKey) {
        markNotificationsAsRead();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [mobileMenuOpen]);

  const handleLogout = useCallback(async () => {
    cleanupSubscriptions();
    await logout();
    window.location.href = '/login';
  }, [logout]);

  if (isInitialLoad || !userData) return <DashboardSkeleton />;

  return (
    <div className="platform-dashboard">
      {/* Top Navigation */}
      <header className="top-nav">
        <div className="top-nav-container">
          <div className="flex items-center">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <FontAwesomeIcon icon={faBars} className="menu-icon" />
            </button>
            <h1 className="top-nav-title">Platform Admin</h1>
          </div>
          
          <div className="nav-buttons">
            <button 
              className={`nav-icon-btn ${hasNewNotifications ? 'has-notifications' : ''}`} 
              aria-label="Notifications"
              onClick={markNotificationsAsRead}
              title="Ctrl+N to mark all as read"
            >
              <FontAwesomeIcon icon={faBell} className="nav-icon" />
              {hasNewNotifications && <span className="notification-dot"></span>}
            </button>
            
            <div className="user-menu">
              <span className="user-email">{userData?.email || 'Admin'}</span>
              <button 
                onClick={handleLogout} 
                className="logout-btn"
                aria-label="Logout"
                title="Logout (Alt + L)"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="nav-icon" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <div className="notifications-panel">
            <div className="notifications-header">
              <span>Recent Notifications</span>
              <button onClick={markNotificationsAsRead} className="mark-read-btn">
                Mark all as read
              </button>
            </div>
            <div className="notifications-list">
              {notifications.slice(0, 5).map(notif => (
                <div key={notif.id} className={`notification-item ${notif.read ? 'read' : 'unread'}`}>
                  <div className="notification-message">{notif.message}</div>
                  <div className="notification-time">
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Sidebar + Main Content */}
      <div className="dashboard-layout">
        {/* Use the Sidebar component */}
        <Sidebar 
          isMobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="content-wrapper">
            <ErrorBoundary onReset={() => window.location.reload()}>
              <Routes>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<Overview />} />
                <Route path="schools" element={<Schools />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="subscriptions" element={<Subscriptions />} />
                <Route path="audit" element={<Audit />} />
                <Route path="notifications" element={<Notifications />} />
                <Route key="live" path="live/*" element={<Live />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <div className="bottom-nav-container">
          <NavLink to="overview" className="bottom-nav-link">
            <i className="fas fa-chart-line"></i>
            <span>Overview</span>
          </NavLink>
          <NavLink to="schools" className="bottom-nav-link">
            <i className="fas fa-school"></i>
            <span>Schools</span>
          </NavLink>
          <NavLink to="revenue" className="bottom-nav-link">
            <i className="fas fa-money-bill"></i>
            <span>Revenue</span>
          </NavLink>
          <NavLink to="wallet" className="bottom-nav-link">
            <i className="fas fa-wallet"></i>
            <span>Wallet</span>
          </NavLink>
          <NavLink to="live" className="bottom-nav-link">
            <i className="fas fa-signal"></i>
            <span>Live</span>
          </NavLink>
        </div>
      </nav>

      <style jsx>{`
        /* Dashboard Container */
        .platform-dashboard {
          min-height: 100vh;
          background: #f7fafc;
        }

        /* Top Navigation */
        .top-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          border-bottom: 2px solid #ff6b00;
          z-index: 50;
          height: 64px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .top-nav-container {
          height: 100%;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }

        .mobile-menu-btn {
          display: block;
          margin-right: 16px;
          color: #4a5568;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          font-size: 20px;
          transition: color 0.2s;
        }

        .mobile-menu-btn:hover {
          color: #ff6b00;
        }

        @media (min-width: 1024px) {
          .mobile-menu-btn {
            display: none;
          }
        }

        .menu-icon {
          font-size: 20px;
        }

        .top-nav-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .nav-buttons {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .nav-icon-btn {
          position: relative;
          color: #4a5568;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          transition: color 0.2s;
          font-size: 18px;
        }

        .nav-icon-btn:hover {
          color: #ff6b00;
        }

        .nav-icon-btn.has-notifications {
          color: #ff6b00;
        }

        .notification-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid #ffffff;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }

        .nav-icon {
          font-size: 18px;
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-email {
          color: #4a5568;
          font-size: 14px;
          display: none;
        }

        @media (min-width: 768px) {
          .user-email {
            display: block;
          }
        }

        .logout-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #4a5568;
          padding: 8px;
          transition: color 0.2s;
          font-size: 18px;
        }

        .logout-btn:hover {
          color: #dc2626;
        }

        /* Notifications Panel */
        .notifications-panel {
          position: absolute;
          top: 64px;
          right: 80px;
          width: 320px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          z-index: 60;
          max-height: 400px;
          overflow-y: auto;
        }

        .notifications-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
          color: #1a202c;
        }

        .mark-read-btn {
          font-size: 12px;
          color: #ff6b00;
          background: none;
          border: none;
          cursor: pointer;
        }

        .notifications-list {
          padding: 8px 0;
        }

        .notification-item {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          transition: background 0.2s;
        }

        .notification-item.unread {
          background: rgba(255, 107, 0, 0.05);
          border-left: 3px solid #ff6b00;
        }

        .notification-item:hover {
          background: #f7fafc;
        }

        .notification-message {
          font-size: 13px;
          color: #4a5568;
          margin-bottom: 4px;
        }

        .notification-time {
          font-size: 11px;
          color: #a0aec0;
        }

        /* Dashboard Layout */
        .dashboard-layout {
          display: flex;
          padding-top: 64px;
          min-height: 100vh;
        }

        /* Main Content */
        .dashboard-main {
          flex: 1;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
          background: #f7fafc;
          min-height: calc(100vh - 64px);
        }

        @media (min-width: 768px) {
          .dashboard-main {
            margin-left: 0;
            width: 100%;
          }
        }

        /* Content wrapper */
        .content-wrapper {
          padding: 24px;
          padding-left: 0;
          height: 100%;
        }

        /* Bottom Navigation */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          z-index: 40;
          display: block;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
        }

        @media (min-width: 1024px) {
          .bottom-nav {
            display: none;
          }
        }

        .bottom-nav-container {
          display: flex;
          justify-content: space-around;
          padding: 8px 16px;
        }

        .bottom-nav-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          border-radius: 8px;
          color: #718096;
          text-decoration: none;
          transition: all 0.2s;
          font-size: 12px;
        }

        .bottom-nav-link:hover {
          color: #ff6b00;
          transform: translateY(-2px);
        }

        .bottom-nav-link.active {
          color: #ff6b00;
        }

        .bottom-nav-icon {
          font-size: 20px;
        }

        .bottom-nav-label {
          font-size: 11px;
          font-weight: 500;
        }

        /* Error styles */
        .error-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: 24px;
        }

        .error-content {
          text-align: center;
          max-width: 400px;
        }

        .error-icon {
          font-size: 48px;
          color: #dc2626;
          margin-bottom: 16px;
        }

        .error-title {
          font-size: 24px;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 12px;
        }

        .error-message {
          color: #718096;
          margin-bottom: 24px;
        }

        .error-button {
          background: #ff6b00;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .error-button:hover {
          background: #e65c00;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-track {
          background: #edf2f7;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
          transition: background 0.2s;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #ff6b00;
        }

        /* Flex utilities */
        .flex {
          display: flex;
        }

        .items-center {
          align-items: center;
        }

        /* Focus styles */
        button:focus-visible,
        .bottom-nav-link:focus-visible {
          outline: 2px solid #ff6b00;
          outline-offset: 2px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .content-wrapper {
            padding: 16px;
            padding-left: 16px;
            padding-bottom: 80px;
          }
          
          .notifications-panel {
            right: 16px;
            left: 16px;
            width: auto;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PlatformAdminDashboard;
