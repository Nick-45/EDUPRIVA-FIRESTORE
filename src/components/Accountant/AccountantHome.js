import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AccountantHome = () => {
  const { user, userData } = useAuth();
  const [stats, setStats] = useState({ 
    totalCollected: 0, 
    walletBalance: 0, 
    termFee: 0, 
    pendingCount: 0,
    currentTerm: '',
    currentAcademicYear: '',
    schoolName: ''
  });
  const [loading, setLoading] = useState(true);

  const schoolId = user?.metadata?.school_id || userData?.school_id;

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const paymentsCollection = collection(db, 'payments');

  useEffect(() => {
    const loadStats = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch school profile
        const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
        let profile = null;
        if (schoolDoc.exists()) {
          profile = schoolDoc.data();
        }

        // Fetch payments for the school
        const paymentsQuery = query(
          paymentsCollection,
          where('school_id', '==', schoolId)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const payments = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate stats
        const completed = payments.filter(payment => payment.status === 'completed');
        const totalCollected = completed.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const pendingCount = payments.filter(payment => payment.status !== 'completed').length;

        setStats({
          totalCollected,
          walletBalance: profile?.wallet_balance || 0,
          termFee: profile?.term_fee || 0,
          pendingCount,
          currentTerm: profile?.current_term || 'Current Term',
          currentAcademicYear: profile?.current_academic_year || '',
          schoolName: profile?.name || '',
        });
      } catch (error) {
        console.error('Error loading stats:', error);
        toast.error('Unable to load school wallet info');
      }
      setLoading(false);
    };

    loadStats();
  }, [schoolId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-24">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Accountant Dashboard</h2>
        <p className="text-sm text-gray-500">
          Monitor school finance, wallet activity, and pending fee collections for {stats.schoolName}.
        </p>
        {stats.currentTerm && stats.currentAcademicYear && (
          <p className="text-xs text-gray-400 mt-1">
            {stats.currentTerm} {stats.currentAcademicYear}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Wallet Balance</div>
          <div className="text-3xl font-semibold text-gray-900">
            KES {stats.walletBalance.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-2">Available funds for school operations.</div>
        </div>
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Total Collected</div>
          <div className="text-3xl font-semibold text-gray-900">
            KES {stats.totalCollected.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-2">Confirmed fee receipts this term.</div>
        </div>
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Pending Payments</div>
          <div className="text-3xl font-semibold text-gray-900">{stats.pendingCount}</div>
          <div className="text-sm text-gray-500 mt-2">Transactions awaiting confirmation.</div>
        </div>
      </div>

      {stats.termFee > 0 && (
        <div className="mt-5 rounded-3xl bg-orange-50 border border-orange-100 p-5">
          <div className="text-sm text-orange-700">
            <span className="font-semibold">Term Fee:</span> KES {stats.termFee.toLocaleString()} per student
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountantHome;
