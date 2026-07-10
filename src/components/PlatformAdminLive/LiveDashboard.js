import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Layout/Sidebar';
import BottomNav from '../../components/Layout/BottomNav';
import Header from '../../components/Layout/Header';
import LiveOverview from './LiveOverview';
import LiveSchools from './LiveSchools';
import LiveRevenue from './LiveRevenue';
import LiveWallet from './LiveWallet';
import LiveSubscriptions from './LiveSubscriptions';
import LiveAudit from './LiveAudit';
import LiveAlerts from './LiveAlerts';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { platformWallet } from '../../services/platformWalletService';

const LiveDashboard = () => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [realtimeData, setRealtimeData] = useState({
    schools: 0,
    activeSubscriptions: 0,
    expiringSoon: 0,
    revenue: 0,
    students: 0,
    walletBalance: 0
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  // Refs for subscriptions
  const schoolsUnsubscribeRef = useRef(null);
  const paymentsUnsubscribeRef = useRef(null);
  const subscriptionsUnsubscribeRef = useRef(null);
  const isMounted = useRef(true);

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const subscriptionsCollection = collection(db, 'subscriptions');
  const paymentsCollection = collection(db, 'payments');
  const studentsCollection = collection(db, 'students');

  useEffect(() => {
    console.log('LiveDashboard mounted');
    isMounted.current = true;
    loadInitialData();
    setupRealtimeSubscriptions();
    
    return () => {
      console.log('LiveDashboard unmounting');
      isMounted.current = false;
      if (schoolsUnsubscribeRef.current) schoolsUnsubscribeRef.current();
      if (paymentsUnsubscribeRef.current) paymentsUnsubscribeRef.current();
      if (subscriptionsUnsubscribeRef.current) subscriptionsUnsubscribeRef.current();
    };
  }, []);

  const loadInitialData = async () => {
    console.log('Loading initial data...');
    try {
      // Fetch schools count
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const schoolsCount = schoolsSnapshot.size;
      
      // Fetch active subscriptions count
      const subscriptionsQuery = query(
        subscriptionsCollection,
        where('status', '==', 'active')
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      const activeSubsCount = subscriptionsSnapshot.size;
      
      // Fetch expiring soon subscriptions (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiringQuery = query(
        subscriptionsCollection,
        where('status', '==', 'active'),
        where('expiry_date', '<=', thirtyDaysFromNow),
        where('expiry_date', '>', new Date())
      );
      const expiringSnapshot = await getDocs(expiringQuery);
      const expiringCount = expiringSnapshot.size;
      
      // Fetch total revenue from payments
      const paymentsQuery = query(
        paymentsCollection,
        where('status', '==', 'completed')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const totalRevenue = paymentsSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0), 
        0
      );
      
      // Fetch students count
      const studentsSnapshot = await getDocs(studentsCollection);
      const studentsCount = studentsSnapshot.size;
      
      // Fetch platform wallet balance
      let walletBalance = 0;
      try {
        walletBalance = await platformWallet.getBalance();
      } catch (walletErr) {
        console.error('Wallet error:', walletErr);
      }
      
      console.log('Data loaded:', {
        schoolsCount,
        activeSubsCount,
        expiringCount,
        totalRevenue,
        studentsCount,
        walletBalance
      });
      
      if (isMounted.current) {
        setRealtimeData({
          schools: schoolsCount || 0,
          activeSubscriptions: activeSubsCount || 0,
          expiringSoon: expiringCount || 0,
          revenue: totalRevenue,
          students: studentsCount || 0,
          walletBalance: walletBalance
        });
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError(error.message);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('Setting up realtime subscriptions...');
    
    // Subscribe to schools changes
    const schoolsUnsubscribe = onSnapshot(schoolsCollection, () => {
      if (isMounted.current) {
        console.log('Schools change detected, refreshing...');
        refreshCounts();
      }
    }, (error) => {
      console.error('Schools subscription error:', error);
    });
    schoolsUnsubscribeRef.current = schoolsUnsubscribe;

    // Subscribe to payments changes
    const paymentsUnsubscribe = onSnapshot(paymentsCollection, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newPayment = { id: change.doc.id, ...change.doc.data() };
            console.log('New payment detected:', newPayment);
            setRealtimeData(prev => ({
              ...prev,
              revenue: prev.revenue + (newPayment.amount || 0)
            }));
            setLastUpdated(new Date());
          }
        });
      }
    }, (error) => {
      console.error('Payments subscription error:', error);
    });
    paymentsUnsubscribeRef.current = paymentsUnsubscribe;

    // Subscribe to subscriptions changes
    const subscriptionsUnsubscribe = onSnapshot(subscriptionsCollection, () => {
      if (isMounted.current) {
        console.log('Subscription change detected, refreshing...');
        refreshSubscriptionCounts();
      }
    }, (error) => {
      console.error('Subscriptions subscription error:', error);
    });
    subscriptionsUnsubscribeRef.current = subscriptionsUnsubscribe;
  };

  const refreshCounts = async () => {
    try {
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const schoolsCount = schoolsSnapshot.size;
      
      if (isMounted.current) {
        setRealtimeData(prev => ({ ...prev, schools: schoolsCount }));
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to refresh counts:', error);
    }
  };

  const refreshSubscriptionCounts = async () => {
    try {
      const subscriptionsQuery = query(
        subscriptionsCollection,
        where('status', '==', 'active')
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      const activeSubsCount = subscriptionsSnapshot.size;
      
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiringQuery = query(
        subscriptionsCollection,
        where('status', '==', 'active'),
        where('expiry_date', '<=', thirtyDaysFromNow),
        where('expiry_date', '>', new Date())
      );
      const expiringSnapshot = await getDocs(expiringQuery);
      const expiringCount = expiringSnapshot.size;
      
      if (isMounted.current) {
        setRealtimeData(prev => ({
          ...prev,
          activeSubscriptions: activeSubsCount || 0,
          expiringSoon: expiringCount || 0
        }));
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to refresh subscription counts:', error);
    }
  };

  // Show loading state
  if (loading) {
    console.log('Showing loading spinner');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error) {
    console.log('Showing error state:', error);
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: '#dc2626', marginBottom: '8px' }}>Failed to Load Dashboard</h2>
        <p style={{ color: '#6b7280' }}>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#ff6b00',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  console.log('Rendering dashboard with data:', realtimeData);

  return (
    <div className="live-dashboard">
      <Header 
        title="Live Dashboard"
        subtitle={userData?.email || user?.email}
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        showVoice={true}
      />
      
      <div className="dashboard-layout">
        <Sidebar isMobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        
        <main className="dashboard-main">
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<LiveOverview realtimeData={realtimeData} lastUpdated={lastUpdated} />} />
            <Route path="schools" element={<LiveSchools />} />
            <Route path="revenue" element={<LiveRevenue />} />
            <Route path="wallet" element={<LiveWallet realtimeData={realtimeData} />} />
            <Route path="subscriptions" element={<LiveSubscriptions />} />
            <Route path="audit" element={<LiveAudit />} />
            <Route path="alerts" element={<LiveAlerts />} />
          </Routes>
        </main>
      </div>
      
      <BottomNav role="platform_admin" />

      <style jsx>{`
        .live-dashboard {
          min-height: 100vh;
          background: #f7fafc;
        }

        .dashboard-layout {
          display: flex;
          padding-top: 0;
          min-height: 100vh;
        }

        .dashboard-main {
          flex: 1;
          padding: 20px;
          width: 100%;
          overflow-x: hidden;
          min-height: calc(100vh - 64px);
          margin-top: 64px;
        }

        @media (min-width: 768px) {
          .dashboard-main {
            padding: 24px;
          }
        }

        @media (min-width: 1024px) {
          .dashboard-main {
            margin-left: 280px;
            width: calc(100% - 280px);
          }
        }

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
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #ff6b00;
        }

        @media (max-width: 768px) {
          .dashboard-main {
            padding: 16px;
            padding-bottom: 80px;
          }
        }
      `}</style>
    </div>
  );
};

export default LiveDashboard;
