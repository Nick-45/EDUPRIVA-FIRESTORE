import React from 'react';
import { Flag } from 'lucide-react';

const PrioritySelector = ({ priority, onChange }) => {
  const priorities = [
    { id: 'normal', label: 'Normal', color: 'gray', icon: '📧' },
    { id: 'high', label: 'High ⚡', color: 'orange', icon: '⚡' },
    { id: 'urgent', label: 'Urgent 🚨', color: 'red', icon: '🚨' }
  ];

  const colorClasses = {
    normal: 'border-gray-600 text-gray-400',
    orange: 'border-orange-500 bg-orange-500/10 text-orange-400',
    red: 'border-red-500 bg-red-500/10 text-red-400'
  };

  return (
    <div className="p-4 border-b border-dark-border">
      <div className="flex items-center gap-2 text-[11px] text-gray-500 uppercase tracking-wider mb-3 font-mono">
        <Flag size={12} />
        Priority
      </div>
      <div className="flex gap-2">
        {priorities.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`flex-1 py-2 rounded-lg text-center text-sm font-medium border transition ${
              priority === p.id ? colorClasses[p.color] : 'border-dark-border text-gray-500 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PrioritySelector;
