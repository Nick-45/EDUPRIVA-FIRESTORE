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
import AIInsightCard from '../Common/AIInsightCard';
import toast from 'react-hot-toast';

const StudentHome = () => {
  const { user, userData } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Collection references
  const studentsCollection = collection(db, 'students');
  const feesCollection = collection(db, 'fees');
  const assessmentsCollection = collection(db, 'assessments');
  const subjectsCollection = collection(db, 'subjects');

  useEffect(() => {
    const loadStudent = async () => {
      if (!user) {
        setStudent(null);
        setLoading(false);
        return;
      }

      try {
        let studentRecord = null;

        // Try to find student by user_id
        const studentQuery = query(
          studentsCollection,
          where('user_id', '==', user.uid)
        );
        const studentSnapshot = await getDocs(studentQuery);
        
        if (!studentSnapshot.empty) {
          const doc = studentSnapshot.docs[0];
          studentRecord = {
            id: doc.id,
            ...doc.data()
          };
        }

        // If not found by user_id, try by email
        if (!studentRecord && user.email) {
          const emailQuery = query(
            studentsCollection,
            where('email', '==', user.email)
          );
          const emailSnapshot = await getDocs(emailQuery);
          if (!emailSnapshot.empty) {
            const doc = emailSnapshot.docs[0];
            studentRecord = {
              id: doc.id,
              ...doc.data()
            };
          }
        }

        // If still not found, try by id match
        if (!studentRecord) {
          const idQuery = query(
            studentsCollection,
            where('id', '==', user.uid)
          );
          const idSnapshot = await getDocs(idQuery);
          if (!idSnapshot.empty) {
            const doc = idSnapshot.docs[0];
            studentRecord = {
              id: doc.id,
              ...doc.data()
            };
          }
        }

        if (!studentRecord) {
          setStudent(null);
          setLoading(false);
          return;
        }

        // Fetch fees for this student
        const feesQuery = query(
          feesCollection,
          where('student_id', '==', studentRecord.id),
          orderBy('created_at', 'desc'),
          limit(1)
        );
        const feesSnapshot = await getDocs(feesQuery);
        if (!feesSnapshot.empty) {
          studentRecord.fees = [{
            id: feesSnapshot.docs[0].id,
            ...feesSnapshot.docs[0].data()
          }];
        }

        // Fetch assessments for this student
        const assessmentsQuery = query(
          assessmentsCollection,
          where('student_id', '==', studentRecord.id),
          orderBy('created_at', 'desc')
        );
        const assessmentsSnapshot = await getDocs(assessmentsQuery);
        const assessmentsData = [];

        for (const assessmentDoc of assessmentsSnapshot.docs) {
          const assessment = {
            id: assessmentDoc.id,
            ...assessmentDoc.data()
          };

          // Fetch subject name if subject_id exists
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

        studentRecord.assessments = assessmentsData;
        setStudent(studentRecord);
      } catch (error) {
        console.error('Error loading student:', error);
        setStudent(null);
      }
      setLoading(false);
    };

    loadStudent();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-4 pt-24">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 text-gray-600">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Student profile not found</h2>
          <p>Please contact your school administrator to link your student profile to this account.</p>
        </div>
      </div>
    );
  }

  const latestAssessment = student.assessments?.[0];
  const balance = student.fees?.[0]?.balance || 0;
  const feeAmount = student.fees?.[0]?.amount || 0;
  const paidPercent = feeAmount ? Math.round(((feeAmount - balance) / feeAmount) * 100) : 0;

  return (
    <div className="p-4 pt-24">
      <AIInsightCard 
        insight={`Welcome back, ${student.name || student.full_name || 'Student'}. Your current fee balance is KES ${balance.toLocaleString()}.`} 
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 mb-2">Latest Score</div>
          <div className="text-2xl font-semibold text-gray-900">
            {latestAssessment ? `${latestAssessment.score}%` : 'No data'}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {latestAssessment?.subjects?.name || 'Awaiting teacher entry'}
          </div>
        </div>
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 mb-2">Fee Balance</div>
          <div className="text-2xl font-semibold text-gray-900">
            KES {balance.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-2">{paidPercent}% paid</div>
        </div>
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 mb-2">Current Level</div>
          <div className="text-2xl font-semibold text-gray-900">
            {latestAssessment?.level || 'Pending'}
          </div>
          <div className="text-sm text-gray-500 mt-2">Based on latest assessment</div>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Student Summary</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Name</div>
            <div className="text-base font-semibold text-gray-900">
              {student.name || student.full_name || 'N/A'}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Admission {student.admission_number || 'N/A'}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs uppercase text-gray-500 mb-2">Grade</div>
            <div className="text-base font-semibold text-gray-900">
              {student.grade || '—'}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              School: {student.school_name || userData?.schools?.name || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
