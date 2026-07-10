import React, { useState, useEffect, useRef } from 'react';
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
import { platformWallet } from '../../services/platformWalletService';
import MetricCard from '../../components/Common/MetricCard';
import LiveFeed from '../../components/Live/LiveFeed';
import SchoolsMap from '../../components/Live/SchoolsMap';
import RevenueDonut from '../../components/Live/RevenueDonut';
import StatusBars from '../../components/Live/StatusBars';
import MonthlyChart from '../../components/Live/MonthlyChart';
import Ticker from '../../components/Live/Ticker';

const LiveOverview = () => {
  const [realtimeData, setRealtimeData] = useState({
    schools: 0,
    activeSubscriptions: 0,
    expiringSoon: 0,
    revenue: 0,
    students: 0,
    walletBalance: 0
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [revenueSummary, setRevenueSummary] = useState({
    subscriptionRevenue: 0,
    commissionRevenue: 0
  });
  const [statusData, setStatusData] = useState({
    active: 0,
    expiring: 0,
    suspended: 0,
    trial: 0
  });
  const [loading, setLoading] = useState(true);
  
  const schoolsUnsubscribeRef = useRef(null);
  const paymentsUnsubscribeRef = useRef(null);
  const subscriptionsUnsubscribeRef = useRef(null);
  const isMounted = useRef(true);

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const subscriptionsCollection = collection(db, 'subscriptions');
  const paymentsCollection = collection(db, 'payments');
  const studentsCollection = collection(db, 'students');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    isMounted.current = true;
    loadDashboardData();
    setupRealtimeSubscriptions();

    return () => {
      isMounted.current = false;
      if (schoolsUnsubscribeRef.current) schoolsUnsubscribeRef.current();
      if (paymentsUnsubscribeRef.current) paymentsUnsubscribeRef.current();
      if (subscriptionsUnsubscribeRef.current) subscriptionsUnsubscribeRef.current();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch schools data
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const schools = schoolsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch subscriptions data
      const subscriptionsSnapshot = await getDocs(subscriptionsCollection);
      const subscriptions = subscriptionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch students count
      const studentsSnapshot = await getDocs(studentsCollection);
      const studentsCount = studentsSnapshot.size;
      
      // Get platform wallet summary
      const summary = await platformWallet.getSummary();
      const balance = await platformWallet.getBalance();
      
      // Calculate metrics
      const totalSchools = schools?.length || 0;
      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active' && s.plan !== 'trial').length || 0;
      
      // Calculate expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringSoon = subscriptions?.filter(s => {
        if (!s.expiry_date || s.status !== 'active') return false;
        const expiryDate = s.expiry_date.toDate ? s.expiry_date.toDate() : new Date(s.expiry_date);
        const now = new Date();
        return expiryDate > now && expiryDate <= thirtyDaysFromNow;
      }).length || 0;
      
      // Calculate status distribution
      const suspended = schools?.filter(s => s.status === 'suspended').length || 0;
      const trial = subscriptions?.filter(s => s.plan === 'trial' && s.status === 'active').length || 0;
      
      // Get recent events from audit_logs
      const auditQuery = query(
        auditLogsCollection,
        orderBy('created_at', 'desc'),
        limit(10)
      );
      const auditSnapshot = await getDocs(auditQuery);
      
      if (!auditSnapshot.empty) {
        const events = auditSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: data.entity_type || 'activity',
            action: data.action,
            timestamp: data.created_at,
            details: data.new_values
          };
        });
        setRecentEvents(events);
      }
      
      if (isMounted.current) {
        setRealtimeData({
          schools: totalSchools,
          activeSubscriptions,
          expiringSoon,
          revenue: summary.total_revenue,
          students: studentsCount || 0,
          walletBalance: balance
        });
        
        setRevenueSummary({
          subscriptionRevenue: summary.total_subscription_income,
          commissionRevenue: summary.total_commission_income
        });
        
        setStatusData({
          active: activeSubscriptions,
          expiring: expiringSoon,
          suspended: suspended,
          trial: trial
        });
      }
      
    } catch (error) {
      console.error('Dashboard data error:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to schools changes
    const schoolsUnsubscribe = onSnapshot(schoolsCollection, () => {
      if (isMounted.current) {
        loadDashboardData();
      }
    }, (error) => {
      console.error('Schools subscription error:', error);
    });
    schoolsUnsubscribeRef.current = schoolsUnsubscribe;

    // Subscribe to payments changes
    const paymentsUnsubscribe = onSnapshot(paymentsCollection, () => {
      if (isMounted.current) {
        loadDashboardData();
      }
    }, (error) => {
      console.error('Payments subscription error:', error);
    });
    paymentsUnsubscribeRef.current = paymentsUnsubscribe;

    // Subscribe to subscriptions changes
    const subscriptionsUnsubscribe = onSnapshot(subscriptionsCollection, () => {
      if (isMounted.current) {
        loadDashboardData();
      }
    }, (error) => {
      console.error('Subscriptions subscription error:', error);
    });
    subscriptionsUnsubscribeRef.current = subscriptionsUnsubscribe;
  };

  const getDateValue = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const formatDate = (date) => {
    const d = getDateValue(date);
    return d ? d.toLocaleString() : 'N/A';
  };

  const metrics = [
    { 
      label: 'Total Schools', 
      value: realtimeData.schools, 
      color: 'orange',
      icon: '🏫'
    },
    { 
      label: 'Active Subscriptions', 
      value: realtimeData.activeSubscriptions, 
      subtitle: realtimeData.schools ? `${Math.round(realtimeData.activeSubscriptions / realtimeData.schools * 100)}% of schools` : '0%',
      color: 'green'
    },
    { 
      label: 'Expiring ≤30 days', 
      value: realtimeData.expiringSoon, 
      subtitle: realtimeData.expiringSoon > 0 ? 'Action required' : 'All good',
      color: realtimeData.expiringSoon > 0 ? 'orange' : 'green'
    },
    { 
      label: 'Platform Revenue', 
      value: `KES ${(realtimeData.revenue / 1000000).toFixed(2)}M`, 
      color: 'yellow'
    },
    { 
      label: 'Total Students', 
      value: realtimeData.students.toLocaleString(), 
      color: 'blue'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} {...metric} />
        ))}
      </div>
      
      {/* Live Feed & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <LiveFeed events={recentEvents} />
        <SchoolsMap schools={realtimeData.schools} />
      </div>
      
      {/* Bottom Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <RevenueDonut 
          subscriptionRevenue={revenueSummary.subscriptionRevenue} 
          commissionRevenue={revenueSummary.commissionRevenue} 
        />
        <StatusBars 
          active={statusData.active} 
          expiring={statusData.expiring} 
          suspended={statusData.suspended}
          trial={statusData.trial}
        />
        <MonthlyChart />
      </div>
      
      {/* Ticker */}
      <Ticker 
        message={`${realtimeData.activeSubscriptions} active subscriptions • KES ${realtimeData.revenue.toLocaleString()} total revenue • ${realtimeData.expiringSoon} expiring soon`}
      />
    </div>
  );
};

export default LiveOverview;
