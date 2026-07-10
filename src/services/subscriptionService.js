import { db } from './firebase'; // your firestore config
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { platformWallet } from './platformWalletService';

export const processSubscriptionPayment = async ({ schoolId, amount, plan, term }) => {
  try {
    // 1. Calculate expiry date
    const expiryDate = new Date();
    if (plan === 'trial') {
      expiryDate.setDate(expiryDate.getDate() + 30);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    }

    // 2. Upsert subscription (Firestore way)
    const subscriptionRef = doc(db, 'subscriptions', schoolId);

    await setDoc(subscriptionRef, {
      school_id: schoolId,
      plan: plan,
      amount: amount,
      status: 'active',
      expiry_date: expiryDate,
      updated_at: serverTimestamp()
    }, { merge: true }); // 🔥 this replaces "upsert"

    // 3. Add to platform wallet
    await platformWallet.addFunds({
      amount: amount,
      type: 'subscription',
      schoolId: schoolId,
      description: `${plan} subscription payment for ${term}`,
      metadata: {
        plan: plan,
        term: term,
        expiry_date: expiryDate
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Subscription processing error:', error);
    throw error;
  }
};
