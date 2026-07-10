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
import { Users, BookOpen, Sparkles, BarChart3 } from 'lucide-react';

const TeacherHome = () => {
  const { user, userData } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState('');

  const schoolId = user?.metadata?.school_id || userData?.school_id;

  const loadStudents = useCallback(async () => {
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
        orderBy('name', 'asc'),
        limit(20)
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
          
          student.assessments = [{
            score: assessmentData.score,
            level: assessmentData.level || 'N/A',
            subjects: { name: subjectName }
          }];
        }
        
        studentsData.push(student);
      }
      
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
      setStudents([]);
    }
    setLoading(false);
  }, [schoolId]);

  const loadInsight = useCallback(() => {
    const totalStudents = students.length;
    const topStudent = students[0]?.name || students[0]?.full_name || 'N/A';
    setInsight(`📚 You are teaching ${totalStudents} students. ${totalStudents > 0 ? `Top student: ${topStudent}` : ''} Tap Students to manage your class or Assessments to enter CBC results.`);
  }, [students]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadInsight();
  }, [loadInsight]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-24">
      <AIInsightCard insight={insight} />

      <VoiceInput onResult={(text) => {
        if (text.toLowerCase().includes('remark')) {
          toast.info('Open Assessments to draft AI remarks for students.');
        } else if (text.toLowerCase().includes('class')) {
          toast.info('Student information is available under Students.');
        } else {
          toast.info('Try: "show my class", "enter assessment", or "review students".');
        }
      }} />

      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-sm text-gray-500">Students in school</div>
          <div className="text-3xl font-semibold text-gray-900 mt-3">{students.length}</div>
        </div>
        <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="text-sm text-gray-500">Top student</div>
          <div className="text-3xl font-semibold text-gray-900 mt-3">
            {students.length > 0 ? (students[0]?.name || students[0]?.full_name || 'N/A') : 'N/A'}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => toast.info('Use Assessments to create or review CBC records.')}
          className="rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-5 shadow-sm flex items-center gap-3"
        >
          <Sparkles size={18} />
          <span>AI Remark Assistant</span>
        </button>
        <button
          onClick={() => toast.info('Student attendance and performance details are available in Students.')}
          className="rounded-3xl border border-orange-500 text-orange-600 py-4 px-5 shadow-sm flex items-center gap-3"
        >
          <BarChart3 size={18} />
          <span>Class Growth</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherHome;
