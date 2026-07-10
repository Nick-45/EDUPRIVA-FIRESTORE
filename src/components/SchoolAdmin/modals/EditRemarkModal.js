import React, { useState } from 'react';
import { db } from '../../../services/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';

const EditRemarkModal = ({ isOpen, onClose, remark, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    remark_text: remark?.remark_text || '',
    cbc_level: remark?.cbc_level || 'ME',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.remark_text.trim()) {
      onSuccess('Please enter a remark', 'error');
      return;
    }

    setLoading(true);

    try {
      // 1. Update remark
      const remarkRef = doc(db, 'ai_remarks', remark.id);

      await updateDoc(remarkRef, {
        remark_text: formData.remark_text,
        cbc_level: formData.cbc_level,
        status: 'approved',
        updated_at: serverTimestamp()
      });

      // 2. Insert audit log
      await addDoc(collection(db, 'audit_logs'), {
        user_id: user?.id || null,
        user_email: user?.email || '',
        action: 'Edited AI remark',
        details: `Edited remark for student`,
        type: 'ai',
        created_at: serverTimestamp()
      });

      onSuccess('Remark updated and approved', 'success');
      onClose();

    } catch (error) {
      console.error(error);
      onSuccess('Failed to update remark', 'error');
    }

    setLoading(false);
  };

  if (!isOpen || !remark) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Edit AI Remark</span>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.body}>
          <div style={styles.studentInfo}>
            Student: <strong>{remark.students?.name}</strong> · Grade {remark.grade_level} · {remark.subject}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Remark Text</label>
            <textarea 
              style={styles.textarea}
              rows={5}
              value={formData.remark_text}
              onChange={(e) => setFormData({ ...formData, remark_text: e.target.value })}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>CBC Level</label>
            <select 
              style={styles.select}
              value={formData.cbc_level}
              onChange={(e) => setFormData({ ...formData, cbc_level: e.target.value })}
            >
              <option value="EE">EE — Exceeds Expectations</option>
              <option value="ME">ME — Meets Expectations</option>
              <option value="AE">AE — Approaching Expectations</option>
              <option value="BE">BE — Below Expectations</option>
            </select>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save & Approve'}
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
  studentInfo: { background: '#1d3824', padding: '10px 12px', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#9bbfa4' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: '#6a9674', marginBottom: 5, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 },
  textarea: { width: '100%', background: '#1d3824', border: '1px solid #2a4a34', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#e8f5eb', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  select: { width: '100%', background: '#1d3824', border: '1px solid #2a4a34', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#e8f5eb', outline: 'none' },
  btnPrimary: { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#ff6b00', color: '#0a1f0e' },
  btnOutline: { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#9bbfa4', border: '1px solid #2a4a34' },
};

export default EditRemarkModal;
