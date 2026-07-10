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
import { db } from '../../services/firebase';
import { platformWallet } from '../../services/platformWalletService';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/Common/StatCard';
import DonutChart from '../../components/Common/DonutChart';
import ActivityTimeline from '../../components/Common/ActivityTimeline';
import toast from 'react-hot-toast';

const Overview = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSubscriptions: 0,
    expiringSoon: 0,
    totalRevenue: 0,
    totalStudents: 0,
    walletBalance: 0,
    subscriptionRevenue: 0,
    commissionRevenue: 0,
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Refs for realtime subscriptions
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
      // Cleanup subscriptions
      if (schoolsUnsubscribeRef.current) {
        schoolsUnsubscribeRef.current();
      }
      if (paymentsUnsubscribeRef.current) {
        paymentsUnsubscribeRef.current();
      }
      if (subscriptionsUnsubscribeRef.current) {
        subscriptionsUnsubscribeRef.current();
      }
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch schools data
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const totalSchools = schoolsSnapshot.size;

      // Fetch subscriptions data
      const subscriptionsSnapshot = await getDocs(subscriptionsCollection);
      const subscriptionsData = subscriptionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const activeSubscriptions = subscriptionsData.filter(s => s.status === 'active').length || 0;
      
      // Calculate expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringSoon = subscriptionsData.filter(s => {
        if (!s.expiry_date || s.status !== 'active') return false;
        const expiryDate = s.expiry_date.toDate ? s.expiry_date.toDate() : new Date(s.expiry_date);
        const now = new Date();
        return expiryDate > now && expiryDate <= thirtyDaysFromNow;
      }).length || 0;

      // Fetch payments for revenue
      const paymentsQuery = query(
        paymentsCollection,
        where('status', '==', 'completed')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnapshot.docs.map(doc => doc.data());

      // Get platform wallet summary
      const platformData = await platformWallet.getSummary();
      const walletBalance = await platformWallet.getBalance();

      // Fetch students count
      const studentsSnapshot = await getDocs(studentsCollection);
      const totalStudents = studentsSnapshot.size;

      // Get recent activities from audit_logs
      const auditQuery = query(
        auditLogsCollection,
        orderBy('created_at', 'desc'),
        limit(10)
      );
      const auditSnapshot = await getDocs(auditQuery);
      
      if (!auditSnapshot.empty) {
        const formattedActivities = auditSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            action: data.action,
            type: data.entity_type,
            timestamp: data.created_at,
            user: data.user_id ? `${data.user_id.slice(0, 8)}...` : 'System'
          };
        });
        setActivities(formattedActivities);
      }

      // Calculate revenue
      const subscriptionRevenue = platformData.total_subscription_income || 0;
      const commissionRevenue = platformData.total_commission_income || 0;
      const totalRevenue = platformData.total_revenue || 0;

      if (isMounted.current) {
        setStats({
          totalSchools,
          activeSubscriptions,
          expiringSoon,
          totalRevenue,
          totalStudents: totalStudents || 0,
          walletBalance: walletBalance || 0,
          subscriptionRevenue,
          commissionRevenue,
        });
        setLastUpdated(new Date());
      }
      
    } catch (error) {
      console.error('Dashboard data error:', error);
      toast.error('Failed to load dashboard data');
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
    });
    schoolsUnsubscribeRef.current = schoolsUnsubscribe;

    // Subscribe to payments changes
    const paymentsQuery = query(
      paymentsCollection,
      where('status', '==', 'completed')
    );
    const paymentsUnsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newPayment = change.doc.data();
            if (newPayment.status === 'completed') {
              loadDashboardData();
              toast.success(`New payment received!`, { icon: '💰', duration: 3000 });
            }
          }
        });
      }
    });
    paymentsUnsubscribeRef.current = paymentsUnsubscribe;

    // Subscribe to subscription changes
    const subscriptionsUnsubscribe = onSnapshot(subscriptionsCollection, () => {
      if (isMounted.current) {
        loadDashboardData();
      }
    });
    subscriptionsUnsubscribeRef.current = subscriptionsUnsubscribe;
  };

  const totalRev = stats.subscriptionRevenue + stats.commissionRevenue;
  const subPercent = totalRev > 0 ? (stats.subscriptionRevenue / totalRev * 100).toFixed(0) : 0;
  const commPercent = totalRev > 0 ? (stats.commissionRevenue / totalRev * 100).toFixed(0) : 0;

  const statusData = {
    active: stats.activeSubscriptions,
    expiring: stats.expiringSoon,
    suspended: stats.totalSchools - stats.activeSubscriptions - stats.expiringSoon,
  };

  const activePercentage = stats.totalSchools > 0 
    ? Math.round((stats.activeSubscriptions / stats.totalSchools) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="overview-page">
      {/* Stats Row */}
      <div className="stats-grid">
        <StatCard 
          label="Total Schools" 
          value={stats.totalSchools} 
          color="orange"
        />
        <StatCard 
          label="Active Subscriptions" 
          value={stats.activeSubscriptions} 
          subtitle={`${activePercentage}% of schools`}
          color="green"
        />
        <StatCard 
          label="Expiring (30 days)" 
          value={stats.expiringSoon} 
          color="orange"
        />
        <StatCard 
          label="Platform Revenue" 
          value={`KES ${stats.totalRevenue.toLocaleString()}`} 
          color="yellow"
        />
        <StatCard 
          label="Total Students" 
          value={stats.totalStudents.toLocaleString()} 
          color="blue"
        />
      </div>
      
      {/* Revenue Breakdown & Status Distribution */}
      <div className="two-column-grid">
        {/* Revenue Breakdown Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Revenue Breakdown</h3>
            {lastUpdated && (
              <span className="last-updated">Updated {lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>
          <div className="card-body">
            <div className="revenue-item">
              <div className="revenue-header">
                <span className="revenue-label">Subscription Revenue</span>
                <span className="revenue-value orange">KES {stats.subscriptionRevenue.toLocaleString()}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill orange" style={{ width: `${subPercent}%` }}></div>
              </div>
              <div className="revenue-subtitle">{subPercent}% of total revenue</div>
            </div>
            
            <div className="revenue-item">
              <div className="revenue-header">
                <span className="revenue-label">Payment Commissions (3% capped)</span>
                <span className="revenue-value green">KES {stats.commissionRevenue.toLocaleString()}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill green" style={{ width: `${commPercent}%` }}></div>
              </div>
              <div className="revenue-subtitle">{commPercent}% of total revenue</div>
            </div>
            
            <div className="revenue-total">
              <span className="total-label">Total Platform Revenue</span>
              <span className="total-value">KES {totalRev.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        {/* School Status Distribution */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">School Status Distribution</h3>
          </div>
          <div className="card-body status-body">
            <DonutChart data={statusData} total={stats.totalSchools} />
            <div className="status-legend">
              <div className="legend-item">
                <div className="legend-dot active"></div>
                <span className="legend-label">Active — {statusData.active}</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot expiring"></div>
                <span className="legend-label">Expiring (30 days) — {statusData.expiring}</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot suspended"></div>
                <span className="legend-label">Suspended — {statusData.suspended}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Platform Wallet Summary */}
      <div className="dashboard-card">
        <div className="card-header">
          <h3 className="card-title">Platform Wallet Summary</h3>
        </div>
        <div className="card-body wallet-summary">
          <div className="wallet-amount">
            <span className="wallet-label">Available Balance</span>
            <span className="wallet-value">KES {stats.walletBalance.toLocaleString()}</span>
          </div>
          <div className="wallet-breakdown">
            <div className="breakdown-item">
              <span>From Subscriptions:</span>
              <strong>KES {stats.subscriptionRevenue.toLocaleString()}</strong>
            </div>
            <div className="breakdown-item">
              <span>From Commissions:</span>
              <strong>KES {stats.commissionRevenue.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      {activities.length > 0 && (
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity — Platform-Wide</h3>
          </div>
          <div className="card-body">
            <ActivityTimeline activities={activities} />
          </div>
        </div>
      )}
      
      {/* Expiring Subscriptions Alert */}
      {stats.expiringSoon > 0 && (
        <div className="alert-banner">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <div className="alert-text">
              <div className="alert-title">Expiring Subscriptions</div>
              <div className="alert-message">
                {stats.expiringSoon} school{stats.expiringSoon !== 1 ? 's' : ''} will expire within the next 30 days.
                Consider sending renewal reminders.
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .overview-page {
          animation: fadeIn 0.3s ease;
        }

        /* Loading State */
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 107, 0, 0.2);
          border-top-color: #ff6b00;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .stats-grid {
            gap: 20px;
          }
        }

        /* Two Column Layout */
        .two-column-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (min-width: 1024px) {
          .two-column-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
        }

        /* Dashboard Card */
        .dashboard-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .dashboard-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #fafbfc;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .last-updated {
          font-size: 11px;
          color: #a0aec0;
        }

        .card-body {
          padding: 20px;
        }

        /* Revenue Items */
        .revenue-item {
          margin-bottom: 20px;
        }

        .revenue-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .revenue-label {
          font-size: 14px;
          color: #4a5568;
        }

        .revenue-value {
          font-size: 14px;
          font-weight: 600;
          font-family: monospace;
        }

        .revenue-value.orange {
          color: #ff6b00;
        }

        .revenue-value.green {
          color: #10b981;
        }

        .revenue-subtitle {
          font-size: 11px;
          color: #a0aec0;
          margin-top: 6px;
        }

        .progress-bar {
          height: 8px;
          background: #edf2f7;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-fill.orange {
          background: #ff6b00;
        }

        .progress-fill.green {
          background: #10b981;
        }

        .revenue-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          margin-top: 8px;
          border-top: 1px solid #e2e8f0;
        }

        .total-label {
          font-size: 15px;
          font-weight: 600;
          color: #1a202c;
        }

        .total-value {
          font-size: 18px;
          font-weight: 700;
          color: #ff6b00;
        }

        /* Status Distribution */
        .status-body {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        @media (min-width: 640px) {
          .status-body {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .status-legend {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-dot.active {
          background: #10b981;
        }

        .legend-dot.expiring {
          background: #ff6b00;
        }

        .legend-dot.suspended {
          background: #ef4444;
        }

        .legend-label {
          font-size: 14px;
          color: #4a5568;
        }

        /* Wallet Summary */
        .wallet-summary {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .wallet-amount {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .wallet-label {
          font-size: 14px;
          color: #4a5568;
        }

        .wallet-value {
          font-size: 24px;
          font-weight: 700;
          color: #ff6b00;
        }

        .wallet-breakdown {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .breakdown-item {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f7fafc;
          border-radius: 8px;
          font-size: 12px;
          color: #4a5568;
        }

        .breakdown-item strong {
          color: #1a202c;
          font-family: monospace;
        }

        /* Alert Banner */
        .alert-banner {
          margin-top: 24px;
          background: rgba(255, 107, 0, 0.08);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 12px;
          padding: 16px;
        }

        .alert-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .alert-icon {
          font-size: 20px;
        }

        .alert-text {
          flex: 1;
        }

        .alert-title {
          font-size: 14px;
          font-weight: 600;
          color: #ff6b00;
          margin-bottom: 4px;
        }

        .alert-message {
          font-size: 13px;
          color: #4a5568;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .card-header {
            padding: 12px 16px;
          }

          .card-body {
            padding: 16px;
          }

          .revenue-value,
          .revenue-label {
            font-size: 13px;
          }

          .total-value {
            font-size: 16px;
          }

          .wallet-value {
            font-size: 20px;
          }

          .wallet-breakdown {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default Overview;
