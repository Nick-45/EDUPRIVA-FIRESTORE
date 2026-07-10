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

const StudentResults = () => {
  const { user, userData } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);

  // Collection references
  const studentsCollection = collection(db, 'students');
  const assessmentsCollection = collection(db, 'assessments');
  const subjectsCollection = collection(db, 'subjects');

  useEffect(() => {
    const loadResults = async () => {
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
          studentRecord = {
            id: studentSnapshot.docs[0].id,
            ...studentSnapshot.docs[0].data()
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
            studentRecord = {
              id: emailSnapshot.docs[0].id,
              ...emailSnapshot.docs[0].data()
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
            studentRecord = {
              id: idSnapshot.docs[0].id,
              ...idSnapshot.docs[0].data()
            };
          }
        }

        if (!studentRecord) {
          setStudent(null);
          setAssessments([]);
          setLoading(false);
          return;
        }

        setStudent(studentRecord);

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

        setAssessments(assessmentsData || []);
      } catch (error) {
        console.error('Error loading results:', error);
        toast.error('Failed to load results');
        setAssessments([]);
      }
      setLoading(false);
    };

    loadResults();
  }, [user]);

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

  if (!student) {
    return (
      <div className="p-4 pt-24">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 text-gray-600">
          No student record could be identified for this account. Please contact your school admin.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-24">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">My Results</h2>
        <p className="text-sm text-gray-500">Review your latest assessments and academic progress.</p>
      </div>

      {assessments.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 text-gray-600">
          There are no results available yet. Check back after your teacher publishes assessments.
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-4">
          <DataTable
            columns={[
              { 
                key: 'subjects', 
                label: 'Subject', 
                render: (row) => row.subjects?.name || 'N/A' 
              },
              { 
                key: 'score', 
                label: 'Score',
                render: (row) => `${row.score}%` 
              },
              { 
                key: 'level', 
                label: 'Level' 
              },
              { 
                key: 'term', 
                label: 'Term' 
              },
              { 
                key: 'year', 
                label: 'Year' 
              },
              { 
                key: 'created_at', 
                label: 'Date', 
                render: (row) => formatDate(row.created_at)
              }
            ]}
            data={assessments}
            showPagination={true}
            itemsPerPage={10}
          />
        </div>
      )}
    </div>
  );
};

export default StudentResults;
