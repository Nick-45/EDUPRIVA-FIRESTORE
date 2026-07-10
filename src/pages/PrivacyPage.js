import React from 'react';
import PrivacyPolicy from '../components/SchoolAdmin/modals/PrivacyPolicy';

const PrivacyPage = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      <PrivacyPolicy isModal={false} />
    </div>
  );
};

export default PrivacyPage;
