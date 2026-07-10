const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const { school_id } = event.queryStringParameters || {};

    if (!school_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'School ID required' }),
      };
    }

    const schoolRef = db.collection('school_profiles').doc(school_id);

    // ✅ GET - Fetch school profile
    if (event.httpMethod === 'GET') {
      const doc = await schoolRef.get();

      if (!doc.exists) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'School profile not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ profile: doc.data() }),
      };
    }

    // ✅ PUT - Update school profile
    if (event.httpMethod === 'PUT') {
      const updates = JSON.parse(event.body || '{}');

      if (!updates || Object.keys(updates).length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No update data provided' }),
        };
      }

      // Optional: add updated timestamp
      updates.updated_at = admin.firestore.FieldValue.serverTimestamp();

      await schoolRef.set(updates, { merge: true });

      const updatedDoc = await schoolRef.get();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ profile: updatedDoc.data() }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('School profile error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};
