import React from 'react';
import { Mail, Smartphone, Bell } from 'lucide-react';

const ChannelSelector = ({ channels, onToggleChannel }) => {
  const channelsList = [
    { id: 'email', icon: Mail, name: 'Email (SMTP)', desc: 'info.edupriva@gmail.com' },
    { id: 'sms', icon: Smartphone, name: 'SMS (Twilio)', desc: 'Also send as SMS to admin phones' },
    { id: 'inApp', icon: Bell, name: 'In-App Notification', desc: 'Show in EduPriva dashboard' }
  ];

  return (
    <div className="p-4 border-b border-dark-border">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-3 font-mono">Send Via</div>
      {channelsList.map((channel) => (
        <div key={channel.id} className="flex items-center justify-between py-3 border-b border-dark-border/50 last:border-0">
          <div className="flex items-center gap-3">
            <channel.icon size={16} className="text-gray-400" />
            <div>
              <div className="text-sm font-medium text-white">{channel.name}</div>
              <div className="text-[10px] text-gray-500">{channel.desc}</div>
            </div>
          </div>
          <button
            onClick={() => onToggleChannel(channel.id)}
            className={`w-10 h-5 rounded-full transition ${
              channels[channel.id] ? 'bg-green-500' : 'bg-dark-hover'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                channels[channel.id] ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChannelSelector;
