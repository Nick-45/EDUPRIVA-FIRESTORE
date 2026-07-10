import React from 'react';
import { Shield, CheckCircle, AlertCircle, X } from 'lucide-react';

const TermsOfService = ({ onClose, onAccept, isModal = true }) => {
  const Content = () => (
    <div style={styles.content}>
      <div style={styles.header}>
        <Shield size={28} color="#ff6b00" />
        <h1 style={styles.title}>EduPriva Terms of Service</h1>
        <p style={styles.version}>Version 2.0 | Effective Date: January 1, 2026</p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Introduction</h2>
        <p style={styles.text}>
          Welcome to EduPriva ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use 
          of the EduPriva platform, website, and related services (collectively, the "Services"). By accessing or using 
          our Services, you agree to be bound by these Terms.
        </p>
        <p style={styles.text}>
          <strong>Legal Compliance:</strong> These Terms comply with the Kenyan Data Protection Act, 2019, the 
          Constitution of Kenya (Article 31 on privacy), and the Kenya Information and Communications Act.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>2. Definitions</h2>
        <ul style={styles.list}>
          <li><strong>"School"</strong> means any educational institution registered under Kenyan law.</li>
          <li><strong>"School Admin"</strong> means an authorized representative of a school.</li>
          <li><strong>"Student Data"</strong> means any information relating to an identified or identifiable student.</li>
          <li><strong>"Processing"</strong> means any operation performed on personal data.</li>
          <li><strong>"Data Controller"</strong> means the school that determines the purposes of processing student data.</li>
          <li><strong>"Data Processor"</strong> means EduPriva that processes data on behalf of the school.</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>3. Eligibility and Account Registration</h2>
        <p style={styles.text}>
          3.1. You must be a legally authorized representative of a registered Kenyan educational institution to use our Services.
        </p>
        <p style={styles.text}>
          3.2. You must provide accurate, complete, and up-to-date registration information.
        </p>
        <p style={styles.text}>
          3.3. You are responsible for maintaining the confidentiality of your account credentials.
        </p>
        <p style={styles.text}>
          3.4. You must immediately notify us of any unauthorized use of your account.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>4. Data Protection and Privacy</h2>
        <p style={styles.text}>
          4.1. We process personal data in accordance with our Privacy Policy and the Kenyan Data Protection Act, 2019.
        </p>
        <p style={styles.text}>
          4.2. Schools act as Data Controllers; EduPriva acts as a Data Processor.
        </p>
        <p style={styles.text}>
          4.3. We implement appropriate technical and organizational measures to protect personal data.
        </p>
        <p style={styles.text}>
          4.4. Data processing agreements are available upon request.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>5. Acceptable Use Policy</h2>
        <p style={styles.text}>You agree NOT to:</p>
        <ul style={styles.list}>
          <li>Use the Services for any unlawful purpose or in violation of Kenyan law</li>
          <li>Access, tamper with, or use non-public areas of the Services</li>
          <li>Attempt to bypass any security measures</li>
          <li>Upload viruses or malicious code</li>
          <li>Harass, abuse, or harm another person</li>
          <li>Impersonate another person or entity</li>
          <li>Share student data without proper consent</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>6. School Data Ownership</h2>
        <p style={styles.text}>
          6.1. You retain all ownership rights to the data you submit to the Services.
        </p>
        <p style={styles.text}>
          6.2. We do not claim ownership over your school data.
        </p>
        <p style={styles.text}>
          6.3. You grant us a license to process, store, and transmit your data solely to provide the Services.
        </p>
        <p style={styles.text}>
          6.4. Upon termination, you may request data export within 30 days.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>7. Fees and Payments</h2>
        <p style={styles.text}>
          7.1. Subscription fees are billed in advance on a termly or annual basis.
        </p>
        <p style={styles.text}>
          7.2. All fees are in Kenyan Shillings (KES) and subject to applicable taxes.
        </p>
        <p style={styles.text}>
          7.3. We reserve the right to change fees with 30 days' notice.
        </p>
        <p style={styles.text}>
          7.4. Late payments may result in suspension of Services.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>8. Service Availability and Support</h2>
        <p style={styles.text}>
          8.1. We strive for 99.9% uptime but do not guarantee uninterrupted service.
        </p>
        <p style={styles.text}>
          8.2. Scheduled maintenance will be notified at least 24 hours in advance.
        </p>
        <p style={styles.text}>
          8.3. Support is available Monday-Friday, 8 AM - 6 PM EAT via email and chat.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>9. Termination</h2>
        <p style={styles.text}>
          9.1. Either party may terminate with 30 days' written notice.
        </p>
        <p style={styles.text}>
          9.2. We may terminate immediately for violation of these Terms.
        </p>
        <p style={styles.text}>
          9.3. Upon termination, you must cease using the Services.
        </p>
        <p style={styles.text}>
          9.4. We will provide data export options upon termination.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>10. Limitation of Liability</h2>
        <p style={styles.text}>
          10.1. To the maximum extent permitted by Kenyan law, EduPriva shall not be liable for any indirect, 
          incidental, special, consequential, or punitive damages.
        </p>
        <p style={styles.text}>
          10.2. Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim.
        </p>
        <p style={styles.text}>
          10.3. We are not liable for data loss, corruption, or security breaches beyond our reasonable control.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>11. Indemnification</h2>
        <p style={styles.text}>
          You agree to indemnify and hold EduPriva harmless from any claims, damages, losses, and expenses 
          arising from your use of the Services or violation of these Terms.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>12. Governing Law and Dispute Resolution</h2>
        <p style={styles.text}>
          12.1. These Terms are governed by the laws of the Republic of Kenya.
        </p>
        <p style={styles.text}>
          12.2. Any disputes shall first be attempted to be resolved through good faith negotiations.
        </p>
        <p style={styles.text}>
          12.3. Unresolved disputes shall be submitted to arbitration in Nairobi, Kenya.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>13. Amendments</h2>
        <p style={styles.text}>
          13.1. We may update these Terms from time to time.
        </p>
        <p style={styles.text}>
          13.2. Material changes will be notified via email or platform notice.
        </p>
        <p style={styles.text}>
          13.3. Continued use after changes constitutes acceptance of new Terms.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>14. Contact Information</h2>
        <p style={styles.text}>
          <strong>EduPriva Kenya</strong><br />
          Data Protection Officer: [Name]<br />
          Email: dpo@edupriva.com<br />
          Phone: +254 7573 573 07 <br />
          Address: Nairobi, Kenya<br />
          Office of the Data Protection Commissioner (ODPC) Registration: [Number]
        </p>
      </div>

      <div style={styles.footer}>
        <p style={styles.acknowledgment}>
          By clicking "I Accept", you acknowledge that you have read, understood, and agree to be bound by 
          these Terms of Service on behalf of your school.
        </p>
        <div style={styles.buttonGroup}>
          <button onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
          <button onClick={onAccept} style={styles.acceptBtn}>
            <CheckCircle size={18} />
            I Accept the Terms of Service
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
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ff6b00',
    marginBottom: '12px',
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

export default TermsOfService;
