// src/components/SchoolAdmin/modals/SchoolProfileModal.js
import React, { useState } from 'react';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const SchoolProfileModal = ({ isOpen, onClose, schoolProfile, setSchoolProfile, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: schoolProfile?.name || '',
    email: schoolProfile?.email || '',
    phone: schoolProfile?.phone || '',
    motto: schoolProfile?.motto || '',
    address: schoolProfile?.address || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('school_profiles')
      .update(formData)
      .eq('id', schoolProfile?.id);

    if (!error) {
      setSchoolProfile({ ...schoolProfile, ...formData });
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'Updated school profile',
        details: 'Updated school information',
        type: 'settings',
      });
      onSuccess('School profile updated successfully', 'success');
      onClose();
    } else {
      onSuccess('Failed to update school profile', 'error');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>School Settings</span>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={styles.body}>
          <div style={styles.formGroup}>
            <label style={styles.label}>School Name</label>
            <input 
              style={styles.input}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>School Email</label>
              <input 
                style={styles.input}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input 
                style={styles.input}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>School Motto</label>
            <input 
              style={styles.input}
              value={formData.motto}
              onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
            />
          </div>
          <div style={styles.subscriptionCard}>
            <div style={styles.subscriptionTitle}>Subscription Details</div>
            <div>Status: <span style={{ color: '#78c487' }}>Active</span></div>
            <div>Expiry: 30 August 2025</div>
            <div>Plan: Standard · KES 12,500/term</div>
          </div>
        </div>
        <div style={styles.footer}>
          <button style={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#162b1b', border: '1px solid #2a4a34', borderRadius: 16, width: 500, maxHeight: '85vh', overflowY: 'auto' },
  header: { padding: '18px 22px', borderBottom: '1px solid #2a4a34', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: '#e8f5eb' },
  closeBtn: { background: 'none', border: 'none', color: '#6a9674', cursor: 'pointer', fontSize: 20 },
  body: { padding: '22px' },
  footer: { padding: '16px 22px', borderTop: '1px solid #2a4a34', display: 'flex', gap: 12, justifyContent: 'flex-end' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: '#6a9674', marginBottom: 5, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', background: '#1d3824', border: '1px solid #2a4a34', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#e8f5eb', outline: 'none' },
  subscriptionCard: { background: '#1d3824', borderRadius: 10, padding: 14, marginTop: 16 },
  subscriptionTitle: { fontWeight: 600, marginBottom: 10, color: '#e8f5eb' },
  btnPrimary: { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#ff6b00', color: '#0a1f0e' },
  btnOutline: { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#9bbfa4', border: '1px solid #2a4a34' },
};

export default SchoolProfileModal;
