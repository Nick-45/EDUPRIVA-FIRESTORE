import React, { useRef, useEffect } from 'react';

const EmailCanvas = ({ emailData, onUpdateBody }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== emailData.body) {
      editorRef.current.innerHTML = emailData.body;
    }
  }, [emailData.body]);

  const handleInput = () => {
    if (editorRef.current) {
      onUpdateBody(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden flex flex-col flex-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-dark-bg p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center text-white font-bold text-base font-serif">
          EP
        </div>
        <div className="flex-1">
          <div className="text-white font-serif text-lg font-semibold">EduPriva</div>
          <div className="text-[10px] text-white/50 font-mono">PLATFORM COMMUNICATION · CONFIDENTIAL</div>
        </div>
        <div className="text-[10px] px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full font-mono">Official Notice</div>
      </div>
      
      {/* Body */}
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="text-white font-serif text-lg mb-4 pb-3 border-b border-dark-border">
          {emailData.subject || 'Your email subject...'}
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="min-h-[250px] text-gray-300 text-sm leading-relaxed outline-none focus:text-white"
          dangerouslySetInnerHTML={{ __html: emailData.body }}
        />
      </div>
      
      {/* Footer */}
      <div className="bg-green-800 p-3 flex justify-between">
        <div className="text-white/50 text-xs italic">"Empowering Schools Across Kenya"</div>
        <div className="text-white/30 text-[9px] font-mono text-right">
          System designed and maintained by EduPriva<br />
          info.edupriva@gmail.com
        </div>
      </div>
    </div>
  );
};

export default EmailCanvas;
