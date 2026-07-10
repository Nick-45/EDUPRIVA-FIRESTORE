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
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Download, Printer, Eye, Calendar, Users, Award, TrendingUp } from 'lucide-react';

const ReportsModule = ({ openModal, showToast }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const schoolId = user?.user_metadata?.school_id;

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const studentsCollection = collection(db, 'students');
  const academicRecordsCollection = collection(db, 'academic_records');
  const paymentsCollection = collection(db, 'payments');
  const reportsCollection = collection(db, 'reports');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    if (schoolId) {
      fetchSchoolData();
      fetchStudents();
      fetchRecentReports();
    }
  }, [schoolId]);

  const fetchSchoolData = async () => {
    try {
      const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
      if (schoolDoc.exists()) {
        const data = schoolDoc.data();
        setSchoolProfile(data);
        if (data.current_term) setSelectedTerm(data.current_term);
        if (data.current_academic_year) setSelectedYear(data.current_academic_year);
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    try {
      const studentsQuery = query(
        studentsCollection,
        where('school_id', '==', schoolId),
        orderBy('name')
      );
      const snapshot = await getDocs(studentsQuery);
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchRecentReports = async () => {
    try {
      const reportsQuery = query(
        reportsCollection,
        where('school_id', '==', schoolId),
        orderBy('created_at', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(reportsQuery);
      const reportsData = [];

      for (const reportDoc of snapshot.docs) {
        const report = {
          id: reportDoc.id,
          ...reportDoc.data()
        };

        // Fetch student data
        if (report.student_id) {
          try {
            const studentDoc = await getDoc(doc(db, 'students', report.student_id));
            if (studentDoc.exists()) {
              report.students = [{
                id: studentDoc.id,
                ...studentDoc.data()
              }];
            }
          } catch (studentError) {
            console.warn('Could not fetch student:', report.student_id);
          }
        }

        reportsData.push(report);
      }

      setRecentReports(reportsData);
    } catch (error) {
      console.error('Error fetching recent reports:', error);
    }
  };

  const generateReportCard = async () => {
    if (!selectedStudent) {
      showToast('Please select a student', 'error');
      return;
    }

    setGenerating(true);
    const student = students.find(s => s.id === selectedStudent);
    
    try {
      // Fetch academic records for the student
      const academicQuery = query(
        academicRecordsCollection,
        where('student_id', '==', selectedStudent),
        where('term', '==', selectedTerm),
        where('year', '==', selectedYear)
      );
      const academicSnapshot = await getDocs(academicQuery);
      const academicRecords = academicSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch payments for the student
      const paymentsQuery = query(
        paymentsCollection,
        where('student_id', '==', selectedStudent),
        where('status', '==', 'completed')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => doc.data());

      // Calculate averages
      const totalScore = academicRecords?.reduce((sum, a) => sum + (a.score || 0), 0) || 0;
      const averageScore = academicRecords?.length ? (totalScore / academicRecords.length).toFixed(1) : 0;
      
      // Determine overall CBC level based on score
      let overallLevel = 'ME';
      if (averageScore >= 80) overallLevel = 'EE';
      else if (averageScore >= 65) overallLevel = 'ME';
      else if (averageScore >= 45) overallLevel = 'AE';
      else overallLevel = 'BE';

      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const termFee = schoolProfile?.term_fee || 0;
      const feeBalance = termFee - totalPaid;

      const report = {
        student,
        academicRecords: academicRecords || [],
        averageScore,
        overallLevel,
        totalPaid,
        feeBalance,
        termFee,
        term: selectedTerm,
        year: selectedYear,
        generatedAt: new Date().toISOString(),
        schoolName: schoolProfile?.name,
      };

      setReportData(report);

      // Save to database
      const currentUser = auth.currentUser;
      await addDoc(reportsCollection, {
        student_id: selectedStudent,
        school_id: schoolId,
        term: selectedTerm,
        year: selectedYear,
        average_score: parseFloat(averageScore),
        overall_level: overallLevel,
        report_data: report,
        generated_by: currentUser?.uid,
        created_at: new Date()
      });

      // Log to audit
      await addDoc(auditLogsCollection, {
        school_id: schoolId,
        user_id: currentUser?.uid,
        action: 'Generated report card',
        entity_type: 'report',
        new_values: { student_name: student.name, term: selectedTerm, year: selectedYear },
        created_at: new Date()
      });

      showToast('Report card generated successfully', 'success');
      fetchRecentReports(); // Refresh the list
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Report Card - ${reportData?.student?.name}</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .school-name { font-size: 24px; font-weight: bold; color: #ff6b00; }
            .school-motto { font-size: 12px; color: #666; margin-top: 5px; }
            .student-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .info-grid { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background: #ff6b00; color: white; }
            .level-EE { color: #28a745; }
            .level-ME { color: #17a2b8; }
            .level-AE { color: #ff6b00; }
            .level-BE { color: #dc3545; }
            .fee-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .fee-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .remarks { margin: 20px 0; font-style: italic; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            @media print {
              body { margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${reportData?.schoolName || 'School Name'}</div>
            <div class="school-motto">"Excellence Through Knowledge"</div>
            <h2>${reportData?.term} ${reportData?.year} REPORT CARD</h2>
          </div>

          <div class="student-info">
            <div class="info-grid">
              <div><strong>Student Name:</strong> ${reportData?.student?.name}</div>
              <div><strong>Admission No:</strong> ${reportData?.student?.admission_number || 'N/A'}</div>
              <div><strong>Grade:</strong> ${reportData?.student?.grade}</div>
              <div><strong>Term:</strong> ${reportData?.term}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr><th>Subject</th><th>Score (%)</th><th>Grade</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              ${reportData?.academicRecords.map(record => {
                let grade = 'E';
                if (record.score >= 80) grade = 'A';
                else if (record.score >= 70) grade = 'B';
                else if (record.score >= 60) grade = 'C';
                else if (record.score >= 50) grade = 'D';
                return `<tr>
                  <td>${record.subject}</td>
                  <td>${record.score}%</td>
                  <td>${grade}</td>
                  <td>${record.remarks || '—'}</td>
                </tr>`;
              }).join('')}
              <tr style="background: #f8f9fa; font-weight: bold;">
                <td colspan="2"><strong>Average Score</strong></td>
                <td colspan="2"><strong>${reportData?.averageScore}%</strong></td>
              </tr>
              <tr>
                <td colspan="2"><strong>Overall Performance Level</strong></td>
                <td colspan="2"><strong class="level-${reportData?.overallLevel}">${reportData?.overallLevel}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="fee-section">
            <h3>Fee Statement</h3>
            <div class="fee-row"><span>Term Fee:</span><span>KES ${reportData?.termFee?.toLocaleString()}</span></div>
            <div class="fee-row"><span>Amount Paid:</span><span>KES ${reportData?.totalPaid?.toLocaleString()}</span></div>
            <div class="fee-row" style="border-top: 1px solid #ddd; margin-top: 5px; padding-top: 8px; font-weight: bold;">
              <span>Balance:</span>
              <span style="color: ${reportData?.feeBalance > 0 ? '#dc3545' : '#28a745'}">
                KES ${Math.max(0, reportData?.feeBalance).toLocaleString()}
              </span>
            </div>
          </div>

          <div class="remarks">
            <strong>Teacher's Remarks:</strong><br />
            ${reportData?.averageScore >= 80 ? 'Excellent performance! Keep up the great work.' :
              reportData?.averageScore >= 65 ? 'Good performance. Continue working hard.' :
              reportData?.averageScore >= 45 ? 'Satisfactory performance. Need more effort.' :
              'Below average. Requires significant improvement and parental support.'}
          </div>

          <div class="signatures">
            <div>_____________________<br />Class Teacher</div>
            <div>_____________________<br />Principal</div>
            <div>_____________________<br />Parent/Guardian</div>
          </div>

          <div class="footer">
            Generated on: ${new Date().toLocaleDateString()} | EduPriva School Management System
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const levelColors = {
    EE: '#28a745',
    ME: '#17a2b8',
    AE: '#ff6b00',
    BE: '#dc3545',
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Report Cards</h2>
          <p style={styles.subtitle}>Generate and manage student report cards</p>
        </div>
      </div>

      {/* Generate Report Card Section */}
      <div style={styles.generatePanel}>
        <div style={styles.generateHeader}>
          <FileText size={20} style={{ color: '#ff6b00' }} />
          <span style={styles.generateTitle}>Generate Report Card</span>
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
                  <option key={s.id} value={s.id}>{s.name} ({s.admission_number}) - {s.grade}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Term</label>
              <select 
                style={styles.formSelect}
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
              >
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Academic Year</label>
              <select 
                style={styles.formSelect}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option>2024</option>
                <option>2025</option>
                <option>2026</option>
              </select>
            </div>
          </div>
          <button style={styles.btnPrimary} onClick={generateReportCard} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Report Card'}
          </button>
        </div>
      </div>

      {/* Report Card Preview */}
      {reportData && (
        <div style={styles.reportCard} id="report-card-content">
          <div style={styles.reportHeader}>
            <div style={styles.schoolName}>{reportData.schoolName || 'School Name'}</div>
            <div style={styles.schoolMotto}>"Excellence Through Knowledge"</div>
            <div style={styles.reportTitle}>{reportData.term} {reportData.year} REPORT CARD</div>
          </div>

          <div style={styles.studentInfoSection}>
            <div style={styles.infoGrid}>
              <div><strong>Student Name:</strong> {reportData.student?.name}</div>
              <div><strong>Admission No:</strong> {reportData.student?.admission_number || 'N/A'}</div>
              <div><strong>Grade:</strong> {reportData.student?.grade}</div>
              <div><strong>Term:</strong> {reportData.term}</div>
            </div>
          </div>

          <table style={styles.performanceTable}>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Score (%)</th>
                <th>Grade</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {reportData.academicRecords.map((record, i) => {
                let grade = 'E';
                if (record.score >= 80) grade = 'A';
                else if (record.score >= 70) grade = 'B';
                else if (record.score >= 60) grade = 'C';
                else if (record.score >= 50) grade = 'D';
                return (
                  <tr key={i}>
                    <td>{record.subject}</td>
                    <td>{record.score}%</td>
                    <td>{grade}</td>
                    <td>{record.remarks || '—'}</td>
                  </tr>
                );
              })}
              <tr style={styles.averageRow}>
                <td colSpan="2"><strong>Average Score</strong></td>
                <td colSpan="2"><strong>{reportData.averageScore}%</strong></td>
              </tr>
              <tr>
                <td colSpan="2"><strong>Overall Performance Level</strong></td>
                <td colSpan="2">
                  <strong style={{ color: levelColors[reportData.overallLevel] }}>
                    {reportData.overallLevel}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={styles.feeSection}>
            <h3 style={styles.feeTitle}>Fee Statement</h3>
            <div style={styles.feeRow}>
              <span>Term Fee:</span>
              <span>KES {reportData.termFee?.toLocaleString()}</span>
            </div>
            <div style={styles.feeRow}>
              <span>Amount Paid:</span>
              <span>KES {reportData.totalPaid?.toLocaleString()}</span>
            </div>
            <div style={{ ...styles.feeRow, ...styles.feeBalance }}>
              <span>Balance:</span>
              <span style={{ color: reportData.feeBalance > 0 ? '#dc3545' : '#28a745' }}>
                KES {Math.max(0, reportData.feeBalance).toLocaleString()}
              </span>
            </div>
          </div>

          <div style={styles.remarksSection}>
            <div style={styles.remarksTitle}>Teacher's Remarks</div>
            <div style={styles.remarksText}>
              {reportData.averageScore >= 80 ? 'Excellent performance! Keep up the great work.' :
               reportData.averageScore >= 65 ? 'Good performance. Continue working hard.' :
               reportData.averageScore >= 45 ? 'Satisfactory performance. Need more effort.' :
               'Below average. Requires significant improvement and parental support.'}
            </div>
          </div>

          <div style={styles.signatureSection}>
            <div>_____________________<br />Class Teacher</div>
            <div>_____________________<br />Principal</div>
            <div>_____________________<br />Parent/Guardian</div>
          </div>

          <div style={styles.reportFooter}>
            Generated on: {new Date(reportData.generatedAt).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {reportData && (
        <div style={styles.actionButtons}>
          <button style={styles.btnPrimary} onClick={handlePrint}>
            <Printer size={16} /> Print Report
          </button>
        </div>
      )}

      {/* Recent Reports */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>Recent Reports</span>
          <span style={styles.panelBadge}>
            <TrendingUp size={12} /> Last 10 generated
          </span>
        </div>
        <div style={styles.panelBody}>
          {recentReports.length === 0 ? (
            <div style={styles.emptyState}>No reports generated yet</div>
          ) : (
            <div style={styles.reportsList}>
              {recentReports.map(report => (
                <div key={report.id} style={styles.reportItem}>
                  <div style={styles.reportItemLeft}>
                    <Award size={20} style={{ color: levelColors[report.overall_level] }} />
                    <div>
                      <div style={styles.reportStudentName}>
                        {report.students?.[0]?.name || 'Unknown Student'}
                      </div>
                      <div style={styles.reportMeta}>
                        {report.students?.[0]?.grade} · {report.term} {report.year}
                      </div>
                    </div>
                  </div>
                  <div style={styles.reportItemRight}>
                    <span style={{ 
                      ...styles.levelBadge, 
                      background: `${levelColors[report.overall_level]}20`, 
                      color: levelColors[report.overall_level] 
                    }}>
                      {report.overall_level}
                    </span>
                    <span style={styles.reportScore}>{report.average_score}%</span>
                    <Eye 
                      size={16} 
                      style={styles.viewIcon} 
                      onClick={() => {
                        const student = students.find(s => s.id === report.student_id);
                        if (student) {
                          setSelectedStudent(report.student_id);
                          setSelectedTerm(report.term);
                          setSelectedYear(report.year);
                          generateReportCard();
                        }
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
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
  header: { marginBottom: 24 },
  title: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 20, 
    fontWeight: 600, 
    color: '#1a1a1a', 
    marginBottom: 4 
  },
  subtitle: { fontSize: 13, color: '#868e96' },
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
    borderBottom: '1px solid #ff6b00', 
    display: 'flex', 
    alignItems: 'center', 
    gap: 10 
  },
  generateTitle: { fontWeight: 600, color: '#ff6b00' },
  generateBody: { padding: '20px' },
  formRow: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(3,1fr)', 
    gap: 16, 
    marginBottom: 20,
    '@media (max-width: 700px)': { gridTemplateColumns: '1fr' }
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
  btnPrimary: { 
    display: 'inline-flex', 
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
    display: 'inline-flex', 
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
    transition: 'all 0.2s'
  },
  actionButtons: { 
    display: 'flex', 
    gap: 12, 
    marginBottom: 24, 
    justifyContent: 'center', 
    flexWrap: 'wrap' 
  },
  reportCard: { 
    background: '#ffffff', 
    color: '#1a1a1a', 
    padding: 40, 
    borderRadius: 16, 
    marginBottom: 24, 
    maxWidth: 800, 
    margin: '0 auto 24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  reportHeader: { 
    textAlign: 'center', 
    marginBottom: 30, 
    paddingBottom: 20, 
    borderBottom: '2px solid #ff6b00' 
  },
  schoolName: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#ff6b00', 
    marginBottom: 5 
  },
  schoolMotto: { 
    fontSize: 12, 
    color: '#868e96', 
    fontStyle: 'italic', 
    marginBottom: 10 
  },
  reportTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginTop: 10,
    color: '#1a1a1a'
  },
  studentInfoSection: { 
    background: '#f8f9fa', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 24 
  },
  infoGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(2,1fr)', 
    gap: 12,
    '@media (max-width: 500px)': { gridTemplateColumns: '1fr' }
  },
  performanceTable: { 
    width: '100%', 
    borderCollapse: 'collapse', 
    marginBottom: 24 
  },
  averageRow: { background: '#f8f9fa', fontWeight: 'bold' },
  feeSection: { 
    background: '#f8f9fa', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 24 
  },
  feeTitle: { fontWeight: 'bold', marginBottom: 12, fontSize: 14, color: '#1a1a1a' },
  feeRow: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    padding: '6px 0' 
  },
  feeBalance: { 
    borderTop: '1px solid #e9ecef', 
    marginTop: 6, 
    paddingTop: 10, 
    fontWeight: 'bold' 
  },
  remarksSection: { marginBottom: 24 },
  remarksTitle: { fontWeight: 'bold', marginBottom: 8, color: '#1a1a1a' },
  remarksText: { fontStyle: 'italic', color: '#4a5568', lineHeight: 1.6 },
  signatureSection: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(3,1fr)', 
    textAlign: 'center', 
    marginTop: 40, 
    paddingTop: 20, 
    borderTop: '1px dashed #e9ecef',
    gap: 20,
    fontSize: 11,
    color: '#868e96'
  },
  reportFooter: { 
    textAlign: 'center', 
    fontSize: 10, 
    color: '#adb5bd', 
    marginTop: 20, 
    paddingTop: 10, 
    borderTop: '1px solid #e9ecef' 
  },
  panel: { 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 16, 
    overflow: 'hidden',
    marginTop: 24,
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
  panelBody: { padding: '20px' },
  emptyState: { textAlign: 'center', padding: '60px', color: '#adb5bd' },
  reportsList: { display: 'flex', flexDirection: 'column', gap: 12 },
  reportItem: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '14px 16px', 
    background: '#f8f9fa', 
    borderRadius: 12, 
    flexWrap: 'wrap', 
    gap: 12 
  },
  reportItemLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  reportStudentName: { fontWeight: 600, color: '#1a1a1a', marginBottom: 2 },
  reportMeta: { fontSize: 11, color: '#868e96' },
  reportItemRight: { display: 'flex', alignItems: 'center', gap: 12 },
  levelBadge: { padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  reportScore: { fontSize: 14, fontWeight: 600, color: '#ff6b00' },
  viewIcon: { cursor: 'pointer', color: '#ff6b00', transition: 'color 0.2s' },
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

export default ReportsModule;
