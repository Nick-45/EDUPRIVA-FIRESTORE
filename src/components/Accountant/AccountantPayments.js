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
import DataTable from '../Common/DataTable';
import toast from 'react-hot-toast';

const AccountantPayments = () => {
  const { user, userData } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const schoolId = user?.metadata?.school_id || userData?.school_id;

  // Collection references
  const paymentsCollection = collection(db, 'payments');
  const studentsCollection = collection(db, 'students');

  useEffect(() => {
    const loadPayments = async () => {
      if (!schoolId) {
        setPayments([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch payments for the school
        const paymentsQuery = query(
          paymentsCollection,
          where('school_id', '==', schoolId),
          orderBy('payment_date', 'desc'),
          limit(50)
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

        setPayments(paymentsData || []);
      } catch (error) {
        console.error('Error loading payments:', error);
        toast.error('Failed to load payments');
        setPayments([]);
      }
      setLoading(false);
    };

    loadPayments();
  }, [schoolId]);

  const formatDate = (date) => {
    if (!date) return '—';
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    return new Date(date).toLocaleDateString();
  };

  const columns = [
    { 
      key: 'students', 
      label: 'Student', 
      render: (row) => row.students?.name || row.students?.full_name || 'School payment' 
    },
    { 
      key: 'amount', 
      label: 'Amount', 
      render: (row) => `KES ${row.amount?.toLocaleString() || 0}` 
    },
    { 
      key: 'payment_method', 
      label: 'Method',
      render: (row) => row.payment_method || 'N/A'
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
          {row.status || 'pending'}
        </span>
      )
    },
    { 
      key: 'payment_date', 
      label: 'Date', 
      render: (row) => formatDate(row.payment_date)
    }
  ];

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
        <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
        <p className="text-sm text-gray-500">School fee payments and receipts from your school.</p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 border border-gray-100 shadow-sm text-gray-600">
          No payment history is available for this school yet.
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-4">
          <DataTable columns={columns} data={payments} showPagination={true} itemsPerPage={10} />
        </div>
      )}
    </div>
  );
};

export default AccountantPayments;
