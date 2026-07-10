// src/components/SchoolAdmin/modals/SchoolProfileModal.js
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../../../services/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react';

const SchoolProfileModal = ({ isOpen, onClose, schoolProfile, setSchoolProfile, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    motto: '',
    address: '',
    city: '',
    current_term: '',
    current_academic_year: '',
    term_fee: '',
  });
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);

  // Collection references
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    if (schoolProfile) {
      setFormData({
        name: schoolProfile.name || '',
        email: schoolProfile.email || '',
        phone: schoolProfile.phone || '',
        motto: schoolProfile.motto || '',
        address: schoolProfile.address || '',
        city: schoolProfile.city || '',
        current_term: schoolProfile.current_term || '',
        current_academic_year: schoolProfile.current_academic_year || '',
        term_fee: schoolProfile.term_fee || '',
      });
      
      // Set subscription info if available
      setSubscription({
        status: schoolProfile.status || 'active',
        plan: schoolProfile.subscription_plan || 'standard',
        expiry_date: schoolProfile.subscription_end_date,
        start_date: schoolProfile.subscription_start_date,
      });
    }
  }, [schoolProfile]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      
      // Update school document in Firestore
      const schoolRef = doc(db, 'schools', schoolProfile.id);
      await updateDoc(schoolRef, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        motto: formData.motto,
        address: formData.address,
        city: formData.city,
        current_term: formData.current_term,
        current_academic_year: formData.current_academic_year,
        term_fee: parseFloat(formData.term_fee) || 0,
        updated_at: new Date()
      });

      // Update local state
      setSchoolProfile({ ...schoolProfile, ...formData });

      // Log to audit
      await addDoc(auditLogsCollection, {
        school_id: schoolProfile.id,
        user_id: currentUser?.uid,
        action: 'Updated school profile',
        entity_type: 'settings',
        new_values: formData,
        created_at: new Date()
      });

      onSuccess('School profile updated successfully', 'success');
      onClose();
    } catch (err) {
      console.error('Error updating school profile:', err);
      setError(err.message || 'Failed to update school profile');
      onSuccess('Failed to update school profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    return new Date(date).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>School Settings</span>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div style={styles.body}>
          {error && (
            <div style={styles.errorCard}>
              <AlertCircle size={16} />
              <span style={styles.errorText}>{error}</span>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>School Name</label>
            <input 
              style={styles.input}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter school name"
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>School Email</label>
              <input 
                type="email"
                style={styles.input}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@school.ac.ke"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input 
                style={styles.input}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254 712 345 678"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>City</label>
              <input 
                style={styles.input}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Nairobi"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Address</label>
              <input 
                style={styles.input}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="School address"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>School Motto</label>
            <input 
              style={styles.input}
              value={formData.motto}
              onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
              placeholder="Excellence Through Knowledge"
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Current Term</label>
              <select 
                style={styles.select}
                value={formData.current_term}
                onChange={(e) => setFormData({ ...formData, current_term: e.target.value })}
              >
                <option value="">Select Term</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Academic Year</label>
              <input 
                style={styles.input}
                value={formData.current_academic_year}
                onChange={(e) => setFormData({ ...formData, current_academic_year: e.target.value })}
                placeholder="2025"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Term Fee (KES)</label>
            <input 
              type="number"
              style={styles.input}
              value={formData.term_fee}
              onChange={(e) => setFormData({ ...formData, term_fee: e.target.value })}
              placeholder="12500"
            />
          </div>

          {subscription && (
            <div style={styles.subscriptionCard}>
              <div style={styles.subscriptionHeader}>
                <span style={styles.subscriptionTitle}>Subscription Details</span>
                <span className={`status-badge ${subscription.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                  {subscription.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={styles.subscriptionInfo}>
                <div>
                  <div style={styles.subscriptionLabel}>Plan</div>
                  <div style={styles.subscriptionValue}>
                    {subscription.plan === 'trial' ? 'Free Trial' : 
                     subscription.plan === 'premium' ? 'Premium' : 'Standard'}
                  </div>
                </div>
                <div>
                  <div style={styles.subscriptionLabel}>Expiry</div>
                  <div style={styles.subscriptionValue}>
                    {formatDate(subscription.expiry_date)}
                  </div>
                </div>
                <div>
                  <div style={styles.subscriptionLabel}>Started</div>
                  <div style={styles.subscriptionValue}>
                    {formatDate(subscription.start_date)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.btnOutline} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button style={styles.btnPrimary} onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-small" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .status-inactive {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
      `}</style>
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
    background: '#ffffff', 
    borderRadius: 16, 
    width: 560, 
    maxHeight: '85vh', 
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  header: { 
    padding: '20px 24px', 
    borderBottom: '1px solid #e9ecef', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    background: 'white',
    zIndex: 10
  },
  title: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 18, 
    fontWeight: 600, 
    color: '#1a202c' 
  },
  closeBtn: { 
    background: 'none', 
    border: 'none', 
    color: '#adb5bd', 
    cursor: 'pointer',
    padding: 4,
    borderRadius: 8,
    transition: 'color 0.2s',
    ':hover': { color: '#ff6b00' }
  },
  body: { padding: '24px' },
  footer: { 
    padding: '16px 24px', 
    borderTop: '1px solid #e9ecef', 
    display: 'flex', 
    gap: 12, 
    justifyContent: 'flex-end' 
  },
  errorCard: {
    background: '#fef3f3',
    border: '1px solid #f5c6cb',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#c53030',
  },
  formRow: { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: 16, 
    marginBottom: 16 
  },
  formGroup: { 
    marginBottom: 16 
  },
  label: { 
    fontSize: 12, 
    color: '#868e96', 
    marginBottom: 6, 
    display: 'block', 
    fontWeight: 500, 
    textTransform: 'uppercase', 
    letterSpacing: 0.3 
  },
  input: { 
    width: '100%', 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 8, 
    padding: '10px 12px', 
    fontSize: 13, 
    color: '#1a202c', 
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': { borderColor: '#ff6b00' }
  },
  select: { 
    width: '100%', 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 8, 
    padding: '10px 12px', 
    fontSize: 13, 
    color: '#1a202c', 
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': { borderColor: '#ff6b00' }
  },
  subscriptionCard: { 
    background: '#f8f9fa', 
    borderRadius: 12, 
    padding: 16, 
    marginTop: 16,
    border: '1px solid #e9ecef'
  },
  subscriptionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionTitle: { 
    fontWeight: 600, 
    fontSize: 14,
    color: '#1a202c' 
  },
  subscriptionInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  subscriptionLabel: {
    fontSize: 10,
    color: '#868e96',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subscriptionValue: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1a202c',
  },
  btnPrimary: { 
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    border: 'none', 
    background: '#ff6b00', 
    color: '#ffffff',
    transition: 'background 0.2s',
    ':hover': { background: '#e55a00' },
    ':disabled': { opacity: 0.5, cursor: 'not-allowed' }
  },
  btnOutline: { 
    padding: '10px 20px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#4a5568', 
    border: '1px solid #e9ecef',
    transition: 'all 0.2s',
    ':hover': { borderColor: '#ff6b00', color: '#ff6b00' },
    ':disabled': { opacity: 0.5, cursor: 'not-allowed' }
  },
};

export default SchoolProfileModal;
