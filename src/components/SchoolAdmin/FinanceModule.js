import React, { useState, useEffect } from 'react';
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
import { Download, Plus, DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';

const FinanceModule = ({ openModal, showToast }) => {
  const { user } = useAuth();
  const schoolId = user?.user_metadata?.school_id;
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [stats, setStats] = useState({
    totalCollected: 0,
    outstanding: 0,
    walletBalance: 0,
    expectedTotal: 0,
    collectionRate: 0,
  });
  const [feeStructure, setFeeStructure] = useState({
    termFee: 0,
    commissionRate: 0.03,
    commissionCap: 200,
    lateFee: 500,
  });
  const [loading, setLoading] = useState(true);
  
  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const studentsCollection = collection(db, 'students');
  const paymentsCollection = collection(db, 'payments');

  useEffect(() => {
    let unsubscribe = null;
    if (schoolId) {
      fetchData();
      unsubscribe = subscribeToPayments();
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [schoolId]);

  const fetchData = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    
    try {
      // Fetch school profile for fee structure
      const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
      if (schoolDoc.exists()) {
        const profile = schoolDoc.data();
        setSchoolProfile(profile);
        
        // Update fee structure from profile
        setFeeStructure(prev => ({
          ...prev,
          termFee: profile.term_fee || 0,
        }));
      }

      // Fetch payments with student info
      const paymentsQuery = query(
        paymentsCollection,
        where('school_id', '==', schoolId),
        orderBy('payment_date', 'desc')
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
      
      setPayments(paymentsData || []);
      
      const totalCollected = (paymentsData || [])
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Fetch students for outstanding calculation
      const studentsQuery = query(
        studentsCollection,
        where('school_id', '==', schoolId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setStudents(studentsData || []);
      
      const totalStudents = studentsData?.length || 0;
      const expectedTotal = totalStudents * (schoolProfile?.term_fee || 0);
      const outstanding = Math.max(0, expectedTotal - totalCollected);
      const collectionRate = expectedTotal > 0 ? (totalCollected / expectedTotal) * 100 : 0;
      
      setStats({
        totalCollected,
        outstanding,
        walletBalance: schoolProfile?.wallet_balance || 0,
        expectedTotal,
        collectionRate,
      });
      
    } catch (error) {
      console.error('Error fetching finance data:', error);
      showToast('Failed to load finance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPayments = () => {
    if (!schoolId) return;
    
    const paymentsQuery = query(
      paymentsCollection,
      where('school_id', '==', schoolId),
      orderBy('payment_date', 'desc')
    );
    
    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      // Refresh data when payments change
      fetchData();
    }, (error) => {
      console.error('Payment subscription error:', error);
    });
    
    return unsubscribe;
  };

  const exportPaymentsToCSV = () => {
    const headers = ['Date', 'Student Name', 'Admission No', 'Grade', 'Amount', 'Method', 'Transaction ID', 'Status'];
    const csvData = payments.map(p => [
      p.payment_date ? new Date(p.payment_date.toDate ? p.payment_date.toDate() : p.payment_date).toLocaleDateString() : 'N/A',
      p.students?.name || 'N/A',
      p.students?.admission_number || 'N/A',
      p.students?.grade || 'N/A',
      p.amount || 0,
      p.payment_method || 'N/A',
      p.transaction_id || 'N/A',
      p.status || 'completed',
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${schoolId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Payments exported successfully', 'success');
  };

  const getMonthlyData = () => {
    const monthly = {};
    payments.forEach(p => {
      if (p.status === 'completed') {
        const date = p.payment_date;
        let month;
        if (date && date.toDate) {
          month = date.toDate().toLocaleString('default', { month: 'short' });
        } else if (date) {
          month = new Date(date).toLocaleString('default', { month: 'short' });
        } else {
          return;
        }
        monthly[month] = (monthly[month] || 0) + (p.amount || 0);
      }
    });
    return Object.entries(monthly).map(([month, amount]) => ({ month, amount }));
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading finance data...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header Bar */}
      <div style={styles.headerBar}>
        <div>
          <div style={styles.headerLabel}>Finance Module</div>
          <div style={styles.headerTitle}>{schoolProfile?.current_term || 'Current Term'} {schoolProfile?.current_academic_year || '2025'}</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={styles.btnPrimary} onClick={() => openModal('payment')}>
            <Plus size={14} /> Record Payment
          </button>
          <button style={styles.btnOutline} onClick={() => openModal('withdraw')}>
            <DollarSign size={14} /> Withdraw
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><CreditCard size={20} color="#ff6b00" /></div>
          <div style={styles.statLabel}>Total Collected</div>
          <div style={styles.statValue}>
            KES {(stats.totalCollected / 1000000).toFixed(1)}M
          </div>
          <div style={styles.statSub}>
            <TrendingUp size={12} color="#ff6b00" /> {stats.collectionRate.toFixed(1)}% of target
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}><TrendingDown size={20} color="#dc3545" /></div>
          <div style={styles.statLabel}>Outstanding</div>
          <div style={styles.statValue}>KES {(stats.outstanding / 1000).toFixed(0)}K</div>
          <div style={styles.statSub}>{students.length} total students</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}><Wallet size={20} color="#ff6b00" /></div>
          <div style={styles.statLabel}>Wallet Balance</div>
          <div style={styles.statValue}>KES {stats.walletBalance.toLocaleString()}</div>
          <div style={styles.statSub}>Available for withdrawal</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statIcon}><DollarSign size={20} color="#ff6b00" /></div>
          <div style={styles.statLabel}>Expected Total</div>
          <div style={styles.statValue}>KES {(stats.expectedTotal / 1000000).toFixed(1)}M</div>
          <div style={styles.statSub}>{students.length} students × KES {feeStructure.termFee.toLocaleString()}</div>
        </div>
      </div>

      {/* Fee Structure Panel */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>Fee Structure — {schoolProfile?.current_term || 'Current Term'} {schoolProfile?.current_academic_year || '2025'}</span>
        </div>
        <div style={styles.panelBody}>
          <div style={styles.feeStructureGrid}>
            <div style={styles.feeItem}>
              <div style={styles.feeLabel}>Term Fee (per student)</div>
              <div style={styles.feeValue}>KES {feeStructure.termFee.toLocaleString()}</div>
            </div>
            <div style={styles.feeItem}>
              <div style={styles.feeLabel}>Payment Commission</div>
              <div style={styles.feeValue}>{feeStructure.commissionRate * 100}% (max KES {feeStructure.commissionCap})</div>
            </div>
            <div style={styles.feeItem}>
              <div style={styles.feeLabel}>Late Payment Fee</div>
              <div style={styles.feeValue}>KES {feeStructure.lateFee.toLocaleString()}</div>
            </div>
            <div style={styles.feeItem}>
              <div style={styles.feeLabel}>Expected Total Revenue</div>
              <div style={styles.feeValue}>KES {(stats.expectedTotal / 1000000).toFixed(1)}M</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>Payment History</span>
          <button style={styles.btnSmall} onClick={exportPaymentsToCSV}>
            <Download size={12} /> Export CSV
          </button>
        </div>
        <div style={styles.panelBody}>
          <div style={styles.tableWrapper}>
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Adm No</th>
                  <th>Grade</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#adb5bd' }}>
                      No payments recorded yet
                    </td>
                  </tr>
                ) : (
                  payments.map(payment => (
                    <tr key={payment.id}>
                      <td style={styles.td}>
                        {payment.payment_date ? 
                          new Date(payment.payment_date.toDate ? payment.payment_date.toDate() : payment.payment_date).toLocaleDateString() : 
                          'N/A'
                        }
                      </td>
                      <td style={styles.td}><strong>{payment.students?.name || 'N/A'}</strong></td>
                      <td style={styles.td}>{payment.students?.admission_number || '—'}</td>
                      <td style={styles.td}>{payment.students?.grade || '—'}</td>
                      <td style={styles.td}>KES {payment.amount?.toLocaleString()}</td>
                      <td style={styles.td}>{payment.payment_method || 'Cash'}</td>
                      <td style={styles.td}>
                        <span style={payment.status === 'completed' ? styles.badgeSuccess : styles.badgePending}>
                          {payment.status === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Collection Chart */}
      {getMonthlyData().length > 0 && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Collection Trend</span>
            <span style={{ fontSize: 12, color: '#868e96' }}>{schoolProfile?.current_term || 'Current Term'} {schoolProfile?.current_academic_year || '2025'}</span>
          </div>
          <div style={styles.panelBody}>
            <div style={styles.chartContainer}>
              {getMonthlyData().map((item, i) => (
                <div key={i} style={styles.chartBar}>
                  <div style={{ 
                    ...styles.bar, 
                    height: `${Math.max(5, (item.amount / stats.totalCollected) * 100)}%`,
                    background: '#ff6b00'
                  }}></div>
                  <div style={styles.chartLabel}>{item.month}</div>
                  <div style={styles.chartValue}>KES {(item.amount / 1000).toFixed(0)}K</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
  headerBar: { 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 16, 
    padding: '20px 24px', 
    marginBottom: 24, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    flexWrap: 'wrap', 
    gap: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  headerLabel: { 
    fontSize: 12, 
    color: '#868e96', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 4 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 600, 
    color: '#1a1a1a' 
  },
  btnPrimary: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '10px 20px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    border: 'none', 
    background: '#ff6b00', 
    color: '#ffffff',
    transition: 'background 0.2s',
    ':hover': { background: '#e55a00' }
  },
  btnOutline: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '10px 20px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#4a5568', 
    border: '1px solid #e9ecef',
    transition: 'all 0.2s',
    ':hover': { borderColor: '#ff6b00', color: '#ff6b00' }
  },
  btnSmall: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 6, 
    fontSize: 12, 
    padding: '6px 12px', 
    borderRadius: 8, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#ff6b00', 
    border: '1px solid #ff6b00',
    fontWeight: 500,
    transition: 'all 0.2s',
    ':hover': { background: '#fff9f0' }
  },
  statsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(4,1fr)', 
    gap: 20, 
    marginBottom: 24,
    '@media (max-width: 1000px)': { gridTemplateColumns: 'repeat(2,1fr)' },
    '@media (max-width: 600px)': { gridTemplateColumns: '1fr' }
  },
  statCard: { 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 16, 
    padding: 20,
    position: 'relative',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  statIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    opacity: 0.5,
  },
  statLabel: { 
    fontSize: 12, 
    color: '#868e96', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 8,
    fontWeight: 500
  },
  statValue: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 28, 
    fontWeight: 700, 
    color: '#1a1a1a',
    marginBottom: 8
  },
  statSub: { 
    fontSize: 12, 
    display: 'flex', 
    alignItems: 'center', 
    gap: 4, 
    color: '#868e96' 
  },
  panel: { 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  panelHeader: { 
    padding: '16px 20px', 
    borderBottom: '1px solid #e9ecef', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    flexWrap: 'wrap', 
    gap: 12 
  },
  panelTitle: { 
    fontSize: 14, 
    fontWeight: 600, 
    color: '#1a1a1a' 
  },
  panelBody: { 
    padding: '20px' 
  },
  feeStructureGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(4,1fr)', 
    gap: 20,
    '@media (max-width: 800px)': { gridTemplateColumns: 'repeat(2,1fr)' }
  },
  feeItem: { 
    textAlign: 'center',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: 12,
  },
  feeLabel: { 
    fontSize: 11, 
    color: '#868e96', 
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  feeValue: { 
    fontSize: 16, 
    fontWeight: 600, 
    color: '#ff6b00' 
  },
  tableWrapper: { 
    overflowX: 'auto' 
  },
  dataTable: { 
    width: '100%', 
    borderCollapse: 'collapse',
    minWidth: 700
  },
  th: {
    textAlign: 'left',
    padding: '12px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#868e96',
    borderBottom: '1px solid #e9ecef',
  },
  td: {
    padding: '12px 12px',
    fontSize: 13,
    color: '#4a5568',
    borderBottom: '1px solid #f1f3f5',
  },
  badgeSuccess: { 
    padding: '4px 10px', 
    borderRadius: 20, 
    fontSize: 11, 
    fontWeight: 600, 
    background: '#fff9f0', 
    color: '#ff6b00',
    display: 'inline-block'
  },
  badgePending: { 
    padding: '4px 10px', 
    borderRadius: 20, 
    fontSize: 11, 
    fontWeight: 600, 
    background: '#f8f9fa', 
    color: '#adb5bd',
    display: 'inline-block'
  },
  chartContainer: { 
    display: 'flex', 
    alignItems: 'flex-end', 
    gap: 20, 
    height: 220, 
    padding: '10px 0' 
  },
  chartBar: { 
    flex: 1, 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    gap: 8 
  },
  bar: { 
    width: '100%', 
    maxWidth: 50, 
    minHeight: 20,
    borderRadius: '8px 8px 0 0', 
    transition: 'height 0.3s ease',
    background: '#ff6b00'
  },
  chartLabel: { 
    fontSize: 11, 
    color: '#868e96' 
  },
  chartValue: { 
    fontSize: 10, 
    color: '#ff6b00',
    fontWeight: 500
  },
};

// Add keyframes animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default FinanceModule;
