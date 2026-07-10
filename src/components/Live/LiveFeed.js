import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  where
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Zap, Bell, Activity } from 'lucide-react';

const LiveFeed = ({ events }) => {
  const [liveEvents, setLiveEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [eventCount, setEventCount] = useState(0);
  const unsubscribeRef = useRef(null);

  // Collection references
  const auditLogsCollection = collection(db, 'audit_logs');
  const paymentsCollection = collection(db, 'payments');

  useEffect(() => {
    // Subscribe to real-time events from Firestore
    const setupRealtimeSubscription = () => {
      // Query for recent events from audit_logs
      const auditQuery = query(
        auditLogsCollection,
        orderBy('created_at', 'desc'),
        limit(10)
      );

      const unsubscribe = onSnapshot(auditQuery, (snapshot) => {
        const eventsData = [];
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const event = {
              id: change.doc.id,
              type: data.entity_type || data.action?.toLowerCase() || 'activity',
              school: data.school_name || data.schools?.name || 'System',
              message: formatAuditMessage(data),
              time: data.created_at,
              badge: getBadgeFromEvent(data),
              badgeColor: getBadgeColorFromEvent(data),
              timestamp: data.created_at
            };
            eventsData.push(event);
          }
        });

        // Also fetch recent payments
        const paymentQuery = query(
          paymentsCollection,
          orderBy('payment_date', 'desc'),
          limit(5)
        );

        // We'll combine audit logs and payments
        setLiveEvents(prev => {
          // Merge new events with existing, avoiding duplicates
          const newEvents = [...eventsData, ...prev];
          // Remove duplicates by id
          const uniqueEvents = newEvents.reduce((acc, current) => {
            const exists = acc.find(item => item.id === current.id);
            if (!exists) {
              acc.push(current);
            }
            return acc;
          }, []);
          return uniqueEvents.slice(0, 12);
        });

        setEventCount(snapshot.size);
        setConnectionStatus('connected');
      }, (error) => {
        console.error('Firestore subscription error:', error);
        setConnectionStatus('error');
      });

      unsubscribeRef.current = unsubscribe;
      return unsubscribe;
    };

    setupRealtimeSubscription();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const formatAuditMessage = (data) => {
    if (data.action) {
      if (data.action.includes('payment')) {
        const amount = data.new_values?.amount || data.amount || '';
        return `payment${amount ? ` of KES ${amount.toLocaleString()}` : ''} recorded`;
      }
      if (data.action.includes('subscription')) {
        return `subscription ${data.action.toLowerCase().includes('renew') ? 'renewed' : 'updated'}`;
      }
      if (data.action.includes('registration')) {
        return `new school registered, onboarding started`;
      }
      if (data.action.includes('generate')) {
        return `generated new record`;
      }
      return data.action.toLowerCase();
    }
    return 'activity recorded';
  };

  const getBadgeFromEvent = (data) => {
    if (data.entity_type === 'payment') return 'PMT';
    if (data.entity_type === 'subscription') return 'SUB';
    if (data.action?.includes('registration')) return 'NEW';
    if (data.action?.includes('generate') || data.entity_type === 'ai') return 'AI';
    if (data.action?.includes('suspend')) return 'SUS';
    if (data.action?.includes('withdraw')) return 'WDR';
    return 'ACT';
  };

  const getBadgeColorFromEvent = (data) => {
    if (data.entity_type === 'payment') return 'pay';
    if (data.entity_type === 'subscription') return 'pay';
    if (data.action?.includes('registration')) return 'new';
    if (data.action?.includes('generate') || data.entity_type === 'ai') return 'sys';
    if (data.action?.includes('suspend')) return 'warn';
    if (data.action?.includes('withdraw')) return 'pay';
    return 'pay';
  };

  const getDotColor = (type) => {
    switch(type) {
      case 'subscription': return 'bg-green-500';
      case 'payment': return 'bg-blue-500';
      case 'admin': return 'bg-orange-500';
      case 'suspension': return 'bg-red-500';
      case 'withdrawal': return 'bg-green-500';
      case 'registration': return 'bg-blue-500';
      case 'ai': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const badgeColors = {
    pay: 'bg-green-500/15 text-green-400 border border-green-500/20',
    new: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
    warn: 'bg-red-500/15 text-red-400 border border-red-500/20',
    sys: 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'just now';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = () => {
    switch(connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  if (liveEvents.length === 0 && connectionStatus === 'connecting') {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden h-[320px] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-sm font-semibold text-white">Live Platform Events</span>
          </div>
          <span className="text-xs text-gray-500 font-mono">Connecting...</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Activity size={32} className="text-gray-600 animate-pulse mx-auto mb-3" />
            <div className="text-sm text-gray-500">Loading live events...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden h-[320px] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
          <span className="text-sm font-semibold text-white">Live Platform Events</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">{eventCount} events</span>
        <button 
          className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-400 hover:text-white hover:bg-gray-600 transition"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {liveEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Bell size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No recent events</p>
            </div>
          </div>
        ) : (
          liveEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-3 p-3 border-b border-gray-700/50 hover:bg-gray-700/30 transition">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getDotColor(event.type)}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-300">
                  <span className="font-semibold text-white">{event.school}</span> 
                  <span className="text-gray-400"> — </span>
                  <span className="text-gray-300">{event.message}</span>
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1">
                  {formatTime(event.time)}
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono flex-shrink-0 ${badgeColors[event.badgeColor]}`}>
                {event.badge}
              </span>
            </div>
          ))
        )}
      </div>
      
      <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()} animate-pulse`} />
        <span className="font-mono">
          {connectionStatus === 'connected' ? 'Firestore Realtime · Connected' :
           connectionStatus === 'error' ? 'Connection Error' : 'Connecting...'}
        </span>
      </div>
    </div>
  );
};

export default LiveFeed;
