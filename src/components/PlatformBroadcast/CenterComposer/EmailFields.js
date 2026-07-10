import React from 'react';

const EmailFields = ({ subject, preview, onUpdateField }) => {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center border-b border-dark-border py-2">
        <span className="text-xs text-gray-500 uppercase font-mono w-16">From</span>
        <span className="text-sm text-green-400 font-mono">info.edupriva@gmail.com</span>
        <span className="text-xs text-gray-500 ml-3">· EduPriva Platform Admin</span>
      </div>
      
      <div className="flex items-center border-b border-dark-border py-2">
        <span className="text-xs text-gray-500 uppercase font-mono w-16">To</span>
        <div className="flex-1">
          <span className="px-2 py-1 bg-dark-hover rounded-md text-sm text-white inline-flex items-center gap-1">
            🌍 Selected Recipients
          </span>
        </div>
      </div>
      
      <div className="flex items-center border-b border-dark-border py-2">
        <span className="text-xs text-gray-500 uppercase font-mono w-16">Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => onUpdateField('subject', e.target.value)}
          placeholder="Enter email subject..."
          className="flex-1 bg-transparent border-none outline-none text-white text-sm"
        />
      </div>
      
      <div className="flex items-center border-b border-dark-border py-2">
        <span className="text-xs text-gray-500 uppercase font-mono w-16">Preview</span>
        <input
          type="text"
          value={preview}
          onChange={(e) => onUpdateField('preview', e.target.value)}
          placeholder="Short preview text (shown in inbox)..."
          className="flex-1 bg-transparent border-none outline-none text-gray-400 text-sm"
        />
      </div>
    </div>
  );
};

export default EmailFields;
