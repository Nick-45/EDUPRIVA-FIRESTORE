import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Login from './components/Auth/Login';
import OnboardingWizard from './components/Onboarding/OnboardingWizard';
import ParentDashboard from './components/Parent/ParentDashboard';
import TeacherDashboard from './components/Teacher/TeacherDashboard';
import StudentDashboard from './components/Student/StudentDashboard';
import SchoolAdminDashboard from './components/SchoolAdmin/SchoolAdminDashboard';
import PlatformAdminDashboard from './components/PlatformAdmin/PlatformAdminDashboard';
import AccountantDashboard from './components/Accountant/AccountantDashboard';
import LiveDashboard from './components/PlatformAdminLive/LiveDashboard';
import UpdatePassword from './components/Auth/UpdatePassword';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

// Simple loading component
const LoadingFallback = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: '#060e08'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '3px solid #1c3321', 
        borderTopColor: '#d99200', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }} />
      <div style={{ color: '#b2d9b9' }}>Loading EduPriva...</div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="bottom-center" />
        <React.Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<OnboardingWizard />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            
            {/* Protected Routes with Role-Based Access */}
            <Route path="/parent/*" element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/teacher/*" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/student/*" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/accountant/*" element={
              <ProtectedRoute allowedRoles={['accountant']}>
                <AccountantDashboard />
              </ProtectedRoute>
            } />

            <Route path="/school-admin/*" element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <SchoolAdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/platform-admin/*" element={
              <ProtectedRoute allowedRoles={['platform_admin']}>
                <PlatformAdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/live/*" element={
              <ProtectedRoute allowedRoles={['platform_admin', 'school_admin']}>
                <LiveDashboard />
              </ProtectedRoute>
            } />
            
            {/* Catch all route - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </React.Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
