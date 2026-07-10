import React, { useRef } from 'react';
import { Paperclip, X, FileText } from 'lucide-react';

const AttachmentManager = ({ attachments, onAddAttachments, onRemoveAttachment }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size < 1024 * 1024 
        ? `${(file.size / 1024).toFixed(0)}KB` 
        : `${(file.size / 1024 / 1024).toFixed(1)}MB`,
      icon: getFileIcon(file.name)
    }));
    onAddAttachments([...attachments, ...newAttachments]);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = { pdf: '📄', docx: '📝', xlsx: '📊', png: '🖼', jpg: '🖼', csv: '📋' };
    return icons[ext] || '📎';
  };

  return (
    <div className="p-4 border-b border-dark-border">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-3 font-mono">Attachments</div>
      
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-dark-border rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 transition bg-dark-hover/30"
      >
        <div className="text-3xl mb-2">📎</div>
        <div className="text-sm text-gray-300 font-medium">Click to attach or drag & drop</div>
        <div className="text-[10px] text-gray-500 mt-1">PDF, DOCX, XLSX, PNG, JPG · Max 10MB</div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-2 p-2 bg-dark-hover rounded-lg border border-dark-border">
              <span className="text-lg">{att.icon}</span>
              <span className="flex-1 text-sm text-white truncate">{att.name}</span>
              <span className="text-[10px] text-gray-500 font-mono">{att.size}</span>
              <button onClick={() => onRemoveAttachment(att.id)} className="text-gray-500 hover:text-red-400">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentManager;
