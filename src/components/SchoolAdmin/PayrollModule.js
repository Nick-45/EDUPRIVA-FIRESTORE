// src/components/SchoolAdmin/PayrollModule.js
import React, { useState, useEffect, useCallback } from 'react';
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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Download, Printer, Mail, Send, 
  Plus, Edit2, Eye, Trash2, AlertCircle
} from 'lucide-react';

const getCurrentPeriod = () => {
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  };

const PayrollModule = ({ showToast }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [currentPayroll, setCurrentPayroll] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => getCurrentPeriod());
  const [stats, setStats] = useState({
    grossPayroll: 0,
    totalDeductions: 0,
    netPayroll: 0,
    employeeCount: 0,
    payeTotal: 0,
    nhifTotal: 0,
    nssfTotal: 0,
    loanTotal: 0,
  });
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [unsubscribeEmployees, setUnsubscribeEmployees] = useState(null);
  const [unsubscribePayrollRuns, setUnsubscribePayrollRuns] = useState(null);

  const schoolId = user?.user_metadata?.school_id;

  // Collection references
  const employeesCollection = collection(db, 'employees');
  const payrollRunsCollection = collection(db, 'payroll_runs');
  const payrollItemsCollection = collection(db, 'payroll_items');
  const auditLogsCollection = collection(db, 'audit_logs');

  // Statutory rates
  const [statutoryRates, setStatutoryRates] = useState({
    nhifRates: [
      { min: 0, max: 5999, amount: 150 },
      { min: 6000, max: 7999, amount: 300 },
      { min: 8000, max: 11999, amount: 400 },
      { min: 12000, max: 14999, amount: 500 },
      { min: 15000, max: 19999, amount: 600 },
      { min: 20000, max: 24999, amount: 750 },
      { min: 25000, max: 29999, amount: 850 },
      { min: 30000, max: 34999, amount: 900 },
      { min: 35000, max: 39999, amount: 950 },
      { min: 40000, max: 44999, amount: 1000 },
      { min: 45000, max: 49999, amount: 1100 },
      { min: 50000, max: 59999, amount: 1200 },
      { min: 60000, max: 69999, amount: 1300 },
      { min: 70000, max: 79999, amount: 1400 },
      { min: 80000, max: 89999, amount: 1500 },
      { min: 90000, max: 99999, amount: 1600 },
      { min: 100000, max: Infinity, amount: 1700 },
    ],
    nssfRate: 0.06,
    nssfMaxEarnings: 72000,
    payeBands: [
      { min: 0, max: 24000, rate: 0.1, deduction: 0 },
      { min: 24001, max: 32333, rate: 0.25, deduction: 2400 },
      { min: 32334, max: 500000, rate: 0.3, deduction: 3833.33 },
      { min: 500001, max: 800000, rate: 0.325, deduction: 13333.33 },
      { min: 800001, max: Infinity, rate: 0.35, deduction: 33333.33 },
    ],
    personalRelief: 2400,
  });

  const fetchStatutorySettings = useCallback(async () => {
    try {
      // Try to fetch from payroll_settings collection
      const settingsQuery = query(
        collection(db, 'payroll_settings'),
        where('school_id', '==', schoolId)
      );
      const settingsSnapshot = await getDocs(settingsQuery);
      if (!settingsSnapshot.empty) {
        const settingsData = settingsSnapshot.docs[0].data();
        setStatutoryRates(prev => ({ ...prev, ...settingsData }));
      }
    } catch (error) {
      console.error('Error fetching statutory settings:', error);
    }
  }, [schoolId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await fetchEmployees();
    await fetchPayrollRuns();
    const payroll = await fetchCurrentPayroll();
    calculateStats(payroll);
    setLoading(false);
  }, [fetchEmployees, fetchPayrollRuns, fetchCurrentPayroll, calculateStats]);

  useEffect(() => {
    if (schoolId) {
      fetchData();
      fetchStatutorySettings();
    }
    return () => {
      if (unsubscribeEmployees) unsubscribeEmployees();
      if (unsubscribePayrollRuns) unsubscribePayrollRuns();
    };
  }, [selectedPeriod, schoolId, fetchData, fetchStatutorySettings]);

  const fetchEmployees = useCallback(async () => {
    try {
      const employeesQuery = query(
        employeesCollection,
        where('school_id', '==', schoolId),
        where('status', '==', 'active'),
        orderBy('name')
      );
      
      // Use onSnapshot for real-time updates
      const unsubscribe = onSnapshot(employeesQuery, (snapshot) => {
        const employeesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmployees(employeesData);
      }, (error) => {
        console.error('Error fetching employees:', error);
      });
      
      setUnsubscribeEmployees(unsubscribe);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, [schoolId]);

  const fetchPayrollRuns = useCallback(async () => {
    try {
      const payrollRunsQuery = query(
        payrollRunsCollection,
        where('school_id', '==', schoolId),
        orderBy('period', 'desc'),
        limit(12)
      );
      
      const snapshot = await getDocs(payrollRunsQuery);
      const runsData = [];
      
      for (const runDoc of snapshot.docs) {
        const run = {
          id: runDoc.id,
          ...runDoc.data()
        };
        
        // Fetch payroll items for this run
        const itemsQuery = query(
          payrollItemsCollection,
          where('payroll_run_id', '==', runDoc.id)
        );
        const itemsSnapshot = await getDocs(itemsQuery);
        run.payroll_items = itemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        runsData.push(run);
      }
      
      setPayrollRuns(runsData);
    } catch (error) {
      console.error('Error fetching payroll runs:', error);
    }
  }, [schoolId]);

  const fetchCurrentPayroll = useCallback(async () => {
    try {
      // Check for draft payroll
      const draftQuery = query(
        payrollRunsCollection,
        where('school_id', '==', schoolId),
        where('period', '==', selectedPeriod),
        where('status', '==', 'draft'),
        limit(1)
      );
      const draftSnapshot = await getDocs(draftQuery);
      
      if (!draftSnapshot.empty) {
        const draftDoc = draftSnapshot.docs[0];
        const draftData = {
          id: draftDoc.id,
          ...draftDoc.data()
        };
        
        // Fetch payroll items
        const itemsQuery = query(
          payrollItemsCollection,
          where('payroll_run_id', '==', draftDoc.id)
        );
        const itemsSnapshot = await getDocs(itemsQuery);
        draftData.payroll_items = itemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCurrentPayroll(draftData);
        return draftData;
      }

      // Check for approved payroll
      const approvedQuery = query(
        payrollRunsCollection,
        where('school_id', '==', schoolId),
        where('period', '==', selectedPeriod),
        where('status', '==', 'approved'),
        limit(1)
      );
      const approvedSnapshot = await getDocs(approvedQuery);
      
      if (!approvedSnapshot.empty) {
        const approvedDoc = approvedSnapshot.docs[0];
        const approvedData = {
          id: approvedDoc.id,
          ...approvedDoc.data()
        };
        
        // Fetch payroll items
        const itemsQuery = query(
          payrollItemsCollection,
          where('payroll_run_id', '==', approvedDoc.id)
        );
        const itemsSnapshot = await getDocs(itemsQuery);
        approvedData.payroll_items = itemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCurrentPayroll(approvedData);
        return approvedData;
      }

      // Create new payroll run
      return await createPayrollRun();
    } catch (error) {
      console.error('Error fetching current payroll:', error);
      return null;
    }
  }, [selectedPeriod, schoolId, createPayrollRun]);

  const calculatePayrollItem = useCallback((employee) => {
    const allowances = (employee.house_allowance || 0) + 
                      (employee.transport_allowance || 0) + 
                      (employee.other_allowances || 0);
    const grossSalary = employee.basic_salary + allowances;
    const paye = calculatePaye(grossSalary);
    const nhif = calculateNhif(grossSalary);
    const nssf = calculateNssf(grossSalary);
    const loanDeduction = employee.monthly_loan || 0;
    const totalDeductions = paye + nhif + nssf + loanDeduction;
    const netPay = grossSalary - totalDeductions;

    return {
      employee_id: employee.id,
      basic_salary: employee.basic_salary,
      allowances: allowances,
      gross_salary: grossSalary,
      paye: paye,
      nhif: nhif,
      nssf: nssf,
      loan_deduction: loanDeduction,
      total_deductions: totalDeductions,
      net_pay: netPay,
      payment_method: employee.payment_method,
      bank_account: employee.bank_account,
    };
  }, [statutoryRates]);

  const createPayrollRun = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      
      // Get active employees
      const employeesQuery = query(
        employeesCollection,
        where('school_id', '==', schoolId),
        where('status', '==', 'active')
      );
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (!employeesData?.length) return null;

      // Calculate payroll items for each employee
      const payrollItems = employeesData.map(emp => calculatePayrollItem(emp));

      const totalGross = payrollItems.reduce((sum, item) => sum + item.gross_salary, 0);
      const totalDeductions = payrollItems.reduce((sum, item) => sum + item.total_deductions, 0);
      const totalNet = payrollItems.reduce((sum, item) => sum + item.net_pay, 0);
      const totalPaye = payrollItems.reduce((sum, item) => sum + item.paye, 0);
      const totalNhif = payrollItems.reduce((sum, item) => sum + item.nhif, 0);
      const totalNssf = payrollItems.reduce((sum, item) => sum + item.nssf, 0);
      const totalLoans = payrollItems.reduce((sum, item) => sum + (item.loan_deduction || 0), 0);

      // Create payroll run
      const payrollRunData = {
        school_id: schoolId,
        period: selectedPeriod,
        status: 'draft',
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        total_paye: totalPaye,
        total_nhif: totalNhif,
        total_nssf: totalNssf,
        total_loans: totalLoans,
        employee_count: employeesData.length,
        created_by: currentUser?.uid,
        created_at: new Date()
      };

      const payrollRunRef = await addDoc(payrollRunsCollection, payrollRunData);

      // Create payroll items
      const batch = writeBatch(db);
      payrollItems.forEach(item => {
        const itemRef = doc(payrollItemsCollection);
        batch.set(itemRef, {
          ...item,
          payroll_run_id: payrollRunRef.id,
          created_at: new Date()
        });
      });
      await batch.commit();

      // Fetch complete payroll run with items
      const payrollRunWithItems = {
        id: payrollRunRef.id,
        ...payrollRunData,
        payroll_items: payrollItems.map(item => ({
          ...item,
          id: `temp_${Date.now()}_${Math.random()}`
        }))
      };

      setCurrentPayroll(payrollRunWithItems);
      await fetchPayrollRuns();
      return payrollRunWithItems;
    } catch (error) {
      console.error('Error creating payroll run:', error);
      return null;
    }
  }, [selectedPeriod, schoolId, calculatePayrollItem, fetchPayrollRuns]);

  const calculatePaye = (grossSalary) => {
    const annualTaxable = grossSalary * 12;
    let tax = 0;
    
    for (const band of statutoryRates.payeBands) {
      if (annualTaxable > band.max) {
        tax += (band.max - band.min + 1) * band.rate;
      } else {
        tax += (annualTaxable - band.min + 1) * band.rate;
        break;
      }
    }
    
    const monthlyTax = tax / 12;
    const paye = Math.max(0, monthlyTax - statutoryRates.personalRelief);
    return Math.round(paye);
  };

  const calculateNhif = (grossSalary) => {
    const band = statutoryRates.nhifRates.find(
      b => grossSalary >= b.min && grossSalary <= b.max
    );
    return band?.amount || 1700;
  };

  const calculateNssf = (grossSalary) => {
    const pensionablePay = Math.min(grossSalary, statutoryRates.nssfMaxEarnings);
    return Math.round(pensionablePay * statutoryRates.nssfRate);
  };

  const calculateStats = useCallback((payroll = currentPayroll) => {
    if (!payroll) return;
    
    setStats({
      grossPayroll: payroll.total_gross || 0,
      totalDeductions: payroll.total_deductions || 0,
      netPayroll: payroll.total_net || 0,
      employeeCount: payroll.employee_count || 0,
      payeTotal: payroll.total_paye || 0,
      nhifTotal: payroll.total_nhif || 0,
      nssfTotal: payroll.total_nssf || 0,
      loanTotal: payroll.total_loans || 0,
    });
  }, [currentPayroll]);

  const handleAddEmployee = async (formData) => {
    try {
      const currentUser = auth.currentUser;
      await addDoc(employeesCollection, {
        ...formData,
        school_id: schoolId,
        status: 'active',
        created_by: currentUser?.uid,
        created_at: new Date()
      });

      showToast('Employee added successfully', 'success');
      await fetchEmployees();
      await createPayrollRun();
      setShowEmployeeModal(false);
    } catch (error) {
      console.error('Error adding employee:', error);
      showToast('Failed to add employee', 'error');
    }
  };

  const handleEditEmployee = async (id, formData) => {
    try {
      const employeeRef = doc(db, 'employees', id);
      await updateDoc(employeeRef, {
        ...formData,
        updated_at: new Date()
      });

      showToast('Employee updated successfully', 'success');
      await fetchEmployees();
      await createPayrollRun();
      setShowEmployeeModal(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error updating employee:', error);
      showToast('Failed to update employee', 'error');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const employeeRef = doc(db, 'employees', id);
        await updateDoc(employeeRef, { status: 'inactive' });

        showToast('Employee removed', 'success');
        await fetchEmployees();
        await createPayrollRun();
      } catch (error) {
        console.error('Error deleting employee:', error);
        showToast('Failed to delete employee', 'error');
      }
    }
  };

  const approvePayroll = async () => {
    if (!currentPayroll) return;

    try {
      const currentUser = auth.currentUser;
      const payrollRef = doc(db, 'payroll_runs', currentPayroll.id);
      
      await updateDoc(payrollRef, {
        status: 'approved',
        approved_at: new Date(),
        approved_by: currentUser?.uid
      });

      // Log audit
      await addDoc(auditLogsCollection, {
        school_id: schoolId,
        user_id: currentUser?.uid,
        action: 'Approved payroll',
        entity_type: 'payroll',
        new_values: {
          period: selectedPeriod,
          net_payroll: stats.netPayroll,
          employee_count: stats.employeeCount
        },
        created_at: new Date()
      });

      showToast(`Payroll approved! Total net pay: KES ${stats.netPayroll.toLocaleString()}`, 'success');
      await fetchData();
    } catch (error) {
      console.error('Error approving payroll:', error);
      showToast('Failed to approve payroll', 'error');
    }
  };

  const exportPayrollCSV = () => {
    if (!currentPayroll?.payroll_items) return;

    const headers = ['Employee Name', 'ID Number', 'Basic Salary', 'Allowances', 'Gross', 'PAYE', 'NHIF', 'NSSF', 'Loan', 'Total Deductions', 'Net Pay', 'Payment Method'];
    const csvData = currentPayroll.payroll_items.map(item => {
      const employee = employees.find(e => e.id === item.employee_id);
      return [
        employee?.name || 'N/A',
        employee?.employee_id || 'N/A',
        item.basic_salary,
        item.allowances,
        item.gross_salary,
        item.paye,
        item.nhif,
        item.nssf,
        item.loan_deduction || 0,
        item.total_deductions,
        item.net_pay,
        item.payment_method,
      ];
    });

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${selectedPeriod.replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Payroll exported successfully', 'success');
  };

   const getDepartmentStats = () => {
    const departments = {
      admin: { count: 0, gross: 0, employees: [] },
      teaching: { count: 0, gross: 0, employees: [] },
      support: { count: 0, gross: 0, employees: [] },
    };

    employees.forEach(emp => {
      const dept = emp.department?.toLowerCase() || 'support';
      if (departments[dept]) {
        departments[dept].count++;
        departments[dept].gross += emp.basic_salary + (emp.house_allowance || 0) + (emp.transport_allowance || 0);
        departments[dept].employees.push(emp);
      }
    });

    return departments;
  };

  const getFilteredEmployees = () => {
    if (departmentFilter === 'all') return employees;
    return employees.filter(e => e.department?.toLowerCase() === departmentFilter);
  };

  const EmployeeFormModal = () => (
    <div style={styles.modalOverlay} onClick={() => {
      setShowEmployeeModal(false);
      setEditingEmployee(null);
    }}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>
            {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
          </span>
          <button style={styles.closeBtn} onClick={() => {
            setShowEmployeeModal(false);
            setEditingEmployee(null);
          }}>×</button>
        </div>
        <div style={styles.modalBody}>
          <EmployeeForm 
            employee={editingEmployee}
            onSubmit={editingEmployee ? 
              (data) => handleEditEmployee(editingEmployee.id, data) : 
              handleAddEmployee
            }
            onCancel={() => {
              setShowEmployeeModal(false);
              setEditingEmployee(null);
            }}
          />
        </div>
      </div>
    </div>
  );

  const PayslipModal = () => (
    <div style={styles.modalOverlay} onClick={() => setShowPayslipModal(false)}>
      <div style={{ ...styles.modal, width: 740 }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Pay Slip — {selectedEmployee?.name}</span>
          <button style={styles.closeBtn} onClick={() => setShowPayslipModal(false)}>×</button>
        </div>
        <div style={styles.modalBody}>
          {selectedEmployee && (
            <PayslipCard 
              employee={selectedEmployee}
              payrollItem={currentPayroll?.payroll_items?.find(i => i.employee_id === selectedEmployee.id)}
              period={selectedPeriod}
            />
          )}
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.btnOutline} onClick={() => {
            showToast('Payslip emailed to employee', 'success');
            setShowPayslipModal(false);
          }}>
            <Mail size={14} /> Email to Employee
          </button>
          <button style={styles.btnPrimary} onClick={() => window.print()}>
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loader}></div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Tabs */}
      <div style={styles.tabs}>
        {['overview', 'employees', 'run', 'payslips', 'statutory', 'history', 'settings'].map(tab => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'employees' && 'Employees'}
            {tab === 'run' && 'Run Payroll'}
            {tab === 'payslips' && 'Payslips'}
            {tab === 'statutory' && 'Statutory'}
            {tab === 'history' && 'History'}
            {tab === 'settings' && 'Settings'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Gross Payroll</div>
              <div style={{ ...styles.metricValue, color: '#ff6b00' }}>
                KES {stats.grossPayroll.toLocaleString()}
              </div>
              <div style={styles.metricSub}>April 2025</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: '100%', background: '#ff6b00' }}></div>
              </div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Total Deductions</div>
              <div style={{ ...styles.metricValue, color: '#e57373' }}>
                KES {stats.totalDeductions.toLocaleString()}
              </div>
              <div style={styles.metricSub}>PAYE + NHIF + NSSF + Loans</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${(stats.totalDeductions / stats.grossPayroll) * 100}%`, background: '#e57373' }}></div>
              </div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Net Payroll</div>
              <div style={{ ...styles.metricValue, color: '#4faa5e' }}>
                KES {stats.netPayroll.toLocaleString()}
              </div>
              <div style={styles.metricSub}>To disburse</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${(stats.netPayroll / stats.grossPayroll) * 100}%`, background: '#4faa5e' }}></div>
              </div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Employees</div>
              <div style={styles.metricValue}>{stats.employeeCount}</div>
              <div style={styles.metricSub}>Active staff</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: '90%', background: '#4080c8' }}></div>
              </div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Pay Status</div>
              <div style={{ ...styles.metricValue, fontSize: 16, color: '#ff6b00' }}>
                {currentPayroll?.status === 'approved' ? '✅ Approved' : '⏳ Pending'}
              </div>
              <div style={styles.metricSub}>Due: 30 Apr 2025</div>
              {currentPayroll?.status !== 'approved' && (
                <button style={styles.btnSmall} onClick={() => setActiveTab('run')}>
                  Run Payroll →
                </button>
              )}
            </div>
          </div>

          {/* Department Breakdown */}
          <div style={styles.twoColGrid}>
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <span style={styles.panelTitle}>Payroll by Department</span>
              </div>
              <div style={styles.panelBody}>
                {Object.entries(getDepartmentStats()).map(([dept, data]) => (
                  <div key={dept} style={styles.deptRow}>
                    <div style={styles.deptHeader}>
                      <span>{dept === 'admin' ? '👔 Administration' : dept === 'teaching' ? '👩‍🏫 Teaching Staff' : '🛠 Support Staff'}</span>
                      <span>{data.count} staff</span>
                    </div>
                    <div style={styles.deptBar}>
                      <div style={{ ...styles.deptFill, width: `${(data.gross / stats.grossPayroll) * 100}%` }}></div>
                    </div>
                    <div style={styles.deptTotal}>
                      KES {data.gross.toLocaleString()}
                    </div>
                  </div>
                ))}
                <div style={styles.deptTotalRow}>
                  <span>Total Gross Payroll</span>
                  <span style={styles.totalAmount}>KES {stats.grossPayroll.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Statutory Deductions */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <span style={styles.panelTitle}>Statutory Deductions</span>
              </div>
              <div style={styles.panelBody}>
                <div style={styles.deductionRow}>
                  <span>PAYE (Income Tax)</span>
                  <span style={{ color: '#e57373' }}>KES {stats.payeTotal.toLocaleString()}</span>
                </div>
                <div style={styles.deductionRow}>
                  <span>NHIF (Health Insurance)</span>
                  <span style={{ color: '#e57373' }}>KES {stats.nhifTotal.toLocaleString()}</span>
                </div>
                <div style={styles.deductionRow}>
                  <span>NSSF (Pension)</span>
                  <span style={{ color: '#e57373' }}>KES {stats.nssfTotal.toLocaleString()}</span>
                </div>
                <div style={styles.deductionRow}>
                  <span>Loan Deductions</span>
                  <span style={{ color: '#e57373' }}>KES {stats.loanTotal.toLocaleString()}</span>
                </div>
                <div style={styles.deductionTotalRow}>
                  <span style={{ fontWeight: 600 }}>Total Deductions</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#e57373' }}>
                    KES {stats.totalDeductions.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payroll Trend */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>6-Month Payroll Trend</span>
              <button style={styles.btnSmall} onClick={exportPayrollCSV}>
                <Download size={12} /> Export CSV
              </button>
            </div>
            <div style={styles.panelBody}>
              <div style={styles.trendChart}>
                {payrollRuns.slice(0, 6).reverse().map((run, i) => {
                  const height = (run.total_gross / stats.grossPayroll) * 100;
                  const isCurrent = run.period === selectedPeriod;
                  return (
                    <div key={i} style={styles.trendBar}>
                      <div style={{ 
                        ...styles.bar, 
                        height: `${Math.min(height, 100)}%`,
                        background: isCurrent ? '#ff6b00' : '#3a8a46'
                      }}></div>
                      <div style={styles.barLabel}>{run.period.split(' ')[0]}</div>
                    </div>
                  );
                })}
              </div>
              <div style={styles.trendFooter}>
                {payrollRuns.slice(0, 6).map((run, i) => (
                  <span key={i}>
                    {run.period}: KES {(run.total_gross / 1000).toFixed(0)}K
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <>
          <div style={styles.headerActions}>
            <div>
              <div style={styles.pageTitle}>Employee Register</div>
              <div style={styles.pageSubtitle}>{employees.length} staff · Active</div>
            </div>
            <div style={styles.headerButtons}>
              <div style={styles.deptFilter}>
                <button 
                  style={{ ...styles.filterBtn, ...(departmentFilter === 'all' ? styles.filterBtnActive : {}) }}
                  onClick={() => setDepartmentFilter('all')}
                >
                  All ({employees.length})
                </button>
                <button 
                  style={{ ...styles.filterBtn, ...(departmentFilter === 'admin' ? styles.filterBtnActive : {}) }}
                  onClick={() => setDepartmentFilter('admin')}
                >
                  Admin ({employees.filter(e => e.department?.toLowerCase() === 'admin').length})
                </button>
                <button 
                  style={{ ...styles.filterBtn, ...(departmentFilter === 'teaching' ? styles.filterBtnActive : {}) }}
                  onClick={() => setDepartmentFilter('teaching')}
                >
                  Teachers ({employees.filter(e => e.department?.toLowerCase() === 'teaching').length})
                </button>
                <button 
                  style={{ ...styles.filterBtn, ...(departmentFilter === 'support' ? styles.filterBtnActive : {}) }}
                  onClick={() => setDepartmentFilter('support')}
                >
                  Support ({employees.filter(e => e.department?.toLowerCase() === 'support').length})
                </button>
              </div>
              <button style={styles.btnPrimary} onClick={() => {
                setEditingEmployee(null);
                setShowEmployeeModal(true);
              }}>
                <Plus size={14} /> Add Employee
              </button>
            </div>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th>Employee</th><th>Role / Dept</th><th>Basic Salary</th><th>Allowances</th>
                  <th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Payment Method</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredEmployees().map(emp => {
                  const payrollItem = currentPayroll?.payroll_items?.find(i => i.employee_id === emp.id);
                  return (
                    <tr key={emp.id}>
                      <td>
                        <div style={styles.employeeCell}>
                          <div style={styles.employeeAvatar}>
                            {emp.name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div style={styles.employeeName}>{emp.name}</div>
                            <div style={styles.employeeId}>{emp.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={styles.roleBadge}>
                          {emp.designation || emp.department}
                        </span>
                      </td>
                      <td style={styles.monoText}>KES {emp.basic_salary?.toLocaleString()}</td>
                      <td style={styles.monoText}>
                        +{((emp.house_allowance || 0) + (emp.transport_allowance || 0)).toLocaleString()}
                      </td>
                      <td style={{ ...styles.monoText, fontWeight: 600 }}>KES {payrollItem?.gross_salary?.toLocaleString()}</td>
                      <td style={{ ...styles.monoText, color: '#e57373' }}>
                        −{payrollItem?.total_deductions?.toLocaleString()}
                      </td>
                      <td style={{ ...styles.monoText, fontWeight: 700, color: '#ff6b00' }}>
                        KES {payrollItem?.net_pay?.toLocaleString()}
                      </td>
                      <td style={styles.smallText}>{emp.payment_method || 'Bank Transfer'}</td>
                      <td>
                        <div style={styles.actionButtons}>
                          <button 
                            style={styles.actionBtn}
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setShowPayslipModal(true);
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            style={styles.actionBtn}
                            onClick={() => {
                              setEditingEmployee(emp);
                              setShowEmployeeModal(true);
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            style={{ ...styles.actionBtn, color: '#e57373' }}
                            onClick={() => handleDeleteEmployee(emp.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Run Payroll Tab */}
      {activeTab === 'run' && currentPayroll && (
        <>
          <div style={styles.headerActions}>
            <div>
              <div style={styles.pageTitle}>Run Payroll — {selectedPeriod}</div>
              <div style={styles.pageSubtitle}>Review and approve before disbursement</div>
            </div>
            <div style={styles.headerButtons}>
              <button style={styles.btnOutline} onClick={exportPayrollCSV}>
                <Download size={14} /> Export CSV
              </button>
              <button 
                style={styles.btnPrimary} 
                onClick={approvePayroll}
                disabled={currentPayroll.status === 'approved'}
              >
                <Send size={14} /> Approve & Disburse
              </button>
            </div>
          </div>

          <div style={styles.warningBox}>
            <AlertCircle size={16} />
            <span>Review all deductions carefully before approving. Once disbursed, payments will be sent to employee accounts via Helix Pay.</span>
          </div>

          <div style={styles.payrollGrid}>
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <span style={styles.panelTitle}>Payroll Review — {stats.employeeCount} Employees</span>
              </div>
              <div style={styles.tableWrapper}>
                <table style={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Employee</th><th>Gross</th><th>PAYE</th><th>NHIF</th><th>NSSF</th><th>Other</th><th>Net Pay</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPayroll.payroll_items?.map(item => {
                      const emp = employees.find(e => e.id === item.employee_id);
                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 500 }}>{emp?.name}</td>
                          <td style={styles.monoText}>KES {item.gross_salary?.toLocaleString()}</td>
                          <td style={{ ...styles.monoText, color: '#e57373' }}>{item.paye?.toLocaleString()}</td>
                          <td style={{ ...styles.monoText, color: '#e57373' }}>{item.nhif?.toLocaleString()}</td>
                          <td style={{ ...styles.monoText, color: '#e57373' }}>{item.nssf?.toLocaleString()}</td>
                          <td style={{ ...styles.monoText, color: '#e57373' }}>{item.loan_deduction?.toLocaleString()}</td>
                          <td style={{ ...styles.monoText, fontWeight: 700, color: '#ff6b00' }}>
                            KES {item.net_pay?.toLocaleString()}
                          </td>
                          <td>
                            <span style={currentPayroll.status === 'approved' ? styles.badgeSuccess : styles.badgePending}>
                              {currentPayroll.status === 'approved' ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.summaryPanel}>
              <div style={styles.summaryBox}>
                <div style={styles.summaryTitle}>{selectedPeriod} Summary</div>
                <div style={styles.summaryRow}>
                  <span>Total Gross</span>
                  <span>KES {stats.grossPayroll.toLocaleString()}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>PAYE</span>
                  <span style={{ color: '#e57373' }}>− KES {stats.payeTotal.toLocaleString()}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>NHIF</span>
                  <span style={{ color: '#e57373' }}>− KES {stats.nhifTotal.toLocaleString()}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>NSSF</span>
                  <span style={{ color: '#e57373' }}>− KES {stats.nssfTotal.toLocaleString()}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>Loans/Other</span>
                  <span style={{ color: '#e57373' }}>− KES {stats.loanTotal.toLocaleString()}</span>
                </div>
                <div style={styles.summaryTotalRow}>
                  <span style={{ fontWeight: 700 }}>NET PAYROLL</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#ff6b00' }}>
                    KES {stats.netPayroll.toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={styles.disbursementInfo}>
                <div style={styles.infoTitle}>Disbursement Method</div>
                <div>Bank Transfer: {employees.filter(e => e.payment_method === 'Bank Transfer').length} employees</div>
                <div>M-Pesa (Helix Pay): {employees.filter(e => e.payment_method === 'M-Pesa').length} employees</div>
                <div>Estimated time: <strong>1-3 minutes</strong></div>
              </div>

              <button 
                style={styles.fullWidthBtn}
                onClick={approvePayroll}
                disabled={currentPayroll.status === 'approved'}
              >
                Approve & Disburse KES {stats.netPayroll.toLocaleString()} →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Payslips Tab */}
      {activeTab === 'payslips' && currentPayroll && (
        <>
          <div style={styles.headerActions}>
            <div>
              <div style={styles.pageTitle}>Payslip Generator</div>
              <div style={styles.pageSubtitle}>Generate and view individual payslips</div>
            </div>
            <div>
              <select 
                style={styles.periodSelect}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {payrollRuns.map(run => (
                  <option key={run.id} value={run.period}>{run.period}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedEmployee ? (
            <PayslipCard 
              employee={selectedEmployee}
              payrollItem={currentPayroll?.payroll_items?.find(i => i.employee_id === selectedEmployee.id)}
              period={selectedPeriod}
            />
          ) : (
            <div style={styles.selectEmployeePrompt}>
              <p>Select an employee from the list to view their payslip</p>
              <div style={styles.employeeGrid}>
                {employees.map(emp => {
                  const payrollItem = currentPayroll?.payroll_items?.find(i => i.employee_id === emp.id);
  return (
    <div 
                      key={emp.id} 
                      style={styles.employeeCard}
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <div style={styles.employeeCardAvatar}>
                        {emp.name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div style={styles.employeeCardInfo}>
                        <div style={styles.employeeCardName}>{emp.name}</div>
                        <div style={styles.employeeCardRole}>{emp.designation || emp.department}</div>
                        <div style={styles.employeeCardNet}>
                          Net: KES {payrollItem?.net_pay?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Statutory Tab */}
      {activeTab === 'statutory' && (
        <>
          <div style={styles.pageTitle}>Statutory Returns — {selectedPeriod}</div>
          
          <div style={styles.statsGrid3}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>PAYE to KRA</div>
              <div style={{ ...styles.statValue, color: '#e57373' }}>KES {stats.payeTotal.toLocaleString()}</div>
              <div style={styles.statSub}>Due: 9 May 2025</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>NHIF Total</div>
              <div style={{ ...styles.statValue, color: '#e57373' }}>KES {stats.nhifTotal.toLocaleString()}</div>
              <div style={styles.statSub}>Due: 9 May 2025</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>NSSF Total</div>
              <div style={{ ...styles.statValue, color: '#e57373' }}>KES {stats.nssfTotal.toLocaleString()}</div>
              <div style={styles.statSub}>Due: 15 May 2025</div>
            </div>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Statutory Filing Status</span>
              <button style={styles.btnSmall} onClick={() => showToast('Downloading P9 forms...', 'info')}>
                <Download size={12} /> Download P9 Forms
              </button>
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Return</th><th>Body</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>PAYE</td>
                    <td>Kenya Revenue Authority (KRA)</td>
                    <td style={styles.monoText}>KES {stats.payeTotal.toLocaleString()}</td>
                    <td>9 May 2025</td>
                    <td><span style={styles.badgePending}>Pending</span></td>
                    <td>
                      <button style={styles.btnSmall} onClick={() => showToast('Redirecting to iTax...', 'info')}>
                        File on iTax
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>NHIF</td>
                    <td>National Hospital Insurance Fund</td>
                    <td style={styles.monoText}>KES {stats.nhifTotal.toLocaleString()}</td>
                    <td>9 May 2025</td>
                    <td><span style={styles.badgePending}>Pending</span></td>
                    <td>
                      <button style={styles.btnSmall} onClick={() => showToast('Processing NHIF submission...', 'info')}>
                        File Online
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>NSSF</td>
                    <td>National Social Security Fund</td>
                    <td style={styles.monoText}>KES {stats.nssfTotal.toLocaleString()}</td>
                    <td>15 May 2025</td>
                    <td><span style={styles.badgePending}>Pending</span></td>
                    <td>
                      <button style={styles.btnSmall} onClick={() => showToast('Processing NSSF submission...', 'info')}>
                        File Online
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          <div style={styles.pageTitle}>Payroll History</div>
          
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Previous Payroll Runs</span>
              <button style={styles.btnOutline} onClick={() => showToast('Downloading annual report...', 'info')}>
                <Download size={12} /> Annual Report
              </button>
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Period</th><th>Employees</th><th>Gross</th><th>Deductions</th><th>Net Paid</th><th>Run Date</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRuns.map(run => (
                    <tr key={run.id}>
                      <td style={{ fontWeight: 600 }}>{run.period}</td>
                      <td>{run.employee_count}</td>
                      <td style={styles.monoText}>KES {run.total_gross?.toLocaleString()}</td>
                      <td style={{ ...styles.monoText, color: '#e57373' }}>{run.total_deductions?.toLocaleString()}</td>
                      <td style={{ ...styles.monoText, color: '#ff6b00' }}>KES {run.total_net?.toLocaleString()}</td>
                      <td>{run.approved_at ? new Date(run.approved_at).toLocaleDateString() : 'Pending'}</td>
                      <td>
                        <span style={run.status === 'approved' ? styles.badgeSuccess : styles.badgePending}>
                          {run.status === 'approved' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button 
                          style={styles.btnSmall}
                          onClick={() => {
                            setSelectedPeriod(run.period);
                            setActiveTab('run');
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div style={styles.settingsGrid}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Allowances Configuration</span>
            </div>
            <div style={styles.panelBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>House Allowance (%)</label>
                <input type="number" style={styles.formInput} placeholder="10" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Transport Allowance (KES)</label>
                <input type="number" style={styles.formInput} placeholder="3,500" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Medical Allowance (KES)</label>
                <input type="number" style={styles.formInput} placeholder="2,000" />
              </div>
              <button style={styles.btnPrimary} onClick={() => showToast('Allowance settings saved', 'success')}>
                Save Allowances
              </button>
            </div>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Statutory Rates</span>
            </div>
            <div style={styles.panelBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>NHIF (KES/month)</label>
                <input type="number" style={styles.formInput} defaultValue="1700" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>NSSF Rate</label>
                <input type="text" style={styles.formInput} defaultValue="6% of gross" readOnly />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Pay Day</label>
                <select style={styles.formSelect}>
                  <option>Last day of month</option>
                  <option>25th of month</option>
                  <option>Custom date</option>
                </select>
              </div>
              <button style={styles.btnPrimary} onClick={() => showToast('Statutory settings saved', 'success')}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEmployeeModal && <EmployeeFormModal />}
      {showPayslipModal && <PayslipModal />}
    </div>
  );
};

// Employee Form Component (updated for Firebase)
const EmployeeForm = ({ employee, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    employee_id: employee?.employee_id || '',
    department: employee?.department || 'teaching',
    designation: employee?.designation || '',
    basic_salary: employee?.basic_salary || 0,
    house_allowance: employee?.house_allowance || 0,
    transport_allowance: employee?.transport_allowance || 0,
    other_allowances: employee?.other_allowances || 0,
    monthly_loan: employee?.monthly_loan || 0,
    kra_pin: employee?.kra_pin || '',
    nhif_number: employee?.nhif_number || '',
    nssf_number: employee?.nssf_number || '',
    payment_method: employee?.payment_method || 'Bank Transfer',
    bank_account: employee?.bank_account || '',
    bank_name: employee?.bank_name || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Full Name</label>
          <input 
            style={styles.formInput}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Employee ID</label>
          <input 
            style={styles.formInput}
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            placeholder="EMP-001"
            required
          />
        </div>
      </div>
      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Department</label>
          <select 
            style={styles.formSelect}
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          >
            <option value="admin">Administration</option>
            <option value="teaching">Teaching Staff</option>
            <option value="support">Support Staff</option>
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Designation</label>
          <input 
            style={styles.formInput}
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            placeholder="e.g., Senior Teacher"
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Basic Salary (KES)</label>
          <input 
            type="number"
            style={styles.formInput}
            value={formData.basic_salary}
            onChange={(e) => setFormData({ ...formData, basic_salary: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>House Allowance (KES)</label>
          <input 
            type="number"
            style={styles.formInput}
            value={formData.house_allowance}
            onChange={(e) => setFormData({ ...formData, house_allowance: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Transport Allowance (KES)</label>
          <input 
            type="number"
            style={styles.formInput}
            value={formData.transport_allowance}
            onChange={(e) => setFormData({ ...formData, transport_allowance: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Other Allowances (KES)</label>
          <input 
            type="number"
            style={styles.formInput}
            value={formData.other_allowances}
            onChange={(e) => setFormData({ ...formData, other_allowances: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>KRA PIN</label>
          <input 
            style={styles.formInput}
            value={formData.kra_pin}
            onChange={(e) => setFormData({ ...formData, kra_pin: e.target.value })}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>NHIF Number</label>
          <input 
            style={styles.formInput}
            value={formData.nhif_number}
            onChange={(e) => setFormData({ ...formData, nhif_number: e.target.value })}
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>NSSF Number</label>
          <input 
            style={styles.formInput}
            value={formData.nssf_number}
            onChange={(e) => setFormData({ ...formData, nssf_number: e.target.value })}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Monthly Loan (KES)</label>
          <input 
            type="number"
            style={styles.formInput}
            value={formData.monthly_loan}
            onChange={(e) => setFormData({ ...formData, monthly_loan: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Payment Method</label>
          <select 
            style={styles.formSelect}
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
          >
            <option>Bank Transfer</option>
            <option>M-Pesa</option>
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Account / Phone</label>
          <input 
            style={styles.formInput}
            value={formData.bank_account}
            onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
            placeholder={formData.payment_method === 'Bank Transfer' ? 'Account number' : 'M-Pesa number'}
          />
        </div>
      </div>

      <div style={styles.modalFooter}>
        <button type="button" style={styles.btnOutline} onClick={onCancel}>Cancel</button>
        <button type="submit" style={styles.btnPrimary}>
          {employee ? 'Update' : 'Add'} Employee
        </button>
      </div>
    </form>
  );
};

// Payslip Card Component (same as before)
const PayslipCard = ({ employee, payrollItem, period }) => {
 const gross = payrollItem?.gross_salary || 0;
  const net = payrollItem?.net_pay || 0;
  const deductions = payrollItem?.total_deductions || 0;
  const initials = employee?.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'GA';

  const numberToWords = (num) => {
    if (num >= 100000) return 'One Hundred Thousand';
    if (num >= 90000) return 'Ninety Thousand';
    if (num >= 80000) return 'Eighty Thousand';
    if (num >= 70000) return 'Seventy Thousand';
    if (num >= 60000) return 'Sixty Thousand';
    if (num >= 50000) return 'Fifty Thousand';
    if (num >= 40000) return 'Forty Thousand';
    return `${num.toLocaleString()}`;
  };

  return (
    <div style={styles.payslipCard}>
      <div style={styles.payslipHeader}>
        <div style={styles.payslipLogo}>{initials}</div>
        <div style={styles.payslipSchoolInfo}>
          <div style={styles.payslipSchoolName}>Greenfield Academy</div>
          <div style={styles.payslipMotto}>"Excellence Through Knowledge"</div>
        </div>
        <div style={styles.payslipDocType}>
          <div style={styles.payslipDocLabel}>Official Document</div>
          <div style={styles.payslipDocTitle}>Pay Slip</div>
          <div style={styles.payslipPeriod}>{period}</div>
        </div>
      </div>

      <div style={styles.payslipEmployeeInfo}>
        <div>
          <div style={styles.payslipLabel}>Employee Name</div>
          <div style={styles.payslipValue}>{employee?.name}</div>
        </div>
        <div>
          <div style={styles.payslipLabel}>Employee ID</div>
          <div style={styles.payslipValue}>{employee?.employee_id}</div>
        </div>
        <div>
          <div style={styles.payslipLabel}>Designation</div>
          <div style={styles.payslipValue}>{employee?.designation || employee?.department}</div>
        </div>
        <div>
          <div style={styles.payslipLabel}>Pay Period</div>
          <div style={styles.payslipValue}>{period}</div>
        </div>
      </div>

      <div style={styles.payslipBody}>
        <div>
          <div style={styles.payslipSectionTitle}>Earnings</div>
          <div style={styles.payslipRow}>
            <span>Basic Salary</span>
            <span>KES {payrollItem?.basic_salary?.toLocaleString()}.00</span>
          </div>
          <div style={styles.payslipRow}>
            <span>House Allowance</span>
            <span>KES {(employee?.house_allowance || 0).toLocaleString()}.00</span>
          </div>
          <div style={styles.payslipRow}>
            <span>Transport Allowance</span>
            <span>KES {(employee?.transport_allowance || 0).toLocaleString()}.00</span>
          </div>
          <div style={styles.payslipRow}>
            <span>Other Allowances</span>
            <span>KES {(employee?.other_allowances || 0).toLocaleString()}.00</span>
          </div>
          <div style={styles.payslipTotalRow}>
            <span>Gross Earnings</span>
            <span>KES {gross.toLocaleString()}.00</span>
          </div>
        </div>

        <div>
          <div style={styles.payslipSectionTitle}>Deductions</div>
          <div style={styles.payslipRow}>
            <span>PAYE</span>
            <span style={{ color: '#8b1a1a' }}>KES {payrollItem?.paye?.toLocaleString()}.00</span>
          </div>
          <div style={styles.payslipRow}>
            <span>NHIF</span>
            <span style={{ color: '#8b1a1a' }}>KES {payrollItem?.nhif?.toLocaleString()}.00</span>
          </div>
          <div style={styles.payslipRow}>
            <span>NSSF</span>
            <span style={{ color: '#8b1a1a' }}>KES {payrollItem?.nssf?.toLocaleString()}.00</span>
          </div>
          <div style={styles.payslipRow}>
            <span>Loan Deduction</span>
            <span style={{ color: '#8b1a1a' }}>KES {payrollItem?.loan_deduction?.toLocaleString()}.00</span>
          </div>
          <div style={styles.payslipTotalRow}>
            <span>Total Deductions</span>
            <span style={{ color: '#8b1a1a' }}>KES {deductions.toLocaleString()}.00</span>
          </div>
        </div>
      </div>

      <div style={styles.payslipNet}>
        <div>
          <div style={styles.payslipNetLabel}>Net Pay</div>
          <div style={styles.payslipNetWords}>{numberToWords(net)} Shillings Only</div>
        </div>
        <div style={styles.payslipNetAmount}>KES {net.toLocaleString()}.00</div>
      </div>

      <div style={styles.payslipFooter}>
        <div style={styles.payslipFooterMotto}>"Excellence Through Knowledge"</div>
        <div style={styles.payslipFooterBrand}>
          System designed and maintained by<br />EduManage Pro · info@edumanagepro.com
        </div>
      </div>
    </div>
  );
};


// Styles object remains the same as original
const styles = {
  container: { padding: '20px 22px' },
  tabs: { display: 'flex', gap: 4, background: '#0f1c11', borderRadius: 10, padding: 4, marginBottom: 24, flexWrap: 'wrap' },
  tab: { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent', color: '#4a7254', border: 'none' },
  tabActive: { background: '#142216', color: '#ff6b00' },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 500, color: '#e8f5eb', marginBottom: 4 },
  pageSubtitle: { fontSize: 12, color: '#6a9674' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24, '@media (max-width: 1000px)': { gridTemplateColumns: 'repeat(2,1fr)' }, '@media (max-width: 600px)': { gridTemplateColumns: '1fr' } },
  metricCard: { background: '#0b180d', border: '1px solid #1d3521', borderRadius: 11, padding: 14, position: 'relative' },
  metricLabel: { fontSize: 10, color: '#466e4e', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7, fontFamily: "'DM Mono', monospace" },
  metricValue: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#e8f5eb', letterSpacing: '-0.3px' },
  metricSub: { fontSize: 11, color: '#466e4e', marginTop: 4 },
  progressBar: { height: 3, background: '#142216', borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, transition: 'width 0.9s ease' },
  btnSmall: { padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#8ab896', border: '1px solid #1d3521' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#ff6b00', color: '#060d07' },
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#8ab896', border: '1px solid #1d3521' },
  twoColGrid: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16, '@media (max-width: 700px)': { gridTemplateColumns: '1fr' } },
  panel: { background: '#0b180d', border: '1px solid #1d3521', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  panelHeader: { padding: '13px 18px', borderBottom: '1px solid #1d3521', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  panelTitle: { fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 500, color: '#e8f5eb' },
  panelBody: { padding: '16px 18px' },
  deptRow: { marginBottom: 12 },
  deptHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, color: '#8ab896' },
  deptBar: { height: 5, background: '#142216', borderRadius: 2, overflow: 'hidden' },
  deptFill: { height: '100%', borderRadius: 2, background: '#ff6b00' },
  deptTotal: { textAlign: 'right', fontSize: 12, marginTop: 4, fontFamily: "'DM Mono', monospace" },
  deptTotalRow: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1d3521', marginTop: 12, paddingTop: 12, fontSize: 12, fontWeight: 600 },
  totalAmount: { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: '#ff6b00' },
  deductionRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(29,53,33,0.5)' },
  deductionTotalRow: { display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #273d2b', marginTop: 8, paddingTop: 10 },
  trendChart: { display: 'flex', alignItems: 'flex-end', gap: 16, height: 80, justifyContent: 'center' },
  trendBar: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 },
  bar: { width: '100%', borderRadius: '3px 3px 0 0', minHeight: 3 },
  barLabel: { fontSize: 9, color: '#253928', fontFamily: "'DM Mono', monospace" },
  trendFooter: { display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#466e4e', borderTop: '1px solid #1d3521', paddingTop: 8, flexWrap: 'wrap' },
  headerActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  headerButtons: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  deptFilter: { display: 'flex', gap: 4, background: '#0f1c11', borderRadius: 9, padding: 3 },
  filterBtn: { padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: 'transparent', color: '#466e4e', border: 'none' },
  filterBtnActive: { background: '#142216', color: '#ff6b00' },
  tableWrapper: { overflowX: 'auto' },
  dataTable: { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  employeeCell: { display: 'flex', alignItems: 'center', gap: 9 },
  employeeAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#1c4a24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#88cc96' },
  employeeName: { fontWeight: 600, color: '#e8f5eb', marginBottom: 2 },
  employeeId: { fontSize: 10, color: '#466e4e', fontFamily: "'DM Mono', monospace" },
  roleBadge: { background: 'rgba(255,107,0,0.1)', color: '#ff6b00', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 },
  monoText: { fontFamily: "'DM Mono', monospace", fontSize: 12 },
  smallText: { fontSize: 11, color: '#466e4e' },
  actionButtons: { display: 'flex', gap: 4 },
  actionBtn: { background: 'none', border: 'none', color: '#88cc96', cursor: 'pointer', padding: 4 },
  warningBox: { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.18)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#ff6b00' },
  payrollGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, '@media (max-width: 900px)': { gridTemplateColumns: '1fr' } },
  summaryPanel: { display: 'flex', flexDirection: 'column', gap: 16 },
  summaryBox: { background: '#0b180d', border: '1px solid #273d2b', borderRadius: 12, padding: 18 },
  summaryTitle: { fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 500, color: '#e8f5eb', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #273d2b' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 },
  summaryTotalRow: { display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #273d2b', marginTop: 8, paddingTop: 10, fontSize: 13 },
  disbursementInfo: { background: 'rgba(82,170,94,0.06)', border: '1px solid rgba(82,170,94,0.15)', borderRadius: 10, padding: 14, fontSize: 12, color: '#85b490', lineHeight: 1.8 },
  infoTitle: { fontWeight: 600, color: '#52aa5e', marginBottom: 4 },
  fullWidthBtn: { width: '100%', padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#ff6b00', color: '#060d07', marginTop: 8 },
  badgePending: { display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(255,107,0,0.1)', color: '#ff6b00' },
  badgeSuccess: { display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(82,170,94,0.12)', color: '#52aa5e' },
  periodSelect: { padding: '8px 12px', borderRadius: 8, background: '#0f1c11', border: '1px solid #1d3521', color: '#e8f5eb', fontSize: 13, outline: 'none' },
  statsGrid3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16, '@media (max-width: 600px)': { gridTemplateColumns: '1fr' } },
  statCard: { background: '#0b180d', border: '1px solid #1d3521', borderRadius: 11, padding: 16, textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#466e4e', textTransform: 'uppercase', marginBottom: 8 },
  statValue: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600 },
  statSub: { fontSize: 11, color: '#466e4e', marginTop: 4 },
  settingsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, '@media (max-width: 700px)': { gridTemplateColumns: '1fr' } },
  formGroup: { marginBottom: 13 },
  formLabel: { fontSize: 10, color: '#466e4e', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4, display: 'block', fontFamily: "'DM Mono', monospace" },
  formInput: { width: '100%', background: '#0f1c11', border: '1px solid #1d3521', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#e8f5eb', outline: 'none' },
  formSelect: { width: '100%', background: '#0f1c11', border: '1px solid #1d3521', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#e8f5eb', outline: 'none' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 },
  selectEmployeePrompt: { textAlign: 'center', padding: 40, background: '#0b180d', borderRadius: 12, border: '1px solid #1d3521' },
  employeeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 20 },
  employeeCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#0f1c11', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' },
  employeeCardAvatar: { width: 48, height: 48, borderRadius: '50%', background: '#1c4a24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#88cc96' },
  employeeCardInfo: { flex: 1 },
  employeeCardName: { fontWeight: 600, color: '#e8f5eb', marginBottom: 4 },
  employeeCardRole: { fontSize: 11, color: '#466e4e', marginBottom: 4 },
  employeeCardNet: { fontSize: 12, fontWeight: 600, color: '#ff6b00' },
  payslipCard: { background: 'white', borderRadius: 0, width: '100%', color: '#1a2e1c' },
  payslipHeader: { background: 'linear-gradient(135deg, #1c4a24 0%, #0b180d 100%)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  payslipLogo: { width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white', fontFamily: "'Playfair Display', serif" },
  payslipSchoolInfo: { flex: 1, marginLeft: 16 },
  payslipSchoolName: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: 'white' },
  payslipMotto: { fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  payslipDocType: { textAlign: 'right' },
  payslipDocLabel: { fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: "'DM Mono', monospace" },
  payslipDocTitle: { fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: 'rgba(245,190,48,0.9)', marginTop: 3 },
  payslipPeriod: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontFamily: "'DM Mono', monospace" },
  payslipEmployeeInfo: { background: '#f7fcf8', borderBottom: '2px solid #e0eee3', padding: '14px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
  payslipLabel: { fontSize: 9, color: '#7a9a7e', textTransform: 'uppercase', letterSpacing: 0.7, fontFamily: "'DM Mono', monospace", marginBottom: 3 },
  payslipValue: { fontSize: 13, fontWeight: 600, color: '#1a2e1c' },
  payslipBody: { padding: '22px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, '@media (max-width: 700px)': { gridTemplateColumns: '1fr' } },
  payslipSectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 600, color: '#1c4a24', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '2px solid #e0eee3', paddingBottom: 6, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
  payslipRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #eef5ef', fontSize: 12 },
  payslipTotalRow: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e0eee3', marginTop: 6, paddingTop: 6, fontWeight: 700 },
  payslipNet: { background: 'linear-gradient(135deg, #f0f8f2, #e8f5ec)', borderTop: '2px solid #c8e0cc', padding: '16px 32px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  payslipNetLabel: { fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: '#1a2e1c' },
  payslipNetWords: { fontSize: 11, color: '#7a9a7e', fontStyle: 'italic', marginTop: 2 },
  payslipNetAmount: { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#1c4a24' },
  payslipFooter: { background: '#1c4a24', padding: '12px 32px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  payslipFooterMotto: { fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  payslipFooterBrand: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono', monospace", textAlign: 'right', lineHeight: 1.6 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#0f1c11', border: '1px solid #273d2b', borderRadius: 14, width: 520, maxHeight: '92vh', overflowY: 'auto' },
  modalHeader: { padding: '16px 20px', borderBottom: '1px solid #1d3521', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 500, color: '#e8f5eb' },
  modalBody: { padding: 20 },
  modalFooter: { padding: '13px 20px', borderTop: '1px solid #1d3521', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  closeBtn: { background: 'none', border: 'none', color: '#466e4e', fontSize: 20, cursor: 'pointer' },
  loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 },
  loader: { width: 40, height: 40, border: '3px solid #1d3521', borderTopColor: '#ff6b00', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};


export default PayrollModule;
