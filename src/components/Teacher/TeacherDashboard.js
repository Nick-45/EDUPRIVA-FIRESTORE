import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../Layout/Header';
import BottomNav from '../Layout/BottomNav';
import TeacherHome from './TeacherHome';
import TeacherStudents from './TeacherStudents';
import TeacherAssessments from './TeacherAssessments';
import TeacherProfile from './TeacherProfile';

const TeacherDashboard = () => {
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
      case 'students':
        return 'My Students';
      case 'assessments':
        return 'Assessments';
      case 'profile':
        return 'My Profile';
      default:
        return 'Teacher Dashboard';
    }
  };

  if (loading) {
    return (
      <div className="pb-20">
        <Header 
          title="Teacher Dashboard" 
          subtitle="Loading..."
          showVoice={false}
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav role="teacher" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Header 
        title={getPageTitle()} 
        subtitle={schoolName || userData?.schools?.name || ''} 
        showVoice={getPageTitle() === 'Teacher Dashboard'}
      />
      <Routes>
        <Route index element={<TeacherHome />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="assessments" element={<TeacherAssessments />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Routes>
      <BottomNav role="teacher" />
    </div>
  );
};

export default TeacherDashboard;
