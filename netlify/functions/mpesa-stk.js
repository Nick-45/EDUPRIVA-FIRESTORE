const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Init Firebase
if (!admin.apps.length) {
admin.initializeApp({
credential: admin.credential.cert(
JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
),
});
}

const db = admin.firestore();

// Email transporter
const transporter = nodemailer.createTransport({
service: 'gmail',
auth: {
user: process.env.SMTP_EMAIL,
pass: process.env.SMTP_PASSWORD,
},
});

// Service fee
const calculateServiceFee = (amount) => {
const fee = Math.round((amount || 0) * 0.03);
return Math.min(Math.max(fee, 0), 200);
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
body: JSON.stringify({ success: false, error: 'Method not allowed' }),
};
}

try {
const payload = JSON.parse(event.body || '{}');
const { studentId, amount, phoneNumber, payerEmail } = payload;

```
if (!studentId || !amount) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({
      success: false,
      error: 'Student ID and amount are required',
    }),
  };
}

// ---------------- FETCH STUDENT ----------------
const studentDoc = await db.collection('students').doc(studentId).get();

if (!studentDoc.exists) {
  throw new Error('Student not found');
}

const student = studentDoc.data();

// ---------------- FETCH SCHOOL ----------------
const schoolDoc = await db
  .collection('schools')
  .doc(student.school_id)
  .get();

const school = schoolDoc.exists ? schoolDoc.data() : {};

// ---------------- FETCH FEES ----------------
const feesDoc = await db
  .collection('fees')
  .doc(studentId) // assuming 1 fee doc per student
  .get();

const balanceBefore = feesDoc.exists
  ? feesDoc.data().balance || 0
  : 0;

const serviceFee = calculateServiceFee(amount);
const totalAmount = amount + serviceFee;

const transactionId = `MPESA${Date.now()}${Math.floor(
  Math.random() * 10000
)}`;

const balanceAfter = Math.max(0, balanceBefore - amount);

// ---------------- SAVE PAYMENT ----------------
await db.collection('payments').add({
  school_id: student.school_id,
  student_id: studentId,
  amount,
  payment_method: 'M-Pesa STK',
  payment_date: new Date().toISOString().split('T')[0],
  description: 'Fee payment via M-Pesa STK',
  status: 'pending',
  transaction_id: transactionId,
  mpesa_receipt: 'STK initiated',
  service_fee: serviceFee,
  customer_phone: phoneNumber || null,
  created_at: new Date().toISOString(),
});

// ---------------- EMAIL ----------------
const recipients = [payerEmail, student.parent_email].filter(Boolean);

if (!recipients.length) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      receiptSent: false,
      transactionId,
    }),
  };
}

const html = `
  <h2>Payment Receipt</h2>
  <p>School: ${school.name || 'EduPriva'}</p>
  <p>Student: ${student.full_name}</p>
  <p>Transaction: ${transactionId}</p>
  <p>Amount: KES ${amount}</p>
  <p>Fee: KES ${serviceFee}</p>
  <p>Total: KES ${totalAmount}</p>
  <p>Status: Pending</p>
`;

await transporter.sendMail({
  from: `"EduPriva" <${process.env.SMTP_EMAIL}>`,
  to: recipients.join(', '),
  subject: `Receipt • ${transactionId}`,
  html,
});

return {
  statusCode: 200,
  headers,
  body: JSON.stringify({
    success: true,
    receiptSent: true,
    transactionId,
  }),
};


} catch (error) {
console.error('mpesa-stk error:', error);


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
