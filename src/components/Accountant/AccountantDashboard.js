import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AccountantHome from './AccountantHome';
import AccountantPayments from './AccountantPayments';
import AccountantWallet from './AccountantWallet';
import AccountantProfile from './AccountantProfile';

const AccountantDashboard = () => {
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
      case 'wallet':
        return 'Wallet';
      case 'profile':
        return 'Profile';
      default:
        return 'Dashboard';
    }
  };

  if (loading) {
    return (
      <div className="pb-20">
        <div className="fixed inset-x-0 top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 shadow-lg z-40">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-xl font-semibold">Accountant Dashboard</h1>
              <p className="text-sm opacity-90">Loading...</p>
            </div>
          </div>
        </div>

        <div className="mt-24 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="fixed inset-x-0 top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 shadow-lg z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-semibold">
              {getPageTitle() === 'Dashboard' ? 'Accountant Dashboard' : getPageTitle()}
            </h1>
            <p className="text-sm opacity-90">
              {schoolName || userData?.schools?.name || 'School financial operations'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
              {getPageTitle()}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-24">
        <Routes>
          <Route index element={<AccountantHome />} />
          <Route path="payments" element={<AccountantPayments />} />
          <Route path="wallet" element={<AccountantWallet />} />
          <Route path="profile" element={<AccountantProfile />} />
          <Route path="*" element={<Navigate to="/accountant" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default AccountantDashboard;
