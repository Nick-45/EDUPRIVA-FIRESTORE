import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { TrendingUp, TrendingDown, Wallet, Users, CreditCard, AlertCircle, Activity } from 'lucide-react';

const DashboardOverview = ({ openModal, showToast, schoolProfile, schoolId }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    feesCollected: 0,
    outstandingFees: 0,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unsubscribePayments, setUnsubscribePayments] = useState(null);
  const [unsubscribeAudit, setUnsubscribeAudit] = useState(null);

  // Collection references
  const studentsCollection = collection(db, 'students');
  const paymentsCollection = collection(db, 'payments');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    let cleanup;
    if (!schoolId) {
      setLoading(false);
      return;
    }

    fetchDashboardData();
    cleanup = subscribeToRealTime();

    return () => {
      if (typeof cleanup === 'function') cleanup();
      if (unsubscribePayments) unsubscribePayments();
      if (unsubscribeAudit) unsubscribeAudit();
    };
  }, [schoolId]);

  const fetchDashboardData = async () => {
    try {
      // Get total students count
      const studentsQuery = query(
        studentsCollection,
        where('school_id', '==', schoolId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentCount = studentsSnapshot.size;

      // Get recent payments with student info
      const paymentsQuery = query(
        paymentsCollection,
        where('school_id', '==', schoolId),
        orderBy('payment_date', 'desc'),
        limit(6)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = [];

      for (const paymentDoc of paymentsSnapshot.docs) {
        const payment = {
          id: paymentDoc.id,
          ...paymentDoc.data()
        };

        // Fetch student data if student_id exists
        if (payment.student_id) {
          try {
            const studentDoc = await getDoc(doc(db, 'students', payment.student_id));
            if (studentDoc.exists()) {
              payment.students = {
                id: studentDoc.id,
                ...studentDoc.data()
              };
            }
          } catch (studentError) {
            console.warn('Could not fetch student:', payment.student_id);
          }
        }

        paymentsData.push(payment);
      }

      // Get all completed payments for total
      const allPaymentsQuery = query(
        paymentsCollection,
        where('school_id', '==', schoolId),
        where('status', '==', 'completed')
      );
      const allPaymentsSnapshot = await getDocs(allPaymentsQuery);
      const totalCollected = allPaymentsSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0), 
        0
      );

      // Get recent audit logs
      const auditQuery = query(
        auditLogsCollection,
        where('school_id', '==', schoolId),
        orderBy('created_at', 'desc'),
        limit(5)
      );
      const auditSnapshot = await getDocs(auditQuery);
      const logsData = auditSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const walletBal = schoolProfile?.wallet_balance || 0;

      setStats({
        totalStudents: studentCount || 0,
        feesCollected: totalCollected,
        outstandingFees: 0,
      });
      setRecentPayments(paymentsData || []);
      setActivities(logsData || []);
      setWalletBalance(walletBal);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRealTime = () => {
    if (!schoolId) return null;

    // Subscribe to payments changes
    const paymentsQuery = query(
      paymentsCollection,
      where('school_id', '==', schoolId),
      orderBy('payment_date', 'desc')
    );
    
    const paymentsUnsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const newPayment = {
            id: change.doc.id,
            ...change.doc.data()
          };
          setRecentPayments(prev => [newPayment, ...prev].slice(0, 6));
          showToast(`Payment received: KES ${newPayment.amount?.toLocaleString()}`, 'success');
          fetchDashboardData();
        }
      });
    }, (error) => {
      console.error('Payment subscription error:', error);
    });
    
    setUnsubscribePayments(() => paymentsUnsubscribe);

    // Subscribe to audit logs changes
    const auditQuery = query(
      auditLogsCollection,
      where('school_id', '==', schoolId),
      orderBy('created_at', 'desc')
    );
    
    const auditUnsubscribe = onSnapshot(auditQuery, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const newActivity = {
            id: change.doc.id,
            ...change.doc.data()
          };
          setActivities(prev => [newActivity, ...prev].slice(0, 5));
        }
      });
    }, (error) => {
      console.error('Audit subscription error:', error);
    });
    
    setUnsubscribeAudit(() => auditUnsubscribe);

    // Return combined cleanup function
    return () => {
      paymentsUnsubscribe();
      auditUnsubscribe();
    };
  };

  const MetricCard = ({ label, value, subText, subUp, icon, onClick }) => (
    <div style={styles.metricCard} onClick={onClick}>
      <div style={styles.metricIcon}>{icon}</div>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
      {subText && (
        <div style={styles.metricSub}>
          {subUp ? <TrendingUp size={12} color="#ff6b00" /> : <TrendingDown size={12} color="#dc3545" />}
          <span style={{ color: subUp ? '#ff6b00' : '#dc3545' }}>{subText}</span>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <>
      <div style={styles.metricsGrid}>
        <MetricCard
          label="Total Students"
          value={stats.totalStudents}
          subText="Current enrollment"
          subUp={true}
          icon={<Users size={20} />}
          onClick={() => navigate('/school-admin/students')}
        />
        <MetricCard
          label="Fees Collected"
          value={`KES ${(stats.feesCollected / 1000000).toFixed(1)}M`}
          subText="This term"
          subUp={true}
          icon={<CreditCard size={20} />}
          onClick={() => navigate('/school-admin/finance')}
        />
        <MetricCard
          label="Outstanding Fees"
          value="KES 0"
          subText="All fees collected"
          subUp={true}
          icon={<AlertCircle size={20} />}
          onClick={() => navigate('/school-admin/finance')}
        />
        <MetricCard
          label="Wallet Balance"
          value={`KES ${walletBalance.toLocaleString()}`}
          subText="Available for withdrawal"
          subUp={true}
          icon={<Wallet size={20} />}
          onClick={() => openModal('withdraw')}
        />
      </div>

      <div style={styles.twoCol}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Recent Payments</span>
            <button style={styles.btnSmall} onClick={() => navigate('/school-admin/finance')}>
              View All
            </button>
          </div>
          <div style={styles.panelBody}>
            {recentPayments.length === 0 ? (
              <p style={styles.emptyState}>No payments recorded yet</p>
            ) : (
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(payment => {
                    const date = payment.payment_date;
                    let formattedDate = 'N/A';
                    if (date) {
                      if (date.toDate) {
                        formattedDate = date.toDate().toLocaleDateString();
                      } else if (typeof date === 'string' || date instanceof Date) {
                        formattedDate = new Date(date).toLocaleDateString();
                      }
                    }
                    return (
                      <tr key={payment.id}>
                        <td>{payment.students?.name || 'Unknown'}</td>
                        <td>KES {payment.amount?.toLocaleString() || 0}</td>
                        <td>{formattedDate}</td>
                        <td>
                          <span style={payment.status === 'completed' ? styles.badgeSuccess : styles.badgePending}>
                            {payment.status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Recent Activity</span>
          </div>
          <div style={styles.panelBody}>
            {activities.length === 0 ? (
              <p style={styles.emptyState}>No recent activity</p>
            ) : (
              activities.map((activity, i) => {
                let formattedDate = 'N/A';
                if (activity.created_at) {
                  if (activity.created_at.toDate) {
                    formattedDate = activity.created_at.toDate().toLocaleString();
                  } else if (typeof activity.created_at === 'string' || activity.created_at instanceof Date) {
                    formattedDate = new Date(activity.created_at).toLocaleString();
                  }
                }
                return (
                  <div key={i} style={styles.activityItem}>
                    <span style={styles.actDot}></span>
                    <div>
                      <div style={styles.activityMsg}>{activity.action}</div>
                      <div style={styles.activityTime}>{formattedDate}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>Wallet & Finance</span>
        <button style={styles.btnOutlineSmall} onClick={() => openModal('withdraw')}>
          Withdraw Funds
        </button>
      </div>
      <div style={styles.financeGrid}>
        <div style={styles.finCard}>
          <div style={styles.finTitle}>Available Balance</div>
          <div style={styles.finAmount}>KES {walletBalance.toLocaleString()}</div>
          <div style={styles.finMeta}>Ready for withdrawal</div>
        </div>
        <div style={styles.finCard}>
          <div style={styles.finTitle}>Total Collected</div>
          <div style={styles.finAmount}>KES {stats.feesCollected.toLocaleString()}</div>
          <div style={styles.finMeta}>All time</div>
        </div>
        <div style={styles.finCard}>
          <div style={styles.finTitle}>Total Students</div>
          <div style={styles.finAmount}>{stats.totalStudents}</div>
          <div style={styles.finMeta}>Currently enrolled</div>
        </div>
      </div>
    </>
  );
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #ff6b00',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
    marginBottom: 28,
    '@media (max-width: 768px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
    '@media (max-width: 480px)': { gridTemplateColumns: '1fr' },
  },
  metricCard: {
    background: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: 16,
    padding: 20,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  },
  metricIcon: {
    float: 'right',
    color: '#ff6b00',
    opacity: 0.7,
  },
  metricLabel: {
    fontSize: 12,
    color: '#868e96',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontWeight: 500,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 700,
    marginTop: 6,
  },
  metricSub: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    color: '#6b7280',
    fontSize: 12,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: 20,
    marginBottom: 24,
    '@media (max-width: 768px)': { gridTemplateColumns: '1fr' },
  },
  panel: {
    background: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
    border: '1px solid #f1f5f9',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 22px',
    borderBottom: '1px solid #f1f5f9',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
  },
  panelBody: {
    padding: 20,
    minHeight: 240,
  },
  btnSmall: {
    background: '#ff6b00',
    color: '#ffffff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'background 0.2s',
    ':hover': { background: '#e55a00' },
  },
  dataTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  emptyState: {
    color: '#6b7280',
    padding: '20px 0',
    textAlign: 'center',
    fontSize: 14,
  },
  badgeSuccess: {
    background: '#d1fae5',
    color: '#047857',
    borderRadius: 9999,
    padding: '4px 10px',
    fontSize: 12,
  },
  badgePending: {
    background: '#fef3c7',
    color: '#b45309',
    borderRadius: 9999,
    padding: '4px 10px',
    fontSize: 12,
  },
  activityItem: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    padding: '14px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  actDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#ff6b00',
    marginTop: 6,
    flexShrink: 0,
  },
  activityMsg: {
    fontSize: 14,
    fontWeight: 500,
  },
  activityTime: {
    color: '#6b7280',
    fontSize: 12,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
  },
  btnOutlineSmall: {
    background: 'transparent',
    color: '#ff6b00',
    border: '1px solid #ffedd5',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': { background: '#fff9f0' },
  },
  financeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 20,
    '@media (max-width: 768px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
    '@media (max-width: 480px)': { gridTemplateColumns: '1fr' },
  },
  finCard: {
    background: '#ffffff',
    borderRadius: 18,
    padding: 22,
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
    border: '1px solid #f1f5f9',
  },
  finTitle: {
    color: '#6b7280',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  finAmount: {
    fontSize: 28,
    fontWeight: 700,
    margin: '14px 0',
    color: '#1a202c',
  },
  finMeta: {
    color: '#6b7280',
    fontSize: 12,
  },
};

export default DashboardOverview;
