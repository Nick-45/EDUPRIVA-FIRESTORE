import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';

class PlatformWalletService {
  /**
   * Get current platform wallet balance
   */
  async getBalance() {
    try {
      const ref = doc(db, 'platform_wallet', 'main');
      const snap = await getDoc(ref);

      if (!snap.exists()) return 0;
      return snap.data().balance || 0;
    } catch (error) {
      console.error('Get balance error:', error);
      return 0;
    }
  }

  /**
   * Add funds to platform wallet (commission, subscription, etc.)
   * Uses Firestore transaction for atomic updates
   */
  async addFunds({ amount, type, schoolId = null, paymentId = null, description }) {
    try {
      const walletRef = doc(db, 'platform_wallet', 'main');
      const txRef = doc(collection(db, 'platform_transactions'));

      await runTransaction(db, async (transaction) => {
        const walletSnap = await transaction.get(walletRef);

        // Initialize wallet if it doesn't exist
        if (!walletSnap.exists()) {
          transaction.set(walletRef, { balance: 0 });
        }

        // Update balance
        transaction.update(walletRef, {
          balance: increment(amount)
        });

        // Record transaction
        transaction.set(txRef, {
          amount,
          type,
          school_id: schoolId,
          payment_id: paymentId,
          description,
          status: 'completed',
          created_at: serverTimestamp()
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Add funds error:', error);
      throw error;
    }
  }

  /**
   * Withdraw funds from platform wallet
   */
  async withdrawFunds({ amount, method, account, description }) {
    try {
      return await this.addFunds({
        amount: -amount,
        type: 'withdrawal',
        description: `${description} via ${method} to ${account}`
      });
    } catch (error) {
      console.error('Withdraw funds error:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions({ limit: lim = 50 } = {}) {
    try {
      const q = query(
        collection(db, 'platform_transactions'),
        orderBy('created_at', 'desc'),
        limit(lim)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Get transactions error:', error);
      return [];
    }
  }

  /**
   * Get transaction summary
   */
  async getSummary() {
    try {
      const snapshot = await getDocs(collection(db, 'platform_transactions'));

      const summary = {
        total_subscription_income: 0,
        total_commission_income: 0,
        total_withdrawn: 0
      };

      snapshot.forEach(doc => {
        const tx = doc.data();

        if (tx.type === 'subscription') {
          summary.total_subscription_income += tx.amount;
        } else if (tx.type === 'commission') {
          summary.total_commission_income += tx.amount;
        } else if (tx.type === 'withdrawal' && tx.amount < 0) {
          summary.total_withdrawn += Math.abs(tx.amount);
        }
      });

      summary.total_revenue =
        summary.total_subscription_income + summary.total_commission_income;

      summary.net_balance =
        summary.total_revenue - summary.total_withdrawn;

      return summary;
    } catch (error) {
      console.error('Get summary error:', error);
      return {
        total_subscription_income: 0,
        total_commission_income: 0,
        total_withdrawn: 0,
        total_revenue: 0,
        net_balance: 0
      };
    }
  }

  /**
   * Ensure platform wallet exists
   */
  async ensureWalletExists() {
    try {
      const ref = doc(db, 'platform_wallet', 'main');
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, { balance: 0 });
      }

      return { success: true };
    } catch (error) {
      console.error('Ensure wallet error:', error);
      return { success: false, error };
    }
  }
}

export const platformWallet = new PlatformWalletService();
