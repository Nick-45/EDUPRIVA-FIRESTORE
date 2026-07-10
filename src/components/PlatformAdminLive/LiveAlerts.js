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
  orderBy, 
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    critical: 0,
    warning: 0,
    info: 0,
    success: 0
  });

  const schoolsUnsubscribeRef = useRef(null);
  const subscriptionsUnsubscribeRef = useRef(null);
  const paymentsUnsubscribeRef = useRef(null);
  const isMounted = useRef(true);

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const subscriptionsCollection = collection(db, 'subscriptions');
  const paymentsCollection = collection(db, 'payments');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    isMounted.current = true;
    loadAlerts();
    subscribeToAlerts();

    return () => {
      isMounted.current = false;
      if (schoolsUnsubscribeRef.current) schoolsUnsubscribeRef.current();
      if (subscriptionsUnsubscribeRef.current) subscriptionsUnsubscribeRef.current();
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
    return d ? d.toLocaleString() : 'N/A';
  };

  const loadAlerts = async () => {
    try {
      const alertsList = [];
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // 1. Check for expiring subscriptions (within 30 days)
      const subscriptionsQuery = query(
        subscriptionsCollection,
        where('status', '==', 'active'),
        where('expiry_date', '<=', thirtyDaysFromNow),
        where('expiry_date', '>', now)
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      const expiringSubs = [];

      for (const subDoc of subscriptionsSnapshot.docs) {
        const sub = {
          id: subDoc.id,
          ...subDoc.data()
        };

        // Fetch school data
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

        expiringSubs.push(sub);
      }

      if (expiringSubs.length > 0) {
        const schoolNames = expiringSubs.map(s => s.schools?.name).filter(Boolean);
        alertsList.push({
          id: 'expiring_' + Date.now(),
          type: 'warning',
          title: `${expiringSubs.length} School${expiringSubs.length !== 1 ? 's' : ''} Expiring Within 30 Days`,
          description: schoolNames.slice(0, 5).join(', ') + (schoolNames.length > 5 ? ` +${schoolNames.length - 5} more` : ''),
          time: new Date().toISOString(),
          action: 'Send Reminder',
          data: { subscriptions: expiringSubs }
        });
      }

      // 2. Check for suspended schools
      const schoolsQuery = query(
        schoolsCollection,
        where('status', '==', 'suspended')
      );
      const schoolsSnapshot = await getDocs(schoolsQuery);
      const suspendedSchools = schoolsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (suspendedSchools.length > 0) {
        alertsList.push({
          id: 'suspended_' + Date.now(),
          type: 'critical',
          title: `${suspendedSchools.length} School${suspendedSchools.length !== 1 ? 's' : ''} Suspended`,
          description: suspendedSchools.map(s => s.name).slice(0, 3).join(', ') + (suspendedSchools.length > 3 ? ` +${suspendedSchools.length - 3} more` : ''),
          time: new Date().toISOString(),
          action: 'Reinstate',
          data: { schools: suspendedSchools }
        });
      }

      // 3. Check for recent failed payments (last 24 hours)
      const paymentsQuery = query(
        paymentsCollection,
        where('status', '==', 'failed'),
        where('payment_date', '>=', yesterday)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const failedPayments = [];

      for (const paymentDoc of paymentsSnapshot.docs) {
        const payment = {
          id: paymentDoc.id,
          ...paymentDoc.data()
        };

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

        failedPayments.push(payment);
      }

      if (failedPayments.length > 0) {
        alertsList.push({
          id: 'failed_payments_' + Date.now(),
          type: 'warning',
          title: `${failedPayments.length} Failed Payment${failedPayments.length !== 1 ? 's' : ''}`,
          description: `Total failed amount: KES ${failedPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}`,
          time: new Date().toISOString(),
          action: 'View Details',
          data: { payments: failedPayments }
        });
      }

      // 4. Check for new schools registered (last 7 days)
      const newSchoolsQuery = query(
        schoolsCollection,
        where('created_at', '>=', weekAgo),
        orderBy('created_at', 'desc')
      );
      const newSchoolsSnapshot = await getDocs(newSchoolsQuery);
      const newSchools = newSchoolsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (newSchools.length > 0) {
        alertsList.push({
          id: 'new_schools_' + Date.now(),
          type: 'info',
          title: `${newSchools.length} New School${newSchools.length !== 1 ? 's' : ''} Registered`,
          description: newSchools.map(s => s.name).slice(0, 3).join(', ') + (newSchools.length > 3 ? ` +${newSchools.length - 3} more` : ''),
          time: new Date().toISOString(),
          action: 'View Schools',
          data: { schools: newSchools }
        });
      }

      // 5. Check for system events from audit_logs (last 24 hours)
      const auditQuery = query(
        auditLogsCollection,
        where('created_at', '>=', yesterday),
        orderBy('created_at', 'desc'),
        limit(5)
      );
      const auditSnapshot = await getDocs(auditQuery);
      const auditEvents = auditSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (auditEvents.length > 0) {
        alertsList.push({
          id: 'audit_events_' + Date.now(),
          type: 'info',
          title: `${auditEvents.length} Recent System ${auditEvents.length !== 1 ? 'Events' : 'Event'}`,
          description: auditEvents.map(e => e.action).slice(0, 3).join(', '),
          time: new Date().toISOString(),
          action: 'View Logs',
          data: { events: auditEvents }
        });
      }

      // Calculate stats
      const statsCount = {
        critical: alertsList.filter(a => a.type === 'critical').length,
        warning: alertsList.filter(a => a.type === 'warning').length,
        info: alertsList.filter(a => a.type === 'info').length,
        success: alertsList.filter(a => a.type === 'success').length
      };

      if (isMounted.current) {
        setAlerts(alertsList);
        setStats(statsCount);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const subscribeToAlerts = () => {
    // Subscribe to schools changes
    const schoolsUnsubscribe = onSnapshot(schoolsCollection, () => {
      if (isMounted.current) {
        loadAlerts();
      }
    }, (error) => {
      console.error('Schools subscription error:', error);
    });
    schoolsUnsubscribeRef.current = schoolsUnsubscribe;

    // Subscribe to subscriptions changes
    const subscriptionsUnsubscribe = onSnapshot(subscriptionsCollection, () => {
      if (isMounted.current) {
        loadAlerts();
      }
    }, (error) => {
      console.error('Subscriptions subscription error:', error);
    });
    subscriptionsUnsubscribeRef.current = subscriptionsUnsubscribe;

    // Subscribe to payments changes
    const paymentsUnsubscribe = onSnapshot(paymentsCollection, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const newPayment = { id: change.doc.id, ...change.doc.data() };
          if (newPayment.status === 'failed' && isMounted.current) {
            toast.error('New failed payment detected!', { icon: '⚠️' });
            loadAlerts();
          }
        }
      });
    }, (error) => {
      console.error('Payments subscription error:', error);
    });
    paymentsUnsubscribeRef.current = paymentsUnsubscribe;
  };

  const handleAction = async (alert) => {
    if (alert.title.includes('Expiring')) {
      toast.success('Reminders sent to all expiring schools', { icon: '📧' });
    } 
    else if (alert.title.includes('Suspended')) {
      toast.success('Opening reinstatement dialog...', { icon: '🔄' });
    }
    else if (alert.title.includes('Failed Payment')) {
      toast.info('Viewing failed payment details...', { icon: '💰' });
    }
    else if (alert.title.includes('New School')) {
      toast.info('Viewing new schools...', { icon: '🏫' });
    }
    else if (alert.title.includes('System Events')) {
      toast.info('Opening audit logs...', { icon: '📋' });
    }
  };

  const markAllResolved = async () => {
    try {
      const currentUser = auth.currentUser;
      await addDoc(auditLogsCollection, {
        action: 'All alerts marked as resolved',
        entity_type: 'alert',
        user_id: currentUser?.uid,
        created_at: new Date()
      });
      
      setAlerts([]);
      toast.success('All alerts marked as resolved');
    } catch (error) {
      console.error('Error marking alerts resolved:', error);
      toast.error('Failed to mark alerts resolved');
    }
  };

  const refreshAlerts = () => {
    loadAlerts();
    toast.success('Alerts refreshed', { icon: '🔄' });
  };

  const getIcon = (type) => {
    switch(type) {
      case 'critical': return <XCircle size={20} className="text-red-500 flex-shrink-0" />;
      case 'warning': return <AlertTriangle size={20} className="text-orange-500 flex-shrink-0" />;
      case 'info': return <Info size={20} className="text-blue-500 flex-shrink-0" />;
      case 'success': return <CheckCircle size={20} className="text-green-500 flex-shrink-0" />;
      default: return <Bell size={20} className="text-gray-500 flex-shrink-0" />;
    }
  };

  const getBgColor = (type) => {
    switch(type) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-orange-50 border-orange-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      case 'success': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = (type) => {
    switch(type) {
      case 'critical': return 'text-red-800';
      case 'warning': return 'text-orange-800';
      case 'info': return 'text-blue-800';
      case 'success': return 'text-green-800';
      default: return 'text-gray-800';
    }
  };

  const getButtonColor = (type) => {
    switch(type) {
      case 'critical': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'warning': return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'info': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'success': return 'bg-green-500 hover:bg-green-600 text-white';
      default: return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

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
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time platform notifications and warnings</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshAlerts} 
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {alerts.length > 0 && (
            <button 
              onClick={markAllResolved} 
              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm text-white transition"
            >
              Mark All Resolved
            </button>
          )}
        </div>
      </div>
      
      {/* Stats Summary */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.critical > 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="text-xs text-red-600 uppercase tracking-wider">Critical</div>
              <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            </div>
          )}
          {stats.warning > 0 && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="text-xs text-orange-600 uppercase tracking-wider">Warnings</div>
              <div className="text-2xl font-bold text-orange-700">{stats.warning}</div>
            </div>
          )}
          {stats.info > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-xs text-blue-600 uppercase tracking-wider">Info</div>
              <div className="text-2xl font-bold text-blue-700">{stats.info}</div>
            </div>
          )}
          {stats.success > 0 && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="text-xs text-green-600 uppercase tracking-wider">Success</div>
              <div className="text-2xl font-bold text-green-700">{stats.success}</div>
            </div>
          )}
        </div>
      )}
      
      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className={`rounded-xl p-4 border flex flex-col md:flex-row items-start gap-4 ${getBgColor(alert.type)}`}>
            {getIcon(alert.type)}
            <div className="flex-1">
              <div className={`font-semibold text-sm md:text-base ${getTextColor(alert.type)}`}>
                {alert.title}
              </div>
              <div className={`text-sm mt-1 ${getTextColor(alert.type)} opacity-80`}>
                {alert.description}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-2">
                {formatDate(alert.time)}
              </div>
            </div>
            <button 
              onClick={() => handleAction(alert)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${getButtonColor(alert.type)}`}
            >
              {alert.action}
            </button>
          </div>
        ))}
        
        {alerts.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
            <div className="text-gray-900 font-medium text-lg">All clear!</div>
            <div className="text-sm text-gray-500 mt-1">No active alerts at this time</div>
            <p className="text-xs text-gray-400 mt-2">System is operating normally</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAlerts;
