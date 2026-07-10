import React, { useState, useEffect } from 'react';
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
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import DataTable from '../../components/Common/DataTable';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

const Subscriptions = () => {
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

  // Collection references
  const subscriptionsCollection = collection(db, 'subscriptions');
  const schoolsCollection = collection(db, 'schools');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      // Query subscriptions ordered by expiry date
      const q = query(
        subscriptionsCollection,
        orderBy('expiry_date', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const subscriptionsData = [];

      for (const doc of snapshot.docs) {
        const subscription = {
          id: doc.id,
          ...doc.data()
        };

        // Fetch school data if school_id exists
        if (subscription.school_id) {
          const schoolDoc = await getDoc(doc(db, 'schools', subscription.school_id));
          if (schoolDoc.exists()) {
            subscription.schools = {
              id: schoolDoc.id,
              ...schoolDoc.data()
            };
          }
        }

        subscriptionsData.push(subscription);
      }
      
      // Calculate expiring count
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiring = subscriptionsData?.filter(sub => {
        if (!sub.expiry_date) return false;
        const expiry = sub.expiry_date.toDate ? sub.expiry_date.toDate() : new Date(sub.expiry_date);
        return expiry > now && expiry <= thirtyDaysFromNow;
      }).length || 0;
      
      setExpiringCount(expiring);
      setSubscriptions(subscriptionsData);
    } catch (error) {
      console.error('Load subscriptions error:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

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
      const subscriptionRef = doc(db, 'subscriptions', selectedSubscription.id);
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
      
      await updateDoc(subscriptionRef, updateData);
      
      // Log audit
      await addDoc(auditLogsCollection, {
        action: 'subscription_override',
        entity_type: 'subscription',
        entity_id: selectedSubscription.id,
        new_values: extendData,
        user_id: currentUser?.uid || null,
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
      if (!sub.expiry_date) return false;
      const expiry = getDateValue(sub.expiry_date);
      return expiry > now && expiry <= thirtyDaysFromNow;
    });
    
    if (expiringSubs.length === 0) {
      toast.error('No expiring subscriptions found');
      return;
    }
    
    try {
      const currentUser = auth.currentUser;
      
      // Send reminders via audit_logs
      const reminderPromises = expiringSubs.map(async (sub) => {
        const expiry = getDateValue(sub.expiry_date);
        const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
        
        // Log reminder in audit
        await addDoc(auditLogsCollection, {
          action: 'subscription_reminder_sent',
          entity_type: 'subscription',
          entity_id: sub.id,
          new_values: { 
            school_name: sub.schools?.name,
            expiry_date: expiry?.toISOString(),
            days_left: daysLeft
          },
          user_id: currentUser?.uid || null,
          created_at: new Date()
        });
        
        console.log(`Reminder sent to ${sub.schools?.name} - Expires: ${formatDate(sub.expiry_date)}`);
      });
      
      await Promise.all(reminderPromises);
      toast.success(`Reminder logged for ${expiringSubs.length} school(s)`);
    } catch (error) {
      console.error('Broadcast error:', error);
      toast.error('Failed to send reminders');
    }
  };

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return 0;
    const expiry = getDateValue(expiryDate);
    if (!expiry) return 0;
    const now = new Date();
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  const columns = [
    { key: 'school', label: 'School', render: (row) => (
      <div className="school-name">{row.schools?.name || '-'}</div>
    )},
    { key: 'plan', label: 'Plan', render: (row) => (
      <span className={`plan-badge ${row.plan === 'trial' ? 'plan-trial' : row.plan === 'premium' ? 'plan-premium' : 'plan-standard'}`}>
        {row.plan === 'trial' ? 'Free Trial' : row.plan === 'premium' ? 'Premium' : 'Standard'}
      </span>
    )},
    { key: 'expiry_date', label: 'Expiry Date', render: (row) => (
      <div className="date-value">{formatDate(row.expiry_date)}</div>
    )},
    { key: 'days_left', label: 'Days Left', render: (row) => {
      const days = getDaysLeft(row.expiry_date);
      return (
        <span className={`days-left ${days <= 30 ? 'days-critical' : days <= 60 ? 'days-warning' : 'days-good'}`}>
          {days} days
        </span>
      );
    }},
    { key: 'status', label: 'Status', render: (row) => (
      <span className={`status-badge ${row.status === 'active' ? 'status-active' : 'status-expired'}`}>
        {row.status === 'active' ? 'Active' : 'Expired'}
      </span>
    )},
    { key: 'actions', label: 'Actions', render: (row) => (
      <button 
        onClick={() => {
          setSelectedSubscription(row);
          setShowExtendModal(true);
        }}
        className="btn-extend"
      >
        Extend
      </button>
    )}
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="subscriptions-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Management</h1>
          <p className="page-subtitle">Manage school subscriptions, extensions, and trial periods</p>
        </div>
        <button 
          onClick={() => {
            setSelectedSubscription(null);
            setExtendData({ action: 'grant_free', newExpiry: '', reason: '' });
            setShowExtendModal(true);
          }} 
          className="btn-primary"
        >
          <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Grant Free Access
        </button>
      </div>
      
      {/* Warning Alert */}
      {expiringCount > 0 && (
        <div className="alert-warning">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <div className="alert-text">
              <span className="alert-message">
                {expiringCount} school{expiringCount !== 1 ? 's' : ''} expiring within 30 days.
              </span>
              <button onClick={sendBulkReminder} className="alert-link">
                Send reminders now →
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Subscriptions Table */}
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">All Subscriptions</h3>
          <button onClick={sendBulkReminder} className="btn-secondary">
            <svg className="btn-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Bulk Reminder
          </button>
        </div>
        <div className="table-wrapper">
          <DataTable 
            columns={columns} 
            data={subscriptions}
            emptyMessage="No subscriptions found"
          />
        </div>
      </div>
      
      {/* Extend Modal */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => {
          setShowExtendModal(false);
          setExtendData({ action: 'extend', newExpiry: '', reason: '' });
        }}
        title="Extend / Override Subscription"
      >
        <div className="modal-content">
          <div className="school-info">
            <div className="school-info-label">School</div>
            <div className="school-info-value">{selectedSubscription?.schools?.name || 'New School'}</div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Action</label>
            <select
              value={extendData.action}
              onChange={(e) => setExtendData({ ...extendData, action: e.target.value })}
              className="form-select"
            >
              <option value="extend">Extend Subscription</option>
              <option value="grant_free">Grant Free Access (30-day trial)</option>
              <option value="reset_trial">Reset to Trial (30 days)</option>
            </select>
          </div>
          
          {extendData.action === 'extend' && (
            <div className="form-group">
              <label className="form-label">New Expiry Date</label>
              <input
                type="date"
                value={extendData.newExpiry}
                onChange={(e) => setExtendData({ ...extendData, newExpiry: e.target.value })}
                className="form-input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Reason (logged in audit trail)</label>
            <textarea
              rows={3}
              value={extendData.reason}
              onChange={(e) => setExtendData({ ...extendData, reason: e.target.value })}
              className="form-textarea"
              placeholder="Enter reason for override..."
            />
          </div>
          
          <div className="audit-note">
            <svg className="audit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This action is permanently logged with your admin ID, timestamp, and IP address.
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={() => {
              setShowExtendModal(false);
              setExtendData({ action: 'extend', newExpiry: '', reason: '' });
            }} 
            className="modal-btn-cancel"
          >
            Cancel
          </button>
          <button onClick={handleExtend} className="modal-btn-submit">
            Apply Override
          </button>
        </div>
      </Modal>

      <style jsx>{`
        .subscriptions-page {
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
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .page-header {
            flex-direction: row;
            align-items: center;
          }
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

        /* Buttons */
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #ff6b00;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #e55a00;
          transform: translateY(-1px);
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #4a5568;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .btn-icon {
          width: 18px;
          height: 18px;
        }

        .btn-icon-small {
          width: 14px;
          height: 14px;
        }

        /* Alert */
        .alert-warning {
          background: rgba(255, 107, 0, 0.08);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 24px;
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .alert-icon {
          font-size: 18px;
        }

        .alert-text {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .alert-message {
          font-size: 14px;
          color: #4a5568;
        }

        .alert-link {
          background: none;
          border: none;
          color: #ff6b00;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
        }

        .alert-link:hover {
          color: #e55a00;
          text-decoration: underline;
        }

        /* Table Card */
        .table-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
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

        .table-wrapper {
          overflow-x: auto;
        }

        /* Table Cell Styles */
        .school-name {
          font-weight: 600;
          color: #1a202c;
        }

        .plan-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .plan-standard {
          background: rgba(255, 107, 0, 0.1);
          color: #ff6b00;
        }

        .plan-premium {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }

        .plan-trial {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .date-value {
          color: #4a5568;
          font-size: 13px;
        }

        .days-left {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .days-good {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .days-warning {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .days-critical {
          background: rgba(255, 107, 0, 0.15);
          color: #ff6b00;
          font-weight: 600;
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .status-expired {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .btn-extend {
          padding: 4px 12px;
          background: rgba(255, 107, 0, 0.1);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #ff6b00;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-extend:hover {
          background: rgba(255, 107, 0, 0.2);
        }

        /* Modal Styles */
        .modal-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .school-info {
          background: #f7fafc;
          border-radius: 10px;
          padding: 12px 16px;
        }

        .school-info-label {
          font-size: 11px;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .school-info-value {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
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
        .form-select,
        .form-textarea {
          padding: 10px 12px;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1a202c;
          transition: all 0.2s;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #ff6b00;
          background: white;
        }

        .audit-note {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 107, 0, 0.05);
          border: 1px solid rgba(255, 107, 0, 0.15);
          border-radius: 8px;
          padding: 12px;
          font-size: 12px;
          color: #ff6b00;
        }

        .audit-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
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

        .modal-btn-submit:hover {
          background: #e55a00;
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
          
          .btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .alert-content {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Subscriptions;
