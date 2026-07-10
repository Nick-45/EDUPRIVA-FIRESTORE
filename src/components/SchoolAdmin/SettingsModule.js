import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  addDoc, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Users, Lock, Palette, Building, Bell, Shield, AlertCircle } from 'lucide-react';

const SettingsModule = ({ schoolProfile, setSchoolProfile, openModal, showToast }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('school');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    current_term: '',
    current_academic_year: '',
    term_fee: '',
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState(null);

  const schoolId = user?.user_metadata?.school_id;

  // Collection references
  const usersCollection = collection(db, 'users');
  const userConsentsCollection = collection(db, 'user_consents');
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    if (schoolProfile) {
      setFormData({
        name: schoolProfile.name || '',
        email: schoolProfile.email || '',
        phone: schoolProfile.phone || '',
        address: schoolProfile.address || '',
        city: schoolProfile.city || '',
        current_term: schoolProfile.current_term || 'Term 1',
        current_academic_year: schoolProfile.current_academic_year || '2025',
        term_fee: schoolProfile.term_fee || '',
      });
    }
    fetchUsers();
    fetchSubscription();
  }, [schoolProfile]);

  const fetchUsers = async () => {
    if (!schoolId) return;
    
    try {
      // Query user_consents for this school
      const consentsQuery = query(
        userConsentsCollection,
        where('school_id', '==', schoolId)
      );
      const consentsSnapshot = await getDocs(consentsQuery);
      
      const usersData = [];
      
      for (const consentDoc of consentsSnapshot.docs) {
        const consent = {
          id: consentDoc.id,
          ...consentDoc.data()
        };
        
        // Fetch user details
        if (consent.user_id) {
          try {
            const userDoc = await getDoc(doc(db, 'users', consent.user_id));
            if (userDoc.exists()) {
              usersData.push({
                ...consent,
                user: {
                  id: userDoc.id,
                  ...userDoc.data()
                }
              });
            }
          } catch (userError) {
            console.warn('Could not fetch user:', consent.user_id);
          }
        }
      }
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchSubscription = async () => {
    if (!schoolProfile) return;
    
    setSubscription({
      status: schoolProfile.status || 'active',
      plan: schoolProfile.subscription_plan || 'standard',
      start_date: schoolProfile.subscription_start_date,
      end_date: schoolProfile.subscription_end_date,
    });
  };

  const handleSaveSchool = async () => {
    if (!schoolId) return;
    
    setSaving(true);
    
    try {
      const currentUser = auth.currentUser;
      const schoolRef = doc(db, 'schools', schoolId);
      
      await updateDoc(schoolRef, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        current_term: formData.current_term,
        current_academic_year: formData.current_academic_year,
        term_fee: parseFloat(formData.term_fee) || 0,
        updated_at: new Date()
      });
      
      setSchoolProfile({ ...schoolProfile, ...formData });
      
      await addDoc(auditLogsCollection, {
        school_id: schoolId,
        user_id: currentUser?.uid,
        action: 'Updated school settings',
        entity_type: 'settings',
        new_values: formData,
        created_at: new Date()
      });
      
      showToast('School settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Failed to save settings', 'error');
    }
    
    setSaving(false);
  };

  const tabs = [
    { id: 'school', label: 'School Profile', icon: <Building size={16} /> },
    { id: 'users', label: 'Users & Roles', icon: <Users size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  ];

  return (
    <>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Settings</h2>
          <p style={styles.subtitle}>Manage your school configuration and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* School Profile Tab */}
      {activeTab === 'school' && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>School Configuration</span>
            <button style={styles.btnPrimary} onClick={handleSaveSchool} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          <div style={styles.panelBody}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>School Name</label>
                <input 
                  style={styles.formInput}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter school name"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>School Email</label>
                <input 
                  type="email"
                  style={styles.formInput}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@school.ac.ke"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Phone Number</label>
                <input 
                  style={styles.formInput}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 712 345 678"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>City</label>
                <input 
                  style={styles.formInput}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Nairobi"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Address</label>
                <input 
                  style={styles.formInput}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="School address"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Current Term</label>
                <select 
                  style={styles.formSelect}
                  value={formData.current_term}
                  onChange={(e) => setFormData({ ...formData, current_term: e.target.value })}
                >
                  <option>Term 1</option>
                  <option>Term 2</option>
                  <option>Term 3</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Academic Year</label>
                <input 
                  style={styles.formInput}
                  value={formData.current_academic_year}
                  onChange={(e) => setFormData({ ...formData, current_academic_year: e.target.value })}
                  placeholder="2025"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Term Fee (KES)</label>
                <input 
                  type="number"
                  style={styles.formInput}
                  value={formData.term_fee}
                  onChange={(e) => setFormData({ ...formData, term_fee: e.target.value })}
                  placeholder="12500"
                />
              </div>
            </div>

            {subscription && (
              <div style={styles.subscriptionCard}>
                <div style={styles.subscriptionHeader}>
                  <Lock size={18} />
                  <span style={styles.subscriptionTitle}>Subscription Details</span>
                </div>
                <div style={styles.subscriptionInfo}>
                  <div>Status: <span style={{ color: subscription.status === 'active' ? '#ff6b00' : '#dc3545' }}>{subscription.status || 'Active'}</span></div>
                  <div>Plan: {subscription.plan || 'Standard'} · KES {formData.term_fee || '0'}/term</div>
                </div>
                <button style={styles.btnOutline}>Contact Support for Renewal</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>User Management</span>
          </div>
          <div style={styles.panelBody}>
            <div style={styles.tableWrapper}>
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th>User Email</th>
                    <th>Role</th>
                    <th>Consent Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{user?.email}</strong></td>
                    <td><span style={styles.roleBadgeAdmin}>School Admin</span></td>
                    <td>{new Date().toLocaleDateString()}</td>
                  </tr>
                  {users.map((u, idx) => (
                    <tr key={idx}>
                      <td>{u.user?.email || 'Unknown'}</td>
                      <td><span style={styles.roleBadgeTeacher}>Staff Member</span></td>
                      <td>{u.created_at ? new Date(u.created_at.toDate ? u.created_at.toDate() : u.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div style={styles.emptyState}>
                  <AlertCircle size={20} />
                  <p>No additional users found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Security Settings</span>
          </div>
          <div style={styles.panelBody}>
            <div style={styles.securityItem}>
              <div>
                <h4>Data Privacy</h4>
                <p>Review and manage data consent settings</p>
              </div>
              <button 
                style={styles.btnOutline}
                onClick={() => openModal('consent')}
              >
                Review Consent
              </button>
            </div>
            <div style={styles.securityItem}>
              <div>
                <h4>Audit Logs</h4>
                <p>View all system activities and changes</p>
              </div>
              <button 
                style={styles.btnOutline}
                onClick={() => window.location.href = '/school-admin/audit-logs'}
              >
                View Logs
              </button>
            </div>
            <div style={styles.securityItem}>
              <div>
                <h4>Session Management</h4>
                <p>Manage active sessions and devices</p>
              </div>
              <button style={styles.btnOutline}>View Sessions</button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Notification Preferences</span>
          </div>
          <div style={styles.panelBody}>
            <div style={styles.notifSetting}>
              <div>
                <h4>Payment Alerts</h4>
                <p>Receive notifications when payments are recorded</p>
              </div>
              <label style={styles.switch}>
                <input type="checkbox" defaultChecked />
                <span style={styles.slider}></span>
              </label>
            </div>
            <div style={styles.notifSetting}>
              <div>
                <h4>Student Enrollment</h4>
                <p>Get notified when new students are enrolled</p>
              </div>
              <label style={styles.switch}>
                <input type="checkbox" defaultChecked />
                <span style={styles.slider}></span>
              </label>
            </div>
            <div style={styles.notifSetting}>
              <div>
                <h4>System Updates</h4>
                <p>Important updates about the platform</p>
              </div>
              <label style={styles.switch}>
                <input type="checkbox" defaultChecked />
                <span style={styles.slider}></span>
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  header: { marginBottom: 24 },
  title: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 20, 
    fontWeight: 600, 
    color: '#1a1a1a', 
    marginBottom: 4 
  },
  subtitle: { fontSize: 13, color: '#868e96' },
  tabs: { 
    display: 'flex', 
    gap: 8, 
    background: '#ffffff', 
    borderBottom: '1px solid #e9ecef',
    paddingBottom: 0,
    marginBottom: 24, 
    flexWrap: 'wrap' 
  },
  tab: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '10px 20px', 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#868e96', 
    border: 'none',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s'
  },
  tabActive: { 
    color: '#ff6b00', 
    borderBottomColor: '#ff6b00' 
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
  btnPrimary: { 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '8px 16px', 
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
    padding: '8px 16px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: '#ff6b00', 
    border: '1px solid #ff6b00',
    transition: 'all 0.2s',
    ':hover': { background: '#fff9f0' }
  },
  formGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(2,1fr)', 
    gap: 20, 
    marginBottom: 24,
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
  subscriptionCard: { 
    background: '#fff9f0', 
    borderRadius: 12, 
    padding: 20, 
    marginTop: 8,
    border: '1px solid #ffedd5'
  },
  subscriptionHeader: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 10, 
    marginBottom: 12 
  },
  subscriptionTitle: { 
    fontWeight: 600, 
    color: '#1a1a1a' 
  },
  subscriptionInfo: { 
    display: 'flex', 
    gap: 24, 
    flexWrap: 'wrap', 
    marginBottom: 16, 
    fontSize: 13, 
    color: '#4a5568' 
  },
  tableWrapper: { overflowX: 'auto' },
  dataTable: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '12px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#868e96',
    borderBottom: '1px solid #e9ecef',
  },
  td: {
    padding: '12px 12px',
    fontSize: 13,
    color: '#4a5568',
    borderBottom: '1px solid #f1f3f5',
  },
  roleBadgeAdmin: { 
    padding: '4px 10px', 
    borderRadius: 20, 
    fontSize: 11, 
    fontWeight: 600, 
    background: '#fff9f0', 
    color: '#ff6b00',
    display: 'inline-block'
  },
  roleBadgeTeacher: { 
    padding: '4px 10px', 
    borderRadius: 20, 
    fontSize: 11, 
    fontWeight: 600, 
    background: '#f8f9fa', 
    color: '#868e96',
    display: 'inline-block'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#adb5bd',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  securityItem: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '16px 0', 
    borderBottom: '1px solid #e9ecef', 
    flexWrap: 'wrap', 
    gap: 16 
  },
  notifSetting: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '16px 0', 
    borderBottom: '1px solid #e9ecef', 
    flexWrap: 'wrap', 
    gap: 16 
  },
  switch: { 
    position: 'relative', 
    display: 'inline-block', 
    width: 48, 
    height: 24 
  },
  slider: { 
    position: 'absolute', 
    cursor: 'pointer', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: '#e9ecef', 
    transition: '0.3s', 
    borderRadius: 24,
    '&:before': { 
      position: 'absolute', 
      content: '""', 
      height: 18, 
      width: 18, 
      left: 3, 
      bottom: 3, 
      backgroundColor: 'white', 
      transition: '0.3s', 
      borderRadius: '50%' 
    }
  },
};

export default SettingsModule;
