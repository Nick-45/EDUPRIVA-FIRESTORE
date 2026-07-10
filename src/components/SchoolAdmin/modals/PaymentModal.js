// src/components/SchoolAdmin/modals/PaymentModal.js
import React, { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { Wallet, CreditCard, X, AlertCircle } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, onSuccess, schoolId }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_method: 'M-Pesa',
    payment_date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && schoolId) {
      fetchStudents();
      fetchSchoolProfile();
    }
  }, [isOpen, schoolId]);

  const fetchStudents = async () => {
    const q = query(
      collection(db, 'schools', schoolId, 'students')
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setStudents(data);
  };

  const fetchSchoolProfile = async () => {
    const ref = doc(db, 'schools', schoolId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      setSchoolProfile(data);

      if (data?.term_fee) {
        setFormData(prev => ({ ...prev, amount: data.term_fee.toString() }));
      }
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!formData.student_id) {
      setError('Please select a student');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    const amount = parseFloat(formData.amount);
    const transactionId = `PAY${Date.now()}`;
    const selectedStudent = students.find(s => s.id === formData.student_id);

    try {
      // ✅ 1. Save payment
      await addDoc(collection(db, 'schools', schoolId, 'payments'), {
        student_id: formData.student_id,
        amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        description: formData.description || `Fee payment for ${selectedStudent?.name}`,
        status: 'completed',
        transaction_id: transactionId,
        recorded_by: user?.id,
        created_at: serverTimestamp(),
      });

      // ✅ 2. Update wallet
      const schoolRef = doc(db, 'schools', schoolId);
      const schoolSnap = await getDoc(schoolRef);

      if (schoolSnap.exists()) {
        const current = schoolSnap.data().wallet_balance || 0;

        await updateDoc(schoolRef, {
          wallet_balance: current + amount,
          updated_at: serverTimestamp(),
        });
      }

      // ✅ 3. Notification (🔥 new improvement)
      await addDoc(collection(db, 'schools', schoolId, 'notifications'), {
        type: 'payment',
        action: 'New payment recorded',
        details: `${selectedStudent?.name} paid KES ${amount.toLocaleString()}`,
        read: false,
        created_at: serverTimestamp(),
      });

      // ✅ 4. Audit log
      await addDoc(collection(db, 'schools', schoolId, 'audit_logs'), {
        user_id: user?.id,
        action: 'Recorded payment',
        entity_type: 'payment',
        entity_id: transactionId,
        created_at: serverTimestamp(),
        new_values: {
          student_id: formData.student_id,
          amount,
          method: formData.payment_method,
        },
      });

      onSuccess(
        `Payment of KES ${amount.toLocaleString()} recorded for ${selectedStudent?.name}`,
        'success'
      );

      setFormData({
        student_id: '',
        amount: schoolProfile?.term_fee?.toString() || '',
        payment_method: 'M-Pesa',
        payment_date: new Date().toISOString().split('T')[0],
        description: '',
      });

      onClose();

    } catch (err) {
      console.error(err);
      setError('Failed to process payment');
      onSuccess('Payment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedStudent = students.find(s => s.id === formData.student_id);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <CreditCard size={20} color="#ff6b00" />
            <span style={styles.title}>Record Fee Payment</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          {error && (
            <div style={styles.errorCard}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={styles.schoolInfo}>
            <Wallet size={14} color="#ff6b00" />
            <span>
              {schoolProfile?.name} · Term Fee: KES {schoolProfile?.term_fee || 0}
            </span>
          </div>

          <select
            style={styles.select}
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
          >
            <option value="">Select Student</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            style={styles.input}
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />

          <button style={styles.btnPrimary} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Processing...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modal: { background: '#fff', padding: 20, borderRadius: 12, width: 400 },
  header: { display: 'flex', justifyContent: 'space-between' },
  headerLeft: { display: 'flex', gap: 10, alignItems: 'center' },
  title: { fontWeight: 600 },
  body: { marginTop: 20 },
  input: { width: '100%', marginTop: 10, padding: 10 },
  select: { width: '100%', padding: 10 },
  btnPrimary: { marginTop: 20, padding: 12, background: '#ff6b00', color: '#fff', border: 'none', borderRadius: 8 },
};

export default PaymentModal;
```
