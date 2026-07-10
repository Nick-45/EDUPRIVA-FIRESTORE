```javascript
// src/components/SchoolAdmin/modals/NotificationModal.js
import React from 'react';
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';

const NotificationModal = ({ isOpen, onClose, notifications, setNotifications }) => {
  const { user } = useAuth();

  const markAllRead = async () => {
    try {
      // 🔥 Target only this school's notifications
      const q = query(
        collection(db, 'schools', user.schoolId, 'notifications'),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { read: true });
      });

      await batch.commit();

      // ✅ Update UI instantly
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      onClose();
    } catch (error) {
      console.error('Failed to mark notifications:', error);
    }
  };

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch(type) {
      case 'payment': return '💰';
      case 'withdrawal': return '💸';
      case 'student': return '👨‍🎓';
      case 'academic': return '📚';
      case 'ai': return '🤖';
      default: return '📌';
    }
  };

  const getColor = (type) => {
    switch(type) {
      case 'payment': return '#78c487';
      case 'withdrawal': return '#ff6b00';
      case 'student': return '#90caf9';
      case 'academic': return '#4faa5e';
      default: return '#6a9674';
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Notifications</span>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.body}>
          {notifications.length === 0 ? (
            <div style={styles.emptyState}>No notifications</div>
          ) : (
            notifications.map((notif, i) => (
              <div key={i} style={styles.notificationItem}>
                <div 
                  style={{ 
                    ...styles.notifIcon, 
                    background: `${getColor(notif.type)}20`, 
                    color: getColor(notif.type) 
                  }}
                >
                  {getIcon(notif.type)}
                </div>

                <div style={styles.notifContent}>
                  <div style={styles.notifMessage}>
                    {notif.action} - {notif.details}
                  </div>
                  <div style={styles.notifTime}>
                    {new Date(notif.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.btnOutline} onClick={markAllRead}>
            Mark All Read
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { 
    position: 'fixed', 
    inset: 0, 
    background: 'rgba(0,0,0,0.7)', 
    zIndex: 1000, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  modal: { 
    background: '#162b1b', 
    border: '1px solid #2a4a34', 
    borderRadius: 16, 
    width: 450, 
    maxHeight: '85vh', 
    overflowY: 'auto' 
  },
  header: { 
    padding: '18px 22px', 
    borderBottom: '1px solid #2a4a34', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  title: { 
    fontFamily: "'Space Grotesk', sans-serif", 
    fontSize: 16, 
    fontWeight: 600, 
    color: '#e8f5eb' 
  },
  closeBtn: { 
    background: 'none', 
    border: 'none', 
    color: '#6a9674', 
    cursor: 'pointer', 
    fontSize: 20 
  },
  body: { padding: '0' },
  footer: { 
    padding: '16px 22px', 
    borderTop: '1px solid #2a4a34', 
    display: 'flex', 
    justifyContent: 'flex-end' 
  },
  emptyState: { 
    textAlign: 'center', 
    padding: '40px', 
    color: '#6a9674' 
  },
  notificationItem: { 
    display: 'flex', 
    gap: 12, 
    padding: '14px 18px', 
    borderBottom: '1px solid rgba(42,74,52,0.4)', 
    alignItems: 'flex-start' 
  },
  notifIcon: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: 16, 
    flexShrink: 0 
  },
  notifContent: { flex: 1 },
  notifMessage: { 
    fontSize: 13, 
    color: '#e8f5eb', 
    lineHeight: 1.4 
  },
  notifTime: { 
    fontSize: 11, 
    color: '#6a9674', 
    marginTop: 4 
  },
  btnOutline: { 
    padding: '8px 16px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 600, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#9bbfa4', 
    border: '1px solid #2a4a34' 
  },
};

export default NotificationModal;
```
