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

const ParentAnalytics = () => {
  const { user, userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ averageScore: 0, topStudent: null, assessmentCount: 0 });

  const parentId = user?.uid || userData?.id;

  // Collection references
  const studentsCollection = collection(db, 'students');
  const assessmentsCollection = collection(db, 'assessments');
  const subjectsCollection = collection(db, 'subjects');

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!parentId) {
        setStudents([]);
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
        const studentsData = [];

        for (const studentDoc of studentsSnapshot.docs) {
          const student = {
            id: studentDoc.id,
            ...studentDoc.data()
          };

          // Fetch assessments for this student
          const assessmentsQuery = query(
            assessmentsCollection,
            where('student_id', '==', studentDoc.id),
            orderBy('created_at', 'desc')
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

          // Calculate student analytics
          const scores = assessmentsData.map(a => a.score || 0);
          const average = scores.length
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : 0;

          student.averageScore = Number(average.toFixed(1));
          student.assessmentCount = assessmentsData.length;
          student.lastAssessment = assessmentsData[0] || null;

          studentsData.push(student);
        }

        // Calculate overall summary
        const allAssessments = studentsData.flatMap((student) => student.assessments || []);
        const allScores = allAssessments.map(a => a.score || 0);
        const averageScore = allScores.length
          ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
          : 0;
        
        const topStudent = studentsData.length
          ? studentsData.slice().sort((a, b) => b.averageScore - a.averageScore)[0]
          : null;

        setStudents(studentsData);
        setSummary({
          averageScore: Number(averageScore.toFixed(1)),
          topStudent,
          assessmentCount: allAssessments.length
        });
      } catch (error) {
        console.error('Error loading analytics:', error);
        toast.error('Unable to load analytics');
        setStudents([]);
      }

      setLoading(false);
    };

    loadAnalytics();
  }, [parentId]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    return new Date(date).toLocaleDateString();
  };

  const columns = [
    {
      key: 'name',
      label: 'Student',
      render: (row) => row.name || row.full_name || 'N/A'
    },
    {
      key: 'grade',
      label: 'Grade',
      render: (row) => row.grade || 'N/A'
    },
    {
      key: 'averageScore',
      label: 'Average Score',
      render: (row) => `${row.averageScore || 0}%`
    },
    {
      key: 'assessmentCount',
      label: 'Assessments',
      render: (row) => row.assessmentCount || 0
    },
    {
      key: 'lastAssessment',
      label: 'Latest Subject',
      render: (row) => {
        if (row.lastAssessment?.subjects?.name) {
          return row.lastAssessment.subjects.name;
        }
        return 'N/A';
      }
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
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Average score</div>
          <div className="text-3xl font-semibold text-gray-900">{summary.averageScore}%</div>
          <div className="text-sm text-gray-500 mt-2">Across {summary.assessmentCount} assessments</div>
        </div>
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Top performer</div>
          <div className="text-xl font-semibold text-gray-900">
            {summary.topStudent?.name || summary.topStudent?.full_name || 'No records'}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Grade {summary.topStudent?.grade || '—'}
          </div>
        </div>
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Children tracked</div>
          <div className="text-3xl font-semibold text-gray-900">{students.length}</div>
          <div className="text-sm text-gray-500 mt-2">Profiles linked to your account</div>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-gray-600">
          No assessment analytics are available yet. Your child's results will appear once teachers submit reports.
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-4">
          <DataTable
            columns={columns}
            data={students}
            showPagination={true}
            itemsPerPage={8}
          />
        </div>
      )}
    </div>
  );
};

export default ParentAnalytics;
