import React, { useState } from 'react';
import { db } from '../../../services/firebase'; // 🔥 Firestore import
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { Wallet, AlertCircle, CheckCircle, X } from 'lucide-react';

const WithdrawModal = ({ isOpen, onClose, onSuccess, walletBalance, schoolId }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('M-Pesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const withdrawAmount = parseFloat(amount);

    // Validation
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > walletBalance) {
      setError(`Insufficient wallet balance. Available: KES ${walletBalance.toLocaleString()}`);
      return;
    }

    if (method === 'M-Pesa' && !phoneNumber) {
      setError('Please enter your M-Pesa phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let targetSchoolId = schoolId;

      // 🔥 Get school_id from user_consents if not provided
      if (!targetSchoolId) {
        const consentRef = doc(db, 'user_consents', user.id);
        const consentSnap = await getDoc(consentRef);

        if (!consentSnap.exists()) {
          throw new Error('School not found');
        }

        targetSchoolId = consentSnap.data().school_id;
      }

      // 🔥 Update wallet balance
      const schoolRef = doc(db, 'school_profiles', targetSchoolId);

      await updateDoc(schoolRef, {
        wallet_balance: walletBalance - withdrawAmount,
        updated_at: new Date().toISOString(),
      });

      // 🔥 Log withdrawal
      await addDoc(collection(db, 'audit_logs'), {
        school_id: targetSchoolId,
        user_id: user.id,
        action: 'Withdrew funds',
        entity_type: 'withdrawal',
        new_values: {
          amount: withdrawAmount,
          method: method,
          phone_number: method === 'M-Pesa' ? phoneNumber : null,
          previous_balance: walletBalance,
          new_balance: walletBalance - withdrawAmount,
        },
        created_at: new Date().toISOString(),
      });

      // Success
      onSuccess(`Successfully withdrew KES ${withdrawAmount.toLocaleString()} via ${method}`, 'success');

      // Reset
      setAmount('');
      setPhoneNumber('');
      setError('');
      onClose();

    } catch (error) {
      console.error('Withdrawal error:', error);
      setError(error.message || 'Withdrawal failed. Please try again.');
      onSuccess('Withdrawal failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Wallet size={20} color="#ff6b00" />
            <span style={styles.title}>Withdraw School Funds</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.balanceCard}>
            <div style={styles.balanceLabel}>Available Balance</div>
            <div style={styles.balanceAmount}>KES {walletBalance.toLocaleString()}</div>
            <div style={styles.balanceNote}>
              <CheckCircle size={12} /> No withdrawal charges
            </div>
          </div>

          {error && (
            <div style={styles.errorCard}>
              <AlertCircle size={16} />
              <span style={styles.errorText}>{error}</span>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Amount to Withdraw (KES)</label>
            <input
              type="number"
              style={styles.input}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              placeholder="Enter amount"
              min="1"
              max={walletBalance}
              step="100"
            />
            {walletBalance > 0 && (
              <button
                style={styles.maxBtn}
                onClick={() => setAmount(walletBalance.toString())}
              >
                Max
              </button>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Withdrawal Method</label>
            <select
              style={styles.select}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="M-Pesa">M-Pesa (Instant)</option>
              <option value="Bank Transfer">Bank Transfer (1-3 business days)</option>
            </select>
          </div>

          {method === 'M-Pesa' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>M-Pesa Phone Number</label>
              <input
                type="tel"
                style={styles.input}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setError('');
                }}
                placeholder="e.g., 0712345678"
              />
              <div style={styles.helperText}>
                Enter the M-Pesa registered phone number for withdrawal
              </div>
            </div>
          )}

          {method === 'Bank Transfer' && (
            <div style={styles.infoCard}>
              <AlertCircle size={14} color="#ff6b00" />
              <span style={styles.infoText}>
                Bank transfers take 1-3 business days. Please contact support to set up bank details.
              </span>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.btnOutline} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            style={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={loading || !amount || parseFloat(amount) <= 0}
          >
            {loading ? 'Processing...' : `Withdraw via ${method}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  /* (unchanged styles) */
};

export default WithdrawModal;
