import React, { useState } from 'react';
import { X, Smartphone, Monitor } from 'lucide-react';

const PreviewModal = ({ isOpen, onClose, subject, body, onSend }) => {
  const [device, setDevice] = useState('desktop');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      
      <div className="relative bg-dark-card rounded-xl border border-dark-border w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <span className="font-serif text-white">Email Preview</span>
            <div className="flex gap-1 ml-4">
              <button
                onClick={() => setDevice('desktop')}
                className={`p-1.5 rounded ${device === 'desktop' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500'}`}
              >
                <Monitor size={16} />
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={`p-1.5 rounded ${device === 'mobile' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500'}`}
              >
                <Smartphone size={16} />
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          <div className={`mx-auto ${device === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}>
            {/* Email Preview */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-green-700 to-green-900 p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm mx-auto mb-2">
                  EP
                </div>
                <div className="text-white font-serif text-xl font-semibold">EduPriva</div>
                <div className="text-white/50 text-xs italic mt-1">"Empowering Schools Across Kenya"</div>
              </div>
              <div className="p-5">
                <div className="text-[10px] text-gray-400 font-mono uppercase mb-3">EduPriva Platform Notification</div>
                <div className="text-gray-800 font-serif text-base font-medium mb-4 pb-3 border-b border-gray-200">
                  {subject || 'Email Subject'}
                </div>
                <div 
                  className="text-gray-600 text-sm leading-relaxed preview-body"
                  dangerouslySetInnerHTML={{ __html: body || '<p>No content</p>' }}
                />
              </div>
              <div className="bg-green-700 p-3 text-center">
                <div className="text-white/40 text-[10px] font-mono">
                  System designed and maintained by EduPriva<br />
                  info.edupriva@gmail.com
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-4 border-t border-dark-border">
          <button onClick={onClose} className="px-4 py-2 bg-transparent border border-dark-border rounded-lg text-gray-400 hover:text-white">
            Close
          </button>
          <button onClick={() => { onSend(); onClose(); }} className="px-4 py-2 bg-orange-500 rounded-lg text-white font-semibold hover:bg-orange-600">
            Send Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
