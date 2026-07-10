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

const StudentProfile = () => {
  const { user, userData } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Collection references
  const studentsCollection = collection(db, 'students');
  const feesCollection = collection(db, 'fees');
  const assessmentsCollection = collection(db, 'assessments');

  useEffect(() => {
    const loadProfile = async () => {
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
        const assessmentsData = assessmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        studentRecord.assessments = assessmentsData;

        setStudent(studentRecord);
      } catch (error) {
        console.error('Error loading student profile:', error);
        setStudent(null);
      }
      setLoading(false);
    };

    loadProfile();
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
          Student profile not available. Please verify your account connection with school administration.
        </div>
      </div>
    );
  }

  // Get the latest fee record
  const latestFee = student.fees?.[0];
  const termFee = latestFee?.amount || 0;
  const balance = latestFee?.balance || 0;

  return (
    <div className="p-4 pt-24">
      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">My Profile</h2>
            <p className="text-sm text-gray-500">A quick overview of your student information and account status.</p>
          </div>
          <div className="inline-flex items-center rounded-3xl bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
            Role: Student
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-xs uppercase text-gray-500 mb-3">Personal</div>
            <div className="text-sm text-gray-700 mb-2">
              <strong>Name:</strong> {student.name || student.full_name || 'N/A'}
            </div>
            <div className="text-sm text-gray-700 mb-2">
              <strong>Admission #:</strong> {student.admission_number || 'N/A'}
            </div>
            <div className="text-sm text-gray-700">
              <strong>Grade:</strong> {student.grade || 'N/A'}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-xs uppercase text-gray-500 mb-3">Financial</div>
            <div className="text-sm text-gray-700 mb-2">
              <strong>Term Fee:</strong> KES {termFee.toLocaleString()}
            </div>
            <div className="text-sm text-gray-700">
              <strong>Balance:</strong> KES {balance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Assessment Summary */}
        {student.assessments && student.assessments.length > 0 && (
          <div className="mt-4 rounded-3xl bg-slate-50 p-5">
            <div className="text-xs uppercase text-gray-500 mb-3">Academic Summary</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-700">
                  <strong>Total Assessments:</strong> {student.assessments.length}
                </div>
                <div className="text-sm text-gray-700">
                  <strong>Average Score:</strong>{' '}
                  {Math.round(
                    student.assessments.reduce((sum, a) => sum + (a.score || 0), 0) / 
                    student.assessments.length
                  )}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-700">
                  <strong>Latest Level:</strong> {student.assessments[0]?.level || 'N/A'}
                </div>
                <div className="text-sm text-gray-700">
                  <strong>Latest Score:</strong> {student.assessments[0]?.score || 'N/A'}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
