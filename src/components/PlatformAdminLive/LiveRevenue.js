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
import DataTable from '../../components/Common/DataTable';
import MetricCard from '../../components/Common/MetricCard';
import { Download, TrendingUp, TrendingDown, Wallet, CreditCard, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveRevenue = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    subscriptionIncome: 0,
    commissionIncome: 0,
    avgCommission: 0,
    platformWallet: 0,
    totalTransactions: 0,
    totalSchools: 0
  });
  const [commissions, setCommissions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Refs for subscriptions
  const paymentsUnsubscribeRef = useRef(null);
  const isMounted = useRef(true);

  // Collection references
  const paymentsCollection = collection(db, 'payments');
  const schoolsCollection = collection(db, 'schools');

  useEffect(() => {
    isMounted.current = true;
    loadRevenueData();
    setupRealtimeSubscriptions();
    
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

  const loadRevenueData = async () => {
    try {
      // Get platform wallet data
      const [balance, summary, recentTransactions] = await Promise.all([
        platformWallet.getBalance(),
        platformWallet.getSummary(),
        platformWallet.getTransactions({ limit: 100 })
      ]);
      
      // Get all completed payments with school info for commission breakdown
      const paymentsQuery = query(
        paymentsCollection,
        where('status', '==', 'completed'),
        orderBy('payment_date', 'desc')
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
      
      // Calculate commission (3% with max 200 KES cap)
      const calculateCommission = (amount) => {
        const commission = amount * 0.03;
        return Math.min(commission, 200);
      };
      
      // Calculate commissions by school
      const schoolCommissions = {};
      let totalSubscriptionIncome = 0;
      let totalCommissionIncome = 0;
      
      paymentsData.forEach(p => {
        const schoolName = p.schools?.name || 'Unknown';
        const commission = calculateCommission(p.amount || 0);
        
        totalSubscriptionIncome += p.amount || 0;
        totalCommissionIncome += commission;
        
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
        capped: Math.min(Math.round((data.commission / (data.feesProcessed || 1)) * 100), 3),
        avgCommissionPerTransaction: data.transactions ? Math.round(data.commission / data.transactions) : 0
      }));
      
      // Sort by commission amount (highest first)
      commissionList.sort((a, b) => b.commission - a.commission);
      
      const totalRevenue = summary.total_revenue;
      const avgCommission = commissionList.length 
        ? Math.round(totalCommissionIncome / commissionList.length) 
        : 0;
      
      if (isMounted.current) {
        setStats({
          totalRevenue,
          subscriptionIncome: summary.total_subscription_income,
          commissionIncome: summary.total_commission_income,
          avgCommission,
          platformWallet: balance,
          totalTransactions: paymentsData?.length || 0,
          totalSchools: commissionList.length
        });
        
        setCommissions(commissionList);
        setTransactions(recentTransactions);
        setLastUpdated(new Date());
      }
      
    } catch (error) {
      console.error('Revenue loading error:', error);
      toast.error('Failed to load revenue data');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to payments changes
    const paymentsQuery = query(
      paymentsCollection,
      where('status', '==', 'completed'),
      orderBy('payment_date', 'desc')
    );
    
    const paymentsUnsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newPayment = { id: change.doc.id, ...change.doc.data() };
            if (newPayment.status === 'completed') {
              // Refresh data on new payment
              loadRevenueData();
              
              const calculateCommission = (amount) => {
                const commission = amount * 0.03;
                return Math.min(commission, 200);
              };
              
              const commission = calculateCommission(newPayment.amount || 0);
              toast.success(
                `New payment of KES ${newPayment.amount?.toLocaleString()} received! Platform earned KES ${commission.toLocaleString()}`,
                { icon: '💰', duration: 5000 }
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

  const exportCSV = () => {
    if (commissions.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['School', 'Transactions', 'Fees Processed', 'Commission (3%)', 'Cap Hit', 'Avg Commission/Txn'];
    const rows = commissions.map(c => [
      c.school,
      c.transactions,
      `KES ${c.feesProcessed.toLocaleString()}`,
      `KES ${c.commission.toLocaleString()}`,
      `${c.capped}%`,
      `KES ${c.avgCommissionPerTransaction.toLocaleString()}`
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
    
    const headers = ['Date', 'Type', 'Amount', 'School', 'Description'];
    const rows = transactions.map(t => [
      formatDate(t.created_at),
      t.type,
      `KES ${Math.abs(t.amount).toLocaleString()}`,
      t.schools?.name || 'Platform',
      t.description || '—'
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

  const columns = [
    { key: 'school', label: 'School', render: (row) => (
      <div className="font-semibold text-white">{row.school}</div>
    )},
    { key: 'transactions', label: 'Transactions', render: (row) => (
      <div className="text-gray-300">{row.transactions}</div>
    )},
    { key: 'feesProcessed', label: 'Fees Processed', render: (row) => (
      <div className="text-gray-300">KES {row.feesProcessed.toLocaleString()}</div>
    )},
    { key: 'commission', label: 'Commission (3%)', render: (row) => (
      <div className="text-orange-500 font-semibold">KES {row.commission.toLocaleString()}</div>
    )},
    { key: 'capped', label: 'Cap Hit', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.capped >= 2.9 ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>
        {row.capped}%
      </span>
    )},
    { key: 'avgCommission', label: 'Avg/Txn', render: (row) => (
      <div className="text-gray-400 text-sm">KES {row.avgCommissionPerTransaction.toLocaleString()}</div>
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Platform Revenue Tracking</h1>
        <p className="text-gray-400 text-sm">
          Monitor subscription income, commission fees, and platform wallet in real-time
          {lastUpdated && <span className="ml-2 text-xs">• Updated {lastUpdated.toLocaleTimeString()}</span>}
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
        <MetricCard 
          label="Total Revenue" 
          value={`KES ${(stats.totalRevenue / 1000000).toFixed(2)}M`} 
          change="↑ 18%" 
          changeType="up" 
          color="orange"
          icon={<TrendingUp size={16} />}
        />
        <MetricCard 
          label="Subscription Income" 
          value={`KES ${(stats.subscriptionIncome / 1000000).toFixed(2)}M`} 
          subtitle={`${stats.totalRevenue ? Math.round((stats.subscriptionIncome / stats.totalRevenue) * 100) : 0}% of total`}
          color="blue"
          icon={<CreditCard size={16} />}
        />
        <MetricCard 
          label="Commission Income" 
          value={`KES ${(stats.commissionIncome / 1000).toFixed(0)}K`} 
          subtitle={`${stats.totalRevenue ? Math.round((stats.commissionIncome / stats.totalRevenue) * 100) : 0}% of total`}
          color="green"
          icon={<DollarSign size={16} />}
        />
        <MetricCard 
          label="Avg Commission/School" 
          value={`KES ${stats.avgCommission.toLocaleString()}`}
          color="purple"
        />
        <MetricCard 
          label="Platform Wallet" 
          value={`KES ${(stats.platformWallet / 1000).toFixed(0)}K`} 
          subtitle="Available to withdraw"
          color="yellow"
          icon={<Wallet size={16} />}
        />
      </div>
      
      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Schools</div>
          <div className="text-2xl font-bold text-white">{stats.totalSchools}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Transactions</div>
          <div className="text-2xl font-bold text-white">{stats.totalTransactions.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Effective Commission Rate</div>
          <div className="text-2xl font-bold text-orange-500">
            {stats.totalRevenue ? Math.round((stats.commissionIncome / stats.totalRevenue) * 100) : 0}%
          </div>
        </div>
      </div>
      
      {/* Commission Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-800">
          <h3 className="font-semibold text-white">Commission Revenue by School</h3>
          <div className="flex gap-2">
            <button 
              onClick={exportTransactionsCSV} 
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-orange-500 flex items-center gap-2 transition"
            >
              <Download size={14} />
              Export Transactions
            </button>
            <button 
              onClick={exportCSV} 
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-orange-500 flex items-center gap-2 transition"
              disabled={commissions.length === 0}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
        <DataTable 
          columns={columns} 
          data={commissions} 
          emptyMessage="No commission data available" 
        />
      </div>
      
      {/* Info Note */}
      <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <p className="text-xs text-orange-400">
          💡 Platform earns 3% commission on each payment, capped at KES 200 per transaction. 
          Subscription fees are added directly to platform wallet.
        </p>
      </div>
    </div>
  );
};

export default LiveRevenue;
