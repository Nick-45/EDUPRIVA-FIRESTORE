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
  serverTimestamp,
  writeBatch,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../../components/Common/DataTable';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

const Schools = () => {
  const { userData } = useAuth();
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    registration_number: '',
    school_code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    current_term: 'Term 1',
    current_academic_year: new Date().getFullYear().toString(),
    term_fee: 12500,
    admin_email: '',
    admin_phone: '',
    plan: 'standard'
  });

  // Reference to schools collection
  const schoolsCollection = collection(db, 'schools');
  const subscriptionsCollection = collection(db, 'subscriptions');
  const usersCollection = collection(db, 'users');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    filterSchools();
  }, [searchTerm, activeFilter, schools]);

  const loadSchools = async () => {
    try {
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn('No active user');
        setLoading(false);
        return;
      }

      // Check if user is a platform admin
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'platform_admin') {
        toast.error('You do not have permission to view schools');
        setLoading(false);
        return;
      }

      // Get all schools with their subscriptions
      const schoolsQuery = query(
        schoolsCollection,
        orderBy('created_at', 'desc')
      );
      
      const schoolsSnapshot = await getDocs(schoolsQuery);
      const schoolsData = [];

      for (const schoolDoc of schoolsSnapshot.docs) {
        const school = {
          id: schoolDoc.id,
          ...schoolDoc.data()
        };

        // Get subscriptions for this school
        const subsQuery = query(
          collection(db, 'subscriptions'),
          where('school_id', '==', schoolDoc.id),
          orderBy('created_at', 'desc'),
          limit(1)
        );
        const subsSnapshot = await getDocs(subsQuery);
        const subscriptions = subsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Get school admin profile
        let adminProfile = null;
        if (school.admin_id) {
          const adminDoc = await getDoc(doc(db, 'users', school.admin_id));
          if (adminDoc.exists()) {
            adminProfile = adminDoc.data();
          }
        }

        schoolsData.push({
          ...school,
          subscriptions: subscriptions || [],
          admin_profile: adminProfile
        });
      }

      setSchools(schoolsData);
      setFilteredSchools(schoolsData);
    } catch (error) {
      console.error('Error loading schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const filterSchools = () => {
    let filtered = [...schools];
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(school => {
        const subscription = school.subscriptions?.[0];
        
        if (activeFilter === 'active') return school.status === 'active';
        if (activeFilter === 'expiring') {
          const expiry = subscription?.expiry_date?.toDate?.() || subscription?.expiry_date;
          if (!expiry) return false;
          const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
          return daysLeft <= 30 && daysLeft > 0;
        }
        if (activeFilter === 'suspended') return school.status === 'suspended';
        if (activeFilter === 'trial') return subscription?.plan === 'trial';
        return true;
      });
    }
    
    if (searchTerm) {
      filtered = filtered.filter(school =>
        school.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.school_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredSchools(filtered);
  };

  const generateSchoolCode = async () => {
    if (!formData.name) {
      toast.error('Please enter the school name first');
      return;
    }

    setIsGeneratingCode(true);
    
    try {
      const namePrefix = formData.name
        .split(' ')
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join('');
      
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      let code = `${namePrefix}${year}${random}`;
      
      let attempts = 0;
      let exists = true;
      
      while (exists && attempts < 10) {
        const q = query(
          schoolsCollection,
          where('school_code', '==', code)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          attempts++;
          const newRandom = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
          code = `${namePrefix}${year}${newRandom}`;
        } else {
          exists = false;
        }
      }
      
      if (exists) {
        toast.error('Could not generate a unique code. Please try again.');
        return;
      }
      
      setFormData({ ...formData, school_code: code });
      toast.success(`Generated school code: ${code}`);
    } catch (error) {
      console.error('Error generating school code:', error);
      toast.error('Failed to generate school code');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCreateSchool = async () => {
    // Validate required fields
    if (!formData.name) {
      toast.error('School name is required');
      return;
    }
    if (!formData.registration_number) {
      toast.error('Registration number is required');
      return;
    }
    if (!formData.school_code) {
      toast.error('School code is required');
      return;
    }
    if (!formData.email) {
      toast.error('School email is required');
      return;
    }
    if (!formData.admin_email) {
      toast.error('Admin email is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error('You must be logged in as a platform admin');
        setIsSubmitting(false);
        return;
      }

      // Verify user is a platform admin
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'platform_admin') {
        toast.error('Only platform admins can create schools');
        setIsSubmitting(false);
        return;
      }

      // Check for duplicate school_code
      const codeQuery = query(
        schoolsCollection,
        where('school_code', '==', formData.school_code.toUpperCase())
      );
      const codeSnapshot = await getDocs(codeQuery);
      if (!codeSnapshot.empty) {
        toast.error(`School code "${formData.school_code.toUpperCase()}" is already in use.`);
        setIsSubmitting(false);
        return;
      }

      // Check for duplicate registration_number
      const regQuery = query(
        schoolsCollection,
        where('registration_number', '==', formData.registration_number)
      );
      const regSnapshot = await getDocs(regQuery);
      if (!regSnapshot.empty) {
        toast.error(`Registration number "${formData.registration_number}" is already in use.`);
        setIsSubmitting(false);
        return;
      }

      // Check for duplicate school email
      const emailQuery = query(
        schoolsCollection,
        where('email', '==', formData.email)
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        toast.error(`School email "${formData.email}" is already registered.`);
        setIsSubmitting(false);
        return;
      }

      // Check if admin user already exists
      const adminQuery = query(
        usersCollection,
        where('email', '==', formData.admin_email)
      );
      const adminSnapshot = await getDocs(adminQuery);
      
      let adminUserId = null;
      let tempPassword = null;

      // Use a batch write for atomic operations
      const batch = writeBatch(db);

      // Create school document
      const schoolRef = doc(schoolsCollection);
      const now = new Date();

      const schoolData = {
        name: formData.name,
        registration_number: formData.registration_number,
        school_code: formData.school_code.toUpperCase(),
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        current_term: formData.current_term,
        current_academic_year: formData.current_academic_year,
        term_fee: formData.term_fee,
        status: 'active',
        wallet_balance: 0,
        created_by: currentUser.uid,
        created_at: now,
        updated_at: now
      };

      batch.set(schoolRef, schoolData);

      // Create subscription
      const subRef = doc(subscriptionsCollection);
      const expiryDate = new Date();
      if (formData.plan === 'trial') {
        expiryDate.setDate(expiryDate.getDate() + 30);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 3);
      }

      const subscriptionData = {
        school_id: schoolRef.id,
        plan: formData.plan,
        status: 'active',
        expiry_date: expiryDate,
        created_at: now,
        updated_at: now
      };

      batch.set(subRef, subscriptionData);

      // If admin doesn't exist, create user document
      if (adminSnapshot.empty) {
        // In Firebase, user accounts are created via Firebase Auth
        // We'll create the user document and send invitation separately
        const userRef = doc(usersCollection);
        const userData = {
          email: formData.admin_email,
          phone: formData.admin_phone || null,
          role: 'school_admin',
          school_id: schoolRef.id,
          full_name: `${formData.name} Admin`,
          created_at: now,
          updated_at: now
        };
        batch.set(userRef, userData);
        adminUserId = userRef.id;
        tempPassword = Math.random().toString(36).slice(-10) + '!@#';
      } else {
        const existingAdmin = adminSnapshot.docs[0];
        adminUserId = existingAdmin.id;
        
        // Update existing user's school_id if not set
        if (!existingAdmin.data().school_id) {
          batch.update(doc(db, 'users', adminUserId), {
            school_id: schoolRef.id,
            updated_at: now
          });
        }
      }

      // Commit the batch
      await batch.commit();

      // Send invitation email (you'll need to implement this)
      if (tempPassword) {
        try {
          // Call your cloud function or API to send email
          await sendInvitationEmail({
            email: formData.admin_email,
            password: tempPassword,
            schoolName: formData.name,
            schoolCode: formData.school_code.toUpperCase()
          });
          toast.success(`School created! Invitation sent to ${formData.admin_email}`);
        } catch (emailError) {
          console.error('Error sending invitation:', emailError);
          toast.warning('School created but invitation email failed. Please send credentials manually.');
        }
      } else {
        toast.success(`School "${formData.name}" created successfully! Admin already exists.`);
      }

      setShowAddModal(false);
      resetForm();
      loadSchools();
      
    } catch (error) {
      console.error('Error creating school:', error);
      toast.error(error.message || 'Failed to create school');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function for sending invitation email
  const sendInvitationEmail = async ({ email, password, schoolName, schoolCode }) => {
    // Implement your email sending logic here
    // You can use Firebase Cloud Functions, SendGrid, etc.
    console.log('Sending invitation to:', email, { password, schoolName, schoolCode });
    
    // Example using a Cloud Function:
    // const sendInvite = getFunctions();
    // const sendInviteFn = httpsCallable(sendInvite, 'sendSchoolInvite');
    // await sendInviteFn({ email, password, schoolName, schoolCode });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      registration_number: '',
      school_code: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      current_term: 'Term 1',
      current_academic_year: new Date().getFullYear().toString(),
      term_fee: 12500,
      admin_email: '',
      admin_phone: '',
      plan: 'standard'
    });
  };

  const handleSuspendSchool = async () => {
    if (!selectedSchool) return;
    
    try {
      const schoolRef = doc(db, 'schools', selectedSchool.id);
      await updateDoc(schoolRef, {
        status: 'suspended',
        updated_at: new Date()
      });
      
      toast.success(`School "${selectedSchool.name}" suspended`);
      setShowSuspendModal(false);
      loadSchools();
    } catch (error) {
      console.error('Error suspending school:', error);
      toast.error('Failed to suspend school');
    }
  };

  const handleReinstateSchool = async (school) => {
    try {
      const schoolRef = doc(db, 'schools', school.id);
      await updateDoc(schoolRef, {
        status: 'active',
        updated_at: new Date()
      });
      
      toast.success(`School "${school.name}" reinstated`);
      loadSchools();
    } catch (error) {
      console.error('Error reinstating school:', error);
      toast.error('Failed to reinstate school');
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedSchool) return;
    
    const newExpiry = document.getElementById('extendExpiry')?.value;
    if (!newExpiry) {
      toast.error('Please select new expiry date');
      return;
    }
    
    try {
      // Find the subscription for this school
      const subsQuery = query(
        collection(db, 'subscriptions'),
        where('school_id', '==', selectedSchool.id),
        orderBy('created_at', 'desc'),
        limit(1)
      );
      const subsSnapshot = await getDocs(subsQuery);
      
      if (subsSnapshot.empty) {
        toast.error('No subscription found for this school');
        return;
      }

      const subDoc = subsSnapshot.docs[0];
      await updateDoc(doc(db, 'subscriptions', subDoc.id), {
        expiry_date: new Date(newExpiry),
        status: 'active',
        updated_at: new Date()
      });
      
      toast.success(`Subscription extended for "${selectedSchool.name}"`);
      setShowExtendModal(false);
      loadSchools();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Failed to extend subscription');
    }
  };

  const exportCSV = () => {
    const headers = ['School Name', 'Registration No', 'School Code', 'Email', 'Phone', 'City', 'Status', 'Plan', 'Expiry Date', 'Admin'];
    const rows = filteredSchools.map(school => {
      const subscription = school.subscriptions?.[0];
      return [
        school.name,
        school.registration_number,
        school.school_code || 'N/A',
        school.email,
        school.phone || 'N/A',
        school.city || 'N/A',
        school.status,
        subscription?.plan === 'trial' ? 'Free Trial' : subscription?.plan || 'Standard',
        subscription?.expiry_date?.toDate?.() ? subscription.expiry_date.toDate().toLocaleDateString() : 
          subscription?.expiry_date ? new Date(subscription.expiry_date).toLocaleDateString() : 'N/A',
        school.admin_profile?.full_name || 'Not assigned'
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schools_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete');
  };

  const columns = [
    { key: 'name', label: 'School', render: (school) => (
      <div>
        <div className="school-name">{school.name}</div>
        <div className="school-reg-number">{school.registration_number}</div>
      </div>
    )},
    { key: 'school_code', label: 'School Code', render: (school) => (
      <div className="school-code-display">{school.school_code || '—'}</div>
    )},
    { key: 'email', label: 'School Email', render: (school) => (
      <div className="admin-email">{school.email || '—'}</div>
    )},
    { key: 'admin', label: 'School Admin', render: (school) => (
      <div>
        <div className="admin-name">{school.admin_profile?.full_name || 'Not assigned'}</div>
        <div className="admin-phone">{school.admin_profile?.phone || ''}</div>
      </div>
    )},
    { key: 'status', label: 'Status', render: (school) => (
      <span className={`status-badge ${school.status === 'active' ? 'status-active' : school.status === 'suspended' ? 'status-suspended' : 'status-expired'}`}>
        {school.status === 'active' ? '● Active' : school.status === 'suspended' ? '○ Suspended' : '⚠ Expired'}
      </span>
    )},
    { key: 'subscription', label: 'Subscription', render: (school) => {
      const subscription = school.subscriptions?.[0];
      return (
        <div>
          <div className="subscription-plan">
            {subscription?.plan === 'trial' ? 'Free Trial' : subscription?.plan === 'premium' ? 'Premium' : subscription?.plan || 'Standard'}
          </div>
          <div className="subscription-expiry">
            {subscription?.expiry_date?.toDate?.() ? subscription.expiry_date.toDate().toLocaleDateString() : 
              subscription?.expiry_date ? new Date(subscription.expiry_date).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      );
    }},
    { key: 'actions', label: 'Actions', render: (school) => (
      <div className="action-buttons">
        <button 
          onClick={() => {
            setSelectedSchool(school);
            setShowExtendModal(true);
          }}
          className="btn-extend"
        >
          Extend
        </button>
        {school.status === 'active' ? (
          <button 
            onClick={() => {
              setSelectedSchool(school);
              setShowSuspendModal(true);
            }}
            className="btn-suspend"
          >
            Suspend
          </button>
        ) : (
          <button 
            onClick={() => handleReinstateSchool(school)}
            className="btn-reinstate"
          >
            Reinstate
          </button>
        )}
      </div>
    )}
  ];

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'expiring', label: 'Expiring Soon' },
    { id: 'suspended', label: 'Suspended' },
    { id: 'trial', label: 'Free Trial' }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="schools-page">
      {/* Header - Keep the same as before */}
      <div className="page-header">
        <div>
          <h1 className="page-title">All Schools</h1>
          <p className="page-subtitle">Full platform control — extend, suspend, grant free access</p>
        </div>
        <div className="header-actions">
          <button onClick={exportCSV} className="btn-secondary">
            <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add School
          </button>
        </div>
      </div>
      
      {/* Filters - Keep the same */}
      <div className="filters-container">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`filter-btn ${activeFilter === filter.id ? 'filter-active' : ''}`}
          >
            {filter.label} {filter.id === 'all' && `(${schools.length})`}
          </button>
        ))}
      </div>
      
      {/* Search Bar - Keep the same */}
      <div className="search-container">
        <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search school name, registration number, code, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      {/* Schools Table */}
      <div className="table-container">
        <DataTable 
          columns={columns} 
          data={filteredSchools}
          emptyMessage="No schools found"
        />
      </div>
      
      {/* Modals - Keep the same JSX structure with updated handlers */}
      {/* Add School Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register New School">
        <div className="modal-form">
          {/* Same form content as before */}
          <div className="form-section">
            <h3 className="section-title">School Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">School Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Greenfield Academy"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Registration Number *</label>
                <input
                  type="text"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  className="form-input"
                  placeholder="e.g., REG/2025/001"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">School Code *</label>
                <div className="code-input-group">
                  <input
                    type="text"
                    value={formData.school_code}
                    onChange={(e) => setFormData({ ...formData, school_code: e.target.value.toUpperCase() })}
                    className="form-input code-input"
                    placeholder="e.g., GFA2025"
                  />
                  <button 
                    type="button" 
                    onClick={generateSchoolCode}
                    className="btn-generate-code"
                    disabled={isGeneratingCode || !formData.name}
                  >
                    {isGeneratingCode ? '...' : 'Generate'}
                  </button>
                </div>
                <div className="field-hint">Unique identifier for the school (auto-converted to uppercase)</div>
              </div>
              <div className="form-group">
                <label className="form-label">School Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  placeholder="info@school.ac.ke"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">School Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                  placeholder="+254 712 345 678"
                />
              </div>
              <div className="form-group">
                <label className="form-label">City/County</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Nairobi"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="form-input"
                placeholder="School address"
              />
            </div>
          </div>

          {/* Academic Settings Section */}
          <div className="form-section">
            <h3 className="section-title">Academic Settings</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Current Term</label>
                <select
                  value={formData.current_term}
                  onChange={(e) => setFormData({ ...formData, current_term: e.target.value })}
                  className="form-select"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <input
                  type="text"
                  value={formData.current_academic_year}
                  onChange={(e) => setFormData({ ...formData, current_academic_year: e.target.value })}
                  className="form-input"
                  placeholder="2025"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Term Fee (KES) *</label>
              <input
                type="number"
                value={formData.term_fee}
                onChange={(e) => setFormData({ ...formData, term_fee: parseFloat(e.target.value) || 0 })}
                className="form-input"
                placeholder="12500"
              />
            </div>
          </div>

          {/* Admin Account Section */}
          <div className="form-section">
            <h3 className="section-title">Admin Account</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Admin Email *</label>
                <input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="form-input"
                  placeholder="admin@school.ac.ke"
                />
                <div className="field-hint">Login credentials will be sent to this email</div>
              </div>
              <div className="form-group">
                <label className="form-label">Admin Phone</label>
                <input
                  type="tel"
                  value={formData.admin_phone}
                  onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                  className="form-input"
                  placeholder="+254 712 345 678"
                />
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="form-section">
            <h3 className="section-title">Subscription Plan</h3>
            
            <div className="form-group">
              <label className="form-label">Initial Plan</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="form-select"
              >
                <option value="standard">Standard - KES 12,500/term</option>
                <option value="premium">Premium - KES 18,500/term</option>
                <option value="trial">Free Trial - 30 days</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={() => setShowAddModal(false)} className="modal-btn-cancel">
            Cancel
          </button>
          <button onClick={handleCreateSchool} className="modal-btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create School'}
          </button>
        </div>
      </Modal>
      
      {/* Suspend Modal */}
      <Modal isOpen={showSuspendModal} onClose={() => setShowSuspendModal(false)} title="Suspend School Access">
        <div className="alert-warning">
          <div className="alert-title">⚠ This immediately revokes all access for all users at this school.</div>
          <div className="alert-message">Finance write access also blocked. Only platform admin can reinstate.</div>
        </div>
        
        <div className="selected-school">{selectedSchool?.name}</div>
        
        <div className="form-group">
          <label className="form-label">Reason</label>
          <select id="suspendReason" className="form-select">
            <option>Non-payment (45+ days overdue)</option>
            <option>Terms of service violation</option>
            <option>Fraudulent activity</option>
            <option>Manual override</option>
          </select>
        </div>
        
        <div className="modal-footer">
          <button onClick={() => setShowSuspendModal(false)} className="modal-btn-cancel">
            Cancel
          </button>
          <button onClick={handleSuspendSchool} className="modal-btn-danger">
            Confirm Suspension
          </button>
        </div>
      </Modal>
      
      {/* Extend Modal */}
      <Modal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} title="Extend / Override Subscription">
        <div className="school-info">
          <div className="school-info-label">School</div>
          <div className="school-info-value">{selectedSchool?.name}</div>
          <div className="school-info-label mt-2">Registration Number</div>
          <div className="school-info-value">{selectedSchool?.registration_number}</div>
          <div className="school-info-label mt-2">School Code</div>
          <div className="school-info-value">{selectedSchool?.school_code || 'N/A'}</div>
        </div>
        
        <div className="form-group">
          <label className="form-label">New Expiry Date</label>
          <input type="date" id="extendExpiry" className="form-input" />
        </div>
        
        <div className="form-group">
          <label className="form-label">Reason (logged in audit trail)</label>
          <textarea rows={3} id="extendReason" className="form-textarea" placeholder="Enter reason for override..."></textarea>
        </div>
        
        <div className="audit-note">
          This action is permanently logged with your admin ID, timestamp, and IP address.
        </div>
        
        <div className="modal-footer">
          <button onClick={() => setShowExtendModal(false)} className="modal-btn-cancel">
            Cancel
          </button>
          <button onClick={handleExtendSubscription} className="modal-btn-submit">
            Apply Override
          </button>
        </div>
      </Modal>

      <style jsx>{`
        /* All your existing styles remain the same */
        .schools-page {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 256px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 107, 0, 0.2);
          border-top-color: #ff6b00;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .page-header {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .page-header {
            flex-direction: row;
            align-items: center;
          }
        }

        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 4px 0;
        }

        .page-subtitle {
          font-size: 14px;
          color: #718096;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #ff6b00;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #e55a00;
          transform: translateY(-1px);
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #4a5568;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .btn-icon {
          width: 16px;
          height: 16px;
        }

        .filters-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .filter-btn {
          padding: 6px 14px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          font-size: 14px;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .filter-active {
          background: rgba(255, 107, 0, 0.1);
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .search-container {
          position: relative;
          margin-bottom: 20px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #a0aec0;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #1a202c;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.1);
        }

        .table-container {
          overflow-x: auto;
        }

        .school-name {
          font-weight: 600;
          color: #1a202c;
        }

        .school-reg-number {
          font-size: 11px;
          color: #a0aec0;
          font-family: monospace;
          margin-top: 2px;
        }

        .school-code-display {
          font-size: 13px;
          font-weight: 500;
          color: #2d3748;
          font-family: monospace;
          background: #f7fafc;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        .admin-email {
          color: #4a5568;
          font-size: 14px;
        }

        .admin-name {
          font-weight: 500;
          color: #1a202c;
        }

        .admin-phone {
          font-size: 11px;
          color: #a0aec0;
          margin-top: 2px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .status-suspended {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .status-expired {
          background: rgba(255, 107, 0, 0.1);
          color: #ff6b00;
        }

        .subscription-plan {
          font-size: 14px;
          color: #1a202c;
        }

        .subscription-expiry {
          font-size: 11px;
          color: #a0aec0;
          margin-top: 2px;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-extend {
          padding: 4px 10px;
          background: rgba(255, 107, 0, 0.1);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          color: #ff6b00;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-extend:hover {
          background: rgba(255, 107, 0, 0.2);
        }

        .btn-suspend {
          padding: 4px 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-suspend:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .btn-reinstate {
          padding: 4px 10px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          color: #10b981;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-reinstate:hover {
          background: rgba(16, 185, 129, 0.2);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-section {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 20px;
        }

        .form-section:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 16px 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (min-width: 640px) {
          .form-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 11px;
          font-weight: 600;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          padding: 10px 12px;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1a202c;
          transition: all 0.2s;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #ff6b00;
          background: white;
        }

        .code-input-group {
          display: flex;
          gap: 8px;
        }

        .code-input {
          flex: 1;
        }

        .btn-generate-code {
          padding: 10px 16px;
          background: #edf2f7;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #4a5568;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .btn-generate-code:hover:not(:disabled) {
          background: #e2e8f0;
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .btn-generate-code:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .field-hint {
          font-size: 11px;
          color: #a0aec0;
          margin-top: 4px;
        }

        .mt-2 {
          margin-top: 8px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .modal-btn-cancel {
          padding: 8px 20px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-cancel:hover {
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .modal-btn-submit {
          padding: 8px 20px;
          background: #ff6b00;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-submit:hover:not(:disabled) {
          background: #e55a00;
        }

        .modal-btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-btn-danger {
          padding: 8px 20px;
          background: #ef4444;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-danger:hover {
          background: #dc2626;
        }

        .alert-warning {
          background: rgba(255, 107, 0, 0.08);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 20px;
        }

        .alert-title {
          font-size: 13px;
          font-weight: 600;
          color: #ff6b00;
          margin-bottom: 4px;
        }

        .alert-message {
          font-size: 12px;
          color: #718096;
        }

        .selected-school {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 20px;
          padding: 12px;
          background: #f7fafc;
          border-radius: 8px;
        }

        .school-info {
          background: #f7fafc;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
        }

        .school-info-label {
          font-size: 11px;
          color: #718096;
          margin-bottom: 4px;
        }

        .school-info-value {
          font-size: 15px;
          font-weight: 600;
          color: #1a202c;
        }

        .audit-note {
          background: rgba(255, 107, 0, 0.05);
          border: 1px solid rgba(255, 107, 0, 0.15);
          border-radius: 8px;
          padding: 10px;
          font-size: 11px;
          color: #ff6b00;
          margin-top: 16px;
        }

        @media (max-width: 640px) {
          .page-title {
            font-size: 20px;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .btn-extend,
          .btn-suspend,
          .btn-reinstate {
            text-align: center;
          }

          .code-input-group {
            flex-direction: column;
          }

          .btn-generate-code {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Schools;
