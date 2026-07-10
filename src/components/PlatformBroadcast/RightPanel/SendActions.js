import React from 'react';
import { Send, Save, Mail } from 'lucide-react';

const SendActions = ({ recipientCount, attachments, channels, onSend, onSaveDraft, onSendTest }) => {
  const channelSummary = [];
  if (channels.email) channelSummary.push('Email');
  if (channels.sms) channelSummary.push('SMS');
  if (channels.inApp) channelSummary.push('In-App');

  return (
    <div className="p-4 mt-auto border-t border-dark-border">
      <div className="bg-dark-hover rounded-lg p-3 mb-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-500">Recipients</span>
          <span className="text-orange-400 font-mono">{recipientCount} schools</span>
        </div>
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-500">Channel</span>
          <span className="text-gray-300">{channelSummary.join(' + ') || 'None'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Attachments</span>
          <span className="text-gray-300">{attachments.length ? `${attachments.length} file(s)` : 'None'}</span>
        </div>
      </div>
      
      <button
        onClick={onSend}
        className="w-full py-3 bg-orange-500 rounded-lg text-white font-semibold flex items-center justify-center gap-2 hover:bg-orange-600 transition"
      >
        <Send size={16} />
        Send Broadcast
      </button>
      
      <div className="flex gap-2 mt-2">
        <button
          onClick={onSaveDraft}
          className="flex-1 py-2 bg-transparent border border-dark-border rounded-lg text-gray-400 text-sm flex items-center justify-center gap-2 hover:text-white hover:border-gray-600 transition"
        >
          <Save size={14} />
          Save Draft
        </button>
        <button
          onClick={onSendTest}
          className="flex-1 py-2 bg-transparent border border-dark-border rounded-lg text-gray-400 text-sm flex items-center justify-center gap-2 hover:text-white hover:border-gray-600 transition"
        >
          <Mail size={14} />
          Test to Me
        </button>
      </div>
    </div>
  );
};

export default SendActions;
