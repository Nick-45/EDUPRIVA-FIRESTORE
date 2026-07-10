const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
admin.initializeApp({
credential: admin.credential.applicationDefault(),
});
}

const db = admin.firestore();

exports.handler = async (event) => {
const headers = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': 'Content-Type',
'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

if (event.httpMethod === 'OPTIONS') {
return { statusCode: 204, headers, body: '' };
}

try {
// ---------------- GET ----------------
if (event.httpMethod === 'GET') {
const { user_id } = event.queryStringParameters || {};


  if (!user_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'User ID required' }),
    };
  }

  const docRef = db.collection('user_consents').doc(user_id);
  const docSnap = await docRef.get();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      consent: docSnap.exists ? docSnap.data() : null,
    }),
  };
}

// ---------------- POST ----------------
if (event.httpMethod === 'POST') {
  const {
    user_id,
    school_id,
    terms_accepted,
    data_processing_accepted,
    communications_accepted,
  } = JSON.parse(event.body);

  if (
    !user_id ||
    terms_accepted === undefined ||
    data_processing_accepted === undefined
  ) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing required fields' }),
    };
  }

  const consentData = {
    user_id,
    school_id: school_id || null,
    terms_accepted,
    data_processing_accepted,
    communications_accepted: communications_accepted || false,
    consent_date: new Date().toISOString(),
    ip_address:
      event.headers['client-ip'] ||
      event.headers['x-forwarded-for'] ||
      null,
    user_agent: event.headers['user-agent'] || null,
  };

  const docRef = db.collection('user_consents').doc(user_id);

  // Firestore equivalent of UPSERT
  await docRef.set(consentData, { merge: true });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      consent: consentData,
    }),
  };
}

return {
  statusCode: 405,
  headers,
  body: JSON.stringify({ error: 'Method not allowed' }),
};


} catch (error) {
console.error('Consent function error:', error);


return {
  statusCode: 500,
  headers,
  body: JSON.stringify({ error: 'Internal server error' }),
};


}
};
