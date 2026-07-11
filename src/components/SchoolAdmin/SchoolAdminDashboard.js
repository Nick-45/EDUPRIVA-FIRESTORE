import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import DashboardOverview from './DashboardOverview';
import FinanceModule from './FinanceModule';
import AcademicsModule from './AcademicsModule';
import StudentsModule from './StudentsModule';
import AIAssistant from './AIAssistant';
import ReportsModule from './ReportsModule';
import AuditLogs from './AuditLogs';
import SettingsModule from './SettingsModule';
import PaymentModal from './modals/PaymentModal';
import WithdrawModal from './modals/WithdrawModal';
import EditRemarkModal from './modals/EditRemarkModal';
import NotificationModal from './modals/NotificationModal';
import SchoolProfileModal from './modals/SchoolProfileModal';
import ConsentModal from './modals/ConsentModal';
import LoadingSpinner from '../Common/LoadingSpinner';
import Toast from '../Common/Toast';
import PayrollModule from './PayrollModule';
import {
  LayoutDashboard, Wallet, GraduationCap, Users,
  Bot, FileText, History, Settings, Menu, X,
  Bell, LogOut, Home, CreditCard, BookOpen, UserPlus, MoreHorizontal, DollarSign
} from 'lucide-react';

const SchoolAdminDashboard = () => {
  // UI State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Data State
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Loading States
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  
  // Consent State
  const [hasConsent, setHasConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  
  // Modal State
  const [modals, setModals] = useState({
    payment: false,
    withdraw: false,
    editRemark: false,
    notifications: false,
    schoolProfile: false,
  });
  const [selectedRemark, setSelectedRemark] = useState(null);
  
  // Refs for cleanup and mount tracking
  const isMounted = useRef(true);
  const unsubscribeRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData, schoolId, logout } = useAuth();

  // Collection references
  const userConsentsCollection = collection(db, 'user_consents');
  const schoolsCollection = collection(db, 'schools');
  const auditLogsCollection = collection(db, 'audit_logs');
  const paymentsCollection = collection(db, 'payments');

  // ============================================
  // 1. Cleanup on unmount
  // ============================================
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // ============================================
  // 2. Check consent on load
  // ============================================
  useEffect(() => {
    if (user) {
      checkUserConsent();
    } else if (!user && isMounted.current) {
      setIsInitializing(false);
    }
  }, [user]);

  const checkUserConsent = async () => {
    if (!user || !isMounted.current) return;

    try {
      const q = query(
        userConsentsCollection,
       where('user_id', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      
      if (!isMounted.current) return;
      
      if (!snapshot.empty) {
        const consentData = snapshot.docs[0].data();
        setHasConsent(true);
        await initializeDashboardData();
      } else {
        setShowConsentModal(true);
        setIsInitializing(false);
      }
    } catch (error) {
      console.error('Error checking consent:', error);
      if (isMounted.current) {
        setShowConsentModal(true);
        setIsInitializing(false);
      }
    }
  };

  // ============================================
  // 3. Initialize dashboard data
  // ============================================
  const initializeDashboardData = async () => {
    await Promise.all([
      fetchSchoolProfile(),
      fetchNotifications()
    ]);
    
    setupRealtimeSubscriptions();
    
    if (isMounted.current) {
      setIsInitializing(false);
    }
  };

  // ============================================
  // 4. Handle consent submission
  // ============================================
  const handleConsent = async (consentData) => {
    if (!user || !schoolId || !isMounted.current) return;

    try {
      const currentUser = auth.currentUser;
      const consentDoc = {
        user_id: user.uid,
        school_id: schoolId,
        terms_accepted: consentData.terms_accepted,
        data_processing_accepted: consentData.data_processing_accepted,
        communications_accepted: consentData.communications_accepted,
        consent_date: new Date(),
        ip_address: consentData.ip_address || 'client-side',
        user_agent: consentData.user_agent || navigator.userAgent,
        created_at: new Date()
      };

      await addDoc(userConsentsCollection, consentDoc);
      
      if (isMounted.current) {
        setHasConsent(true);
        setShowConsentModal(false);
        await initializeDashboardData();
        showToast('Thank you for providing your consent', 'success');
      }
    } catch (error) {
      console.error('Error saving consent:', error);
      if (isMounted.current) {
        showToast(error.message || 'Failed to save consent. Please try again.', 'error');
      }
    }
  };

  // ============================================
  // 5. Fetch school profile
  // ============================================
  const fetchSchoolProfile = async () => {
    if (!schoolId || !isMounted.current) return;

    setIsProfileLoading(true);
    
    try {
      const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
      
      if (isMounted.current && schoolDoc.exists()) {
        setSchoolProfile({ id: schoolDoc.id, ...schoolDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching school profile:', error);
      if (isMounted.current) {
        showToast('Failed to load school profile', 'error');
      }
    } finally {
      if (isMounted.current) {
        setIsProfileLoading(false);
      }
    }
  };

  // ============================================
  // 6. Fetch notifications
  // ============================================
  const fetchNotifications = async () => {
    if (!schoolId || !isMounted.current) return;

    setIsNotificationsLoading(true);
    
    try {
      const q = query(
        auditLogsCollection,
        where('school_id', '==', schoolId),
        orderBy('created_at', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (isMounted.current) {
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (isMounted.current) {
        setIsNotificationsLoading(false);
      }
    }
  };

  // ============================================
  // 7. Setup realtime subscriptions
  // ============================================
  const setupRealtimeSubscriptions = () => {
    if (!schoolId) return;

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to audit logs
    const auditQuery = query(
      auditLogsCollection,
      where('school_id', '==', schoolId),
      orderBy('created_at', 'desc')
    );
    
    const unsubscribe = onSnapshot(auditQuery, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newLog = { id: change.doc.id, ...change.doc.data() };
            setNotifications(prev => [newLog, ...prev].slice(0, 10));
            showToast('New activity detected', 'info');
          }
        });
      }
    }, (error) => {
      console.error('Audit subscription error:', error);
    });

    // Subscribe to payments
    const paymentsQuery = query(
      paymentsCollection,
      where('school_id', '==', schoolId),
      orderBy('created_at', 'desc')
    );
    
    const paymentsUnsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newPayment = { id: change.doc.id, ...change.doc.data() };
            showToast(`Payment received: KES ${newPayment.amount?.toLocaleString()}`, 'success');
            fetchSchoolProfile();
          }
        });
      }
    }, (error) => {
      console.error('Payment subscription error:', error);
    });

    // Store both unsubscribe functions
    unsubscribeRef.current = () => {
      unsubscribe();
      paymentsUnsubscribe();
    };
  };

  // ============================================
  // 8. Toast notification helper
  // ============================================
  const showToast = useCallback((message, type = 'success') => {
    if (!isMounted.current) return;
    setToast({ message, type });
    setTimeout(() => {
      if (isMounted.current) {
        setToast(null);
      }
    }, 3000);
  }, []);

  // ============================================
  // 9. Navigation items
  // ============================================
  const navItems = [
    { path: '/school-admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/school-admin/finance', label: 'Finance', icon: <Wallet size={18} /> },
    { path: '/school-admin/academics', label: 'Academics (CBC)', icon: <GraduationCap size={18} /> },
    { path: '/school-admin/students', label: 'Students', icon: <Users size={18} /> },
    { path: '/school-admin/ai-assistant', label: 'AI Assistant', icon: <Bot size={18} /> },
    { path: '/school-admin/reports', label: 'Reports', icon: <FileText size={18} /> },
    { path: '/school-admin/payroll', label: 'Payroll', icon: <DollarSign size={18} /> },
    { path: '/school-admin/audit-logs', label: 'Audit Logs', icon: <History size={18} /> },
    { path: '/school-admin/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const mobileNavItems = [
    { path: '/school-admin', label: 'Home', icon: <Home size={20} /> },
    { path: '/school-admin/finance', label: 'Finance', icon: <CreditCard size={20} /> },
    { path: '/school-admin/academics', label: 'Academics', icon: <BookOpen size={20} /> },
    { path: '/school-admin/students', label: 'Students', icon: <UserPlus size={20} /> },
    { path: 'menu', label: 'More', icon: <MoreHorizontal size={20} />, isMenu: true },
  ];

  // ============================================
  // 10. Handlers
  // ============================================
  const handleLogout = async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    await logout();
    navigate('/login');
  };

  const openModal = (modalName, data = null) => {
    if (modalName === 'editRemark' && data) setSelectedRemark(data);
    setModals(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    if (modalName === 'editRemark') setSelectedRemark(null);
  };

  // ============================================
  // 11. Sidebar Components
  // ============================================
  const SidebarContent = () => (
    <>
      <div style={styles.logo}>
        <div style={styles.logoBadge}>Edu<span style={{ color: '#ff6b00' }}>Priva</span></div>
        <div style={styles.logoSub}>School Management Platform</div>
      </div>
      
      <div style={styles.schoolPill} onClick={() => openModal('schoolProfile')}>
        <div style={styles.schoolName}>{schoolProfile?.name || 'School Name'}</div>
        <div style={styles.schoolStatus}>
          <span style={styles.statusDot}></span>
          <span style={styles.statusText}>{schoolProfile?.status || 'Active'}</span>
        </div>
      </div>

      <div style={styles.navSection}>Main</div>
      {navItems.slice(0, 4).map(item => (
        <NavItem 
          key={item.path} 
          {...item} 
          currentPath={location.pathname} 
          onClick={() => {
            navigate(item.path);
            setMobileMenuOpen(false);
          }} 
        />
      ))}

      <div style={styles.navSection}>Tools</div>
      {navItems.slice(4).map(item => (
        <NavItem 
          key={item.path} 
          {...item} 
          currentPath={location.pathname} 
          onClick={() => {
            navigate(item.path);
            setMobileMenuOpen(false);
          }} 
        />
      ))}

      <div style={styles.sidebarFooter}>
        <div style={styles.userRow}>
          <div style={styles.avatar}>
            {user?.email?.charAt(0).toUpperCase() || 'SA'}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>
              {user?.displayName || user?.email?.split('@')[0] || 'School Admin'}
            </div>
            <div style={styles.userRole}>School Administrator</div>
          </div>
          <LogOut size={16} style={styles.logoutIcon} onClick={handleLogout} />
        </div>
      </div>
    </>
  );

  const NavItem = ({ path, label, icon, currentPath, onClick }) => (
    <div
      style={{
        ...styles.navItem,
        ...(currentPath === path ? styles.navItemActive : {}),
      }}
      onClick={onClick}
    >
      <span style={styles.navIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );

  // Show initial loading spinner
  if (isInitializing) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  return (
    <div style={styles.container}>
      {/* Consent Modal */}
      <ConsentModal 
        isOpen={showConsentModal}
        onConsent={handleConsent}
        onClose={() => {}}
      />

      {/* Desktop Sidebar */}
      <nav style={styles.sidebar}>
        <SidebarContent />
      </nav>

      {/* Mobile Sidebar Drawer */}
      <div style={{ 
        ...styles.mobileDrawer, 
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)' 
      }}>
        <div style={styles.drawerHeader}>
          <div style={styles.logoBadge}>Edu<span style={{ color: '#ff6b00' }}>Priva</span></div>
          <X size={20} style={{ cursor: 'pointer' }} onClick={() => setMobileMenuOpen(false)} />
        </div>
        <SidebarContent />
      </div>

      {mobileMenuOpen && (
        <div style={styles.drawerOverlay} onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <Menu size={20} style={styles.menuBtn} onClick={() => setMobileMenuOpen(true)} />
            <div>
              <h1 style={styles.pageTitle}>
                {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
              </h1>
              <p style={styles.pageDesc}>
                {schoolProfile?.name || 'School Dashboard'}
              </p>
            </div>
          </div>
          <div style={styles.topbarRight}>
            <div style={styles.notifBtn} onClick={() => openModal('notifications')}>
              <Bell size={16} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={styles.notifDot}></span>
              )}
            </div>
            <button style={styles.btnOutline} onClick={() => openModal('payment')}>
              + Record Payment
            </button>
            <button style={styles.btnPrimary} onClick={() => navigate('/school-admin/students')}>
              + New Student
            </button>
          </div>
        </div>

        <div style={styles.content}>
          <Routes>
            <Route index element={
              <DashboardOverview 
                schoolProfile={schoolProfile}
                schoolId={schoolId}
                openModal={openModal}
                showToast={showToast}
              />
            } />
            <Route path="finance" element={
              <FinanceModule 
                openModal={openModal}
                showToast={showToast}
              />
            } />
            <Route path="academics" element={
              <AcademicsModule 
                openModal={openModal}
                showToast={showToast}
              />
            } />
            <Route path="students" element={
              <StudentsModule 
                openModal={openModal}
                showToast={showToast}
              />
            } />
            <Route path="ai-assistant" element={
              <AIAssistant 
                openModal={openModal}
                showToast={showToast}
              />
            } />
            <Route path="reports" element={
              <ReportsModule 
                openModal={openModal}
                showToast={showToast}
              />
            } />
            <Route path="payroll" element={<PayrollModule showToast={showToast} />} />
            <Route path="audit-logs" element={
              <AuditLogs />
            } />
            <Route path="settings" element={
              <SettingsModule 
                schoolProfile={schoolProfile}
                setSchoolProfile={setSchoolProfile}
                openModal={openModal}
                showToast={showToast}
              />
            } />
          </Routes>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div style={styles.bottomNav}>
        {mobileNavItems.map(item => (
          <button
            key={item.label}
            style={{
              ...styles.bottomNavItem,
              ...(location.pathname === item.path ? styles.bottomNavItemActive : {}),
            }}
            onClick={() => {
              if (item.isMenu) {
                setMobileMenuOpen(true);
              } else {
                navigate(item.path);
              }
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Modals */}
      <PaymentModal 
        isOpen={modals.payment}
        onClose={() => closeModal('payment')}
        onSuccess={showToast}
        schoolId={schoolId}
      />
      <WithdrawModal 
        isOpen={modals.withdraw}
        onClose={() => closeModal('withdraw')}
        onSuccess={showToast}
        walletBalance={schoolProfile?.wallet_balance || 0}
        schoolId={schoolId}
      />
      <EditRemarkModal 
        isOpen={modals.editRemark}
        onClose={() => closeModal('editRemark')}
        remark={selectedRemark}
        onSuccess={showToast}
      />
      <NotificationModal 
        isOpen={modals.notifications}
        onClose={() => closeModal('notifications')}
        notifications={notifications}
        setNotifications={setNotifications}
      />
      <SchoolProfileModal 
        isOpen={modals.schoolProfile}
        onClose={() => closeModal('schoolProfile')}
        schoolProfile={schoolProfile}
        setSchoolProfile={setSchoolProfile}
        onSuccess={showToast}
      />

      {/* Toast Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

const styles = {
  container: { 
    display: 'flex', 
    minHeight: '100vh', 
    background: '#f8f9fa', 
    fontFamily: "'Inter', sans-serif",
    '@media (max-width: 768px)': { flexDirection: 'column' }
  },
  sidebar: {
    width: 280,
    minWidth: 280,
    background: '#ffffff',
    borderRight: '1px solid #e9ecef',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    overflowY: 'auto',
    '@media (max-width: 1000px)': { 
      display: 'none',
      position: 'fixed',
      zIndex: 100,
      transform: 'translateX(-100%)',
      transition: 'transform 0.3s ease',
      boxShadow: '2px 0 12px rgba(0,0,0,0.1)'
    }
  },
  sidebarOpen: {
    '@media (max-width: 1000px)': {
      display: 'flex',
      transform: 'translateX(0)'
    }
  },
  logo: { 
    padding: '24px 20px', 
    borderBottom: '1px solid #e9ecef',
    '@media (max-width: 600px)': { padding: '16px' }
  },
  logoBadge: {
    color: '#1a1a1a',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    display: 'inline-block'
  },
  logoSub: { 
    color: '#868e96', 
    fontSize: 11, 
    marginTop: 6, 
    letterSpacing: 0.3, 
    textTransform: 'uppercase' 
  },
  schoolPill: { 
    margin: '16px 16px', 
    background: '#fff9f0', 
    border: '1px solid #ffedd5', 
    borderRadius: 12, 
    padding: '12px 14px', 
    cursor: 'pointer',
    '@media (max-width: 600px)': { margin: '12px' }
  },
  schoolName: { 
    fontSize: 14, 
    fontWeight: 600, 
    color: '#1a1a1a', 
    whiteSpace: 'nowrap', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis' 
  },
  schoolStatus: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: '50%', background: '#ff6b00' },
  statusText: { fontSize: 11, color: '#868e96' },
  navSection: { 
    padding: '12px 0 6px', 
    fontSize: 10, 
    color: '#adb5bd', 
    letterSpacing: 0.5, 
    textTransform: 'uppercase', 
    paddingLeft: 20, 
    marginTop: 8 
  },
  navItem: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12, 
    padding: '10px 20px', 
    cursor: 'pointer', 
    color: '#4a5568', 
    fontSize: 14, 
    fontWeight: 500, 
    position: 'relative',
    transition: 'all 0.2s',
    '@media (max-width: 600px)': { padding: '8px 16px', fontSize: 13 }
  },
  navItemActive: { 
    background: '#fff9f0', 
    color: '#ff6b00', 
    borderRight: '3px solid #ff6b00' 
  },
  navIcon: { width: 18, height: 18, display: 'flex', alignItems: 'center' },
  sidebarFooter: { 
    marginTop: 'auto', 
    padding: '16px', 
    borderTop: '1px solid #e9ecef',
    '@media (max-width: 600px)': { padding: '12px' }
  },
  userRow: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { 
    width: 36, 
    height: 36, 
    borderRadius: '50%', 
    background: '#fff9f0', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: 13, 
    fontWeight: 600, 
    color: '#ff6b00' 
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: 600, color: '#1a1a1a' },
  userRole: { fontSize: 11, color: '#868e96' },
  logoutIcon: { cursor: 'pointer', opacity: 0.6, color: '#868e96' },
  main: { 
    flex: 1, 
    overflowY: 'auto', 
    background: '#f8f9fa',
    '@media (max-width: 768px)': { paddingTop: 0 }
  },
  topbar: {
    background: '#ffffff',
    borderBottom: '1px solid #e9ecef',
    padding: '16px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    flexWrap: 'wrap',
    gap: 12,
    '@media (max-width: 600px)': { 
      padding: '12px 16px',
      flexDirection: 'column',
      alignItems: 'stretch'
    }
  },
  topbarLeft: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 16,
    '@media (max-width: 600px)': { gap: 12 }
  },
  menuBtn: { 
    display: 'none', 
    cursor: 'pointer', 
    color: '#868e96',
    '@media (max-width: 1000px)': { display: 'block' } 
  },
  pageTitle: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 20, 
    fontWeight: 600, 
    color: '#1a1a1a',
    margin: 0,
    '@media (max-width: 600px)': { fontSize: 17 }
  },
  pageDesc: { 
    fontSize: 13, 
    color: '#868e96', 
    marginTop: 4, 
    marginBottom: 0,
    '@media (max-width: 600px)': { fontSize: 12 }
  },
  topbarRight: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12, 
    flexWrap: 'wrap',
    '@media (max-width: 600px)': { 
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 8
    }
  },
  btnPrimary: { 
    padding: '8px 16px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    border: 'none', 
    background: '#ff6b00', 
    color: '#ffffff',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap',
    '@media (max-width: 600px)': { 
      width: '100%',
      justifyContent: 'center',
      padding: '10px 16px'
    }
  },
  btnOutline: { 
    padding: '8px 16px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#4a5568', 
    border: '1px solid #e9ecef',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    '@media (max-width: 600px)': { 
      width: '100%',
      justifyContent: 'center',
      padding: '10px 16px'
    }
  },
  notifBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 8, 
    background: '#f8f9fa', 
    border: '1px solid #e9ecef', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    cursor: 'pointer', 
    position: 'relative', 
    color: '#868e96',
    '@media (max-width: 600px)': { 
      width: '100%',
      height: 44
    }
  },
  notifDot: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    width: 8, 
    height: 8, 
    background: '#ff6b00', 
    borderRadius: '50%', 
    border: '2px solid #ffffff' 
  },
  content: { 
    padding: '28px',
    '@media (max-width: 600px)': { 
      padding: '16px',
      paddingBottom: '80px' 
    },
    '@media (min-width: 601px) and (max-width: 1024px)': { 
      padding: '20px' 
    }
  },
  bottomNav: {
    display: 'none',
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#ffffff',
    borderTop: '1px solid #e9ecef',
    padding: '10px 12px',
    zIndex: 30,
    justifyContent: 'space-around',
    '@media (max-width: 1000px)': { 
      display: 'flex',
      padding: '8px 8px'
    },
    '@media (max-width: 600px)': { padding: '6px 4px' }
  },
  bottomNavItem: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    gap: 4, 
    background: 'none', 
    border: 'none', 
    color: '#adb5bd', 
    fontSize: 10, 
    padding: '8px 12px', 
    borderRadius: 8, 
    cursor: 'pointer',
    transition: 'all 0.2s',
    '@media (max-width: 600px)': { 
      padding: '6px 8px',
      fontSize: 9
    }
  },
  bottomNavItemActive: { 
    color: '#ff6b00', 
    background: '#fff9f0' 
  },
  mobileDrawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    background: '#ffffff',
    borderRight: '1px solid #e9ecef',
    zIndex: 200,
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s ease',
    overflowY: 'auto',
    display: 'none',
    '@media (max-width: 1000px)': { 
      display: 'block',
      boxShadow: '2px 0 12px rgba(0,0,0,0.15)'
    },
    '@media (max-width: 600px)': { width: 260 }
  },
  drawerHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '20px', 
    borderBottom: '1px solid #e9ecef' 
  },
  drawerOverlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'rgba(0,0,0,0.5)', 
    zIndex: 199,
    '@media (min-width: 1001px)': { display: 'none' } 
  },
};

export default SchoolAdminDashboard;
