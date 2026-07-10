import React from 'react';
import TermsOfService from '../components/SchoolAdmin/modals/TermsOfService';

const TermsPage = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      <TermsOfService isModal={false} />
    </div>
  );
};

export default TermsPage;
