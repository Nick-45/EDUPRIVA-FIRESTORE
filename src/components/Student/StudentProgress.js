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

const StudentProgress = () => {
  const { user, userData } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [averageScore, setAverageScore] = useState(0);

  // Collection references
  const studentsCollection = collection(db, 'students');
  const feesCollection = collection(db, 'fees');
  const assessmentsCollection = collection(db, 'assessments');
  const subjectsCollection = collection(db, 'subjects');

  useEffect(() => {
    const loadProgress = async () => {
      if (!user) {
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

        // Calculate average score
        const scores = assessmentsData.map(a => a.score || 0);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        setAverageScore(scores.length ? Number((totalScore / scores.length).toFixed(1)) : 0);

        setStudent(studentRecord);
      } catch (error) {
        console.error('Error loading progress:', error);
        toast.error('Failed to load progress data');
      }
      setLoading(false);
    };

    loadProgress();
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
          Student progress cannot be shown until your profile is linked. Please check with school administration.
        </div>
      </div>
    );
  }

  const balance = student.fees?.[0]?.balance || 0;
  const feeAmount = student.fees?.[0]?.amount || 0;
  const feeProgress = feeAmount ? Math.max(0, Math.min(100, ((feeAmount - balance) / feeAmount) * 100)) : 0;

  return (
    <div className="p-4 pt-24">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Progress Overview</h2>
        <p className="text-sm text-gray-500">Track fee payments and academic progress over time.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-5">
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 mb-2">Fee payment</div>
          <div className="text-3xl font-semibold text-gray-900">{Math.round(feeProgress)}%</div>
          <div className="text-sm text-gray-500 mt-2">Paid toward KES {feeAmount.toLocaleString()}</div>
        </div>
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 mb-2">Academic average</div>
          <div className="text-3xl font-semibold text-gray-900">{averageScore}%</div>
          <div className="text-sm text-gray-500 mt-2">Across recent assessments</div>
        </div>
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase text-gray-500 mb-2">Latest grade</div>
          <div className="text-3xl font-semibold text-gray-900">
            {student.assessments?.[0]?.level || 'Pending'}
          </div>
          <div className="text-sm text-gray-500 mt-2">Most recent entry</div>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
        <div className="text-sm text-gray-700 mb-4">Fee progress</div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, feeProgress)}%` }} />
        </div>
        <div className="mt-3 text-xs text-gray-500">Payment progress against current term fee.</div>
      </div>
    </div>
  );
};

export default StudentProgress;
