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
import DataTable from '../../components/Common/DataTable';
import Modal from '../../components/Common/Modal';
import { Gift, Send, AlertCircle, TrendingUp, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expiringCount, setExpiringCount] = useState(0);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [extendData, setExtendData] = useState({ 
    action: 'extend', 
    newExpiry: '', 
    reason: '' 
  });
  const [stats, setStats] = useState({
    totalActive: 0,
    totalTrial: 0,
    totalExpired: 0
  });

  const subscriptionUnsubscribeRef = useRef(null);
  const isMounted = useRef(true);

  // Collection references
  const subscriptionsCollection = collection(db, 'subscriptions');
  const schoolsCollection = collection(db, 'schools');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    isMounted.current = true;
    loadSubscriptions();
    setupRealtimeSubscription();

    return () => {
      isMounted.current = false;
      if (subscriptionUnsubscribeRef.current) subscriptionUnsubscribeRef.current();
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

  const loadSubscriptions = async () => {
    try {
      // Fetch subscriptions with school data
      const subscriptionsSnapshot = await getDocs(subscriptionsCollection);
      const subscriptionsData = [];

      for (const subDoc of subscriptionsSnapshot.docs) {
        const sub = {
          id: subDoc.id,
          ...subDoc.data()
        };

        // Fetch school data if school_id exists
        if (sub.school_id) {
          try {
            const schoolDoc = await getDoc(doc(db, 'schools', sub.school_id));
            if (schoolDoc.exists()) {
              sub.schools = {
                id: schoolDoc.id,
                ...schoolDoc.data()
              };
            }
          } catch (schoolError) {
            console.warn('Could not fetch school:', sub.school_id);
          }
        }

        subscriptionsData.push(sub);
      }
      
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiring = subscriptionsData?.filter(sub => {
        if (!sub.expiry_date || sub.status !== 'active') return false;
        const expiry = getDateValue(sub.expiry_date);
        return expiry && expiry > now && expiry <= thirtyDaysFromNow;
      }).length || 0;
      
      // Calculate stats
      const totalActive = subscriptionsData?.filter(sub => sub.status === 'active' && sub.plan !== 'trial').length || 0;
      const totalTrial = subscriptionsData?.filter(sub => sub.plan === 'trial' && sub.status === 'active').length || 0;
      const totalExpired = subscriptionsData?.filter(sub => sub.status !== 'active').length || 0;
      
      if (isMounted.current) {
        setExpiringCount(expiring);
        setSubscriptions(subscriptionsData || []);
        setStats({ totalActive, totalTrial, totalExpired });
      }
    } catch (error) {
      console.error('Load subscriptions error:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const setupRealtimeSubscription = () => {
    const unsubscribe = onSnapshot(subscriptionsCollection, () => {
      if (isMounted.current) {
        loadSubscriptions();
      }
    }, (error) => {
      console.error('Subscriptions subscription error:', error);
    });
    
    subscriptionUnsubscribeRef.current = unsubscribe;
  };

  const handleExtend = async () => {
    if (!selectedSubscription) return;
    
    if (!extendData.newExpiry && extendData.action === 'extend') {
      toast.error('Please select new expiry date');
      return;
    }
    
    if (!extendData.reason) {
      toast.error('Please provide a reason for this action');
      return;
    }
    
    try {
      const currentUser = auth.currentUser;
      const subRef = doc(db, 'subscriptions', selectedSubscription.id);
      const now = new Date();
      
      let updateData = {};
      let expiryDate = null;
      
      if (extendData.action === 'extend') {
        expiryDate = new Date(extendData.newExpiry);
        updateData = { 
          expiry_date: expiryDate,
          status: 'active',
          updated_at: now
        };
      } else if (extendData.action === 'grant_free') {
        // Grant free trial for 30 days
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 30);
        updateData = { 
          plan: 'trial', 
          expiry_date: trialExpiry,
          status: 'active',
          updated_at: now
        };
      } else if (extendData.action === 'reset_trial') {
        // Reset trial to 30 days from now
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 30);
        updateData = { 
          plan: 'trial', 
          expiry_date: trialExpiry,
          status: 'active',
          updated_at: now
        };
      }
      
      await updateDoc(subRef, updateData);
      
      // Log audit
      await addDoc(auditLogsCollection, {
        action: 'subscription_override',
        entity_type: 'subscription',
        entity_id: selectedSubscription.id,
        new_values: extendData,
        user_id: currentUser?.uid,
        created_at: now
      });
      
      toast.success('Subscription updated successfully');
      setShowExtendModal(false);
      setExtendData({ action: 'extend', newExpiry: '', reason: '' });
      loadSubscriptions();
    } catch (error) {
      console.error('Extend error:', error);
      toast.error('Failed to update subscription');
    }
  };

  const sendBulkReminder = async () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringSubs = subscriptions.filter(sub => {
      if (!sub.expiry_date || sub.status !== 'active') return false;
      const expiry = getDateValue(sub.expiry_date);
      return expiry && expiry > now && expiry <= thirtyDaysFromNow;
    });
    
    if (expiringSubs.length === 0) {
      toast.error('No expiring subscriptions found');
      return;
    }
    
    try {
      const currentUser = auth.currentUser;
      
      // Log reminders in audit_logs
      const reminderPromises = expiringSubs.map(async (sub) => {
        const expiry = getDateValue(sub.expiry_date);
        const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
        
        await addDoc(auditLogsCollection, {
          action: 'subscription_reminder_sent',
          entity_type: 'subscription',
          entity_id: sub.id,
          new_values: { 
            school_name: sub.schools?.name,
            expiry_date: expiry?.toISOString(),
            days_left: daysLeft
          },
          user_id: currentUser?.uid,
          created_at: new Date()
        });
      });
      
      await Promise.all(reminderPromises);
      toast.success(`Reminder logged for ${expiringSubs.length} school(s)`);
    } catch (error) {
      console.error('Reminder error:', error);
      toast.error('Failed to send reminders');
    }
  };

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return 0;
    const expiry = getDateValue(expiryDate);
    if (!expiry) return 0;
    const now = new Date();
    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusBadge = (subscription) => {
    const daysLeft = getDaysLeft(subscription.expiry_date);
    
    if (subscription.status !== 'active') {
      return { text: 'Expired', color: 'bg-red-500/15 text-red-400' };
    }
    if (subscription.plan === 'trial') {
      return { text: 'Free Trial', color: 'bg-blue-500/15 text-blue-400' };
    }
    if (daysLeft <= 30) {
      return { text: 'Expiring Soon', color: 'bg-orange-500/15 text-orange-400' };
    }
    return { text: 'Active', color: 'bg-green-500/15 text-green-400' };
  };

  const columns = [
    { key: 'school', label: 'School', render: (row) => (
      <div>
        <div className="font-semibold text-gray-900">{row.schools?.name || '—'}</div>
        <div className="text-xs text-gray-500">{row.schools?.email || ''}</div>
      </div>
    )},
    { key: 'plan', label: 'Plan', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.plan === 'trial' ? 'bg-blue-500/15 text-blue-400' : 
        row.plan === 'premium' ? 'bg-purple-500/15 text-purple-400' : 
        'bg-orange-500/15 text-orange-400'
      }`}>
        {row.plan === 'trial' ? 'Free Trial' : row.plan === 'premium' ? 'Premium' : 'Standard'}
      </span>
    )},
    { key: 'expiry_date', label: 'Expiry Date', render: (row) => (
      <div className="text-gray-600">
        {row.expiry_date ? formatDate(row.expiry_date) : 'N/A'}
      </div>
    )},
    { key: 'days_left', label: 'Days Left', render: (row) => {
      const days = getDaysLeft(row.expiry_date);
      return (
        <span className={days <= 30 ? 'text-orange-600 font-semibold' : 'text-green-600'}>
          {days > 0 ? `${days} days` : 'Expired'}
        </span>
      );
    }},
    { key: 'status', label: 'Status', render: (row) => {
      const badge = getStatusBadge(row);
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
          {badge.text}
        </span>
      );
    }},
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex gap-2">
        <button 
          onClick={() => {
            setSelectedSubscription(row);
            setShowExtendModal(true);
          }}
          className="text-xs px-3 py-1.5 bg-orange-500/10 text-orange-600 rounded-lg border border-orange-500/20 hover:bg-orange-500/20 transition"
        >
          {row.status === 'active' ? 'Extend' : 'Reactivate'}
        </button>
      </div>
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription Management</h1>
        <p className="text-gray-500 text-sm">Manage school subscriptions, extensions, and trial periods</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Active Subscriptions</div>
            <CreditCard size={18} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalActive}</div>
          <div className="text-xs text-gray-400 mt-1">Paid subscriptions</div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Free Trials</div>
            <Gift size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalTrial}</div>
          <div className="text-xs text-gray-400 mt-1">Active trial periods</div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Expired</div>
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalExpired}</div>
          <div className="text-xs text-gray-400 mt-1">Need attention</div>
        </div>
      </div>
      
      {/* Expiring Alert */}
      {expiringCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6 flex items-start gap-3">
          <span className="text-orange-500 text-sm">⚠️</span>
          <div className="text-sm text-gray-700">
            <strong className="text-orange-600">{expiringCount}</strong> school{expiringCount !== 1 ? 's' : ''} will expire within 30 days.
            <button 
              onClick={sendBulkReminder} 
              className="text-orange-600 ml-2 hover:underline font-medium"
            >
              Send reminders now →
            </button>
          </div>
        </div>
      )}
      
      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">All Subscriptions</h3>
          <button 
            onClick={sendBulkReminder} 
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center gap-2 transition"
          >
            <Send size={14} />
            Send Bulk Reminder
          </button>
        </div>
        <DataTable 
          columns={columns} 
          data={subscriptions} 
          emptyMessage="No subscriptions found" 
        />
      </div>
      
      {/* Extend Modal */}
      <Modal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} title="Extend / Override Subscription">
        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">School</div>
          <div className="text-gray-900 font-medium">{selectedSubscription?.schools?.name || 'New School'}</div>
          <div className="text-xs text-gray-400 mt-1">
            Current plan: {selectedSubscription?.plan === 'trial' ? 'Free Trial' : selectedSubscription?.plan || 'Standard'}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Action</label>
            <select
              value={extendData.action}
              onChange={(e) => setExtendData({ ...extendData, action: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="extend">Extend Subscription</option>
              <option value="grant_free">Grant Free Access (30-day trial)</option>
              <option value="reset_trial">Reset to Trial (30 days)</option>
            </select>
          </div>
          
          {extendData.action === 'extend' && (
            <div>
              <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">New Expiry Date</label>
              <input
                type="date"
                value={extendData.newExpiry}
                onChange={(e) => setExtendData({ ...extendData, newExpiry: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Reason (logged in audit trail)</label>
            <textarea
              rows={3}
              value={extendData.reason}
              onChange={(e) => setExtendData({ ...extendData, reason: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter reason for override..."
            />
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700">
            ⏱️ This action is permanently logged with your admin ID, timestamp, and IP address.
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button 
            onClick={() => setShowExtendModal(false)} 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleExtend} 
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
          >
            Apply Override
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default LiveSubscriptions;
