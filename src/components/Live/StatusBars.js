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
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const StatusBars = () => {
  const [statusData, setStatusData] = useState({
    active: 0,
    expiring: 0,
    suspended: 0,
    trial: 0,
    total: 0,
    lastUpdated: null
  });
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState({ active: 0, expiring: 0, suspended: 0, trial: 0 });

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const subscriptionsCollection = collection(db, 'subscriptions');

  useEffect(() => {
    fetchStatusData();
  }, []);

  const getDateValue = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const fetchStatusData = async () => {
    try {
      // Fetch all schools
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const schools = schoolsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch subscriptions
      const subscriptionsSnapshot = await getDocs(subscriptionsCollection);
      const subscriptions = subscriptionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate active schools (status is 'active')
      const active = schools.filter(s => s.status === 'active').length;

      // Calculate suspended schools
      const suspended = schools.filter(s => s.status === 'suspended').length;

      // Calculate trial subscriptions
      const trial = subscriptions.filter(s => 
        s.plan === 'trial' && s.status === 'active'
      ).length;

      // Calculate expiring soon (within 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringSubs = subscriptions.filter(sub => {
        if (!sub.expiry_date || sub.status !== 'active') return false;
        const expiry = getDateValue(sub.expiry_date);
        return expiry && expiry > now && expiry <= thirtyDaysFromNow;
      });
      const expiring = new Set(expiringSubs.map(sub => sub.school_id)).size;

      // Calculate trends (compare with previous period if available)
      // For now, we'll use mock trends since we don't have historical data
      // In production, you'd store historical data or use last month's data
      const trends = {
        active: active > 0 ? Math.round((active / schools.length) * 100) : 0,
        expiring: expiring > 0 ? Math.round((expiring / active) * 100) : 0,
        suspended: suspended > 0 ? Math.round((suspended / schools.length) * 100) : 0,
        trial: trial > 0 ? Math.round((trial / schools.length) * 100) : 0
      };

      setStatusData({
        active,
        expiring,
        suspended,
        trial,
        total: schools.length,
        lastUpdated: new Date()
      });
      setTrend(trends);

    } catch (error) {
      console.error('Error fetching status data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'expiring': return 'bg-orange-500';
      case 'suspended': return 'bg-red-500';
      case 'trial': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusDotColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'expiring': return 'bg-orange-500';
      case 'suspended': return 'bg-red-500';
      case 'trial': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status) => {
    switch(status) {
      case 'active': return 'text-green-400';
      case 'expiring': return 'text-orange-400';
      case 'suspended': return 'text-red-400';
      case 'trial': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return <CheckCircle size={14} className="text-green-400" />;
      case 'expiring': return <Clock size={14} className="text-orange-400" />;
      case 'suspended': return <AlertCircle size={14} className="text-red-400" />;
      case 'trial': return <TrendingUp size={14} className="text-blue-400" />;
      default: return null;
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const items = [
    { 
      key: 'active',
      label: 'Active', 
      value: statusData.active, 
      percent: statusData.total > 0 ? (statusData.active / statusData.total * 100).toFixed(0) : 0,
      color: 'bg-green-500', 
      textColor: 'text-green-400', 
      dotColor: 'bg-green-500' 
    },
    { 
      key: 'expiring',
      label: 'Expiring Soon', 
      value: statusData.expiring, 
      percent: statusData.total > 0 ? (statusData.expiring / statusData.total * 100).toFixed(0) : 0,
      color: 'bg-orange-500', 
      textColor: 'text-orange-400', 
      dotColor: 'bg-orange-500' 
    },
    { 
      key: 'suspended',
      label: 'Suspended', 
      value: statusData.suspended, 
      percent: statusData.total > 0 ? (statusData.suspended / statusData.total * 100).toFixed(0) : 0,
      color: 'bg-red-500', 
      textColor: 'text-red-400', 
      dotColor: 'bg-red-500' 
    },
    { 
      key: 'trial',
      label: 'Free Trial', 
      value: statusData.trial, 
      percent: statusData.total > 0 ? (statusData.trial / statusData.total * 100).toFixed(0) : 0,
      color: 'bg-blue-500', 
      textColor: 'text-blue-400', 
      dotColor: 'bg-blue-500' 
    }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">School Status</h3>
        </div>
        <div className="p-4 flex items-center justify-center h-[160px]">
          <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">School Status</h3>
          {statusData.lastUpdated && (
            <span className="text-[10px] text-gray-400">
              Updated {formatTimeAgo(statusData.lastUpdated)}
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {statusData.total === 0 ? (
          <div className="text-center py-4">
            <div className="text-gray-400 text-sm">No schools registered</div>
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.dotColor}`} />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  {getStatusIcon(item.key)}
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 sm:w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-700 ease-out`} 
                    style={{ width: `${Math.min(100, Math.max(0, parseFloat(item.percent)))}%` }} 
                  />
                </div>
                <div className="flex items-center gap-2 min-w-[60px]">
                  <span className={`text-sm font-mono ${item.textColor} min-w-[30px]`}>
                    {item.value}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    ({item.percent}%)
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Total */}
        {statusData.total > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Total Schools</span>
              <span className="font-semibold text-gray-700">{statusData.total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusBars;
