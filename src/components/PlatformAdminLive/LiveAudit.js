import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  addDoc, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import DataTable from '../../components/Common/DataTable';
import { Download, Filter, RefreshCw, Calendar, User, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveAudit = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    payment: 0,
    student: 0,
    academic: 0,
    settings: 0,
    report: 0
  });

  const auditUnsubscribeRef = useRef(null);
  const isMounted = useRef(true);

  // Collection reference
  const auditLogsCollection = collection(db, 'audit_logs');

  useEffect(() => {
    isMounted.current = true;
    loadAuditLogs();
    setupRealtimeSubscription();

    return () => {
      isMounted.current = false;
      if (auditUnsubscribeRef.current) {
        auditUnsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    filterLogs();
  }, [roleFilter, entityFilter, dateFilter, searchTerm, logs]);

  const getDateValue = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const formatDate = (date) => {
    const d = getDateValue(date);
    return d ? d.toLocaleString() : 'N/A';
  };

  const formatDateShort = (date) => {
    const d = getDateValue(date);
    return d ? d.toLocaleDateString() : 'N/A';
  };

  const loadAuditLogs = async () => {
    try {
      const q = query(
        auditLogsCollection,
        orderBy('created_at', 'desc'),
        limit(200)
      );
      
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        entity_type: doc.data().entity_type || 'general'
      }));
      
      if (isMounted.current) {
        setLogs(logsData);
        calculateStats(logsData);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const calculateStats = (logsData) => {
    setStats({
      total: logsData.length,
      payment: logsData.filter(l => l.entity_type === 'payment').length,
      student: logsData.filter(l => l.entity_type === 'student').length,
      academic: logsData.filter(l => l.entity_type === 'academic').length,
      settings: logsData.filter(l => l.entity_type === 'settings').length,
      report: logsData.filter(l => l.entity_type === 'report').length
    });
  };

  const filterLogs = () => {
    let filtered = [...logs];
    
    if (roleFilter !== 'all') {
      // Filter by user role (would require joining users table)
      // For now, keep as is
    }
    
    if (entityFilter !== 'all') {
      filtered = filtered.filter(log => log.entity_type === entityFilter);
    }
    
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(log => {
        const logDate = getDateValue(log.created_at);
        return logDate && logDate.toDateString() === filterDate.toDateString();
      });
    }
    
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLogs(filtered);
  };

  const setupRealtimeSubscription = () => {
    const q = query(
      auditLogsCollection,
      orderBy('created_at', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isMounted.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const newLog = {
              id: change.doc.id,
              ...change.doc.data(),
              entity_type: change.doc.data().entity_type || 'general'
            };
            setLogs(prev => [newLog, ...prev].slice(0, 200));
            toast.info(`New audit entry: ${newLog.action}`, { icon: '📋', duration: 3000 });
            calculateStats([newLog, ...logs]);
          }
        });
      }
    }, (error) => {
      console.error('Audit subscription error:', error);
    });
    
    auditUnsubscribeRef.current = unsubscribe;
  };

  const exportJSON = () => {
    if (filteredLogs.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const exportData = filteredLogs.map(log => ({
      timestamp: log.created_at,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      old_values: log.old_values,
      new_values: log.new_values,
      user_id: log.user_id,
      school_id: log.school_id
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

  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User ID', 'School ID'];
    const rows = filteredLogs.map(log => [
      formatDate(log.created_at),
      log.action,
      log.entity_type,
      log.entity_id || 'N/A',
      log.user_id || 'System',
      log.school_id || 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete');
  };

  const refreshLogs = () => {
    loadAuditLogs();
    toast.success('Audit logs refreshed', { icon: '🔄' });
  };

  const clearFilters = () => {
    setRoleFilter('all');
    setEntityFilter('all');
    setDateFilter('');
    setSearchTerm('');
  };

  const getEntityIcon = (entityType) => {
    switch(entityType) {
      case 'payment': return '💰';
      case 'student': return '👨‍🎓';
      case 'academic': return '📚';
      case 'settings': return '⚙️';
      case 'report': return '📄';
      default: return '📌';
    }
  };

  const columns = [
    { key: 'created_at', label: 'Timestamp', render: (row) => (
      <div className="text-gray-600 text-sm whitespace-nowrap">
        {formatDate(row.created_at)}
      </div>
    )},
    { key: 'action', label: 'Action', render: (row) => (
      <div className="font-medium text-gray-800">{row.action}</div>
    )},
    { key: 'entity_type', label: 'Entity', render: (row) => (
      <div className="flex items-center gap-1">
        <span className="text-sm">{getEntityIcon(row.entity_type)}</span>
        <span className="capitalize text-gray-600">{row.entity_type}</span>
      </div>
    )},
    { key: 'entity_id', label: 'Entity ID', render: (row) => (
      <div className="text-xs font-mono text-gray-500">
        {row.entity_id ? `${row.entity_id.slice(0, 8)}...` : '—'}
      </div>
    )},
    { key: 'user_id', label: 'User', render: (row) => (
      <div className="text-xs font-mono text-gray-500">
        {row.user_id ? `${row.user_id.slice(0, 8)}...` : 'System'}
      </div>
    )},
    { key: 'changes', label: 'Changes', render: (row) => (
      <div className="text-xs text-gray-500 max-w-xs truncate">
        {row.new_values ? 'Updated record' : row.old_values ? 'Deleted record' : '—'}
      </div>
    )}
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
          <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Complete activity tracking for compliance and security</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshLogs} 
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button 
            onClick={exportCSV} 
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition flex items-center gap-2"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button 
            onClick={exportJSON} 
            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm text-white transition flex items-center gap-2"
          >
            <Download size={14} />
            Export JSON
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Total Events</div>
          <div className="text-xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider">💰 Payments</div>
          <div className="text-xl font-bold text-gray-900">{stats.payment}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider">👨‍🎓 Students</div>
          <div className="text-xl font-bold text-gray-900">{stats.student}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider">📚 Academic</div>
          <div className="text-xl font-bold text-gray-900">{stats.academic}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider">⚙️ Settings</div>
          <div className="text-xl font-bold text-gray-900">{stats.settings}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider">📄 Reports</div>
          <div className="text-xl font-bold text-gray-900">{stats.report}</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by action or entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Entities</option>
          <option value="payment">Payments</option>
          <option value="student">Students</option>
          <option value="academic">Academic</option>
          <option value="settings">Settings</option>
          <option value="report">Reports</option>
        </select>
        
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        
        {(searchTerm || entityFilter !== 'all' || dateFilter) && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition"
          >
            Clear Filters
          </button>
        )}
      </div>
      
      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Activity Log</h3>
            <span className="text-xs text-gray-500">
              Showing {filteredLogs.length} of {logs.length} records
            </span>
          </div>
        </div>
        <DataTable 
          columns={columns} 
          data={filteredLogs} 
          emptyMessage="No audit logs found" 
        />
      </div>
    </div>
  );
};

export default LiveAudit;
