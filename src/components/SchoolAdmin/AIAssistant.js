import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Send, RefreshCw, CheckCircle, Edit2, AlertCircle, Loader } from 'lucide-react';

const AIAssistant = ({ openModal, showToast }) => {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [generating, setGenerating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [stats, setStats] = useState({
    totalGenerated: 0,
    approvedCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const schoolId = user?.user_metadata?.school_id;
  const subjects = ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'CRE', 'Music', 'Art & Craft', 'Physical Education'];

  // Collection references
  const studentsCollection = collection(db, 'students');
  const aiRemarksCollection = collection(db, 'ai_remarks');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    if (schoolId) {
      fetchData();
    }
  }, [schoolId]);

  const fetchData = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      // Fetch students
      const studentsQuery = query(
        studentsCollection,
        where('school_id', '==', schoolId),
        orderBy('name')
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData || []);

      // Fetch AI remarks
      const aiRemarksQuery = query(
        aiRemarksCollection,
        where('school_id', '==', schoolId),
        orderBy('created_at', 'desc')
      );
      const aiRemarksSnapshot = await getDocs(aiRemarksQuery);
      const remarksData = [];

      for (const remarkDoc of aiRemarksSnapshot.docs) {
        const remark = {
          id: remarkDoc.id,
          ...remarkDoc.data()
        };

        // Fetch student data if student_id exists
        if (remark.student_id) {
          try {
            const studentDoc = await getDoc(doc(db, 'students', remark.student_id));
            if (studentDoc.exists()) {
              remark.students = [{
                id: studentDoc.id,
                ...studentDoc.data()
              }];
            }
          } catch (studentError) {
            console.warn('Could not fetch student:', remark.student_id);
          }
        }

        remarksData.push(remark);
      }
      
      setRemarks(remarksData || []);
      setStats({
        totalGenerated: remarksData?.length || 0,
        approvedCount: remarksData?.filter(r => r.status === 'published').length || 0,
        pendingCount: remarksData?.filter(r => r.status === 'draft').length || 0,
      });
    } catch (error) {
      console.error('Error fetching AI data:', error);
      showToast('Failed to load AI assistant data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateAIRemark = async (student, subject) => {
    try {
      // Call your Cloud Function or API endpoint
      const response = await fetch('/api/generate-remark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.name,
          studentGrade: student.grade,
          subject: subject,
          schoolId: schoolId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to generate remark');
      
      return {
        remark: data.remark,
        level: data.level,
      };
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  };

  const generateRemark = async () => {
    if (!selectedStudent) {
      showToast('Please select a student', 'error');
      return;
    }

    setGenerating(true);
    const student = students.find(s => s.id === selectedStudent);
    
    try {
      const currentUser = auth.currentUser;
      const aiResponse = await generateAIRemark(student, selectedSubject);
      
      const remarkData = {
        school_id: schoolId,
        student_id: selectedStudent,
        subject: selectedSubject,
        remark: aiResponse.remark,
        grade: aiResponse.level,
        type: 'academic',
        status: 'draft',
        term: new Date().getFullYear().toString(),
        created_by: currentUser?.uid,
        created_at: new Date(),
        updated_at: new Date()
      };

      await addDoc(aiRemarksCollection, remarkData);

      await addDoc(auditLogsCollection, {
        school_id: schoolId,
        user_id: currentUser?.uid,
        action: 'Generated AI remark',
        entity_type: 'ai',
        new_values: { student_id: selectedStudent, subject: selectedSubject },
        created_at: new Date()
      });

      showToast('AI remark generated successfully', 'success');
      await fetchData();
      setSelectedStudent('');
    } catch (error) {
      console.error('Error generating remark:', error);
      showToast(error.message || 'Failed to generate remark', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generateBulkRemarks = async () => {
    if (students.length === 0) {
      showToast('No students found', 'error');
      return;
    }

    setBulkGenerating(true);
    let successCount = 0;
    let errorCount = 0;
    
    const studentsToProcess = students.slice(0, 10);
    
    for (const student of studentsToProcess) {
      try {
        const currentUser = auth.currentUser;
        const aiResponse = await generateAIRemark(student, selectedSubject);
        
        const remarkData = {
          school_id: schoolId,
          student_id: student.id,
          subject: selectedSubject,
          remark: aiResponse.remark,
          grade: aiResponse.level,
          type: 'academic',
          status: 'draft',
          term: new Date().getFullYear().toString(),
          created_by: currentUser?.uid,
          created_at: new Date(),
          updated_at: new Date()
        };

        await addDoc(aiRemarksCollection, remarkData);
        successCount++;
      } catch (error) {
        console.error(`Error generating remark for ${student.name}:`, error);
        errorCount++;
      }
    }
    
    const currentUser = auth.currentUser;
    await addDoc(auditLogsCollection, {
      school_id: schoolId,
      user_id: currentUser?.uid,
      action: 'Bulk generated AI remarks',
      entity_type: 'ai',
      new_values: { count: successCount, subject: selectedSubject },
      created_at: new Date()
    });
    
    showToast(`Generated ${successCount} remarks (${errorCount} failed)`, successCount > 0 ? 'success' : 'error');
    await fetchData();
    setBulkGenerating(false);
  };

  const approveRemark = async (remarkId) => {
    try {
      const currentUser = auth.currentUser;
      const remarkRef = doc(db, 'ai_remarks', remarkId);
      await updateDoc(remarkRef, {
        status: 'published',
        updated_at: new Date()
      });
      
      await addDoc(auditLogsCollection, {
        school_id: schoolId,
        user_id: currentUser?.uid,
        action: 'Approved AI remark',
        entity_type: 'ai',
        entity_id: remarkId,
        created_at: new Date()
      });
      
      showToast('Remark approved successfully', 'success');
      await fetchData();
    } catch (error) {
      console.error('Error approving remark:', error);
      showToast('Failed to approve remark', 'error');
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
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading AI Assistant...</p>
      </div>
    );
  }

  return (
    <>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>AI Assistant</h2>
          <p style={styles.subtitle}>Powered by DeepSeek AI</p>
        </div>
        <div style={styles.aiBadge}>
          <Sparkles size={14} /> AI Powered
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Remarks Generated</div>
          <div style={styles.statValue}>{stats.totalGenerated}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Approved</div>
          <div style={{ ...styles.statValue, color: '#28a745' }}>{stats.approvedCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending Review</div>
          <div style={{ ...styles.statValue, color: '#ff6b00' }}>{stats.pendingCount}</div>
        </div>
      </div>

      {/* Generate Remark Section */}
      <div style={styles.generatePanel}>
        <div style={styles.generateHeader}>
          <Sparkles size={20} style={{ color: '#ff6b00' }} />
          <span style={styles.generateTitle}>Generate AI Remark</span>
        </div>
        <div style={styles.generateBody}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Select Student</label>
              <select 
                style={styles.formSelect}
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="">Choose a student...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} - {s.grade}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Subject</label>
              <select 
                style={styles.formSelect}
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.buttonGroup}>
            <button 
              style={styles.btnPrimary} 
              onClick={generateRemark} 
              disabled={generating || !selectedStudent}
            >
              {generating ? <Loader size={14} className="spin" /> : <Send size={14} />}
              {generating ? ' Generating...' : ' Generate Remark'}
            </button>
            <button 
              style={styles.btnOutline} 
              onClick={generateBulkRemarks} 
              disabled={bulkGenerating || students.length === 0}
            >
              {bulkGenerating ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />}
              {bulkGenerating ? ' Generating...' : ' Bulk Generate (Max 10)'}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Remarks */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>Generated Remarks</span>
          <button style={styles.btnSmall} onClick={fetchData}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div style={styles.panelBody}>
          {remarks.length === 0 ? (
            <div style={styles.emptyState}>
              <Sparkles size={48} style={{ opacity: 0.3 }} />
              <p>No remarks generated yet</p>
              <span style={styles.emptySubtext}>Select a student and click "Generate Remark" to get started</span>
            </div>
          ) : (
            remarks.map(remark => (
              <div key={remark.id} style={styles.remarkCard}>
                <div style={styles.remarkHeader}>
                  <div style={styles.remarkBadges}>
                    <span style={remark.status === 'published' ? styles.badgeApproved : styles.badgeDraft}>
                      {remark.status === 'published' ? 'APPROVED' : 'DRAFT'}
                    </span>
                    <span style={styles.badgeSubject}>{remark.subject}</span>
                    <span style={styles.badgeLevel}>{remark.grade}</span>
                  </div>
                  <div style={styles.remarkActions}>
                    {remark.status === 'draft' && (
                      <>
                        <button 
                          style={styles.actionEdit} 
                          onClick={() => openModal('editRemark', remark)}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button 
                          style={styles.actionApprove} 
                          onClick={() => approveRemark(remark.id)}
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div style={styles.remarkText}>"{remark.remark}"</div>
                <div style={styles.remarkFooter}>
                  <span style={styles.remarkStudent}>
                    {remark.students?.[0]?.name || 'Unknown'} · {remark.students?.[0]?.grade || 'N/A'}
                  </span>
                  <span style={styles.remarkDate}>
                    {formatDate(remark.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #ff6b00',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 24, 
    flexWrap: 'wrap', 
    gap: 16 
  },
  title: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 20, 
    fontWeight: 600, 
    color: '#1a1a1a', 
    marginBottom: 4 
  },
  subtitle: { fontSize: 13, color: '#868e96' },
  aiBadge: { 
    background: '#fff9f0', 
    border: '1px solid #ffedd5', 
    color: '#ff6b00', 
    fontSize: 12, 
    padding: '6px 12px', 
    borderRadius: 20, 
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  statsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(3,1fr)', 
    gap: 20, 
    marginBottom: 24 
  },
  statCard: { 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 16, 
    padding: 20, 
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  statLabel: { 
    fontSize: 12, 
    color: '#868e96', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 8,
    fontWeight: 500
  },
  statValue: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 32, 
    fontWeight: 700, 
    color: '#1a1a1a' 
  },
  generatePanel: { 
    background: '#ffffff', 
    border: '1px solid #ff6b00', 
    borderRadius: 16, 
    marginBottom: 24, 
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  generateHeader: { 
    padding: '16px 20px', 
    background: '#fff9f0', 
    borderBottom: '1px solid #ffedd5', 
    display: 'flex', 
    alignItems: 'center', 
    gap: 10 
  },
  generateTitle: { fontWeight: 600, color: '#ff6b00' },
  generateBody: { padding: '20px' },
  formRow: { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: 16, 
    marginBottom: 20,
    '@media (max-width: 600px)': { gridTemplateColumns: '1fr' }
  },
  formGroup: { marginBottom: 0 },
  formLabel: { 
    fontSize: 12, 
    color: '#868e96', 
    marginBottom: 6, 
    display: 'block', 
    fontWeight: 500, 
    textTransform: 'uppercase', 
    letterSpacing: 0.3 
  },
  formSelect: { 
    width: '100%', 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 8, 
    padding: '10px 12px', 
    fontSize: 13, 
    color: '#1a1a1a', 
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': { borderColor: '#ff6b00' }
  },
  buttonGroup: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  btnPrimary: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '10px 20px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    border: 'none', 
    background: '#ff6b00', 
    color: '#ffffff',
    transition: 'background 0.2s',
    ':hover': { background: '#e55a00' },
    ':disabled': { opacity: 0.5, cursor: 'not-allowed' }
  },
  btnOutline: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '10px 20px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#ff6b00', 
    border: '1px solid #ff6b00',
    transition: 'all 0.2s',
    ':hover': { background: '#fff9f0' },
    ':disabled': { opacity: 0.5, cursor: 'not-allowed' }
  },
  btnSmall: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 6, 
    fontSize: 12, 
    padding: '6px 12px', 
    borderRadius: 8, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#ff6b00', 
    border: '1px solid #ff6b00',
    transition: 'all 0.2s'
  },
  panel: { 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 16, 
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  panelHeader: { 
    padding: '16px 20px', 
    borderBottom: '1px solid #e9ecef', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    flexWrap: 'wrap', 
    gap: 12 
  },
  panelTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  panelBody: { padding: '20px' },
  emptyState: { 
    textAlign: 'center', 
    padding: '60px 20px', 
    color: '#adb5bd' 
  },
  emptySubtext: {
    fontSize: 12,
    color: '#ced4da',
    marginTop: 8,
    display: 'block',
  },
  remarkCard: { 
    background: '#f8f9fa', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    border: '1px solid #e9ecef'
  },
  remarkHeader: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 12 
  },
  remarkBadges: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  badgeDraft: { 
    background: '#fef3c7', 
    color: '#d97706', 
    fontSize: 10, 
    padding: '4px 10px', 
    borderRadius: 20,
    fontWeight: 600
  },
  badgeApproved: { 
    background: '#d1fae5', 
    color: '#059669', 
    fontSize: 10, 
    padding: '4px 10px', 
    borderRadius: 20,
    fontWeight: 600
  },
  badgeSubject: { 
    background: '#e9ecef', 
    color: '#495057', 
    fontSize: 10, 
    padding: '4px 10px', 
    borderRadius: 20 
  },
  badgeLevel: { 
    background: '#fff9f0', 
    color: '#ff6b00', 
    fontSize: 10, 
    padding: '4px 10px', 
    borderRadius: 20 
  },
  remarkActions: { display: 'flex', gap: 8 },
  actionEdit: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 4, 
    background: 'none', 
    border: 'none', 
    color: '#17a2b8', 
    fontSize: 11, 
    cursor: 'pointer',
    fontWeight: 500
  },
  actionApprove: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 4, 
    background: 'none', 
    border: 'none', 
    color: '#28a745', 
    fontSize: 11, 
    cursor: 'pointer',
    fontWeight: 500
  },
  remarkText: { 
    fontSize: 13, 
    color: '#4a5568', 
    lineHeight: 1.6, 
    fontStyle: 'italic', 
    marginBottom: 12 
  },
  remarkFooter: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  remarkStudent: { 
    fontSize: 12, 
    fontWeight: 600, 
    color: '#ff6b00' 
  },
  remarkDate: { 
    fontSize: 11, 
    color: '#adb5bd' 
  },
};

// Add keyframes animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(styleSheet);

export default AIAssistant;
