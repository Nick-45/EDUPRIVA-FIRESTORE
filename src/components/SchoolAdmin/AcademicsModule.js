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
import { Plus, Edit2, BarChart2, Users, BookOpen, TrendingUp } from 'lucide-react';

const AcademicsModule = ({ openModal, showToast }) => {
  const { user } = useAuth();
  const [academicRecords, setAcademicRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [subjects, setSubjects] = useState(['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'CRE']);
  const [cbcDistribution, setCbcDistribution] = useState({
    EE: { count: 0, percentage: 0, label: 'Exceeds Expectations' },
    ME: { count: 0, percentage: 0, label: 'Meets Expectations' },
    AE: { count: 0, percentage: 0, label: 'Approaching Expectations' },
    BE: { count: 0, percentage: 0, label: 'Below Expectations' },
  });
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    student_id: '',
    subject: 'Mathematics',
    score: 0,
    term: '',
    year: new Date().getFullYear().toString(),
    remarks: '',
  });

  const schoolId = user?.user_metadata?.school_id;

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const studentsCollection = collection(db, 'students');
  const academicRecordsCollection = collection(db, 'academic_records');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    if (schoolId) {
      fetchSchoolData();
      fetchData();
    }
  }, [schoolId]);

  const fetchSchoolData = async () => {
    try {
      const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
      if (schoolDoc.exists()) {
        const data = schoolDoc.data();
        setSchoolProfile(data);
        setSelectedTerm(data.current_term || 'Term 1');
        setFormData(prev => ({ ...prev, term: data.current_term || 'Term 1' }));
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
    }
    setLoading(false);
  };

  const fetchData = async () => {
    if (!schoolId) return;
    
    // Fetch students
    try {
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
    } catch (error) {
      console.error('Error fetching students:', error);
    }

    // Fetch academic records
    try {
      const recordsQuery = query(
        academicRecordsCollection,
        where('school_id', '==', schoolId),
        orderBy('created_at', 'desc')
      );
      const recordsSnapshot = await getDocs(recordsQuery);
      const recordsData = [];

      for (const recordDoc of recordsSnapshot.docs) {
        const record = {
          id: recordDoc.id,
          ...recordDoc.data()
        };

        // Fetch student data if student_id exists
        if (record.student_id) {
          try {
            const studentDoc = await getDoc(doc(db, 'students', record.student_id));
            if (studentDoc.exists()) {
              record.students = {
                id: studentDoc.id,
                ...studentDoc.data()
              };
            }
          } catch (studentError) {
            console.warn('Could not fetch student:', record.student_id);
          }
        }

        recordsData.push(record);
      }

      setAcademicRecords(recordsData || []);
      calculateCBCDistribution(recordsData || []);
    } catch (error) {
      console.error('Error fetching academic records:', error);
    }
  };

  const calculateCBCDistribution = (recordsData) => {
    const total = recordsData.length;
    const counts = { EE: 0, ME: 0, AE: 0, BE: 0 };
    
    recordsData.forEach(record => {
      if (record.grade) {
        if (record.grade === 'A' || (record.score >= 80)) counts.EE++;
        else if (record.grade === 'B' || (record.score >= 65)) counts.ME++;
        else if (record.grade === 'C' || (record.score >= 45)) counts.AE++;
        else counts.BE++;
      } else if (record.score) {
        if (record.score >= 80) counts.EE++;
        else if (record.score >= 65) counts.ME++;
        else if (record.score >= 45) counts.AE++;
        else counts.BE++;
      }
    });
    
    setCbcDistribution({
      EE: { 
        ...cbcDistribution.EE, 
        count: counts.EE, 
        percentage: total ? (counts.EE / total) * 100 : 0 
      },
      ME: { 
        ...cbcDistribution.ME, 
        count: counts.ME, 
        percentage: total ? (counts.ME / total) * 100 : 0 
      },
      AE: { 
        ...cbcDistribution.AE, 
        count: counts.AE, 
        percentage: total ? (counts.AE / total) * 100 : 0 
      },
      BE: { 
        ...cbcDistribution.BE, 
        count: counts.BE, 
        percentage: total ? (counts.BE / total) * 100 : 0 
      },
    });
  };

  const getGradeFromScore = (score) => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'E';
  };

  const getCBCLevelFromScore = (score) => {
    if (score >= 80) return { level: 'EE', label: 'Exceeds Expectations' };
    if (score >= 65) return { level: 'ME', label: 'Meets Expectations' };
    if (score >= 45) return { level: 'AE', label: 'Approaching Expectations' };
    return { level: 'BE', label: 'Below Expectations' };
  };

  const handleAddRecord = async () => {
    if (!formData.student_id || !formData.subject || !formData.score) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const score = parseFloat(formData.score);
    const grade = getGradeFromScore(score);
    const cbcInfo = getCBCLevelFromScore(score);

    const recordData = {
      school_id: schoolId,
      student_id: formData.student_id,
      subject: formData.subject,
      score: score,
      grade: grade,
      term: formData.term,
      year: formData.year,
      remarks: formData.remarks || `${cbcInfo.label} - ${cbcInfo.level}`,
    };

    try {
      const currentUser = auth.currentUser;
      
      if (editingRecord) {
        const recordRef = doc(db, 'academic_records', editingRecord.id);
        await updateDoc(recordRef, {
          ...recordData,
          updated_at: new Date()
        });
        
        await logAudit('Updated academic record', `Updated ${formData.subject} score for student`);
        showToast('Academic record updated successfully', 'success');
      } else {
        await addDoc(academicRecordsCollection, {
          ...recordData,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        await logAudit('Added academic record', `Added ${formData.subject} assessment`);
        showToast('Academic record added successfully', 'success');
      }
      
      setShowRecordModal(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error('Error saving academic record:', error);
      showToast(error.message || 'Failed to save record', 'error');
    }
  };

  const logAudit = async (action, details) => {
    try {
      const currentUser = auth.currentUser;
      await addDoc(auditLogsCollection, {
        school_id: schoolId,
        user_id: currentUser?.uid,
        action: action,
        entity_type: 'academic',
        new_values: { details: details },
        created_at: new Date()
      });
    } catch (error) {
      console.error('Error logging audit:', error);
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({
      student_id: '',
      subject: 'Mathematics',
      score: 0,
      term: schoolProfile?.current_term || 'Term 1',
      year: new Date().getFullYear().toString(),
      remarks: '',
    });
  };

  const getFilteredRecords = () => {
    let filtered = academicRecords;
    if (selectedSubject !== 'All') {
      filtered = filtered.filter(r => r.subject === selectedSubject);
    }
    if (selectedGrade !== 'All') {
      filtered = filtered.filter(r => r.students?.grade === selectedGrade);
    }
    if (selectedTerm !== 'All') {
      filtered = filtered.filter(r => r.term === selectedTerm);
    }
    return filtered;
  };

  const grades = ['All', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];
  const terms = ['All', 'Term 1', 'Term 2', 'Term 3'];

  const filteredRecords = getFilteredRecords();
  const averageScore = filteredRecords.length 
    ? (filteredRecords.reduce((s, r) => s + (r.score || 0), 0) / filteredRecords.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading academic data...</p>
      </div>
    );
  }

  return (
    <>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>CBC Assessments — {selectedTerm !== 'All' ? selectedTerm : schoolProfile?.current_term || 'Current Term'}</h2>
          <p style={styles.subtitle}>Competency-Based Curriculum Progress Tracking</p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowRecordModal(true)}>
          <Plus size={16} /> Add Assessment
        </button>
      </div>

      {/* CBC Distribution Cards */}
      <div style={styles.distributionGrid}>
        {Object.entries(cbcDistribution).map(([key, value]) => (
          <div key={key} style={styles.distCard}>
            <div style={{ ...styles.distLevel, color: key === 'EE' ? '#28a745' : key === 'ME' ? '#17a2b8' : key === 'AE' ? '#ff6b00' : '#dc3545' }}>
              {key}
            </div>
            <div style={styles.distLabel}>{value.label}</div>
            <div style={styles.distCount}>{value.count} records</div>
            <div style={styles.distPercent}>{value.percentage.toFixed(1)}%</div>
            <div style={styles.progressBar}>
              <div style={{ 
                ...styles.progressFill, 
                width: `${value.percentage}%`, 
                background: key === 'EE' ? '#28a745' : key === 'ME' ? '#17a2b8' : key === 'AE' ? '#ff6b00' : '#dc3545' 
              }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={styles.filtersBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Subject</label>
          <select 
            style={styles.filterSelect}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option>All</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Grade</label>
          <select 
            style={styles.filterSelect}
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            {grades.map(g => <option key={g} value={g}>{g === 'All' ? 'All Grades' : g}</option>)}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Term</label>
          <select 
            style={styles.filterSelect}
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            {terms.map(t => <option key={t} value={t}>{t === 'All' ? 'All Terms' : t}</option>)}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Performance Summary</label>
          <div style={styles.summaryBadge}>
            <TrendingUp size={14} /> 
            Avg: {averageScore}%
          </div>
        </div>
      </div>

      {/* Academic Records Table */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>Student Assessments</span>
          <span style={styles.panelBadge}>
            <BookOpen size={12} /> {filteredRecords.length} records
          </span>
        </div>
        <div style={styles.panelBody}>
          <div style={styles.tableWrapper}>
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Grade</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Term</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: '#adb5bd' }}>
                      No academic records found
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(record => {
                    const cbcInfo = getCBCLevelFromScore(record.score);
                    const levelColor = cbcInfo.level === 'EE' ? '#28a745' : 
                                      cbcInfo.level === 'ME' ? '#17a2b8' : 
                                      cbcInfo.level === 'AE' ? '#ff6b00' : '#dc3545';
                    return (
                      <tr key={record.id}>
                        <td style={styles.td}><strong>{record.students?.name || 'N/A'}</strong></td>
                        <td style={styles.td}>{record.students?.admission_number || '—'}</td>
                        <td style={styles.td}>{record.students?.grade || '—'}</td>
                        <td style={styles.td}>{record.subject}</td>
                        <td style={styles.td}>{record.score}%</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badgeLevel, background: `${levelColor}20`, color: levelColor }}>
                            {record.grade}
                          </span>
                        </td>
                        <td style={styles.td}>{record.term}</td>
                        <td style={styles.td}>
                          <Edit2 size={16} style={styles.editIcon} onClick={() => {
                            setEditingRecord(record);
                            setFormData({
                              student_id: record.student_id,
                              subject: record.subject,
                              score: record.score,
                              term: record.term,
                              year: record.year,
                              remarks: record.remarks || '',
                            });
                            setShowRecordModal(true);
                          }} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Record Modal */}
      {showRecordModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRecordModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>
                {editingRecord ? 'Edit Assessment' : 'Add New Assessment'}
              </span>
              <button style={styles.closeBtn} onClick={() => setShowRecordModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Student *</label>
                  <select 
                    style={styles.formSelect}
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  >
                    <option value="">Select Student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Subject *</label>
                  <select 
                    style={styles.formSelect}
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Score (%) *</label>
                  <input 
                    type="number"
                    style={styles.formInput}
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    placeholder="Enter score"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Term</label>
                  <select 
                    style={styles.formSelect}
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  >
                    <option>Term 1</option>
                    <option>Term 2</option>
                    <option>Term 3</option>
                  </select>
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Academic Year</label>
                  <input 
                    type="text"
                    style={styles.formInput}
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2025"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Remarks (Optional)</label>
                  <input 
                    type="text"
                    style={styles.formInput}
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Additional comments"
                  />
                </div>
              </div>
              
              {formData.score > 0 && (
                <div style={styles.levelPreview}>
                  <div style={styles.previewLabel}>CBC Level Prediction:</div>
                  <div style={{ ...styles.previewLevel, color: getCBCLevelFromScore(formData.score).level === 'EE' ? '#28a745' : getCBCLevelFromScore(formData.score).level === 'ME' ? '#17a2b8' : getCBCLevelFromScore(formData.score).level === 'AE' ? '#ff6b00' : '#dc3545' }}>
                    {getCBCLevelFromScore(formData.score).level}
                  </div>
                  <div style={styles.previewDesc}>
                    {getCBCLevelFromScore(formData.score).label}
                  </div>
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnOutline} onClick={() => setShowRecordModal(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleAddRecord}>
                {editingRecord ? 'Update' : 'Save Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    ':hover': { background: '#e55a00' }
  },
  distributionGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(4,1fr)', 
    gap: 20, 
    marginBottom: 24,
    '@media (max-width: 800px)': { gridTemplateColumns: 'repeat(2,1fr)' }
  },
  distCard: { 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 16, 
    padding: 20, 
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  distLevel: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 32, 
    fontWeight: 700, 
    marginBottom: 8 
  },
  distLabel: { fontSize: 12, color: '#868e96', marginBottom: 8 },
  distCount: { fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 },
  distPercent: { fontSize: 14, color: '#ff6b00', marginBottom: 12 },
  progressBar: { height: 6, background: '#e9ecef', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.5s ease' },
  filtersBar: { 
    display: 'flex', 
    gap: 16, 
    marginBottom: 24, 
    flexWrap: 'wrap', 
    alignItems: 'flex-end' 
  },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  filterLabel: { fontSize: 11, color: '#868e96', textTransform: 'uppercase', fontWeight: 500 },
  filterSelect: { 
    padding: '8px 12px', 
    borderRadius: 8, 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    color: '#1a1a1a', 
    fontSize: 13, 
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': { borderColor: '#ff6b00' }
  },
  summaryBadge: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 6, 
    padding: '8px 12px', 
    borderRadius: 8, 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    fontSize: 13, 
    color: '#ff6b00',
    fontWeight: 500
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
  panelBadge: { fontSize: 12, color: '#868e96', display: 'flex', alignItems: 'center', gap: 4 },
  panelBody: { padding: '0' },
  tableWrapper: { overflowX: 'auto' },
  dataTable: { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  td: {
    padding: '14px 16px',
    fontSize: 13,
    color: '#4a5568',
    borderBottom: '1px solid #f1f3f5',
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: '#868e96',
    borderBottom: '1px solid #e9ecef',
  },
  badgeLevel: { 
    padding: '4px 10px', 
    borderRadius: 20, 
    fontSize: 11, 
    fontWeight: 600,
    display: 'inline-block'
  },
  editIcon: { 
    cursor: 'pointer', 
    color: '#ff6b00',
    transition: 'color 0.2s',
    ':hover': { color: '#e55a00' }
  },
  modalOverlay: { 
    position: 'fixed', 
    inset: 0, 
    background: 'rgba(0,0,0,0.7)', 
    zIndex: 1000, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  modal: { 
    background: '#ffffff', 
    borderRadius: 16, 
    width: 550, 
    maxHeight: '85vh', 
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalHeader: { 
    padding: '20px 24px', 
    borderBottom: '1px solid #e9ecef', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  modalTitle: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 18, 
    fontWeight: 600, 
    color: '#1a1a1a' 
  },
  closeBtn: { 
    background: 'none', 
    border: 'none', 
    color: '#adb5bd', 
    cursor: 'pointer', 
    fontSize: 24,
    transition: 'color 0.2s'
  },
  modalBody: { padding: '24px' },
  modalFooter: { 
    padding: '16px 24px', 
    borderTop: '1px solid #e9ecef', 
    display: 'flex', 
    gap: 12, 
    justifyContent: 'flex-end' 
  },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
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
  formInput: { 
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
  levelPreview: { 
    background: '#fff9f0', 
    borderRadius: 12, 
    padding: 16, 
    marginTop: 16, 
    textAlign: 'center', 
    border: '1px solid #ffedd5' 
  },
  previewLabel: { fontSize: 11, color: '#868e96', marginBottom: 8, textTransform: 'uppercase' },
  previewLevel: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 28, 
    fontWeight: 700, 
    marginBottom: 6 
  },
  previewDesc: { fontSize: 12, color: '#4a5568' },
  btnOutline: { 
    padding: '10px 20px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#4a5568', 
    border: '1px solid #e9ecef',
    transition: 'all 0.2s',
    ':hover': { borderColor: '#ff6b00', color: '#ff6b00' }
  },
};

// Add keyframes animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default AcademicsModule;
