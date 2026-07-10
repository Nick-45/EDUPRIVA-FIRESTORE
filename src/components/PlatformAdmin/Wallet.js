import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { platformWallet } from '../../services/platformWalletService';
import DataTable from '../../components/Common/DataTable';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

const Wallet = () => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_subscription_income: 0,
    total_commission_income: 0,
    total_withdrawn: 0,
    total_revenue: 0,
    net_balance: 0
  });
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('mpesa');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      // Get platform wallet balance
      const balance = await platformWallet.getBalance();
      setWalletBalance(balance);
      
      // Get transaction history
      const transactionsData = await platformWallet.getTransactions({ limit: 50 });
      setTransactions(transactionsData);
      
      // Get summary stats
      const summaryData = await platformWallet.getSummary();
      setSummary(summaryData);
      
    } catch (error) {
      console.error('Wallet data error:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amount > walletBalance) {
      toast.error('Insufficient balance');
      return;
    }
    
    if (!withdrawAccount) {
      toast.error('Please enter account/phone number');
      return;
    }
    
    setProcessingWithdrawal(true);
    
    try {
      const currentUser = auth.currentUser;
      
      const result = await platformWallet.withdrawFunds({
        amount: amount,
        method: withdrawMethod,
        account: withdrawAccount,
        description: `Withdrawal request via ${withdrawMethod}`,
        metadata: {
          requested_by: currentUser?.uid || 'system',
          ip_address: 'client-side'
        }
      });
      
      toast.success(`Withdrawal of KES ${amount.toLocaleString()} requested successfully`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawAccount('');
      loadWalletData();
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    return new Date(date).toLocaleDateString();
  };

  const columns = [
    { key: 'date', label: 'Date', render: (row) => (
      <div className="transaction-date">{formatDate(row.created_at)}</div>
    )},
    { key: 'type', label: 'Type', render: (row) => (
      <span className={`transaction-type ${row.type}`}>
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
    )},
    { key: 'status', label: 'Status', render: (row) => (
      <span className={`status-badge status-${row.status}`}>
        {row.status}
      </span>
    )}
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading wallet data...</p>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Wallet</h1>
          <p className="page-subtitle">Manage platform earnings from subscriptions and commissions</p>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card platform-wallet-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Available Balance</div>
            <div className="stat-value">KES {walletBalance.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">KES {summary.total_revenue.toLocaleString()}</div>
            <div className="stat-subtitle">
              Subscriptions: KES {summary.total_subscription_income.toLocaleString()} | 
              Commissions: KES {summary.total_commission_income.toLocaleString()}
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🏧</div>
          <div className="stat-content">
            <div className="stat-label">Total Withdrawn</div>
            <div className="stat-value">KES {summary.total_withdrawn.toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      {/* Warning Alert */}
      <div className="info-alert">
        <div className="info-alert-content">
          <span className="info-alert-icon">ℹ️</span>
          <div className="info-alert-text">
            Platform earnings come from:<br/>
            • <strong>Subscription fees</strong> - Schools pay for their subscription plans<br/>
            • <strong>Commission fees (3%, capped at KES 200)</strong> - Earned on each parent payment
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="actions-bar">
        <button 
          onClick={() => setShowWithdrawModal(true)}
          className="btn-withdraw"
          disabled={walletBalance <= 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 10l-7-7-7 7"/>
            <path d="M12 3v14"/>
            <path d="M5 21h14"/>
          </svg>
          Withdraw Funds
        </button>
      </div>
      
      {/* Transactions Table */}
      <div className="table-card">
        <div className="card-header">
          <h3 className="card-title">Transaction History</h3>
        </div>
        <DataTable 
          columns={columns} 
          data={transactions}
          emptyMessage="No transactions found"
        />
      </div>
      
      {/* Withdraw Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Withdraw Platform Earnings"
      >
        <div className="modal-content">
          <div className="balance-display">
            <div className="balance-label">Available Balance</div>
            <div className="balance-amount">KES {walletBalance.toLocaleString()}</div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Amount (KES)</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="form-input"
              placeholder="Enter amount"
              min="1"
              max={walletBalance}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Withdrawal Method</label>
            <select
              value={withdrawMethod}
              onChange={(e) => setWithdrawMethod(e.target.value)}
              className="form-select"
            >
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">{withdrawMethod === 'mpesa' ? 'M-Pesa Number' : 'Bank Account'}</label>
            <input
              type="text"
              value={withdrawAccount}
              onChange={(e) => setWithdrawAccount(e.target.value)}
              className="form-input"
              placeholder={withdrawMethod === 'mpesa' ? '0712 345 678' : 'Account Number'}
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={() => setShowWithdrawModal(false)} className="modal-btn-cancel">
            Cancel
          </button>
          <button 
            onClick={handleWithdrawal} 
            className="modal-btn-submit"
            disabled={processingWithdrawal}
          >
            {processingWithdrawal ? 'Processing...' : `Withdraw via ${withdrawMethod === 'mpesa' ? 'M-Pesa' : 'Bank Transfer'}`}
          </button>
        </div>
      </Modal>

      <style jsx>{`
        .wallet-page {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

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
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid #e2e8f0;
        }

        .platform-wallet-card {
          background: linear-gradient(135deg, #ff6b00 0%, #e55a00 100%);
          color: white;
        }

        .platform-wallet-card .stat-icon {
          background: rgba(255, 255, 255, 0.2);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 107, 0, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 12px;
          color: #718096;
          margin-bottom: 4px;
        }

        .platform-wallet-card .stat-label {
          color: rgba(255, 255, 255, 0.8);
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1a202c;
        }

        .platform-wallet-card .stat-value {
          color: white;
        }

        .stat-subtitle {
          font-size: 11px;
          color: #a0aec0;
          margin-top: 4px;
        }

        /* Info Alert */
        .info-alert {
          background: rgba(255, 107, 0, 0.08);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .info-alert-content {
          display: flex;
          gap: 12px;
        }

        .info-alert-icon {
          font-size: 18px;
        }

        .info-alert-text {
          font-size: 13px;
          color: #4a5568;
          line-height: 1.5;
        }

        /* Actions Bar */
        .actions-bar {
          margin-bottom: 24px;
        }

        .btn-withdraw {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: #ff6b00;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-withdraw:hover:not(:disabled) {
          background: #e55a00;
          transform: translateY(-1px);
        }

        .btn-withdraw:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Table Card */
        .table-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #fafbfc;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        /* Transaction Styles */
        .transaction-date {
          font-size: 13px;
          color: #4a5568;
        }

        .transaction-type {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .transaction-type.subscription {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .transaction-type.commission {
          background: rgba(255, 107, 0, 0.1);
          color: #ff6b00;
        }

        .transaction-type.withdrawal {
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

        .status-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-completed {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .status-pending {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        /* Modal Styles */
        .modal-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .balance-display {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }

        .balance-label {
          font-size: 11px;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .balance-amount {
          font-size: 28px;
          font-weight: 700;
          color: #ff6b00;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input,
        .form-select {
          padding: 10px 12px;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1a202c;
          transition: all 0.2s;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #ff6b00;
          background: white;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .modal-btn-cancel {
          padding: 8px 20px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-cancel:hover {
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .modal-btn-submit {
          padding: 8px 24px;
          background: #ff6b00;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-submit:hover:not(:disabled) {
          background: #e55a00;
        }

        .modal-btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
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

        .loading-text {
          margin-top: 16px;
          font-size: 14px;
          color: #718096;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 640px) {
          .page-title {
            font-size: 20px;
          }
          
          .stat-value {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default Wallet;
