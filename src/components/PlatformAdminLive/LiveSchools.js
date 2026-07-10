import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc,
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
import DataTable from '../../components/Common/DataTable';
import Modal from '../../components/Common/Modal';
import { Search, Download, Plus, Filter, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveSchools = () => {
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [extendData, setExtendData] = useState({ newExpiry: '', reason: '' });
  const [formData, setFormData] = useState({
    name: '',
    registration_number: '',
    email: '',
    phone: '',
    address: '',
    city: 'Nairobi',
    admin_email: '',
    admin_phone: '',
    plan: 'standard',
    term_fee: 12500
  });

  const schoolsUnsubscribeRef = useRef(null);
  const isMounted = useRef(true);

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const subscriptionsCollection = collection(db, 'subscriptions');

  useEffect(() => {
    isMounted.current = true;
    loadSchools();
    setupRealtimeSubscription();

    return () => {
      isMounted.current = false;
      if (schoolsUnsubscribeRef.current) schoolsUnsubscribeRef.current();
    };
  }, []);

  useEffect(() => {
    filterSchools();
  }, [searchTerm, statusFilter, schools]);

  const getDateValue = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const formatDate = (date) => {
    const d = getDateValue(date);
    return d ? d.toLocaleDateString() : 'N/A';
  };

  const loadSchools = async () => {
    try {
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const schoolsData = [];

      for (const schoolDoc of schoolsSnapshot.docs) {
        const school = {
          id: schoolDoc.id,
          ...schoolDoc.data()
        };

        // Fetch subscriptions for this school
        const subscriptionsQuery = query(
          subscriptionsCollection,
          where('school_id', '==', schoolDoc.id),
          orderBy('created_at', 'desc')
        );
        const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
        const subscriptionsData = subscriptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        school.subscriptions = subscriptionsData;
        schoolsData.push(school);
      }
      
      if (isMounted.current) {
        setSchools(schoolsData);
        setFilteredSchools(schoolsData);
      }
    } catch (error) {
      console.error('Load schools error:', error);
      toast.error('Failed to load schools');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const setupRealtimeSubscription = () => {
    const unsubscribe = onSnapshot(schoolsCollection, () => {
      if (isMounted.current) {
        loadSchools();
      }
    }, (error) => {
      console.error('Schools subscription error:', error);
    });
    
    schoolsUnsubscribeRef.current = unsubscribe;
  };

  const filterSchools = () => {
    let filtered = [...schools];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(school => {
        const subscription = school.subscriptions?.[0];
        
        if (statusFilter === 'active') return school.status === 'active';
        if (statusFilter === 'expiring') {
          const expiry = subscription?.expiry_date;
          if (!expiry) return false;
          const expiryDate = getDateValue(expiry);
          if (!expiryDate) return false;
          const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
          return daysLeft <= 30 && daysLeft > 0;
        }
        if (statusFilter === 'suspended') return school.status === 'suspended';
        if (statusFilter === 'trial') return subscription?.plan === 'trial';
        return true;
      });
    }
    
    if (searchTerm) {
      filtered = filtered.filter(school =>
        school.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredSchools(filtered);
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
    if (!formData.email) {
      toast.error('School email is required');
      return;
    }
    if (!formData.admin_email) {
      toast.error('Admin email is required');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      const now = new Date();

      // Create school document
      const schoolRef = doc(schoolsCollection);
      const schoolData = {
        name: formData.name,
        registration_number: formData.registration_number,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        current_term: 'Term 1',
        current_academic_year: new Date().getFullYear().toString(),
        term_fee: formData.term_fee,
        status: 'active',
        wallet_balance: 0,
        created_by: currentUser?.uid,
        created_at: now,
        updated_at: now
      };

      await setDoc(schoolRef, schoolData);

      // Create subscription
      const expiryDate = new Date();
      if (formData.plan === 'trial') {
        expiryDate.setDate(expiryDate.getDate() + 30);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 3);
      }

      const subscriptionRef = doc(subscriptionsCollection);
      await setDoc(subscriptionRef, {
        school_id: schoolRef.id,
        plan: formData.plan,
        status: 'active',
        expiry_date: expiryDate,
        created_at: now,
        updated_at: now
      });

      toast.success(`School "${formData.name}" created successfully!`);
      setShowAddModal(false);
      resetForm();
      loadSchools();
      
    } catch (error) {
      console.error('Error creating school:', error);
      toast.error(error.message || 'Failed to create school');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      registration_number: '',
      email: '',
      phone: '',
      address: '',
      city: 'Nairobi',
      admin_email: '',
      admin_phone: '',
      plan: 'standard',
      term_fee: 12500
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
    
    if (!extendData.newExpiry) {
      toast.error('Please select new expiry date');
      return;
    }
    
    if (!extendData.reason) {
      toast.error('Please provide a reason');
      return;
    }
    
    try {
      // Find the subscription for this school
      const subscriptionsQuery = query(
        subscriptionsCollection,
        where('school_id', '==', selectedSchool.id),
        orderBy('created_at', 'desc'),
        limit(1)
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      
      if (subscriptionsSnapshot.empty) {
        toast.error('No subscription found for this school');
        return;
      }

      const subDoc = subscriptionsSnapshot.docs[0];
      const subRef = doc(db, 'subscriptions', subDoc.id);
      await updateDoc(subRef, {
        expiry_date: new Date(extendData.newExpiry),
        status: 'active',
        updated_at: new Date()
      });
      
      toast.success(`Subscription extended for "${selectedSchool.name}"`);
      setShowExtendModal(false);
      setExtendData({ newExpiry: '', reason: '' });
      loadSchools();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Failed to extend subscription');
    }
  };

  const exportCSV = () => {
    const headers = ['School Name', 'Registration No', 'Email', 'Phone', 'City', 'Status', 'Plan', 'Expiry Date'];
    const rows = filteredSchools.map(school => {
      const subscription = school.subscriptions?.[0];
      return [
        school.name,
        school.registration_number,
        school.email,
        school.phone || 'N/A',
        school.city || 'N/A',
        school.status,
        subscription?.plan === 'trial' ? 'Free Trial' : subscription?.plan || 'Standard',
        subscription?.expiry_date ? formatDate(subscription.expiry_date) : 'N/A'
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

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return 0;
    const date = getDateValue(expiryDate);
    if (!date) return 0;
    const days = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const columns = [
    { key: 'name', label: 'School', render: (school) => (
      <div>
        <div className="font-semibold text-gray-900">{school.name}</div>
        <div className="text-xs text-gray-500 font-mono">{school.registration_number}</div>
      </div>
    )},
    { key: 'email', label: 'Email', render: (school) => (
      <div className="text-gray-600">{school.email || '—'}</div>
    )},
    { key: 'city', label: 'Location', render: (school) => (
      <div className="text-gray-600">{school.city || '—'}</div>
    )},
    { key: 'status', label: 'Status', render: (school) => {
      const subscription = school.subscriptions?.[0];
      const daysLeft = getDaysLeft(subscription?.expiry_date);
      
      if (school.status === 'suspended') {
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">Suspended</span>;
      }
      if (subscription?.plan === 'trial') {
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">Free Trial</span>;
      }
      if (daysLeft <= 30 && daysLeft > 0) {
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">Expiring Soon</span>;
      }
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">Active</span>;
    }},
    { key: 'subscription', label: 'Plan', render: (school) => {
      const subscription = school.subscriptions?.[0];
      return (
        <div>
          <div className="text-gray-900 font-medium">
            {subscription?.plan === 'trial' ? 'Free Trial' : subscription?.plan === 'premium' ? 'Premium' : 'Standard'}
          </div>
          {subscription?.expiry_date && (
            <div className="text-xs text-gray-500">
              Expires: {formatDate(subscription.expiry_date)}
            </div>
          )}
        </div>
      );
    }},
    { key: 'wallet', label: 'Wallet', render: (school) => (
      <div className="font-mono text-orange-600 font-medium">
        KES {school.wallet_balance?.toLocaleString() || 0}
      </div>
    )},
    { key: 'actions', label: 'Actions', render: (school) => (
      <div className="flex gap-2">
        <button 
          onClick={() => {
            setSelectedSchool(school);
            setShowExtendModal(true);
          }}
          className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
        >
          Manage
        </button>
        {school.status === 'active' ? (
          <button 
            onClick={() => {
              setSelectedSchool(school);
              setShowSuspendModal(true);
            }}
            className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Suspend
          </button>
        ) : school.status === 'suspended' ? (
          <button 
            onClick={() => handleReinstateSchool(school)}
            className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Reinstate
          </button>
        ) : null}
      </div>
    )}
  ];

  const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'expiring', label: 'Expiring Soon' },
    { id: 'suspended', label: 'Suspended' },
    { id: 'trial', label: 'Free Trial' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Schools</h1>
          <p className="text-sm text-gray-500 mt-1">Full platform control — extend, suspend, grant free access</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center gap-2 transition">
            <Download size={14} />
            Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2">
            <Plus size={14} />
            Add School
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statusFilters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              statusFilter === filter.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.label} {filter.id === 'all' && `(${schools.length})`}
          </button>
        ))}
      </div>
      
      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search school name, registration number or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>
      
      {/* Schools Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <DataTable 
          columns={columns} 
          data={filteredSchools} 
          emptyMessage="No schools found" 
        />
      </div>
      
      {/* Modals - JSX remains the same as original */}
      {/* Add School Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register New School">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">School Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Westlands Academy"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Registration Number *</label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="REG/2025/001"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">School Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="info@school.ac.ke"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="+254 712 345 678"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">City</label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option>Nairobi</option>
                <option>Mombasa</option>
                <option>Kisumu</option>
                <option>Nakuru</option>
                <option>Eldoret</option>
                <option>Thika</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Term Fee (KES)</label>
              <input
                type="number"
                value={formData.term_fee}
                onChange={(e) => setFormData({ ...formData, term_fee: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="12500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Admin Email *</label>
            <input
              type="email"
              value={formData.admin_email}
              onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="admin@school.ac.ke"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Initial Plan</label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="standard">Standard - KES 12,500/term</option>
              <option value="premium">Premium - KES 18,500/term</option>
              <option value="trial">Free Trial - 30 days</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition">
            Cancel
          </button>
          <button onClick={handleCreateSchool} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white font-semibold transition">
            Create School
          </button>
        </div>
      </Modal>
      
      {/* Suspend Modal */}
      <Modal isOpen={showSuspendModal} onClose={() => setShowSuspendModal(false)} title="Suspend School Access">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="text-red-700 text-sm font-medium">⚠ This immediately revokes all access for all users at this school.</div>
          <div className="text-xs text-red-600 mt-1">Finance write access also blocked. Only platform admin can reinstate.</div>
        </div>
        <div className="text-gray-900 font-medium mb-4">{selectedSchool?.name}</div>
        <div>
          <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Reason</label>
          <select className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option>Non-payment (45+ days overdue)</option>
            <option>Terms of service violation</option>
            <option>Fraudulent activity</option>
            <option>Manual override</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setShowSuspendModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition">
            Cancel
          </button>
          <button onClick={handleSuspendSchool} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-semibold transition">
            Confirm Suspension
          </button>
        </div>
      </Modal>
      
      {/* Extend Modal */}
      <Modal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} title="Extend Subscription">
        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">School</div>
          <div className="text-gray-900 font-medium">{selectedSchool?.name}</div>
          <div className="text-xs text-gray-400 mt-1">
            Registration: {selectedSchool?.registration_number}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">New Expiry Date</label>
            <input
              type="date"
              value={extendData.newExpiry}
              onChange={(e) => setExtendData({ ...extendData, newExpiry: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 uppercase tracking-wider mb-1">Reason</label>
            <textarea
              rows={3}
              value={extendData.reason}
              onChange={(e) => setExtendData({ ...extendData, reason: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter reason for extension..."
            />
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700">
            ⏱️ This action is permanently logged with your admin ID, timestamp, and IP address.
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button 
            onClick={() => setShowExtendModal(false)} 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleExtendSubscription} 
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white font-semibold transition"
          >
            Apply Extension
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default LiveSchools;
