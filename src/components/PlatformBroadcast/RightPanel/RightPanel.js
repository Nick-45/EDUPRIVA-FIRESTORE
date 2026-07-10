import React from 'react';
import ChannelSelector from './ChannelSelector';
import TemplatePicker from './TemplatePicker';
import AttachmentManager from './AttachmentManager';
import PersonalizationTags from './PersonalizationTags';
import ScheduleSelector from './ScheduleSelector';
import PrioritySelector from './PrioritySelector';
import SendActions from './SendActions';

const RightPanel = ({
  channels,
  onToggleChannel,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onInsertTag,
  schedule,
  onScheduleChange,
  priority,
  onPriorityChange,
  recipientCount,
  onSend,
  onSaveDraft,
  onSendTest
}) => {
  return (
    <div className="w-80 bg-dark-card border-l border-dark-border overflow-y-auto flex flex-col">
      <ChannelSelector channels={channels} onToggleChannel={onToggleChannel} />
      <TemplatePicker onSelectTemplate={(templateId) => {
        // Load template from service
        console.log('Load template:', templateId);
      }} />
      <AttachmentManager 
        attachments={attachments}
        onAddAttachments={onAddAttachments}
        onRemoveAttachment={onRemoveAttachment}
      />
      <PersonalizationTags onInsertTag={onInsertTag} />
      <ScheduleSelector schedule={schedule} onChange={onScheduleChange} />
      <PrioritySelector priority={priority} onChange={onPriorityChange} />
      <SendActions 
        recipientCount={recipientCount}
        attachments={attachments}
        channels={channels}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        onSendTest={onSendTest}
      />
    </div>
  );
};

export default RightPanel;
