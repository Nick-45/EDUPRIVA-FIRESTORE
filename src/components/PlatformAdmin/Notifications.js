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
import DataTable from '../../components/Common/DataTable';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [broadcastData, setBroadcastData] = useState({
    target: 'all',
    channel: 'both',
    subject: '',
    message: '',
    urgent: false
  });
  const [sending, setSending] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Collection reference
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    loadNotificationLogs();
  }, []);

  const loadNotificationLogs = async () => {
    try {
      // First try to get broadcast-specific logs
      const broadcastQuery = query(
        auditLogsCollection,
        where('action', '==', 'broadcast_sent'),
        orderBy('created_at', 'desc'),
        limit(50)
      );
      
      let snapshot = await getDocs(broadcastQuery);
      let data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If no broadcast logs found, get recent audit logs as fallback
      if (data.length === 0) {
        const fallbackQuery = query(
          auditLogsCollection,
          orderBy('created_at', 'desc'),
          limit(20)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        data = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      // Format the logs for display
      const formattedLogs = data.map(log => ({
        id: log.id,
        date: log.created_at,
        target: log.new_values?.target || log.entity_type || 'system',
        channel: log.new_values?.channel || 'system',
        status: 'sent',
        subject: log.new_values?.subject || log.action || 'Notification',
        recipients: log.new_values?.recipient_count || 1,
        urgent: log.new_values?.urgent || false
      }));
      
      setNotificationLogs(formattedLogs);
    } catch (error) {
      console.error('Failed to load notification logs:', error);
      setNotificationLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastData.subject || !broadcastData.message) {
      toast.error('Please enter subject and message');
      return;
    }
    
    setSending(true);
    
    try {
      // Call the Cloud Function or API endpoint
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: broadcastData.target,
          channel: broadcastData.channel,
          subject: broadcastData.subject,
          message: broadcastData.message,
          urgent: broadcastData.urgent
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Broadcast sent to ${result.sentCount} recipients (${result.emailSent || 0} emails, ${result.smsSent || 0} SMS)`);
        setBroadcastData({
          ...broadcastData,
          subject: '',
          message: '',
          urgent: false
        });
        loadNotificationLogs(); // Refresh logs
      } else {
        toast.error(result.error || 'Failed to send broadcast');
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleString();
    if (date instanceof Date) return date.toLocaleString();
    return new Date(date).toLocaleString();
  };

  const columns = [
    { key: 'date', label: 'Date', render: (row) => (
      <div className="log-date">{formatDate(row.date)}</div>
    )},
    { key: 'subject', label: 'Subject', render: (row) => (
      <div className="log-subject">
        {row.urgent && <span className="urgent-badge">URGENT</span>}
        <span>{row.subject}</span>
      </div>
    )},
    { key: 'target', label: 'Target', render: (row) => (
      <div className="log-target">
        {row.target === 'all' ? 'All Schools' :
         row.target === 'active' ? 'Active Schools' :
         row.target === 'expiring' ? 'Expiring Soon' :
         row.target === 'suspended' ? 'Suspended Schools' :
         row.target === 'trial' ? 'Free Trial' :
         row.target === 'system' ? 'System Event' :
         row.target}
      </div>
    )},
    { key: 'channel', label: 'Channel', render: (row) => (
      <div className="log-channel">
        {row.channel === 'both' ? 'Email + SMS' :
         row.channel === 'email' ? 'Email Only' : 
         row.channel === 'sms' ? 'SMS Only' :
         'System'}
      </div>
    )},
    { key: 'recipients', label: 'Recipients', render: (row) => (
      <div className="log-recipients">{row.recipients} {row.recipients === 1 ? 'school' : 'schools'}</div>
    )},
    { key: 'status', label: 'Status', render: (row) => (
      <span className="status-badge status-sent">
        ✓ Sent
      </span>
    )}
  ];

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Broadcast</h1>
          <p className="page-subtitle">Send notifications to schools via email and SMS</p>
        </div>
      </div>
      
      {/* Info Alert */}
      <div className="info-alert">
        <div className="info-alert-content">
          <span className="info-alert-icon">ℹ️</span>
          <div className="info-alert-text">
            Notifications sent via SMTP (Email) + Africa's Talking (SMS). All broadcasts are logged in the system.
          </div>
        </div>
      </div>
      
      <div className="two-column-grid">
        {/* Send Notification Card */}
        <div className="form-card">
          <div className="card-header">
            <h3 className="card-title">Send Notification</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <select
                value={broadcastData.target}
                onChange={(e) => setBroadcastData({ ...broadcastData, target: e.target.value })}
                className="form-select"
              >
                <option value="all">All Schools</option>
                <option value="active">Active Only</option>
                <option value="expiring">Expiring Soon</option>
                <option value="suspended">Suspended</option>
                <option value="trial">Free Trial</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Channel</label>
              <select
                value={broadcastData.channel}
                onChange={(e) => setBroadcastData({ ...broadcastData, channel: e.target.value })}
                className="form-select"
              >
                <option value="both">Email + SMS (Recommended)</option>
                <option value="email">Email Only</option>
                <option value="sms">SMS Only</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                value={broadcastData.subject}
                onChange={(e) => setBroadcastData({ ...broadcastData, subject: e.target.value })}
                className="form-input"
                placeholder="e.g., Subscription Renewal Reminder"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                rows={4}
                value={broadcastData.message}
                onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                className="form-textarea"
                placeholder="Dear School Admin, your subscription is due for renewal…"
              />
              <div className="field-hint">SMS messages are limited to 160 characters</div>
            </div>
            
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="urgentFlag"
                checked={broadcastData.urgent}
                onChange={(e) => setBroadcastData({ ...broadcastData, urgent: e.target.checked })}
                className="checkbox"
              />
              <label htmlFor="urgentFlag" className="checkbox-label">Mark as urgent</label>
            </div>
            
            <button
              onClick={handleSendBroadcast}
              disabled={sending}
              className="btn-send"
            >
              {sending ? (
                <>
                  <div className="spinner-small"></div>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                  Send to All Schools →
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Notification Logs Card */}
        <div className="logs-card">
          <div className="card-header">
            <h3 className="card-title">Notification Logs</h3>
          </div>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={notificationLogs}
              emptyMessage="No notifications sent yet"
            />
          )}
        </div>
      </div>

      <style jsx>{`
        .notifications-page {
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

        /* Info Alert */
        .info-alert {
          background: rgba(255, 107, 0, 0.08);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 24px;
        }

        .info-alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .info-alert-icon {
          font-size: 18px;
        }

        .info-alert-text {
          font-size: 13px;
          color: #4a5568;
        }

        .field-hint {
          font-size: 11px;
          color: #a0aec0;
          margin-top: 4px;
        }

        /* Two Column Layout */
        .two-column-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 1024px) {
          .two-column-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Cards */
        .form-card,
        .logs-card {
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

        .card-body {
          padding: 20px;
        }

        /* Form Elements */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-select,
        .form-input,
        .form-textarea {
          padding: 10px 12px;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1a202c;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-select:focus,
        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #ff6b00;
          background: white;
        }

        .form-textarea {
          resize: vertical;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }

        .checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #ff6b00;
        }

        .checkbox-label {
          font-size: 14px;
          color: #4a5568;
          cursor: pointer;
        }

        /* Send Button */
        .btn-send {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #ff6b00;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-send:hover:not(:disabled) {
          background: #e55a00;
          transform: translateY(-1px);
        }

        .btn-send:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-icon {
          width: 16px;
          height: 16px;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Table Log Styles */
        .log-date {
          font-size: 12px;
          color: #718096;
          white-space: nowrap;
        }

        .log-subject {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .urgent-badge {
          background: #dc2626;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }

        .log-target,
        .log-channel,
        .log-recipients {
          font-size: 13px;
          color: #4a5568;
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-sent {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .status-failed {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        /* Loading State */
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 107, 0, 0.2);
          border-top-color: #ff6b00;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .page-title {
            font-size: 20px;
          }

          .card-header {
            padding: 12px 16px;
          }

          .card-body {
            padding: 16px;
          }

          .info-alert {
            padding: 12px;
          }
          
          .log-date {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default Notifications;
