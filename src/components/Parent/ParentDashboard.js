import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../Layout/Header';
import BottomNav from '../Layout/BottomNav';
import ParentHome from './ParentHome';
import ParentPayments from './ParentPayments';
import ParentAnalytics from './ParentAnalytics';
import ParentProfile from './ParentProfile';

const ParentDashboard = () => {
  const { user, userData } = useAuth();
  const location = useLocation();
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);

  const schoolId = user?.metadata?.school_id || userData?.school_id;

  useEffect(() => {
    const fetchSchoolName = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
        if (schoolDoc.exists()) {
          const schoolData = schoolDoc.data();
          setSchoolName(schoolData.name || '');
        }
      } catch (error) {
        console.error('Error fetching school name:', error);
      }
      setLoading(false);
    };

    fetchSchoolName();
  }, [schoolId]);

  // Get current page title based on route
  const getPageTitle = () => {
    const path = location.pathname.split('/').pop();
    switch (path) {
      case 'payments':
        return 'Payments';
      case 'analytics':
        return 'Analytics';
      case 'profile':
        return 'My Profile';
      default:
        return 'Parent Dashboard';
    }
  };

  if (loading) {
    return (
      <div className="pb-20">
        <Header 
          title="Parent Dashboard" 
          subtitle="Loading..."
          showVoice={false}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav role="parent" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Header 
        title={getPageTitle()} 
        subtitle={schoolName || userData?.schools?.name || ''} 
        showVoice={getPageTitle() === 'Parent Dashboard'}
      />
      <Routes>
        <Route index element={<ParentHome />} />
        <Route path="payments" element={<ParentPayments />} />
        <Route path="analytics" element={<ParentAnalytics />} />
        <Route path="profile" element={<ParentProfile />} />
        <Route path="*" element={<Navigate to="/parent" replace />} />
      </Routes>
      <BottomNav role="parent" />
    </div>
  );
};

export default ParentDashboard;
