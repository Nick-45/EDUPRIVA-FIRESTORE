import React from 'react';
import ComposerToolbar from './ComposerToolbar';
import EmailFields from './EmailFields';
import EmailCanvas from './EmailCanvas';

const CenterComposer = ({ 
  emailData, 
  onUpdateField, 
  onUpdateBody, 
  onInsertTag, 
  onClearBody,
  onPreview 
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ComposerToolbar 
        onInsertTag={onInsertTag} 
        onClearBody={onClearBody}
        onPreview={onPreview}
      />
      
      <div className="flex-1 overflow-y-auto p-5">
        <EmailFields 
          subject={emailData.subject}
          preview={emailData.preview}
          onUpdateField={onUpdateField}
        />
        
        <EmailCanvas 
          emailData={emailData}
          onUpdateBody={onUpdateBody}
        />
      </div>
    </div>
  );
};

export default CenterComposer;
