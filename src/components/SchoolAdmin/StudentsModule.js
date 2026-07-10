import React, { useState, useEffect, useRef } from 'react';
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
  serverTimestamp,
  writeBatch,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Plus, Edit2, Trash2, UserPlus, Filter, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const StudentsModule = ({ openModal, showToast }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importSuccess, setImportSuccess] = useState([]);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    admission_number: '',
    grade: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: '',
    date_of_birth: '',
  });
  const [stats, setStats] = useState({ total: 0, feesPaid: 0, outstanding: 0 });

  // Get school ID from user metadata
  const schoolId = user?.user_metadata?.school_id;

  // Collection reference
  const studentsCollection = collection(db, 'students');
  const paymentsCollection = collection(db, 'payments');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
      fetchStats();
    }
  }, [schoolId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (schoolId) fetchStudents();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, filterGrade]);

  const fetchStudents = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    
    try {
      let q = query(
        studentsCollection,
        where('school_id', '==', schoolId),
        orderBy('name')
      );
      
      const snapshot = await getDocs(q);
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students', 'error');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!schoolId) return;
    
    try {
      // Get total students
      const studentsQuery = query(
        studentsCollection,
        where('school_id', '==', schoolId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const total = studentsSnapshot.size;
      
      // Get students with payments
      const paymentsQuery = query(
        paymentsCollection,
        where('school_id', '==', schoolId)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paidStudents = new Set(paymentsSnapshot.docs.map(doc => doc.data().student_id));
      
      setStats({
        total: total || 0,
        feesPaid: paidStudents.size,
        outstanding: total - paidStudents.size,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        total: 0,
        feesPaid: 0,
        outstanding: 0,
      });
    }
  };

  const handleAddEdit = async () => {
    if (!formData.name || !formData.grade) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      const now = new Date();
      
      if (editingStudent) {
        const studentRef = doc(db, 'students', editingStudent.id);
        await updateDoc(studentRef, {
          ...formData,
          updated_at: now
        });
        
        await addDoc(auditLogsCollection, {
          school_id: schoolId,
          user_id: currentUser?.uid,
          action: 'Updated student',
          entity_type: 'student',
          entity_id: editingStudent.id,
          new_values: formData,
          created_at: now
        });
        
        showToast('Student updated successfully', 'success');
      } else {
        const studentData = {
          ...formData,
          school_id: schoolId,
          enrollment_date: now,
          created_at: now,
          updated_at: now
        };
        
        await addDoc(studentsCollection, studentData);
        
        await addDoc(auditLogsCollection, {
          school_id: schoolId,
          user_id: currentUser?.uid,
          action: 'Added student',
          entity_type: 'student',
          new_values: formData,
          created_at: now
        });
        
        showToast('Student enrolled successfully', 'success');
      }
      
      setShowModal(false);
      resetForm();
      await fetchStudents();
      await fetchStats();
    } catch (error) {
      console.error('Error saving student:', error);
      showToast(error.message || 'Failed to save student', 'error');
    }
  };

  const handleDelete = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
      try {
        const studentRef = doc(db, 'students', student.id);
        await deleteDoc(studentRef);
        
        const currentUser = auth.currentUser;
        await addDoc(auditLogsCollection, {
          school_id: schoolId,
          user_id: currentUser?.uid,
          action: 'Deleted student',
          entity_type: 'student',
          entity_id: student.id,
          old_values: student,
          created_at: new Date()
        });
        
        showToast('Student deleted successfully', 'success');
        await fetchStudents();
        await fetchStats();
      } catch (error) {
        console.error('Error deleting student:', error);
        showToast('Failed to delete student', 'error');
      }
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name || '',
      admission_number: student.admission_number || '',
      grade: student.grade || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || '',
      address: student.address || '',
      date_of_birth: student.date_of_birth || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      admission_number: '',
      grade: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
      address: '',
      date_of_birth: '',
    });
  };

  // ============ CSV IMPORT FUNCTIONS ============

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parseCSV(text);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      showToast('Empty CSV file', 'error');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const expectedHeaders = {
      'name': 'name',
      'full name': 'name',
      'student name': 'name',
      'student_name': 'name',
      'admission_number': 'admission_number',
      'admission no': 'admission_number',
      'admission no.': 'admission_number',
      'admission number': 'admission_number',
      'grade': 'grade',
      'class': 'grade',
      'parent_name': 'parent_name',
      'parent name': 'parent_name',
      'guardian': 'parent_name',
      'parent_phone': 'parent_phone',
      'parent phone': 'parent_phone',
      'phone': 'parent_phone',
      'parent_email': 'parent_email',
      'parent email': 'parent_email',
      'email': 'parent_email',
      'address': 'address',
      'date_of_birth': 'date_of_birth',
      'dob': 'date_of_birth',
      'birth_date': 'date_of_birth',
    };

    const columnMap = {};
    headers.forEach((header, index) => {
      const mapped = expectedHeaders[header];
      if (mapped) {
        columnMap[mapped] = index;
      }
    });

    const requiredColumns = ['name', 'grade'];
    const missingColumns = requiredColumns.filter(col => !(col in columnMap));
    
    if (missingColumns.length > 0) {
      showToast(`Missing required columns: ${missingColumns.join(', ')}. Please include 'Name' and 'Grade'.`, 'error');
      return;
    }

    const parsedData = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      const student = {
        name: values[columnMap.name] || '',
        grade: values[columnMap.grade] || '',
        admission_number: columnMap.admission_number ? values[columnMap.admission_number] || '' : '',
        parent_name: columnMap.parent_name ? values[columnMap.parent_name] || '' : '',
        parent_phone: columnMap.parent_phone ? values[columnMap.parent_phone] || '' : '',
        parent_email: columnMap.parent_email ? values[columnMap.parent_email] || '' : '',
        address: columnMap.address ? values[columnMap.address] || '' : '',
        date_of_birth: columnMap.date_of_birth ? values[columnMap.date_of_birth] || '' : '',
      };

      if (!student.name) {
        errors.push(`Row ${i + 1}: Missing student name`);
        continue;
      }
      if (!student.grade) {
        errors.push(`Row ${i + 1}: Missing grade for ${student.name}`);
        continue;
      }

      parsedData.push(student);
    }

    if (errors.length > 0) {
      setImportErrors(errors);
      showToast(`Found ${errors.length} errors in CSV`, 'error');
    }

    setImportData(parsedData);
    setShowImportModal(true);
  };

  const handleImportStudents = async () => {
    if (importData.length === 0) {
      showToast('No data to import', 'error');
      return;
    }

    setImporting(true);
    const success = [];
    const errors = [];

    try {
      const batch = writeBatch(db);
      const currentUser = auth.currentUser;
      const now = new Date();

      for (const student of importData) {
        try {
          // Check if student already exists
          let q = query(
            studentsCollection,
            where('school_id', '==', schoolId)
          );

          if (student.admission_number) {
            q = query(q, where('admission_number', '==', student.admission_number));
          } else {
            q = query(
              q,
              where('name', '==', student.name),
              where('parent_name', '==', student.parent_name || '')
            );
          }

          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            // Update existing student
            const existingDoc = snapshot.docs[0];
            const docRef = doc(db, 'students', existingDoc.id);
            batch.update(docRef, {
              ...student,
              updated_at: now
            });
            success.push(student.name);
          } else {
            // Add new student
            const docRef = doc(studentsCollection);
            batch.set(docRef, {
              ...student,
              school_id: schoolId,
              enrollment_date: now,
              created_at: now,
              updated_at: now
            });
            success.push(student.name);
          }
        } catch (error) {
          errors.push(`${student.name}: ${error.message}`);
        }
      }

      await batch.commit();

      // Log import in audit
      await addDoc(auditLogsCollection, {
        school_id: schoolId,
        user_id: currentUser?.uid,
        action: 'Imported students',
        entity_type: 'student',
        new_values: {
          imported_count: success.length,
          failed_count: errors.length
        },
        created_at: now
      });

    } catch (error) {
      console.error('Import error:', error);
      showToast('Failed to import students', 'error');
    }

    setImportSuccess(success);
    setImportErrors(errors);

    if (success.length > 0) {
      showToast(`Successfully imported ${success.length} students`, 'success');
      await fetchStudents();
      await fetchStats();
    }

    if (errors.length > 0) {
      showToast(`Failed to import ${errors.length} students`, 'error');
    }

    setImporting(false);
    
    if (errors.length === 0) {
      setTimeout(() => {
        setShowImportModal(false);
        setImportData([]);
        setImportErrors([]);
        setImportSuccess([]);
      }, 2000);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Grade', 'Admission Number', 'Parent Name', 'Parent Phone', 'Parent Email', 'Address', 'Date of Birth'];
    const sampleRow = ['John Doe', 'Grade 5', 'GFA/2025/001', 'Jane Doe', '0712345678', 'jane@example.com', 'Nairobi', '2015-06-15'];
    
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Template downloaded', 'success');
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Admission Number', 'Grade', 'Parent Name', 'Parent Phone', 'Parent Email', 'Address', 'Date of Birth'];
    const csvData = students.map(s => [
      s.name,
      s.admission_number || '',
      s.grade,
      s.parent_name || '',
      s.parent_phone || '',
      s.parent_email || '',
      s.address || '',
      s.date_of_birth || ''
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${schoolId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export completed', 'success');
  };

  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];

  if (loading && students.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading students...</p>
      </div>
    );
  }

  return (
    <>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Students</h2>
          <p style={styles.subtitle}>{stats.total} total enrolled</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={styles.btnOutline} onClick={exportToCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button style={styles.btnOutline} onClick={downloadTemplate}>
            <FileSpreadsheet size={16} /> Template
          </button>
          <button style={styles.btnOutline} onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button 
            style={styles.btnPrimary} 
            onClick={() => { 
              resetForm();
              setShowModal(true); 
            }}
          >
            <UserPlus size={16} /> + Enroll Student
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Students</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Fees Paid</div>
          <div style={{ ...styles.statValue, color: '#ff6b00' }}>{stats.feesPaid}</div>
          <div style={styles.statSub}>{Math.round((stats.feesPaid / (stats.total || 1)) * 100)}% of total</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Outstanding Fees</div>
          <div style={styles.statValue}>{stats.outstanding}</div>
          <div style={styles.statSub}>Students with pending fees</div>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>Student Register</span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
              <input
                style={styles.searchInput}
                placeholder="Search by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              style={styles.filterSelect}
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
            >
              <option value="">All Grades</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div style={styles.panelBody}>
          <div style={styles.tableWrapper}>
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th>Adm No</th>
                  <th>Full Name</th>
                  <th>Grade</th>
                  <th>Parent Contact</th>
                  <th>Parent Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#adb5bd' }}>
                      {searchTerm || filterGrade ? 'No matching students found' : 'No students enrolled yet'}
                    </td>
                  </tr>
                ) : (
                  students.map(student => (
                    <tr key={student.id}>
                      <td style={styles.td}>{student.admission_number || '—'}</td>
                      <td style={styles.td}><strong>{student.name}</strong></td>
                      <td style={styles.td}>{student.grade}</td>
                      <td style={styles.td}>{student.parent_phone || student.parent_name || '—'}</td>
                      <td style={styles.td}>{student.parent_email || '—'}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Edit2 size={16} style={styles.actionIcon} onClick={() => handleEdit(student)} />
                          <Trash2 size={16} style={styles.actionIconDanger} onClick={() => handleDelete(student)} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div style={{ ...styles.modal, width: 750 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>
                <FileSpreadsheet size={20} style={{ display: 'inline', marginRight: 8 }} />
                Import Students from CSV
              </span>
              <button style={styles.closeBtn} onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              {importData.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 14, color: '#4a5568' }}>
                      Found <strong>{importData.length}</strong> students to import
                    </span>
                    <button style={styles.btnOutline} onClick={downloadTemplate}>
                      <FileSpreadsheet size={14} /> Download Template
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e9ecef', borderRadius: 8 }}>
                    <table style={{ ...styles.dataTable, fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>#</th>
                          <th style={styles.th}>Name</th>
                          <th style={styles.th}>Grade</th>
                          <th style={styles.th}>Adm No</th>
                          <th style={styles.th}>Parent</th>
                          <th style={styles.th}>Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 20).map((student, index) => (
                          <tr key={index}>
                            <td style={styles.td}>{index + 1}</td>
                            <td style={styles.td}>{student.name}</td>
                            <td style={styles.td}>{student.grade}</td>
                            <td style={styles.td}>{student.admission_number || '—'}</td>
                            <td style={styles.td}>{student.parent_name || '—'}</td>
                            <td style={styles.td}>{student.parent_phone || '—'}</td>
                          </tr>
                        ))}
                        {importData.length > 20 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: 12, color: '#adb5bd' }}>
                              ... and {importData.length - 20} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Errors Display */}
                  {importErrors.length > 0 && (
                    <div style={{ marginTop: 16, padding: 12, background: '#fef3f3', border: '1px solid #f5c6cb', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <AlertCircle size={16} style={{ color: '#dc3545' }} />
                        <span style={{ fontWeight: 600, color: '#dc3545' }}>{importErrors.length} errors found</span>
                      </div>
                      <div style={{ maxHeight: 150, overflow: 'auto', fontSize: 12, color: '#721c24' }}>
                        {importErrors.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success Display */}
                  {importSuccess.length > 0 && (
                    <div style={{ marginTop: 16, padding: 12, background: '#f0f9f0', border: '1px solid #b8d4b8', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={16} style={{ color: '#28a745' }} />
                        <span style={{ fontWeight: 600, color: '#28a745' }}>{importSuccess.length} students imported successfully</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button 
                style={styles.btnOutline} 
                onClick={() => {
                  setShowImportModal(false);
                  setImportData([]);
                  setImportErrors([]);
                  setImportSuccess([]);
                }}
              >
                {importSuccess.length > 0 ? 'Close' : 'Cancel'}
              </button>
              {importData.length > 0 && importSuccess.length === 0 && (
                <button 
                  style={styles.btnPrimary} 
                  onClick={handleImportStudents}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : `Import ${importData.length} Students`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>
                {editingStudent ? 'Edit Student' : 'Enroll New Student'}
              </span>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Full Name *</label>
                  <input 
                    style={styles.formInput} 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="e.g., John Doe" 
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Admission Number</label>
                  <input 
                    style={styles.formInput} 
                    value={formData.admission_number} 
                    onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })} 
                    placeholder="GFA/2025/001" 
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Grade/Class *</label>
                  <select 
                    style={styles.formSelect} 
                    value={formData.grade} 
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  >
                    <option value="">Select Grade</option>
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Date of Birth</label>
                  <input 
                    type="date"
                    style={styles.formInput} 
                    value={formData.date_of_birth} 
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} 
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Parent/Guardian Name</label>
                  <input 
                    style={styles.formInput} 
                    value={formData.parent_name} 
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })} 
                    placeholder="Full name" 
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Parent Phone</label>
                  <input 
                    style={styles.formInput} 
                    value={formData.parent_phone} 
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })} 
                    placeholder="0712 345 678" 
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Parent Email</label>
                  <input 
                    type="email"
                    style={styles.formInput} 
                    value={formData.parent_email} 
                    onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })} 
                    placeholder="parent@example.com" 
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Address</label>
                  <input 
                    style={styles.formInput} 
                    value={formData.address} 
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    placeholder="Home address" 
                  />
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnOutline} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleAddEdit}>
                {editingStudent ? 'Update Student' : 'Enroll Student'}
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
    margin: 0
  },
  subtitle: {
    fontSize: 13,
    color: '#868e96',
    marginTop: 4,
    marginBottom: 0,
  },
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
    color: '#4a5568', 
    border: '1px solid #e9ecef',
    transition: 'all 0.2s',
    ':hover': { borderColor: '#ff6b00', color: '#ff6b00' }
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
  statSub: {
    fontSize: 11,
    color: '#adb5bd',
    marginTop: 6,
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
  panelTitle: { 
    fontSize: 14, 
    fontWeight: 600, 
    color: '#1a1a1a' 
  },
  searchInput: { 
    padding: '8px 12px 8px 32px', 
    borderRadius: 8, 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    color: '#1a1a1a', 
    fontSize: 13, 
    width: 260, 
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': { borderColor: '#ff6b00' }
  },
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
  panelBody: { 
    padding: '0' 
  },
  tableWrapper: { 
    overflowX: 'auto' 
  },
  dataTable: { 
    width: '100%', 
    borderCollapse: 'collapse' 
  },
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
  actionIcon: { 
    cursor: 'pointer', 
    color: '#ff6b00',
    transition: 'color 0.2s',
    ':hover': { color: '#e55a00' }
  },
  actionIconDanger: { 
    cursor: 'pointer', 
    color: '#dc3545',
    transition: 'color 0.2s',
    ':hover': { color: '#c82333' }
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
    width: 650, 
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
    transition: 'color 0.2s',
    ':hover': { color: '#ff6b00' }
  },
  modalBody: { 
    padding: '24px' 
  },
  modalFooter: { 
    padding: '16px 24px', 
    borderTop: '1px solid #e9ecef', 
    display: 'flex', 
    gap: 12, 
    justifyContent: 'flex-end' 
  },
  formRow: { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: 16, 
    marginBottom: 16 
  },
  formGroup: { 
    marginBottom: 0 
  },
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

export default StudentsModule;
