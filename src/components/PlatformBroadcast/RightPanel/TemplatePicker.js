import React from 'react';
import { templates } from '../../services/broadcastService';

const TemplatePicker = ({ onSelectTemplate, activeTemplate }) => {
  const templateList = [
    { id: 'renewal', icon: '🔄', label: 'Renewal Reminder' },
    { id: 'expired', icon: '⚠️', label: 'Subscription Expired' },
    { id: 'suspended', icon: '⊘', label: 'School Suspended' },
    { id: 'welcome', icon: '🎉', label: 'Welcome Onboard' },
    { id: 'maintenance', icon: '🔧', label: 'System Update' },
    { id: 'feature', icon: '✨', label: 'New Feature' },
    { id: 'payment', icon: '💰', label: 'Payment Notice' },
    { id: 'cbc', icon: '📚', label: 'CBC Update' },
    { id: 'blank', icon: '📝', label: 'Blank' }
  ];

  const handleSelect = (templateId) => {
    onSelectTemplate(templateId);
  };

  return (
    <div className="p-4 border-b border-dark-border">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-3 font-mono">Quick Templates</div>
      <div className="flex flex-wrap gap-2">
        {templateList.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              activeTemplate === template.id
                ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                : 'border-dark-border text-gray-400 hover:border-gray-600 hover:text-white'
            }`}
          >
            {template.icon} {template.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplatePicker;
