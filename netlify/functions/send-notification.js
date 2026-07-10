const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

const db = admin.firestore();

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// SMS (Africa's Talking)
const sendAfricasTalkingSMS = async (phoneNumber, message) => {
  const username = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
  const apiKey = process.env.AFRICAS_TALKING_API_KEY;

  if (!apiKey) {
    console.log('SMS simulated →', phoneNumber);
    return { success: true, simulated: true };
  }

  try {
    const response = await fetch(
      'https://api.africastalking.com/version1/messaging',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          apiKey,
        },
        body: new URLSearchParams({
          username,
          to: phoneNumber,
          message,
          from: process.env.AFRICAS_TALKING_SHORTCODE || 'EDUPRIVA',
        }),
      }
    );

    return await response.json();
  } catch (error) {
    console.error('SMS error:', error);
    return { success: false };
  }
};

// Email HTML
const buildEmailHtml = (subject, message, urgent = false) => `
  <html>
    <body style="font-family:Arial;padding:20px;">
      <h2 style="color:${urgent ? '#dc2626' : '#ff6b00'};">
        EduPriva ${urgent ? '(URGENT)' : ''}
      </h2>
      <h3>${subject}</h3>
      <p>${message.replace(/\n/g, '<br/>')}</p>
      <hr/>
      <small>EduPriva School Platform</small>
    </body>
  </html>
`;

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
    const { target, channel, subject, message, urgent } = JSON.parse(event.body);

    let schools = [];

    // 🔍 Fetch schools
    if (target === 'active' || target === 'suspended') {
      const snapshot = await db
        .collection('schools')
        .where('status', '==', target)
        .get();

      schools = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    else if (target === 'expiring' || target === 'trial') {
      const subsSnapshot = await db
        .collection('subscriptions')
        .where('status', '==', 'active')
        .get();

      const now = new Date();
      const future = new Date();
      future.setDate(now.getDate() + 30);

      const schoolIds = subsSnapshot.docs
        .map((doc) => doc.data())
        .filter((sub) => {
          if (target === 'trial') {
            return sub.plan === 'trial';
          }
          if (target === 'expiring') {
            return sub.expiry_date && new Date(sub.expiry_date) <= future;
          }
          return false;
        })
        .map((sub) => sub.school_id);

      if (schoolIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < schoolIds.length; i += 10) {
          chunks.push(schoolIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
          const snapshot = await db
            .collection('schools')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();

          snapshot.forEach((doc) => {
            schools.push({ id: doc.id, ...doc.data() });
          });
        }
      }
    }

    else {
      // 'all'
      const snapshot = await db.collection('schools').get();
      schools = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    if (schools.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, sentCount: 0 }),
      };
    }

    let emailSent = 0;
    let smsSent = 0;
    let errors = [];

    const batch = schools.slice(0, 20); // limit

    for (const school of batch) {
      try {
        // 📧 Email
        if ((channel === 'email' || channel === 'both') && school.email) {
          await emailTransporter.sendMail({
            from: `"EduPriva" <${process.env.SMTP_EMAIL}>`,
            to: school.email,
            subject: urgent ? `URGENT: ${subject}` : subject,
            html: buildEmailHtml(subject, message, urgent),
          });
          emailSent++;
        }

        // 📱 SMS
        if ((channel === 'sms' || channel === 'both') && school.phone) {
          const smsMessage = `${urgent ? 'URGENT: ' : ''}${subject.slice(0, 30)}\n${message.slice(0, 120)}`;
          await sendAfricasTalkingSMS(school.phone, smsMessage);
          smsSent++;
        }

      } catch (err) {
        errors.push({ school: school.name, error: err.message });
      }
    }

    // 📝 Audit log
    await db.collection('audit_logs').add({
      action: 'broadcast_sent',
      entity_type: 'notification',
      target,
      channel,
      subject,
      message: message.slice(0, 500),
      urgent,
      recipient_count: batch.length,
      email_sent: emailSent,
      sms_sent: smsSent,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sentCount: batch.length,
        emailSent,
        smsSent,
        errors: errors.length ? errors : undefined,
      }),
    };

  } catch (error) {
    console.error('Notification error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to send notifications',
      }),
    };
  }
};
