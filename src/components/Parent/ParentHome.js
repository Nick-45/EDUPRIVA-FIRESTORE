import React, { useEffect, useState, useCallback } from 'react';
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
import AIInsightCard from '../Common/AIInsightCard';
import VoiceInput from '../Common/VoiceInput';
import toast from 'react-hot-toast';
import { DollarSign, BookOpen, FileText } from 'lucide-react';

const ParentHome = () => {
  const { user, userData } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState('');

  const parentId = user?.uid || userData?.id;

  // Collection references
  const studentsCollection = collection(db, 'students');
  const feesCollection = collection(db, 'fees');
  const assessmentsCollection = collection(db, 'assessments');
  const subjectsCollection = collection(db, 'subjects');

  const loadChildren = useCallback(async () => {
    if (!parentId) {
      setChildren([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch students linked to parent
      const studentsQuery = query(
        studentsCollection,
        where('parent_id', '==', parentId),
        orderBy('name', 'asc')
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const childrenData = [];

      for (const studentDoc of studentsSnapshot.docs) {
        const student = {
          id: studentDoc.id,
          ...studentDoc.data()
        };

        // Fetch fees for this student
        const feesQuery = query(
          feesCollection,
          where('student_id', '==', studentDoc.id),
          orderBy('created_at', 'desc'),
          limit(1)
        );
        const feesSnapshot = await getDocs(feesQuery);
        if (!feesSnapshot.empty) {
          const feeDoc = feesSnapshot.docs[0];
          student.fees = [{
            id: feeDoc.id,
            ...feeDoc.data()
          }];
        }

        // Fetch assessments for this student
        const assessmentsQuery = query(
          assessmentsCollection,
          where('student_id', '==', studentDoc.id),
          orderBy('created_at', 'desc'),
          limit(1)
        );
        const assessmentsSnapshot = await getDocs(assessmentsQuery);
        const assessmentsData = [];

        for (const assessmentDoc of assessmentsSnapshot.docs) {
          const assessment = {
            id: assessmentDoc.id,
            ...assessmentDoc.data()
          };

          // Fetch subject name
          if (assessment.subject_id) {
            try {
              const subjectDoc = await getDoc(doc(db, 'subjects', assessment.subject_id));
              if (subjectDoc.exists()) {
                assessment.subjects = {
                  id: subjectDoc.id,
                  ...subjectDoc.data()
                };
              }
            } catch (subjectError) {
              console.warn('Could not fetch subject:', assessment.subject_id);
            }
          }

          assessmentsData.push(assessment);
        }

        student.assessments = assessmentsData;
        childrenData.push(student);
      }

      setChildren(childrenData || []);
    } catch (error) {
      console.error('Error loading children data:', error);
      toast.error('Failed to load children data');
      setChildren([]);
    }
    setLoading(false);
  }, [parentId]);

  const loadAIInsights = useCallback(() => {
    const totalBalance = children.reduce((sum, child) => sum + (child.fees?.[0]?.balance || 0), 0);
    if (totalBalance > 0) {
      setAiInsight(`💰 You have a total balance of KES ${totalBalance.toLocaleString()}. Keep your child on track by settling fees early.`);
    } else if (children.length > 0) {
      setAiInsight(`✅ All fees are paid for your children. Great job staying ahead of school finances!`);
    } else {
      setAiInsight('👋 Welcome to your parent dashboard. Add your children to monitor fees, reports, and attendance.');
    }
  }, [children]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    loadAIInsights();
  }, [loadAIInsights]);

  const payFees = async (studentId, balance) => {
    const amount = prompt(`Enter amount to pay (Balance: KES ${balance.toLocaleString()}):`);
    if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
      toast.error('Enter a valid payment amount.');
      return;
    }

    toast.loading('Preparing payment...');
    try {
      // Get user's phone number from userData
      const phoneNumber = userData?.phone || userData?.phone_number;
      
      const response = await fetch('/api/mpesa-stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          amount: parseInt(amount),
          phoneNumber: phoneNumber || '0712345678', // Fallback for testing
          payerEmail: userData?.email || user?.email,
        })
      });
      const result = await response.json();
      toast.dismiss();
      if (result.success) {
        toast.success('STK push sent. Confirm on your phone.');
      } else {
        toast.error(result.error || 'Payment could not be initiated.');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Payment service unavailable.');
      console.error(error);
    }
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
      <AIInsightCard insight={aiInsight} />

      <VoiceInput onResult={(text) => {
        if (text.toLowerCase().includes('fees')) {
          toast.info('Tap Payments to review fee history and balances.');
        } else if (text.toLowerCase().includes('report')) {
          toast.info('Use Analytics for your child’s latest assessment trends.');
        } else {
          toast.info('Ask me to check fees, view results, or show your child’s latest progress.');
        }
      }} />

      <div className="mt-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">My Children</h2>
        {children.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-gray-600">
            No linked children were found for your account. Please ask your school administrator to connect your parent profile.
          </div>
        ) : (
          children.map((child) => {
            const fee = child.fees?.[0];
            const balance = fee?.balance || 0;
            const totalAmount = fee?.amount || 0;
            const paidPercentage = totalAmount > 0 ? ((totalAmount - balance) / totalAmount) * 100 : 0;
            const recentAssessment = child.assessments?.[0];

            return (
              <div key={child.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {child.name || child.full_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {child.grade} · Adm {child.admission_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${balance === 0 ? 'text-emerald-600' : 'text-orange-500'}`}>
                      KES {balance.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">Current balance</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>Fees paid</span>
                    <span>{Math.round(paidPercentage)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, paidPercentage))}%` }} />
                  </div>
                </div>

                {recentAssessment && (
                  <div className="mt-4 rounded-2xl bg-orange-50 p-3 text-sm text-orange-700">
                    Latest result: {recentAssessment.subjects?.name || 'Subject'} — {recentAssessment.level} ({recentAssessment.score}%)
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => payFees(child.id, balance)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 text-white py-2 text-sm font-medium hover:bg-orange-600 transition"
                  >
                    <DollarSign size={16} /> Pay Fees
                  </button>
                  <button
                    onClick={() => toast.info('Student report view available under Analytics.')}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-700 py-2 text-sm font-medium hover:bg-gray-50 transition"
                  >
                    <BookOpen size={16} /> View Results
                  </button>
                  <button
                    onClick={() => toast.info('Fee statement generation will be available soon.')}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-700 py-2 text-sm font-medium hover:bg-gray-50 transition"
                  >
                    <FileText size={16} /> Statement
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ParentHome;
