import { db } from './firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { platformWallet } from './platformWalletService';

const calculateCommission = (amount) => {
  const commission = amount * 0.03;
  return Math.min(commission, 200);
};

export const processSchoolPayment = async ({
  schoolId,
  studentId,
  amount,
  paymentMethod,
  transactionId
}) => {
  const commission = calculateCommission(amount);
  const schoolReceives = amount;
  const platformEarns = commission;

  try {
    // 1. Record payment
    const paymentRef = await addDoc(collection(db, 'payments'), {
      school_id: schoolId,
      student_id: studentId,
      amount,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      status: 'completed',
      payment_date: serverTimestamp()
    });

    // 2. Platform commission
    await platformWallet.addFunds({
      amount: platformEarns,
      type: 'commission',
      schoolId,
      paymentId: paymentRef.id,
      description: `Commission for payment of KES ${amount}`,
      metadata: {
        original_amount: amount,
        commission_rate: 0.03,
        capped: commission === 200
      }
    });

    // 3. Update school wallet
    await updateDoc(doc(db, 'schools', schoolId), {
      wallet_balance: increment(schoolReceives)
    });

    return {
      success: true,
      paymentId: paymentRef.id,
      platformEarned: platformEarns
    };

  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
};
