import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import DataTable from '../../components/Common/DataTable';
import toast from 'react-hot-toast';

const Audit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  // Collection reference
  const auditLogsCollection = collection(db, 'audit_logs');
  const usersCollection = collection(db, 'users');
  const schoolsCollection = collection(db, 'schools');

  useEffect(() => {
    loadAuditLogs();
  }, [roleFilter, moduleFilter]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      // Build query
      let q = query(
        auditLogsCollection,
        orderBy('created_at', 'desc'),
        limit(100)
      );
      
      // Apply module filter if not 'all'
      if (moduleFilter !== 'all') {
        q = query(
          auditLogsCollection,
          where('module', '==', moduleFilter),
          orderBy('created_at', 'desc'),
          limit(100)
        );
      }
      
      const snapshot = await getDocs(q);
      const logsData = [];

      for (const docSnap of snapshot.docs) {
        const log = {
          id: docSnap.id,
          ...docSnap.data()
        };

        // Fetch user data if user_id exists
        if (log.user_id) {
          try {
            const userDoc = await getDoc(doc(db, 'users', log.user_id));
            if (userDoc.exists()) {
              log.users = {
                id: userDoc.id,
                ...userDoc.data()
              };
            }
          } catch (userError) {
            console.warn('Could not fetch user:', log.user_id);
          }
        }

        // Fetch school data if school_id exists
        if (log.school_id) {
          try {
            const schoolDoc = await getDoc(doc(db, 'schools', log.school_id));
            if (schoolDoc.exists()) {
              log.schools = {
                id: schoolDoc.id,
                ...schoolDoc.data()
              };
            }
          } catch (schoolError) {
            console.warn('Could not fetch school:', log.school_id);
          }
        }

        // Apply role filter if not 'all' (after fetching user data)
        if (roleFilter !== 'all') {
          if (log.users?.role === roleFilter) {
            logsData.push(log);
          }
          // If no user data, skip if filter is active
          continue;
        }

        logsData.push(log);
      }

      // Apply role filter if we didn't filter in the query
      let filteredLogs = logsData;
      if (roleFilter !== 'all') {
        filteredLogs = logsData.filter(log => log.users?.role === roleFilter);
      }

      setLogs(filteredLogs);
    } catch (error) {
      console.error('Audit logs error:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    if (logs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = logs.map(log => ({
      timestamp: log.created_at?.toDate?.()?.toISOString() || log.created_at,
      user: log.users?.full_name || log.users?.name,
      role: log.users?.role,
      school: log.schools?.name,
      action: log.action,
      details: log.new_data || log.new_values,
      ip_address: log.ip_address,
      user_id: log.user_id
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete');
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleString();
    if (date instanceof Date) return date.toLocaleString();
    return new Date(date).toLocaleString();
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'platform_admin':
        return 'role-badge-platform';
      case 'school_admin':
        return 'role-badge-school';
      case 'teacher':
        return 'role-badge-teacher';
      case 'parent':
        return 'role-badge-parent';
      case 'student':
        return 'role-badge-student';
      default:
        return 'role-badge-system';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'platform_admin':
        return 'Platform Admin';
      case 'school_admin':
        return 'School Admin';
      case 'teacher':
        return 'Teacher';
      case 'parent':
        return 'Parent';
      case 'student':
        return 'Student';
      default:
        return 'System';
    }
  };

  const columns = [
    { key: 'created_at', label: 'Timestamp', render: (row) => (
      <div className="log-timestamp">
        {formatDate(row.created_at)}
      </div>
    )},
    { key: 'user', label: 'User', render: (row) => (
      <div className="log-user">
        {row.users?.full_name || row.users?.name || 'System'}
      </div>
    )},
    { key: 'role', label: 'Role', render: (row) => (
      <span className={`role-badge ${getRoleBadgeClass(row.users?.role)}`}>
        {getRoleLabel(row.users?.role)}
      </span>
    )},
    { key: 'school', label: 'School', render: (row) => (
      <div className="log-school">
        {row.schools?.name || row.school_name || '-'}
      </div>
    )},
    { key: 'action', label: 'Action', render: (row) => (
      <div className="log-action">{row.action}</div>
    )},
    { key: 'details', label: 'Details', render: (row) => {
      const details = row.new_data || row.new_values || {};
      const detailsStr = JSON.stringify(details);
      return (
        <div className="log-details" title={detailsStr}>
          {detailsStr.slice(0, 50)}
          {detailsStr.length > 50 && '...'}
        </div>
      );
    }}
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="audit-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Audit Logs</h1>
          <p className="page-subtitle">Track all user activities and system changes</p>
        </div>
        <button onClick={exportJSON} className="btn-export" disabled={logs.length === 0}>
          <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Export JSON
        </button>
      </div>
      
      {/* Filters */}
      <div className="filters-container">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Roles</option>
          <option value="platform_admin">Platform Admin</option>
          <option value="school_admin">School Admin</option>
          <option value="teacher">Teacher</option>
          <option value="parent">Parent</option>
          <option value="student">Student</option>
        </select>
        
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Modules</option>
          <option value="auth">Authentication</option>
          <option value="schools">Schools</option>
          <option value="subscriptions">Subscriptions</option>
          <option value="payments">Payments</option>
          <option value="users">Users</option>
          <option value="settings">Settings</option>
        </select>
        
        <button onClick={loadAuditLogs} className="btn-refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Refresh
        </button>
      </div>
      
      {/* Audit Table */}
      <div className="table-card">
        <DataTable 
          columns={columns} 
          data={logs}
          emptyMessage="No audit logs found"
        />
      </div>

      <style jsx>{`
        .audit-page {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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

        .btn-export {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-export:hover:not(:disabled) {
          border-color: #ff6b00;
          color: #ff6b00;
        }

        .btn-export:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon {
          width: 16px;
          height: 16px;
        }

        /* Filters */
        .filters-container {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
        }

        .filter-select {
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #1a202c;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #ff6b00;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 13px;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-refresh:hover {
          border-color: #ff6b00;
          color: #ff6b00;
        }

        /* Table Card */
        .table-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        /* Table Cell Styles */
        .log-timestamp {
          font-size: 13px;
          color: #4a5568;
          white-space: nowrap;
        }

        .log-user {
          font-weight: 500;
          color: #1a202c;
        }

        .log-school {
          font-size: 13px;
          color: #718096;
        }

        .log-action {
          font-size: 13px;
          color: #4a5568;
          font-family: monospace;
        }

        .log-details {
          font-size: 11px;
          color: #a0aec0;
          font-family: monospace;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: help;
        }

        /* Role Badges */
        .role-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .role-badge-platform {
          background: rgba(255, 107, 0, 0.1);
          color: #ff6b00;
        }

        .role-badge-school {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .role-badge-teacher {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .role-badge-parent {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }

        .role-badge-student {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .role-badge-system {
          background: rgba(113, 128, 150, 0.1);
          color: #718096;
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 107, 0, 0.2);
          border-top-color: #ff6b00;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .loading-text {
          margin-top: 16px;
          font-size: 14px;
          color: #718096;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .page-title {
            font-size: 20px;
          }

          .filters-container {
            gap: 8px;
          }

          .filter-select,
          .btn-refresh {
            font-size: 13px;
            padding: 6px 10px;
          }
        }

        @media (max-width: 640px) {
          .log-timestamp {
            font-size: 11px;
          }

          .log-user,
          .log-action {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Audit;
