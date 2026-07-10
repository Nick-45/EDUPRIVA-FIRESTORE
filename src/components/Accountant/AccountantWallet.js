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

const AccountantWallet = () => {
  const { user, userData } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const schoolId = user?.metadata?.school_id || userData?.school_id;

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const paymentsCollection = collection(db, 'payments');

  useEffect(() => {
    const loadWallet = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch school profile
        const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
        if (schoolDoc.exists()) {
          setWallet({
            id: schoolDoc.id,
            ...schoolDoc.data()
          });
        }

        // Fetch recent payments
        const paymentsQuery = query(
          paymentsCollection,
          where('school_id', '==', schoolId),
          orderBy('payment_date', 'desc'),
          limit(5)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData = [];

        for (const paymentDoc of paymentsSnapshot.docs) {
          const payment = {
            id: paymentDoc.id,
            ...paymentDoc.data()
          };

          // Fetch student data if student_id exists
          if (payment.student_id) {
            try {
              const studentDoc = await getDoc(doc(db, 'students', payment.student_id));
              if (studentDoc.exists()) {
                payment.students = {
                  id: studentDoc.id,
                  ...studentDoc.data()
                };
              }
            } catch (studentError) {
              console.warn('Could not fetch student:', payment.student_id);
            }
          }

          paymentsData.push(payment);
        }

        setRecentPayments(paymentsData || []);
      } catch (error) {
        console.error('Error loading wallet:', error);
        toast.error('Unable to load wallet details');
      }
      setLoading(false);
    };

    loadWallet();
  }, [schoolId]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    return new Date(date).toLocaleDateString();
  };

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
        <h2 className="text-lg font-semibold text-gray-900">School Wallet</h2>
        <p className="text-sm text-gray-500">Review available balance and recent wallet activity.</p>
      </div>

      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6 mb-6">
        <div className="text-xs uppercase text-gray-500 mb-2">{wallet?.name || 'School Wallet'}</div>
        <div className="text-4xl font-semibold text-gray-900">
          KES {wallet?.wallet_balance?.toLocaleString() || '0'}
        </div>
        <div className="text-sm text-gray-500 mt-3">
          {wallet?.current_term || 'Current'} term payables and disbursements are managed here.
        </div>
        <div className="text-xs text-gray-400 mt-2">
          Academic Year: {wallet?.current_academic_year || 'N/A'}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Recent wallet activity</h3>
        {recentPayments.length === 0 ? (
          <div className="text-gray-600">No recent wallet activity found.</div>
        ) : (
          <div className="space-y-3">
            {recentPayments.map((record) => (
              <div key={record.id} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {record.students?.name || record.students?.full_name || 'Student payment'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(record.payment_date)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    KES {record.amount?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Status: <span className={record.status === 'completed' ? 'text-emerald-600 font-medium' : 'text-orange-600 font-medium'}>
                    {record.status || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountantWallet;
