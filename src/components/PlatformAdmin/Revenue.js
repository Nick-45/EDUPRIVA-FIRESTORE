import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { platformWallet } from '../../services/platformWalletService';
import StatCard from '../../components/Common/StatCard';
import DataTable from '../../components/Common/DataTable';
import toast from 'react-hot-toast';

const Revenue = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    subscriptionIncome: 0,
    commissionIncome: 0,
    avgCommission: 0,
    platformWallet: 0
  });
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  // Collection references
  const paymentsCollection = collection(db, 'payments');
  const schoolsCollection = collection(db, 'schools');
  const platformTransactionsCollection = collection(db, 'platform_transactions');

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    try {
      // Get platform wallet balance and summary
      const [balance, summary, transactionsData] = await Promise.all([
        platformWallet.getBalance(),
        platformWallet.getSummary(),
        platformWallet.getTransactions({ limit: 100 })
      ]);
      
      setStats({
        totalRevenue: summary.total_revenue,
        subscriptionIncome: summary.total_subscription_income,
        commissionIncome: summary.total_commission_income,
        avgCommission: summary.total_commission_income / (summary.total_subscription_income / 12500) || 0,
        platformWallet: balance
      });
      
      setTransactions(transactionsData);
      
      // Get all completed payments with school info for commission breakdown
      const paymentsQuery = query(
        paymentsCollection,
        where('status', '==', 'completed')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = [];

      for (const paymentDoc of paymentsSnapshot.docs) {
        const payment = {
          id: paymentDoc.id,
          ...paymentDoc.data()
        };

        // Fetch school data if school_id exists
        if (payment.school_id) {
          try {
            const schoolDoc = await getDoc(doc(db, 'schools', payment.school_id));
            if (schoolDoc.exists()) {
              payment.schools = {
                id: schoolDoc.id,
                ...schoolDoc.data()
              };
            }
          } catch (schoolError) {
            console.warn('Could not fetch school:', payment.school_id);
          }
        }

        paymentsData.push(payment);
      }
      
      // Calculate commissions by school
      const calculateCommission = (amount) => {
        const commission = amount * 0.03;
        return Math.min(commission, 200);
      };
      
      const schoolCommissions = {};
      paymentsData.forEach(p => {
        const schoolName = p.schools?.name || 'Unknown';
        const commission = calculateCommission(p.amount || 0);
        
        if (!schoolCommissions[schoolName]) {
          schoolCommissions[schoolName] = { 
            transactions: 0, 
            feesProcessed: 0, 
            commission: 0,
            schoolId: p.school_id
          };
        }
        schoolCommissions[schoolName].transactions++;
        schoolCommissions[schoolName].feesProcessed += p.amount || 0;
        schoolCommissions[schoolName].commission += commission;
      });
      
      const commissionList = Object.entries(schoolCommissions).map(([name, data]) => ({
        school: name,
        schoolId: data.schoolId,
        transactions: data.transactions,
        feesProcessed: data.feesProcessed,
        commission: data.commission,
        capped: Math.min(Math.round((data.commission / (data.feesProcessed || 1)) * 100), 3)
      }));
      
      setCommissions(commissionList);
      
    } catch (error) {
      console.error('Revenue loading error:', error);
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get doc reference
  const getDoc = async (docRef) => {
    const { getDoc } = await import('firebase/firestore');
    return getDoc(docRef);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    return new Date(date).toLocaleDateString();
  };

  const exportCSV = () => {
    if (commissions.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['School', 'Transactions', 'Fees Processed', 'Commission (3%)', 'Cap Hit'];
    const rows = commissions.map(c => [
      c.school,
      c.transactions,
      `KES ${c.feesProcessed.toLocaleString()}`,
      `KES ${c.commission.toLocaleString()}`,
      `${c.capped}%`
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission_revenue_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete');
  };

  const exportTransactionsCSV = () => {
    if (transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    
    const headers = ['Date', 'Type', 'Amount', 'School', 'Description', 'Status'];
    const rows = transactions.map(t => [
      t.created_at ? formatDate(t.created_at) : 'N/A',
      t.type,
      `KES ${Math.abs(t.amount).toLocaleString()}`,
      t.schools?.name || 'Platform',
      t.description || '—',
      t.status
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete');
  };

  const transactionColumns = [
    { key: 'date', label: 'Date', render: (row) => (
      <div className="transaction-date">{formatDate(row.created_at)}</div>
    )},
    { key: 'type', label: 'Type', render: (row) => (
      <span className={`transaction-type-badge ${row.type}`}>
        {row.type === 'subscription' ? '💰 Subscription' : 
         row.type === 'commission' ? '💸 Commission' : 
         row.type === 'withdrawal' ? '🏧 Withdrawal' : row.type}
      </span>
    )},
    { key: 'amount', label: 'Amount', render: (row) => (
      <div className={`transaction-amount ${row.amount > 0 ? 'positive' : 'negative'}`}>
        {row.amount > 0 ? '+' : ''}KES {Math.abs(row.amount).toLocaleString()}
      </div>
    )},
    { key: 'school', label: 'School', render: (row) => (
      <div className="transaction-school">{row.schools?.name || '—'}</div>
    )},
    { key: 'description', label: 'Description', render: (row) => (
      <div className="transaction-description">{row.description || '—'}</div>
    )}
  ];

  const commissionColumns = [
    { key: 'school', label: 'School', render: (row) => (
      <div className="school-cell">{row.school}</div>
    )},
    { key: 'transactions', label: 'Transactions', render: (row) => (
      <div className="transactions-cell">{row.transactions}</div>
    )},
    { key: 'feesProcessed', label: 'Fees Processed', render: (row) => (
      <div className="amount-cell">KES {row.feesProcessed.toLocaleString()}</div>
    )},
    { key: 'commission', label: 'Commission (3%)', render: (row) => (
      <div className="commission-cell">KES {row.commission.toLocaleString()}</div>
    )},
    { key: 'capped', label: 'Cap Hit', render: (row) => (
      <div className={`cap-cell ${row.capped >= 2.9 ? 'cap-high' : 'cap-low'}`}>
        {row.capped}%
      </div>
    )},
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading revenue data...</p>
      </div>
    );
  }

  return (
    <div className="revenue-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Revenue Tracking</h1>
          <p className="page-subtitle">Monitor subscription income, commission fees, and platform wallet</p>
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="stats-grid">
        <StatCard 
          label="Total Revenue (YTD)" 
          value={`KES ${stats.totalRevenue.toLocaleString()}`} 
          change="↑ 18%" 
          changeType="up" 
          color="orange"
        />
        <StatCard 
          label="Subscription Income" 
          value={`KES ${stats.subscriptionIncome.toLocaleString()}`} 
          subtitle={`${stats.totalRevenue ? Math.round((stats.subscriptionIncome / stats.totalRevenue) * 100) : 0}% of revenue`}
          color="blue"
        />
        <StatCard 
          label="Commission Income" 
          value={`KES ${stats.commissionIncome.toLocaleString()}`} 
          subtitle={`${stats.totalRevenue ? Math.round((stats.commissionIncome / stats.totalRevenue) * 100) : 0}% of revenue`}
          color="green"
        />
        <StatCard 
          label="Avg Commission/School" 
          value={`KES ${stats.avgCommission.toLocaleString()}`}
          color="purple"
        />
        <StatCard 
          label="Platform Wallet" 
          value={`KES ${stats.platformWallet.toLocaleString()}`} 
          subtitle="Available for withdrawal"
          color="yellow"
        />
      </div>
      
      {/* Platform Transactions Section */}
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">Platform Wallet Transactions</h3>
          <button onClick={exportTransactionsCSV} className="btn-export" disabled={transactions.length === 0}>
            <svg className="export-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
        
        <div className="table-wrapper">
          <DataTable 
            columns={transactionColumns} 
            data={transactions}
            emptyMessage="No platform transactions found"
          />
        </div>
      </div>
      
      {/* Commission Table */}
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">Commission Revenue by School</h3>
          <button onClick={exportCSV} className="btn-export" disabled={commissions.length === 0}>
            <svg className="export-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
        
        <div className="table-wrapper">
          <DataTable 
            columns={commissionColumns} 
            data={commissions}
            emptyMessage="No commission data available"
          />
        </div>
      </div>
      
      {/* Summary Section - Only show if there's data */}
      {commissions.length > 0 && (
        <div className="summary-card">
          <div className="summary-header">
            <h3 className="summary-title">Revenue Summary</h3>
          </div>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">Total Schools with Payments</div>
              <div className="summary-value">{commissions.length}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Total Transactions</div>
              <div className="summary-value">{commissions.reduce((sum, c) => sum + c.transactions, 0).toLocaleString()}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Effective Commission Rate</div>
              <div className="summary-value">
                {stats.totalRevenue ? Math.round((stats.commissionIncome / stats.totalRevenue) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .revenue-page {
          animation: fadeIn 0.3s ease;
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

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 256px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 107, 0, 0.2);
          border-top-color: #ff6b00;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .loading-text {
          margin-top: 16px;
          font-size: 14px;
          color: #718096;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Page Header */
        .page-header {
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 4px 0;
        }

        .page-subtitle {
          font-size: 14px;
          color: #718096;
          margin: 0;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 20px;
          }
        }

        /* Table Card */
        .table-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #fafbfc;
          flex-wrap: wrap;
          gap: 12px;
        }

        .table-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .btn-export {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-export:hover:not(:disabled) {
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .btn-export:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-icon {
          width: 16px;
          height: 16px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        /* Transaction Table Cell Styles */
        .transaction-date {
          font-size: 13px;
          color: #4a5568;
          white-space: nowrap;
        }

        .transaction-type-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .transaction-type-badge.subscription {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .transaction-type-badge.commission {
          background: rgba(255, 107, 0, 0.1);
          color: #ff6b00;
        }

        .transaction-type-badge.withdrawal {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .transaction-amount {
          font-weight: 600;
          font-family: monospace;
        }

        .transaction-amount.positive {
          color: #10b981;
        }

        .transaction-amount.negative {
          color: #ef4444;
        }

        .transaction-school {
          font-weight: 500;
          color: #1a202c;
        }

        .transaction-description {
          font-size: 12px;
          color: #718096;
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Commission Table Cell Styles */
        .school-cell {
          font-weight: 600;
          color: #1a202c;
        }

        .transactions-cell {
          color: #4a5568;
          text-align: center;
        }

        .amount-cell {
          color: #1a202c;
          font-weight: 500;
          font-family: monospace;
        }

        .commission-cell {
          color: #ff6b00;
          font-weight: 600;
          font-family: monospace;
        }

        .cap-cell {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .cap-low {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .cap-high {
          background: rgba(255, 107, 0, 0.1);
          color: #ff6b00;
        }

        /* Summary Card */
        .summary-card {
          background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%);
          border: 1px solid #fed7aa;
          border-radius: 16px;
          overflow: hidden;
        }

        .summary-header {
          padding: 16px 20px;
          border-bottom: 1px solid #fed7aa;
          background: rgba(255, 107, 0, 0.05);
        }

        .summary-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding: 20px;
        }

        @media (max-width: 640px) {
          .summary-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        .summary-item {
          text-align: center;
        }

        .summary-label {
          font-size: 13px;
          color: #718096;
          margin-bottom: 8px;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: #ff6b00;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .page-title {
            font-size: 20px;
          }
          
          .table-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .btn-export {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .stats-grid {
            gap: 12px;
          }
          
          .summary-value {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default Revenue;
