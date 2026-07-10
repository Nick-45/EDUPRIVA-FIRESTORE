import React from 'react';
import { Lock, Eye, Database, Mail, X, CheckCircle } from 'lucide-react';

const PrivacyPolicy = ({ onClose, onAccept, isModal = true }) => {
  const Content = () => (
    <div style={styles.content}>
      <div style={styles.header}>
        <Lock size={28} color="#ff6b00" />
        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.version}>Version 2.0 | Effective Date: January 1, 2026</p>
        <p style={styles.compliance}>Compliant with Kenyan Data Protection Act, 2019</p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Introduction</h2>
        <p style={styles.text}>
          EduPriva ("we," "our," "us") is committed to protecting your privacy and the privacy of student data. 
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use 
          our platform. We comply with the Kenyan Data Protection Act, 2019 (DPA) and the Constitution of Kenya 
          (Article 31 on the right to privacy).
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>2. Data Controller and Data Processor</h2>
        <p style={styles.text}>
          <strong>Data Controller:</strong> Your school determines the purposes and means of processing student data.
        </p>
        <p style={styles.text}>
          <strong>Data Processor:</strong> EduPriva processes data on behalf of your school under a Data Processing Agreement.
        </p>
        <p style={styles.text}>
          <strong>Data Protection Officer:</strong> We have appointed a Data Protection Officer (DPO) who can be contacted 
          at dpo@edupriva.com.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>3. Information We Collect</h2>
        
        <h3 style={styles.subsectionTitle}>3.1 School Information</h3>
        <ul style={styles.list}>
          <li>School name, registration number, and contact details</li>
          <li>Physical and postal address</li>
          <li>Bank account details for payment processing</li>
          <li>Subscription and payment history</li>
        </ul>

        <h3 style={styles.subsectionTitle}>3.2 Student Data</h3>
        <ul style={styles.list}>
          <li>Student names, admission numbers, and dates of birth</li>
          <li>Academic records, grades, and performance data</li>
          <li>Attendance records</li>
          <li>Parent/guardian contact information</li>
          <li>Disciplinary records (where applicable)</li>
        </ul>

        <h3 style={styles.subsectionTitle}>3.3 Staff Data</h3>
        <ul style={styles.list}>
          <li>Staff names, contact details, and employment information</li>
          <li>Payroll and compensation data</li>
          <li>Performance records</li>
        </ul>

        <h3 style={styles.subsectionTitle}>3.4 Account Data</h3>
        <ul style={styles.list}>
          <li>Admin user names, email addresses, and role information</li>
          <li>Login activity and audit logs</li>
          <li>IP addresses and device information</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>4. Legal Basis for Processing</h2>
        <p style={styles.text}>Under the Kenyan Data Protection Act, we process data based on:</p>
        <ul style={styles.list}>
          <li><strong>Consent:</strong> You have given clear consent for us to process your data.</li>
          <li><strong>Contract:</strong> Processing is necessary for the performance of our service agreement.</li>
          <li><strong>Legal Obligation:</strong> Processing is required by Kenyan law (e.g., maintaining records).</li>
          <li><strong>Legitimate Interests:</strong> Processing is necessary for our legitimate business interests.</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>5. How We Use Your Information</h2>
        <ul style={styles.list}>
          <li>To provide, maintain, and improve our Services</li>
          <li>To process payments and manage subscriptions</li>
          <li>To generate academic reports and analytics</li>
          <li>To communicate important updates and notifications</li>
          <li>To comply with legal and regulatory requirements</li>
          <li>To detect and prevent fraud or security issues</li>
          <li>To provide AI-powered insights and recommendations</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>6. Data Sharing and Disclosure</h2>
        <p style={styles.text}>
          We do not sell your personal data. We may share data with:
        </p>
        <ul style={styles.list}>
          <li><strong>Service Providers:</strong> Third-party vendors who assist with hosting, payment processing, and analytics</li>
          <li><strong>Government Authorities:</strong> When required by Kenyan law or court order</li>
          <li><strong>Professional Advisors:</strong> Lawyers, auditors, and insurers</li>
          <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
        </ul>
        <p style={styles.text}>
          All third-party processors sign data processing agreements compliant with Kenyan law.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>7. Data Security</h2>
        <p style={styles.text}>
          We implement appropriate technical and organizational measures to protect your data:
        </p>
        <ul style={styles.list}>
          <li>Encryption of data in transit (TLS 1.3) and at rest (AES-256)</li>
          <li>Access controls and multi-factor authentication</li>
          <li>Regular security audits and penetration testing</li>
          <li>Employee background checks and confidentiality agreements</li>
          <li>Data backup and disaster recovery procedures</li>
          <li>Incident response and breach notification procedures</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>8. Data Retention</h2>
        <p style={styles.text}>
          We retain data as follows:
        </p>
        <ul style={styles.list}>
          <li>Active school data: For the duration of your subscription</li>
          <li>Student records: 7 years after student leaves (as required by Kenyan education regulations)</li>
          <li>Financial records: 10 years (tax and audit requirements)</li>
          <li>Audit logs: 3 years</li>
          <li>Deleted data: Permanently removed after 30 days</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>9. Your Rights Under Kenyan Law</h2>
        <p style={styles.text}>
          Under the Data Protection Act, 2019, you have the following rights:
        </p>
        <ul style={styles.list}>
          <li><strong>Right to be informed:</strong> About how your data is used</li>
          <li><strong>Right of access:</strong> Request copies of your data</li>
          <li><strong>Right to rectification:</strong> Correct inaccurate data</li>
          <li><strong>Right to erasure:</strong> Request deletion of your data (subject to legal requirements)</li>
          <li><strong>Right to restrict processing:</strong> Limit how we use your data</li>
          <li><strong>Right to data portability:</strong> Receive your data in a structured format</li>
          <li><strong>Right to object:</strong> Object to certain processing activities</li>
          <li><strong>Rights related to automated decision-making:</strong> Including profiling</li>
        </ul>
        <p style={styles.text}>
          To exercise these rights, contact our Data Protection Officer at dpo@edupriva.com. We will respond within 
          30 days as required by law.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>10. International Data Transfers</h2>
        <p style={styles.text}>
          We store data on servers located in Kenya and the European Union. Any international transfers comply with 
          Kenyan DPA requirements and include appropriate safeguards such as standard contractual clauses.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>11. Children's Data</h2>
        <p style={styles.text}>
          We collect and process student data only with the authorization of the school, which acts as the data 
          controller. Schools are responsible for obtaining parental consent where required by law.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>12. Data Breach Notification</h2>
        <p style={styles.text}>
          In the event of a data breach, we will:
        </p>
        <ul style={styles.list}>
          <li>Notify affected schools within 72 hours of discovery</li>
          <li>Report to the Office of the Data Protection Commissioner (ODPC) as required</li>
          <li>Provide recommendations to mitigate potential harm</li>
          <li>Conduct a thorough investigation and implement preventive measures</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>13. Cookies and Tracking</h2>
        <p style={styles.text}>
          We use essential cookies for platform functionality. You can manage cookie preferences through your browser 
          settings. Third-party analytics may be used to improve our Services.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>14. Updates to This Policy</h2>
        <p style={styles.text}>
          We may update this Privacy Policy periodically. Material changes will be notified via email and platform 
          notice at least 30 days in advance. Your continued use constitutes acceptance of the updated policy.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>15. Contact Information</h2>
        <p style={styles.text}>
          <strong>Data Protection Officer:</strong><br />
          Name: Nickson James<br />
          Email: dpo@edupriva.com<br />
          Phone: +254 7573 573 07 <br />
          <br />
          <strong>Office of the Data Protection Commissioner (ODPC):</strong><br />
          Website: www.odpc.go.ke<br />
          Email: info@odpc.go.ke<br />
          Phone: +254 709 267 000<br />
          <br />
          <strong>EduPriva Kenya:</strong><br />
          Address: Nairobi, Kenya<br />
          Registration Number: [Company Reg Number]<br />
          Data Protection Registration Number: [ODPC Number]
        </p>
      </div>

      <div style={styles.footer}>
        <p style={styles.acknowledgment}>
          By clicking "I Accept", you acknowledge that you have read, understood, and agree to this Privacy Policy 
          on behalf of your school and consent to the processing of your data as described.
        </p>
        <div style={styles.buttonGroup}>
          <button onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
          <button onClick={onAccept} style={styles.acceptBtn}>
            <CheckCircle size={18} />
            I Accept the Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
          <Content />
        </div>
      </div>
    );
  }

  return <Content />;
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
  },
  closeBtn: {
    position: 'sticky',
    top: '10px',
    right: '10px',
    float: 'right',
    background: '#f7fafc',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    padding: '8px',
    margin: '10px',
    zIndex: 10,
  },
  content: {
    padding: '32px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    borderBottom: '2px solid #ff6b00',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    marginTop: '16px',
  },
  version: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '8px',
  },
  compliance: {
    fontSize: '13px',
    color: '#10b981',
    marginTop: '8px',
    fontWeight: '500',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ff6b00',
    marginBottom: '12px',
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
    marginTop: '16px',
    marginBottom: '8px',
  },
  text: {
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.6',
    marginBottom: '12px',
  },
  list: {
    marginLeft: '20px',
    color: '#4a5568',
    fontSize: '14px',
    lineHeight: '1.8',
  },
  footer: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  acknowledgment: {
    fontSize: '14px',
    color: '#718096',
    textAlign: 'center',
    marginBottom: '20px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  cancelBtn: {
    padding: '10px 24px',
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#4a5568',
    cursor: 'pointer',
    fontWeight: '500',
  },
  acceptBtn: {
    padding: '10px 24px',
    background: '#ff6b00',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};

export default PrivacyPolicy;
