import React, { useState } from 'react';
import { Shield, Check, X, FileText } from 'lucide-react';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';

const ConsentModal = ({ isOpen, onConsent, onClose }) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDataProcessing, setAgreedToDataProcessing] = useState(false);
  const [agreedToCommunications, setAgreedToCommunications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleConsent = async () => {
    if (!agreedToTerms || !agreedToDataProcessing) {
      alert('Please agree to the Terms of Service and Data Processing to continue');
      return;
    }

    setIsLoading(true);
    await onConsent({
      terms_accepted: agreedToTerms,
      data_processing_accepted: agreedToDataProcessing,
      communications_accepted: agreedToCommunications,
      consent_date: new Date().toISOString()
    });
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <Shield size={24} color="#ff6b00" />
            <h2 style={styles.title}>Data Privacy Consent</h2>
            <button onClick={onClose} style={styles.closeBtn}>
              <X size={20} />
            </button>
          </div>

          <div style={styles.content}>
            <p style={styles.notice}>
              <strong>Legal Requirement:</strong> In compliance with the Kenyan Constitution (Article 31) 
              and the Data Protection Act, 2019, we require your consent to process your school's data.
            </p>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>1. Terms of Service</h3>
              <p style={styles.text}>
                I agree to the <button onClick={() => setShowTermsModal(true)} style={styles.linkButton}>
                  Terms of Service
                </button> governing the use of EduPriva platform.
              </p>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>I agree to the Terms of Service *</span>
              </label>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>2. Privacy Policy & Data Processing Consent</h3>
              <p style={styles.text}>
                I have read and agree to the <button onClick={() => setShowPrivacyModal(true)} style={styles.linkButton}>
                  Privacy Policy
                </button>. I consent to the collection, storage, and processing of my school's data.
              </p>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={agreedToDataProcessing}
                  onChange={(e) => setAgreedToDataProcessing(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>I consent to data processing as described in the Privacy Policy *</span>
              </label>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>3. Communication Consent (Optional)</h3>
              <p style={styles.text}>
                I agree to receive important updates, newsletters, and promotional communications.
              </p>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={agreedToCommunications}
                  onChange={(e) => setAgreedToCommunications(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>I agree to receive communications (optional)</span>
              </label>
            </div>

            <div style={styles.footer}>
              <button 
                onClick={handleConsent} 
                disabled={isLoading || !agreedToTerms || !agreedToDataProcessing}
                style={{
                  ...styles.consentBtn,
                  opacity: (!agreedToTerms || !agreedToDataProcessing || isLoading) ? 0.5 : 1
                }}
              >
                {isLoading ? 'Processing...' : (
                  <>
                    <Check size={18} />
                    I Consent and Agree
                  </>
                )}
              </button>
              <p style={styles.note}>
                * Required fields. You cannot use the platform without accepting Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <TermsOfService
          isModal={true}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setAgreedToTerms(true);
            setShowTermsModal(false);
          }}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <PrivacyPolicy
          isModal={true}
          onClose={() => setShowPrivacyModal(false)}
          onAccept={() => {
            setAgreedToDataProcessing(true);
            setShowPrivacyModal(false);
          }}
        />
      )}
    </>
  );
};

const styles = {
  overlay: {
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
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'sticky',
    top: 0,
    background: 'white',
  },
  title: {
    flex: 1,
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a202c',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#718096',
    padding: '4px',
  },
  content: {
    padding: '24px',
  },
  notice: {
    background: '#fff7ed',
    borderLeft: '4px solid #ff6b00',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '24px',
    borderRadius: '8px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '8px',
  },
  text: {
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#ff6b00',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '14px',
    padding: 0,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#1a202c',
    cursor: 'pointer',
    marginTop: '8px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#ff6b00',
  },
  footer: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  consentBtn: {
    width: '100%',
    padding: '12px',
    background: '#ff6b00',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  note: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '12px',
    textAlign: 'center',
  },
};

export default ConsentModal;
