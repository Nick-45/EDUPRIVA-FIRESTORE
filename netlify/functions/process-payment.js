const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { paymentId, amount, schoolId, studentId, paymentMethod } = JSON.parse(event.body);

    if (!paymentId || !amount || !schoolId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Commission (3% capped at 200)
    const calculateCommission = (amt) => {
      const commission = amt * 0.03;
      return Math.min(commission, 200);
    };

    const platformCommission = calculateCommission(amount);
    const schoolReceives = amount;

    const paymentRef = db.collection('payments').doc(paymentId);
    const schoolRef = db.collection('schools').doc(schoolId);
    const platformRef = db.collection('platform').doc('wallet');

    // 🔐 Firestore Transaction (atomic)
    await db.runTransaction(async (transaction) => {
      const paymentDoc = await transaction.get(paymentRef);

      if (!paymentDoc.exists) {
        throw new Error('Payment not found');
      }

      const paymentData = paymentDoc.data();

      // ✅ Idempotency check
      if (paymentData.status === 'completed') {
        return;
      }

      // 1. Update school wallet
      const schoolDoc = await transaction.get(schoolRef);
      const currentBalance = schoolDoc.data()?.wallet_balance || 0;

      transaction.update(schoolRef, {
        wallet_balance: currentBalance + schoolReceives,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Update platform wallet
      const platformDoc = await transaction.get(platformRef);
      const platformBalance = platformDoc.data()?.balance || 0;

      transaction.set(platformRef, {
        balance: platformBalance + platformCommission,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // 3. Update payment
      transaction.update(paymentRef, {
        status: 'completed',
        processed_at: admin.firestore.FieldValue.serverTimestamp(),
        commission: platformCommission,
      });

      // 4. Audit log
      const auditRef = db.collection('audit_logs').doc();

      transaction.set(auditRef, {
        action: 'Payment processed',
        entity_type: 'payment',
        entity_id: paymentId,
        new_values: {
          amount,
          commission: platformCommission,
          school_receives: schoolReceives,
        },
        school_id: schoolId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        platformEarned: platformCommission,
        schoolReceived: schoolReceives,
      }),
    };

  } catch (error) {
    console.error('Payment processing error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to process payment',
      }),
    };
  }
};
