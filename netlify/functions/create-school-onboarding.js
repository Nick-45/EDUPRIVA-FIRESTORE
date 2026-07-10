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

// Email transporter
const transporter = nodemailer.createTransport({
service: 'gmail',
auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
});

// Password generator
const generatePassword = () => {
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
let password = '';
for (let i = 0; i < 12; i++) {
password += chars.charAt(Math.floor(Math.random() * chars.length));
}
return password;
};

// Email sender
const sendWelcomeEmail = async (
to,
name,
role,
schoolName,
tempPassword
) => {
const roleTitle =
{
school_admin: 'School Administrator',
teacher: 'Teacher',
accountant: 'Accountant',
}[role] || 'Staff';

const html = `     <h2>Welcome to EduPriva, ${name}!</h2>     <p>Your ${roleTitle} account for <b>${schoolName}</b> has been created.</p>     <p>Email: ${to}</p>     <p>Password: <b>${tempPassword}</b></p>     <p>Please log in and change your password immediately.</p>     <a href="${process.env.APP_URL}/login">Login</a>
  `;

await transporter.sendMail({
from: `"EduPriva" <${process.env.SMTP_EMAIL}>`,
to,
subject: `Welcome to EduPriva - ${schoolName}`,
html,
});
};

exports.handler = async (event) => {
try {
const { schoolInfo, branding, curriculum, staff, plan } = JSON.parse(
event.body
);


const schoolId = db.collection('schools').doc().id;
const schoolCode = `SCH-${Date.now()}-${Math.floor(
  Math.random() * 10000
)}`;

// ---------------- CREATE SCHOOL ----------------
await db.collection('schools').doc(schoolId).set({
  name: schoolInfo.name,
  school_code: schoolCode,
  county: schoolInfo.county,
  school_level: schoolInfo.level,
  admin_email: schoolInfo.email,
  admin_phone: schoolInfo.phone,
  school_email: schoolInfo.email,
  school_phone: schoolInfo.phone,
  knec_code: schoolInfo.knecCode,
  motto: branding.motto,
  logo_url: branding.logoUrl,
  curriculum,
  status: 'active',
  created_at: new Date().toISOString(),
});

// ---------------- WALLET ----------------
await db.collection('school_wallets').doc(schoolId).set({
  school_id: schoolId,
  balance: 0,
});

// ---------------- SUBSCRIPTION ----------------
const expiryDate = new Date();
expiryDate.setMonth(
  expiryDate.getMonth() + (plan === 'standard' ? 4 : 1)
);

await db.collection('subscriptions').add({
  school_id: schoolId,
  plan,
  amount: plan === 'standard' ? 12500 : 0,
  start_date: new Date().toISOString(),
  expiry_date: expiryDate.toISOString(),
  status: 'active',
});

// ---------------- ADMIN USER ----------------
const adminPassword = generatePassword();

const adminUser = await auth.createUser({
  email: schoolInfo.email,
  password: adminPassword,
  displayName: `${schoolInfo.name} Admin`,
});

await db.collection('users').doc(adminUser.uid).set({
  id: adminUser.uid,
  school_id: schoolId,
  role: 'school_admin',
  full_name: `${schoolInfo.name} Admin`,
  email: schoolInfo.email,
  phone: schoolInfo.phone,
  whatsapp_phone: schoolInfo.phone,
  whatsapp_verified: true,
  status: 'active',
});

await sendWelcomeEmail(
  schoolInfo.email,
  `${schoolInfo.name} Admin`,
  'school_admin',
  schoolInfo.name,
  adminPassword
);

// ---------------- STAFF ----------------
let staffCreated = 0;

for (let i = 1; i <= staff.teacher; i++) {
  const teacherEmail = `teacher${i}@${schoolCode.toLowerCase()}.temp`;
  const teacherPassword = generatePassword();

  try {
    const teacherUser = await auth.createUser({
      email: teacherEmail,
      password: teacherPassword,
      displayName: `Teacher ${i}`,
    });

    await db.collection('users').doc(teacherUser.uid).set({
      id: teacherUser.uid,
      school_id: schoolId,
      role: 'teacher',
      full_name: `Teacher ${i}`,
      email: teacherEmail,
      status: 'active',
    });

    staffCreated++;
  } catch (err) {
    console.error('Teacher creation failed:', err.message);
  }
}

return {
  statusCode: 200,
  body: JSON.stringify({
    success: true,
    schoolId,
    schoolCode,
    staffCreated,
  }),
};


} catch (error) {
console.error(error);

return {
  statusCode: 500,
  body: JSON.stringify({
    success: false,
    error: error.message,
  }),
};


}
};
