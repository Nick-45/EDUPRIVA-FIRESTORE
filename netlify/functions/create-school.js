const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase
if (!admin.apps.length) {
admin.initializeApp({
credential: admin.credential.cert(
JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
),
});
}

const db = admin.firestore();
const auth = admin.auth();

// Generate password
const generateRandomPassword = (length = 12) => {
const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
let password = '';
for (let i = 0; i < length; i++) {
password += charset[Math.floor(Math.random() * charset.length)];
}
return password;
};

// Mail transporter
const createTransporter = () => {
return nodemailer.createTransport({
host: process.env.SMTP_HOST,
port: parseInt(process.env.SMTP_PORT) || 587,
secure: process.env.SMTP_SECURE === 'true',
auth: {
user: process.env.SMTP_USER || process.env.SMTP_EMAIL,
pass: process.env.SMTP_PASSWORD,
},
});
};

// Send email (kept same)
const sendWelcomeEmail = async (email, password, schoolName, adminName) => {
const transporter = createTransporter();
const appUrl = process.env.APP_URL;

return transporter.sendMail({
from: `"EduPriva" <${process.env.SMTP_EMAIL}>`,
to: email,
subject: `Welcome to EduPriva - ${schoolName}`,
html: `       <h2>Welcome to EduPriva</h2>       <p>${schoolName} has been registered successfully.</p>       <p>Email: ${email}</p>       <p>Password: <b>${password}</b></p>       <a href="${appUrl}/login">Login</a>
    `,
});
};

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
const schoolData = JSON.parse(event.body);


if (!schoolData.name) throw new Error('School name is required');
if (!schoolData.registration_number) throw new Error('Registration number is required');
if (!schoolData.email) throw new Error('School email is required');
if (!schoolData.admin_email) throw new Error('Admin email is required');
if (!schoolData.term_fee) throw new Error('Term fee is required');

const generatedPassword = generateRandomPassword(12);

// ---------------- AUTH USER ----------------
const userRecord = await auth.createUser({
  email: schoolData.admin_email,
  password: generatedPassword,
  displayName: schoolData.admin_name || 'School Administrator',
});

const userId = userRecord.uid;

// ---------------- SCHOOL ----------------
const schoolRef = db.collection('schools').doc();
const schoolId = schoolRef.id;

const expiryDate = new Date();
if (schoolData.plan === 'trial') {
  expiryDate.setDate(expiryDate.getDate() + 30);
} else {
  expiryDate.setMonth(expiryDate.getMonth() + 3);
}

await schoolRef.set({
  name: schoolData.name,
  registration_number: schoolData.registration_number,
  email: schoolData.email,
  phone: schoolData.phone || null,
  address: schoolData.address || null,
  city: schoolData.city || null,
  current_term: schoolData.current_term || 'Term 1',
  current_academic_year:
    schoolData.current_academic_year ||
    new Date().getFullYear().toString(),
  term_fee: parseFloat(schoolData.term_fee),
  status: 'active',
  wallet_balance: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// ---------------- USER PROFILE ----------------
await db.collection('users').doc(userId).set({
  id: userId,
  school_id: schoolId,
  role: 'school_admin',
  full_name: schoolData.admin_name || 'School Administrator',
  email: schoolData.admin_email,
  status: 'active',
});

// ---------------- SUBSCRIPTION ----------------
await db.collection('subscriptions').add({
  school_id: schoolId,
  plan: schoolData.plan || 'standard',
  status: 'active',
  expiry_date: expiryDate.toISOString(),
  created_at: new Date().toISOString(),
});

// ---------------- CONSENT ----------------
await db.collection('user_consents').doc(userId).set({
  user_id: userId,
  school_id: schoolId,
  terms_accepted: false,
  data_processing_accepted: false,
  communications_accepted: false,
  created_at: new Date().toISOString(),
});

// ---------------- AUDIT LOG ----------------
await db.collection('audit_logs').add({
  school_id: schoolId,
  user_id: userId,
  action: 'School created',
  entity_type: 'school',
  entity_id: schoolId,
  new_values: {
    school_name: schoolData.name,
    registration_number: schoolData.registration_number,
    admin_email: schoolData.admin_email,
    plan: schoolData.plan,
  },
  created_at: new Date().toISOString(),
});

// ---------------- EMAIL ----------------
try {
  await sendWelcomeEmail(
    schoolData.admin_email,
    generatedPassword,
    schoolData.name,
    schoolData.admin_name
  );
} catch (err) {
  console.error('Email failed:', err.message);
}

return {
  statusCode: 200,
  headers,
  body: JSON.stringify({
    success: true,
    school: {
      id: schoolId,
      name: schoolData.name,
      registration_number: schoolData.registration_number,
    },
    admin: {
      email: schoolData.admin_email,
      temporary_password: generatedPassword,
    },
  }),
};


} catch (error) {
console.error('Create school error:', error);


return {
  statusCode: 500,
  headers,
  body: JSON.stringify({
    success: false,
    error: error.message,
  }),
};


}
};
