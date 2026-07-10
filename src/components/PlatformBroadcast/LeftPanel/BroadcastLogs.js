import React from 'react';
import { History, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const BroadcastLogs = ({ logs, onLoadBroadcast }) => {
  const getStatusIcon = (status) => {
    if (status === 'sent') return <CheckCircle size={12} className="text-green-400" />;
    if (status === 'scheduled') return <Clock size={12} className="text-blue-400" />;
    return <AlertCircle size={12} className="text-red-400" />;
  };

  const getStatusBadge = (status) => {
    if (status === 'sent') return 'bg-green-500/15 text-green-400';
    if (status === 'scheduled') return 'bg-blue-500/15 text-blue-400';
    return 'bg-red-500/15 text-red-400';
  };

  // Sample logs - in production, these come from the database
  const sampleLogs = [
    { id: 1, subject: 'Subscription Renewal Reminder', date: 'Apr 15', recipients: 47, status: 'sent' },
    { id: 2, subject: 'System Maintenance Notice', date: 'Apr 10', recipients: 47, status: 'sent' },
    { id: 3, subject: 'Fee Payment Deadline — Nairobi', date: 'Apr 5', recipients: 8, status: 'sent' },
    { id: 4, subject: 'New CBC Feature Update', date: 'May 5', recipients: 47, status: 'scheduled' },
    { id: 5, subject: 'Suspended School Warning', date: 'Mar 28', recipients: 2, status: 'sent' }
  ];

  const displayLogs = logs.length > 0 ? logs : sampleLogs;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 border-b border-dark-border">
        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-mono">
          <History size={12} />
          Recent Broadcasts
        </div>
      </div>
      
      {displayLogs.map((log) => (
        <div
          key={log.id}
          onClick={() => onLoadBroadcast(log)}
          className="px-4 py-3 border-b border-dark-border/50 cursor-pointer hover:bg-dark-hover/30 transition"
        >
          <div className="text-sm font-medium text-white mb-1 truncate">{log.subject}</div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span>{log.date} · {log.recipients} schools</span>
            <span className={`px-1.5 py-0.5 rounded-full flex items-center gap-1 ${getStatusBadge(log.status)}`}>
              {getStatusIcon(log.status)}
              {log.status === 'sent' ? 'Sent ✓' : log.status === 'scheduled' ? 'Scheduled' : 'Failed'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BroadcastLogs;
