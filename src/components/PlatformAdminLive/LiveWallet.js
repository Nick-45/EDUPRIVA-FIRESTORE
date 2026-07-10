import React, { useState, useEffect, useRef } from 'react';
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
import { platformWallet } from '../../services/platformWalletService';
import DataTable from '../../components/Common/DataTable';
import Modal from '../../components/Common/Modal';
import MetricCard from '../../components/Common/MetricCard';
import { Wallet, ArrowUpRight, Shield, TrendingUp, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveWallet = () => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalSchoolWallet, setTotalSchoolWallet] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('mpesa');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [summary, setSummary] = useState({
    total_subscription_income: 0,
    total_commission_income: 0,
    total_withdrawn: 0,
    total_revenue: 0
  });

  const isMounted = useRef(true);
  const paymentsUnsubscribeRef = useRef(null);

  // Collection references
  const paymentsCollection = collection(db, 'payments');
  const schoolsCollection = collection(db, 'schools');

  useEffect(() => {
    isMounted.current = true;
    loadWalletData();
    setupRealtimeSubscription();
    fetchSchoolWalletsTotal();

    return () => {
      isMounted.current = false;
      if (paymentsUnsubscribeRef.current) paymentsUnsubscribeRef.current();
    };
  }, []);

  const getDateValue = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const formatDate = (date) => {
    const d = getDateValue(date);
    return d ? d.toLocaleDateString() : 'N/A';
  };

  const loadWalletData = async () => {
    try {
      // Get platform wallet data
      const [balance, summaryData, transactionsData] = await Promise.all([
        platformWallet.getBalance(),
        platformWallet.getSummary(),
        platformWallet.getTransactions({ limit: 50 })
      ]);

      if (isMounted.current) {
        setWalletBalance(balance);
        setSummary(summaryData);
        setTransactions(transactionsData);
      }
    } catch (error) {
      console.error('Wallet data error:', error);
      toast.error('Failed to load wallet data');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const fetchSchoolWalletsTotal = async () => {
    try {
      // Calculate total of all school wallets
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const total = schoolsSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().wallet_balance || 0), 
        0
      );
      
      if (isMounted.current) {
        setTotalSchoolWallet(total);
      }
    } catch (error) {
      console.error('Error fetching school wallets:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to payments changes
    const paymentsQuery = query(
      paymentsCollection,
      orderBy('created_at', 'desc')
    );
    
    const paymentsUnsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newPayment = { id: change.doc.id, ...change.doc.data() };
            if (newPayment.status === 'completed') {
              // Refresh wallet data on new payment
              loadWalletData();
              
              const calculateCommission = (amount) => {
                const commission = amount * 0.03;
                return Math.min(commission, 200);
              };
              
              const platformEarns = calculateCommission(newPayment.amount || 0);
              toast.success(
                `Platform earned KES ${platformEarns.toLocaleString()} from payment!`,
                { icon: '💰', duration: 4000 }
              );
            }
          }
        });
      }
    }, (error) => {
      console.error('Payments subscription error:', error);
    });
    
    paymentsUnsubscribeRef.current = paymentsUnsubscribe;
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
          requested_by: currentUser?.uid,
          ip_address: 'client-side'
        }
      });
      
      if (isMounted.current) {
        toast.success(`Withdrawal of KES ${amount.toLocaleString()} requested successfully`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawAccount('');
        loadWalletData(); // Refresh wallet data
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const columns = [
    { key: 'date', label: 'Date', render: (row) => (
      <div className="text-gray-400 text-sm whitespace-nowrap">
        {formatDate(row.created_at)}
      </div>
    )},
    { key: 'type', label: 'Type', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.type === 'subscription' ? 'bg-blue-500/15 text-blue-400' :
        row.type === 'commission' ? 'bg-orange-500/15 text-orange-400' :
        row.type === 'withdrawal' ? 'bg-red-500/15 text-red-400' : 'bg-gray-500/15 text-gray-400'
      }`}>
        {row.type === 'subscription' ? '💰 Subscription' :
         row.type === 'commission' ? '💸 Commission' :
         row.type === 'withdrawal' ? '🏧 Withdrawal' : row.type}
      </span>
    )},
    { key: 'amount', label: 'Amount', render: (row) => (
      <span className={`font-mono ${row.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {row.amount > 0 ? '+' : ''}KES {Math.abs(row.amount).toLocaleString()}
      </span>
    )},
    { key: 'school', label: 'School', render: (row) => (
      <div className="text-gray-300">{row.schools?.name || '—'}</div>
    )},
    { key: 'description', label: 'Description', render: (row) => (
      <div className="text-gray-400 text-sm">{row.description || '—'}</div>
    )},
    { key: 'status', label: 'Status', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.status === 'completed' ? 'bg-green-500/15 text-green-400' :
        row.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400' :
        'bg-red-500/15 text-red-400'
      }`}>
        {row.status}
      </span>
    )}
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Platform Wallet</h1>
        <p className="text-gray-500 text-sm">Manage platform earnings from subscriptions and commissions</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Platform Balance</div>
            <Wallet size={18} className="text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-orange-600">KES {walletBalance.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Available for withdrawal</div>
          <button 
            onClick={() => setShowWithdrawModal(true)}
            disabled={walletBalance <= 0}
            className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition"
          >
            Withdraw Funds
          </button>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Total Revenue</div>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">KES {summary.total_revenue.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">
            Subscriptions: KES {summary.total_subscription_income.toLocaleString()} | 
            Commissions: KES {summary.total_commission_income.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">School Funds (Read-Only)</div>
            <Shield size={18} className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">KES {totalSchoolWallet.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Belongs to individual schools - not accessible</div>
        </div>
      </div>
      
      {/* Info Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6 flex items-start gap-3">
        <span className="text-orange-500 text-sm">⚠️</span>
        <div className="text-sm text-gray-700">
          <strong className="text-orange-600">Critical Rule:</strong> Platform admin can ONLY withdraw platform earnings (subscriptions + commissions). 
          School funds are ring-fenced and inaccessible.
        </div>
      </div>
      
      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Platform Wallet Transactions</h3>
          <p className="text-xs text-gray-500 mt-0.5">All deposits and withdrawals</p>
        </div>
        <DataTable 
          columns={columns} 
          data={transactions} 
          emptyMessage="No transactions found" 
        />
      </div>
      
      {/* Withdraw Modal */}
      <Modal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} title="Withdraw Platform Earnings">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <div className="text-orange-700 text-sm">Only platform earnings (subscriptions + commissions) can be withdrawn here.</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Available Balance</div>
          <div className="text-2xl font-bold text-orange-600">KES {walletBalance.toLocaleString()}</div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Amount (KES)</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter amount"
              min="1"
              max={walletBalance}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Method</label>
            <select
              value={withdrawMethod}
              onChange={(e) => setWithdrawMethod(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">
              {withdrawMethod === 'mpesa' ? 'M-Pesa Number' : 'Bank Account Number'}
            </label>
            <input
              type="text"
              value={withdrawAccount}
              onChange={(e) => setWithdrawAccount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={withdrawMethod === 'mpesa' ? '0712 345 678' : 'Account Number'}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button 
            onClick={() => setShowWithdrawModal(false)} 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleWithdrawal} 
            disabled={processingWithdrawal || walletBalance <= 0}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
          >
            {processingWithdrawal ? 'Processing...' : `Withdraw via ${withdrawMethod === 'mpesa' ? 'M-Pesa' : 'Bank Transfer'}`}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default LiveWallet;
