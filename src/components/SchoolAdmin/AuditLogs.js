import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Filter, Download, Calendar, User, Activity, AlertCircle } from 'lucide-react';

const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    student: 0,
    payment: 0,
    academic: 0,
    settings: 0,
    report: 0,
  });

  const schoolId = user?.user_metadata?.school_id;
  const auditLogsCollection = collection(db, 'audit_logs');
  const auditUnsubscribeRef = useRef(null);

  useEffect(() => {
    if (schoolId) {
      fetchLogs();
      setupRealtimeSubscription();
    }
    return () => {
      if (auditUnsubscribeRef.current) {
        auditUnsubscribeRef.current();
      }
    };
  }, [schoolId]);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, filterAction, filterDate, logs]);

  const fetchLogs = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      const q = query(
        auditLogsCollection,
        where('school_id', '==', schoolId),
        orderBy('created_at', 'desc'),
        limit(200)
      );
      
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLogs(logsData);
      calculateStats(logsData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    if (!schoolId) return;

    const q = query(
      auditLogsCollection,
      where('school_id', '==', schoolId),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const newLog = {
            id: change.doc.id,
            ...change.doc.data()
          };
          setLogs(prev => [newLog, ...prev].slice(0, 200));
          calculateStats([newLog, ...logs]);
        }
      });
    }, (error) => {
      console.error('Audit subscription error:', error);
    });

    auditUnsubscribeRef.current = unsubscribe;
  };

  const calculateStats = (logsData) => {
    setStats({
      total: logsData.length,
      student: logsData.filter(l => l.entity_type === 'student').length,
      payment: logsData.filter(l => l.entity_type === 'payment').length,
      academic: logsData.filter(l => l.entity_type === 'academic').length,
      settings: logsData.filter(l => l.entity_type === 'settings').length,
      report: logsData.filter(l => l.entity_type === 'report').length,
    });
  };

  const filterLogs = () => {
    let filtered = [...logs];
    
    if (searchTerm) {
      filtered = filtered.filter(l => 
        l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterAction !== 'All') {
      filtered = filtered.filter(l => l.entity_type === filterAction.toLowerCase());
    }
    
    if (filterDate) {
      filtered = filtered.filter(l => {
        const logDate = l.created_at?.toDate ? l.created_at.toDate() : new Date(l.created_at);
        const filterDateObj = new Date(filterDate);
        return logDate.toDateString() === filterDateObj.toDateString();
      });
    }
    
    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const headers = ['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'Changes'];
    const csvData = filteredLogs.map(l => {
      const date = l.created_at?.toDate ? l.created_at.toDate() : new Date(l.created_at);
      return [
        date.toLocaleString(),
        l.user_id || 'System',
        l.action,
        l.entity_type,
        l.entity_id || 'N/A',
        JSON.stringify(l.new_values || l.old_values || ''),
      ];
    });
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${schoolId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionIcon = (action) => {
    if (action?.toLowerCase().includes('add')) return '➕';
    if (action?.toLowerCase().includes('update')) return '✏️';
    if (action?.toLowerCase().includes('delete')) return '🗑️';
    if (action?.toLowerCase().includes('payment')) return '💰';
    if (action?.toLowerCase().includes('withdraw')) return '💸';
    if (action?.toLowerCase().includes('generate')) return '📄';
    return '📌';
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'payment': return '#ff6b00';
      case 'student': return '#17a2b8';
      case 'academic': return '#28a745';
      case 'settings': return '#6c757d';
      case 'report': return '#fd7e14';
      default: return '#868e96';
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading audit logs...</p>
      </div>
    );
  }

  return (
    <>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Audit Logs</h2>
          <p style={styles.subtitle}>Complete activity tracking for compliance and security</p>
        </div>
        <button style={styles.btnOutline} onClick={exportLogs} disabled={filteredLogs.length === 0}>
          <Download size={16} /> Export Logs
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Events</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👨‍🎓</div>
          <div>
            <div style={styles.statValue}>{stats.student}</div>
            <div style={styles.statLabel}>Student Events</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div>
            <div style={styles.statValue}>{stats.payment}</div>
            <div style={styles.statLabel}>Payments</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📚</div>
          <div>
            <div style={styles.statValue}>{stats.academic}</div>
            <div style={styles.statLabel}>Academic</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⚙️</div>
          <div>
            <div style={styles.statValue}>{stats.settings}</div>
            <div style={styles.statLabel}>Settings</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <Search size={16} style={styles.searchIcon} />
          <input 
            type="text"
            style={styles.searchInput}
            placeholder="Search by action or entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          style={styles.filterSelect}
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option>All</option>
          <option>Student</option>
          <option>Payment</option>
          <option>Academic</option>
          <option>Settings</option>
          <option>Report</option>
        </select>
        <input 
          type="date"
          style={styles.dateInput}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        {(searchTerm || filterAction !== 'All' || filterDate) && (
          <button 
            style={styles.clearBtn}
            onClick={() => {
              setSearchTerm('');
              setFilterAction('All');
              setFilterDate('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>
            <Activity size={14} /> Activity Log
          </span>
          <span style={styles.panelBadge}>
            Showing {filteredLogs.length} of {logs.length} records
          </span>
        </div>
        <div style={styles.panelBody}>
          <div style={styles.tableWrapper}>
            {filteredLogs.length === 0 ? (
              <div style={styles.emptyState}>
                <AlertCircle size={40} />
                <p>No audit logs found</p>
                <span style={styles.emptySubtext}>Activities will appear here as users interact with the system</span>
              </div>
            ) : (
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th><Calendar size={12} /> Timestamp</th>
                    <th><User size={12} /> User</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => {
                    const date = log.created_at?.toDate ? log.created_at.toDate() : new Date(log.created_at);
                    return (
                      <tr key={log.id}>
                        <td style={styles.tdDateTime}>
                          {date.toLocaleString()}
                        </td>
                        <td style={styles.td}>
                          {log.user_id ? `${log.user_id.slice(0, 8)}...` : 'System'}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.actionCell}>
                            <span style={styles.actionIcon}>{getActionIcon(log.action)}</span>
                            <strong>{log.action}</strong>
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ 
                            ...styles.typeBadge, 
                            background: `${getTypeColor(log.entity_type)}15`,
                            color: getTypeColor(log.entity_type)
                          }}>
                            {log.entity_type || 'general'}
                          </span>
                        </td>
                        <td style={styles.tdDetails}>
                          {log.new_values ? 'Updated record' : log.entity_id ? `ID: ${log.entity_id.slice(0, 8)}...` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
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
  btnOutline: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '8px 16px', 
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
  statsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(5,1fr)', 
    gap: 16, 
    marginBottom: 24,
    '@media (max-width: 900px)': { gridTemplateColumns: 'repeat(3,1fr)' },
    '@media (max-width: 600px)': { gridTemplateColumns: 'repeat(2,1fr)' }
  },
  statCard: { 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    borderRadius: 16, 
    padding: 16, 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  statIcon: { fontSize: 32 },
  statValue: { 
    fontFamily: "'Inter', sans-serif", 
    fontSize: 24, 
    fontWeight: 700, 
    color: '#1a1a1a' 
  },
  statLabel: { fontSize: 11, color: '#868e96', marginTop: 2 },
  filtersBar: { 
    display: 'flex', 
    gap: 12, 
    marginBottom: 20, 
    flexWrap: 'wrap', 
    alignItems: 'center' 
  },
  searchBox: { position: 'relative', flex: 1, minWidth: 200 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' },
  searchInput: { 
    width: '100%', 
    padding: '10px 12px 10px 36px', 
    borderRadius: 8, 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    color: '#1a1a1a', 
    fontSize: 13, 
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': { borderColor: '#ff6b00' }
  },
  filterSelect: { 
    padding: '10px 12px', 
    borderRadius: 8, 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    color: '#1a1a1a', 
    fontSize: 13, 
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': { borderColor: '#ff6b00' }
  },
  dateInput: { 
    padding: '10px 12px', 
    borderRadius: 8, 
    background: '#ffffff', 
    border: '1px solid #e9ecef', 
    color: '#1a1a1a', 
    fontSize: 13, 
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': { borderColor: '#ff6b00' }
  },
  clearBtn: { 
    padding: '10px 16px', 
    borderRadius: 8, 
    fontSize: 13, 
    fontWeight: 500,
    cursor: 'pointer', 
    background: '#f8f9fa', 
    color: '#dc3545', 
    border: '1px solid #e9ecef',
    transition: 'all 0.2s',
    ':hover': { background: '#fff5f5', borderColor: '#dc3545' }
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
    color: '#1a1a1a', 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8 
  },
  panelBadge: { fontSize: 12, color: '#868e96' },
  panelBody: { padding: '0' },
  tableWrapper: { overflowX: 'auto' },
  dataTable: { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: '#868e96',
    borderBottom: '1px solid #e9ecef',
  },
  td: {
    padding: '14px 16px',
    fontSize: 13,
    color: '#4a5568',
    borderBottom: '1px solid #f1f3f5',
  },
  tdDateTime: {
    padding: '14px 16px',
    fontSize: 12,
    color: '#868e96',
    borderBottom: '1px solid #f1f3f5',
    whiteSpace: 'nowrap',
  },
  tdDetails: {
    padding: '14px 16px',
    fontSize: 12,
    color: '#adb5bd',
    borderBottom: '1px solid #f1f3f5',
  },
  actionCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    fontSize: 14,
  },
  typeBadge: { 
    padding: '4px 10px', 
    borderRadius: 20, 
    fontSize: 11, 
    fontWeight: 600, 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: 4 
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#adb5bd',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#ced4da',
    marginTop: 8,
    display: 'block',
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

export default AuditLogs;
