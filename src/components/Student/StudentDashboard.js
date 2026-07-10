import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../Layout/Header';
import BottomNav from '../Layout/BottomNav';
import StudentHome from './StudentHome';
import StudentResults from './StudentResults';
import StudentProgress from './StudentProgress';
import StudentProfile from './StudentProfile';

const StudentDashboard = () => {
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
      case 'results':
        return 'My Results';
      case 'progress':
        return 'My Progress';
      case 'profile':
        return 'My Profile';
      default:
        return 'Student Dashboard';
    }
  };

  if (loading) {
    return (
      <div className="pb-20">
        <Header 
          title="Student Dashboard" 
          subtitle="Loading..."
          showVoice={false}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav role="student" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Header 
        title={getPageTitle()} 
        subtitle={schoolName || userData?.schools?.name || ''} 
        showVoice={getPageTitle() === 'Student Dashboard'}
      />
      <Routes>
        <Route index element={<StudentHome />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="progress" element={<StudentProgress />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
      <BottomNav role="student" />
    </div>
  );
};

export default StudentDashboard;
