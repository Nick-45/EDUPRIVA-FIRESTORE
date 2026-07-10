import React from 'react';

const tags = [
  { label: '{{school_name}}', desc: 'School Name' },
  { label: '{{admin_name}}', desc: 'Admin Name' },
  { label: '{{expiry_date}}', desc: 'Expiry Date' },
  { label: '{{balance_due}}', desc: 'Balance Due' },
  { label: '{{renewal_url}}', desc: 'Renewal URL' },
  { label: '{{today_date}}', desc: 'Today\'s Date' }
];

const PersonalizationTags = ({ onInsertTag }) => {
  return (
    <div className="p-4 border-b border-dark-border">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2 font-mono">Personalisation Tags</div>
      <div className="text-xs text-gray-500 mb-2">Click to insert into email body</div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag.label}
            onClick={() => onInsertTag(tag.label)}
            className="px-2 py-1 rounded-md bg-dark-hover border border-dark-border text-[10px] text-gray-400 font-mono hover:border-orange-500 hover:text-orange-400 transition"
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PersonalizationTags;
