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

const TeacherStudents = () => {
  const { user, userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const schoolId = user?.metadata?.school_id || userData?.school_id;

  useEffect(() => {
    const fetchStudents = async () => {
      if (!schoolId) {
        setStudents([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch students from the students collection
        const studentsQuery = query(
          collection(db, 'students'),
          where('school_id', '==', schoolId),
          orderBy('name', 'asc')
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const studentsData = [];
        
        for (const studentDoc of studentsSnapshot.docs) {
          const student = {
            id: studentDoc.id,
            ...studentDoc.data()
          };
          
          // Fetch assessments for each student
          const assessmentsQuery = query(
            collection(db, 'assessments'),
            where('student_id', '==', studentDoc.id),
            orderBy('created_at', 'desc'),
            limit(1)
          );
          const assessmentsSnapshot = await getDocs(assessmentsQuery);
          
          if (!assessmentsSnapshot.empty) {
            const assessmentDoc = assessmentsSnapshot.docs[0];
            const assessmentData = assessmentDoc.data();
            
            // Fetch subject name if subject_id exists
            let subjectName = 'Subject';
            if (assessmentData.subject_id) {
              try {
                const subjectDoc = await getDoc(doc(db, 'subjects', assessmentData.subject_id));
                if (subjectDoc.exists()) {
                  subjectName = subjectDoc.data().name || 'Subject';
                }
              } catch (subjectError) {
                console.warn('Could not fetch subject:', assessmentData.subject_id);
              }
            }
            
            student.latest_assessment = {
              subject: subjectName,
              score: assessmentData.score,
              level: assessmentData.level || 'N/A',
              created_at: assessmentData.created_at
            };
          }
          
          studentsData.push(student);
        }
        
        setStudents(studentsData || []);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Could not load students');
        setStudents([]);
      }
      setLoading(false);
    };

    fetchStudents();
  }, [schoolId]);

  const columns = [
    { key: 'name', label: 'Student', render: (row) => row.name || 'N/A' },
    { key: 'grade', label: 'Grade', render: (row) => row.grade || 'N/A' },
    { key: 'admission_number', label: 'Admission #', render: (row) => row.admission_number || 'N/A' },
    {
      key: 'assessment',
      label: 'Latest Assessment',
      render: (row) => {
        if (row.latest_assessment) {
          return `${row.latest_assessment.subject} · ${row.latest_assessment.level}`;
        }
        return 'No record';
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
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">My Students</h2>
        <p className="text-sm text-gray-500">Browse students assigned to your school and review the latest assessment entry.</p>
      </div>

      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-4">
        <DataTable
          columns={columns}
          data={students}
          showPagination={true}
          itemsPerPage={10}
        />
      </div>
    </div>
  );
};

export default TeacherStudents;
