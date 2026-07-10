const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const buildReceiptHtml = ({
  schoolName,
  studentName,
  transactionId,
  amount,
  platformFee,
  totalAmount,
  paymentMethod,
  paymentDate,
  status,
  description,
  balance,
  note,
}) => {
  const currentYear = new Date().getFullYear();
  const appUrl = process.env.APP_URL || 'https://edupriva.com';
  
  // Calculate values
  const schoolReceives = amount || 0;
  const feeAmount = platformFee || (amount * 0.03) || 0;
  const cappedFee = Math.min(feeAmount, 200);
  const totalCharged = totalAmount || (schoolReceives + cappedFee);
  
  const formattedSchoolReceives = `KES ${schoolReceives.toLocaleString()}`;
  const formattedPlatformFee = `KES ${cappedFee.toLocaleString()}`;
  const formattedTotal = `KES ${totalCharged.toLocaleString()}`;
  
  const isCapped = cappedFee === 200 && schoolReceives > 0;
  const feeNote = isCapped ? 'Capped at KES 200 (max)' : '3% of payment amount';
  
  const balanceLine = balance !== undefined && balance !== null
    ? `
      <div class="detail-row">
        <div class="detail-label">Balance After</div>
        <div class="detail-value">KES ${balance.toLocaleString()}</div>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt | EduPriva</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    
    .email-wrapper {
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
      border: 1px solid #f0f0f0;
    }
    
    .header {
      background: #ffffff;
      padding: 30px 40px;
      text-align: center;
      border-bottom: 3px solid #ff6b00;
      position: relative;
    }
    
    .logo-container {
      margin-bottom: 20px;
    }
    
    .logo {
      max-width: 160px;
      height: auto;
      display: inline-block;
    }
    
    .logo-sub {
      font-size: 10px;
      color: #ff6b00;
      letter-spacing: 2px;
      margin-top: 5px;
      font-weight: 500;
    }
    
    .content {
      padding: 40px;
      color: #333333;
    }
    
    h2 {
      color: #ff6b00;
      font-size: 28px;
      margin-top: 0;
      margin-bottom: 20px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    
    p {
      color: #555555;
      line-height: 1.6;
      margin-bottom: 25px;
      font-size: 16px;
    }
    
    .receipt-details {
      background: #f9f9f9;
      border-radius: 16px;
      padding: 20px;
      margin: 25px 0;
      border: 1px solid #eeeeee;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eeeeee;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      color: #666666;
      font-size: 14px;
    }
    
    .detail-value {
      color: #333333;
      font-weight: 600;
      font-size: 14px;
    }
    
    .amount-section {
      background: #fff9f5;
      border-radius: 16px;
      padding: 20px;
      margin: 25px 0;
      border-left: 3px solid #ff6b00;
    }
    
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
    }
    
    .amount-label {
      color: #666666;
      font-size: 14px;
    }
    
    .amount-value {
      color: #333333;
      font-weight: 600;
      font-size: 16px;
    }
    
    .amount-value.total {
      color: #ff6b00;
      font-size: 20px;
      font-weight: 700;
    }
    
    .fee-breakdown {
      background: #fff0e6;
      border-radius: 12px;
      padding: 12px 16px;
      margin-top: 10px;
      font-size: 12px;
      color: #ff6b00;
    }
    
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #ff6b00, #ff8c3a, #ff6b00, transparent);
      margin: 30px 0;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .status-completed {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }
    
    .status-pending {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }
    
    .status-failed {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    
    .button-container {
      text-align: center;
      margin: 35px 0;
    }
    
    .view-button {
      display: inline-block;
      background: #ff6b00;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 35px;
      border-radius: 50px;
      font-weight: 700;
      font-size: 16px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255, 107, 0, 0.3);
      border: none;
      cursor: pointer;
    }
    
    .view-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 107, 0, 0.4);
      background: #e66000;
    }
    
    .note {
      font-size: 13px;
      color: #666666;
      background: #fff9f5;
      padding: 15px;
      border-radius: 12px;
      border-left: 3px solid #ff6b00;
      margin-top: 30px;
    }
    
    .fee-explanation {
      font-size: 11px;
      color: #999999;
      margin-top: 8px;
      text-align: center;
    }
    
    .footer {
      background: #fafafa;
      padding: 25px 40px;
      text-align: center;
      border-top: 1px solid #eeeeee;
    }
    
    .footer-text {
      color: #666666;
      font-size: 12px;
      margin: 0 0 10px 0;
      line-height: 1.5;
    }
    
    .footer-text a {
      color: #ff6b00;
      text-decoration: none;
    }
    
    .footer-text a:hover {
      text-decoration: underline;
    }
    
    .social-links {
      margin-top: 15px;
    }
    
    .social-link {
      color: #999999;
      text-decoration: none;
      margin: 0 10px;
      font-size: 11px;
      transition: color 0.3s ease;
    }
    
    .social-link:hover {
      color: #ff6b00;
    }
    
    .copyright {
      color: #999999;
      font-size: 11px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eeeeee;
    }
    
    @media (max-width: 600px) {
      .content {
        padding: 25px;
      }
      
      .header {
        padding: 20px;
      }
      
      .footer {
        padding: 20px;
      }
      
      h2 {
        font-size: 24px;
      }
      
      .view-button {
        padding: 12px 28px;
        font-size: 14px;
      }
      
      .detail-row {
        flex-direction: column;
        gap: 4px;
      }
      
      .amount-row {
        flex-direction: column;
        gap: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <div class="logo-container">
          <img src="https://yt3.ggpht.com/sATVa4e20FmjSNqg7AoS2pAEm3hDpyquKP7t34Q9DfURC4pks1mPums-afugv0yvxmbOpMPeQ2bG=s500-c-fcrop64=1,00000000ffffffff-rw-nd-v1" alt="EduPriva" class="logo">
        </div>
      </div>
      
      <div class="content">
        <h2>Payment Receipt</h2>
        
        <p>Thank you for your payment. This is your official receipt for the recent transaction through EduPriva.</p>
        
        <!-- Receipt Details -->
        <div class="receipt-details">
          <div class="detail-row">
            <div class="detail-label">School</div>
            <div class="detail-value">${schoolName || 'EduPriva'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Student</div>
            <div class="detail-value">${studentName || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Transaction ID</div>
            <div class="detail-value">${transactionId}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Payment Method</div>
            <div class="detail-value">${paymentMethod}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Date</div>
            <div class="detail-value">${paymentDate || new Date().toLocaleDateString()}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Status</div>
            <div class="detail-value">
              <span class="status-badge status-${status === 'Completed' ? 'completed' : status === 'Pending' ? 'pending' : 'failed'}">
                ${status || 'Completed'}
              </span>
            </div>
          </div>
          ${balanceLine}
          <div class="detail-row">
            <div class="detail-label">Description</div>
            <div class="detail-value">${description || 'School fee payment'}</div>
          </div>
        </div>
        
        <!-- Amount Section with Platform Fee Breakdown -->
        <div class="amount-section">
          <div class="amount-row">
            <div class="amount-label">School receives</div>
            <div class="amount-value">${formattedSchoolReceives}</div>
          </div>
          <div class="amount-row">
            <div class="amount-label">Platform fee (3% of payment)</div>
            <div class="amount-value">${formattedPlatformFee}</div>
          </div>
          ${isCapped ? `
          <div class="fee-breakdown">
            💡 Fee capped at KES 200 per transaction as per platform policy
          </div>
          ` : ''}
          <div class="amount-row" style="border-top: 1px solid #ffe0cc; margin-top: 10px; padding-top: 10px;">
            <div class="amount-label">Total charged</div>
            <div class="amount-value total">${formattedTotal}</div>
          </div>
        </div>
        
        <div class="fee-explanation">
          Platform fee: 3% per transaction (capped at KES 200) • Terms apply
        </div>
        
        <div class="divider"></div>
        
        <div class="button-container">
          <a href="${appUrl}/login" class="view-button">View Payment Details</a>
        </div>
        
        <div class="note">
          <strong>📧 Receipt Note:</strong> ${note || 'Thank you for using EduPriva. Your receipt has been generated and stored securely with the platform. '}
        </div>
      </div>
      
      <div class="footer">
        <p class="footer-text">
          Need help? Contact our support team at 
          <a href="mailto:info.edupriva@gmail.com">info.edupriva@gmail.com</a>
        </p>
        
        <div class="social-links">
          <a href="#" class="social-link">Website</a>
          <span style="color: #dddddd;">|</span>
          <a href="#" class="social-link">Support</a>
          <span style="color: #dddddd;">|</span>
          <a href="#" class="social-link">Privacy Policy</a>
        </div>
        
        <div class="copyright">
          © ${currentYear} EduPriva. All rights reserved.<br>
          Powering modern education across Kenya and beyond.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
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
    const recipients = Array.isArray(payload.to)
      ? payload.to.filter(Boolean)
      : payload.to ? [payload.to] : [];

    if (!recipients.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Recipient email required' }),
      };
    }

    // Calculate platform fee if not provided
    const amount = payload.amount || 0;
    const providedFee = payload.platformFee;
    const platformFee = providedFee !== undefined ? providedFee : Math.min(amount * 0.03, 200);
    const totalAmount = payload.totalAmount || (amount + platformFee);

    const html = buildReceiptHtml({
      schoolName: payload.schoolName,
      studentName: payload.studentName,
      transactionId: payload.transactionId,
      amount: amount,
      platformFee: platformFee,
      totalAmount: totalAmount,
      paymentMethod: payload.paymentMethod,
      paymentDate: payload.paymentDate,
      status: payload.status,
      description: payload.description,
      balance: payload.balance,
      note: payload.note,
    });

    const subject = `EduPriva Receipt • ${payload.transactionId || 'Payment'} • KES ${totalAmount.toLocaleString()}`;

    await transporter.sendMail({
      from: `"EduPriva" <${process.env.SMTP_EMAIL}>`,
      to: recipients.join(', '),
      subject,
      html,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Receipt email error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message || 'Unable to send receipt email' }),
    };
  }
};
