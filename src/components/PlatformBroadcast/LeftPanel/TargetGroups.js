import React from 'react';
import { Target } from 'lucide-react';

const TargetGroups = ({ selectedGroup, onSelectGroup, groupInfo }) => {
  const groups = [
    { id: 'all', icon: '🌍', label: 'All Schools', badge: 'ALL', badgeColor: 'green' },
    { id: 'active', icon: '✅', label: 'Active Subscriptions', badge: '39', badgeColor: 'green' },
    { id: 'expiring', icon: '⏳', label: 'Expiring Within 30 Days', badge: '5', badgeColor: 'orange' },
    { id: 'expired', icon: '⚠️', label: 'Expired Subscriptions', badge: '3', badgeColor: 'red' },
    { id: 'suspended', icon: '⊘', label: 'Suspended Schools', badge: '2', badgeColor: 'red' },
    { id: 'trial', icon: '🆓', label: 'Free Trial Schools', badge: '2', badgeColor: 'blue' },
    { id: 'new', icon: '🆕', label: 'New Schools (Last 30 Days)', badge: '3', badgeColor: 'teal' },
    { id: 'nairobi', icon: '📍', label: 'Nairobi County Schools', badge: '8', badgeColor: 'purple' },
    { id: 'custom', icon: '🎯', label: 'Individual / Custom', badge: 'Custom', badgeColor: 'purple' }
  ];

  const badgeColors = {
    green: 'bg-green-500/15 text-green-400',
    orange: 'bg-orange-500/15 text-orange-400',
    red: 'bg-red-500/15 text-red-400',
    blue: 'bg-blue-500/15 text-blue-400',
    teal: 'bg-teal-500/15 text-teal-400',
    purple: 'bg-purple-500/15 text-purple-400'
  };

  return (
    <div className="p-4 border-b border-dark-border">
      <div className="flex items-center gap-2 text-white text-sm font-serif mb-3">
        <Target size={14} />
        Target Audience
      </div>
      
      {groups.map((group) => (
        <div
          key={group.id}
          onClick={() => onSelectGroup(group.id)}
          className={`border rounded-xl mb-2 cursor-pointer transition ${
            selectedGroup === group.id
              ? 'border-orange-500 bg-orange-500/5'
              : 'border-dark-border hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3 p-3">
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              selectedGroup === group.id ? 'bg-orange-500 border-orange-500' : 'border-dark-border'
            }`}>
              {selectedGroup === group.id && <span className="text-white text-[10px]">✓</span>}
            </div>
            <div className="text-lg">{group.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{group.label}</div>
              <div className="text-[10px] text-gray-500 font-mono">
                {groupInfo[group.id]?.count || 0} schools
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeColors[group.badgeColor]}`}>
              {group.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TargetGroups;
