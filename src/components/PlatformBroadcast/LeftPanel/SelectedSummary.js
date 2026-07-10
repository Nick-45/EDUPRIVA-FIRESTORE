import React from 'react';
import { Users } from 'lucide-react';

const SelectedSummary = ({ count, label, icon }) => {
  return (
    <div className="px-4 py-3 bg-orange-500/5 border-b border-dark-border flex items-center gap-2">
      <Users size={14} className="text-orange-400" />
      <span className="text-orange-400 font-serif text-lg font-semibold">{count}</span>
      <span className="text-gray-500 text-xs">schools selected ·</span>
      <span className="text-gray-400 text-xs">{icon} {label}</span>
    </div>
  );
};

export default SelectedSummary;
