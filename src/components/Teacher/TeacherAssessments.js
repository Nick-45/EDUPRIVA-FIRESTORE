import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  addDoc, 
  updateDoc, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../Common/DataTable';
import toast from 'react-hot-toast';

const TeacherAssessments = () => {
  const { user, userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ studentId: '', subject: 'Mathematics', score: '' });
  const [subjects, setSubjects] = useState([]);

  const schoolId = user?.metadata?.school_id || userData?.school_id;

  // Collection references
  const studentsCollection = collection(db, 'students');
  const assessmentsCollection = collection(db, 'assessments');
  const subjectsCollection = collection(db, 'subjects');

  useEffect(() => {
    const loadData = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch students
        const studentsQuery = query(
          studentsCollection,
          where('school_id', '==', schoolId),
          orderBy('name', 'asc')
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStudents(studentsData || []);

        // Fetch subjects
        const subjectsQuery = query(
          subjectsCollection,
          where('school_id', '==', schoolId)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjectsData = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSubjects(subjectsData || []);

        // Fetch assessments
        const assessmentsQuery = query(
          assessmentsCollection,
          where('school_id', '==', schoolId),
          orderBy('created_at', 'desc'),
          limit(30)
        );
        const assessmentsSnapshot = await getDocs(assessmentsQuery);
        const assessmentsData = [];

        for (const assessmentDoc of assessmentsSnapshot.docs) {
          const assessment = {
            id: assessmentDoc.id,
            ...assessmentDoc.data()
          };

          // Fetch student data
          if (assessment.student_id) {
            try {
              const studentDoc = await getDoc(doc(db, 'students', assessment.student_id));
              if (studentDoc.exists()) {
                assessment.students = {
                  id: studentDoc.id,
                  ...studentDoc.data()
                };
              }
            } catch (studentError) {
              console.warn('Could not fetch student:', assessment.student_id);
            }
          }

          // Fetch subject data
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
        console.error('Error loading data:', error);
        toast.error('Unable to load data');
      }

      setLoading(false);
    };

    loadData();
  }, [schoolId]);

  const saveAssessment = async () => {
    const score = parseInt(form.score, 10);
    if (!form.studentId || !form.subject || Number.isNaN(score)) {
      toast.error('Complete the assessment details');
      return;
    }

    const level = score >= 80 ? 'EE' : score >= 60 ? 'ME' : score >= 40 ? 'AE' : 'BE';

    try {
      const currentUser = auth.currentUser;
      
      // Check if subject exists, if not create it
      let subjectId = form.subject;
      const subjectQuery = query(
        subjectsCollection,
        where('name', '==', form.subject),
        where('school_id', '==', schoolId)
      );
      const subjectSnapshot = await getDocs(subjectQuery);
      
      if (subjectSnapshot.empty) {
        // Create new subject
        const newSubjectRef = await addDoc(subjectsCollection, {
          name: form.subject,
          school_id: schoolId,
          created_at: new Date(),
          created_by: currentUser?.uid
        });
        subjectId = newSubjectRef.id;
      } else {
        subjectId = subjectSnapshot.docs[0].id;
      }

      // Save assessment
      const assessmentData = {
        school_id: schoolId,
        student_id: form.studentId,
        subject_id: subjectId,
        score: score,
        level: level,
        term: 'Term 2',
        year: new Date().getFullYear(),
        created_by: currentUser?.uid,
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date()
      };

      await addDoc(assessmentsCollection, assessmentData);

      toast.success('Assessment recorded successfully');
      setForm({ studentId: '', subject: 'Mathematics', score: '' });

      // Refresh assessments
      const refreshQuery = query(
        assessmentsCollection,
        where('school_id', '==', schoolId),
        orderBy('created_at', 'desc'),
        limit(30)
      );
      const refreshSnapshot = await getDocs(refreshQuery);
      const refreshData = [];

      for (const assessmentDoc of refreshSnapshot.docs) {
        const assessment = {
          id: assessmentDoc.id,
          ...assessmentDoc.data()
        };

        if (assessment.student_id) {
          try {
            const studentDoc = await getDoc(doc(db, 'students', assessment.student_id));
            if (studentDoc.exists()) {
              assessment.students = {
                id: studentDoc.id,
                ...studentDoc.data()
              };
            }
          } catch (studentError) {
            console.warn('Could not fetch student:', assessment.student_id);
          }
        }

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

        refreshData.push(assessment);
      }

      setAssessments(refreshData || []);
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    }
  };

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
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Assessments</h2>
          <p className="text-sm text-gray-500">Create and review assessments for your students.</p>
        </div>
        <div className="rounded-3xl bg-orange-50 border border-orange-100 p-5 text-orange-700">
          <div className="text-sm font-semibold">Quick entry</div>
          <div className="text-sm mt-2">Select a student, choose a subject, and save an assessment instantly.</div>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-5 mb-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Student</label>
            <select
              className="mt-2 w-full rounded-2xl border border-gray-200 p-3"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name || student.full_name} — {student.grade}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              className="mt-2 w-full rounded-2xl border border-gray-200 p-3"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Mathematics"
              list="subject-options"
            />
            <datalist id="subject-options">
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Score</label>
            <input
              type="number"
              min="0"
              max="100"
              className="mt-2 w-full rounded-2xl border border-gray-200 p-3"
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
              placeholder="85"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={saveAssessment}
              className="w-full rounded-2xl bg-orange-500 py-3 text-white font-semibold hover:bg-orange-600 transition"
            >
              Save Assessment
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-4">
        <DataTable
          columns={[
            { 
              key: 'students', 
              label: 'Student', 
              render: (row) => row.students?.name || row.students?.full_name || 'Unknown' 
            },
            { 
              key: 'subject', 
              label: 'Subject', 
              render: (row) => row.subjects?.name || row.subject_id || 'N/A' 
            },
            { key: 'score', label: 'Score' },
            { key: 'level', label: 'Level' },
            { 
              key: 'created_at', 
              label: 'Created', 
              render: (row) => formatDate(row.created_at) 
            }
          ]}
          data={assessments}
          showPagination={true}
          itemsPerPage={8}
        />
      </div>
    </div>
  );
};

export default TeacherAssessments;
