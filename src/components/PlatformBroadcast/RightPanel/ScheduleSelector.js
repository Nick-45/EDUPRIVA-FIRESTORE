import React, { useState } from 'react';

const ScheduleSelector = ({ schedule, onChange }) => {
  const [type, setType] = useState(schedule.type);

  const handleTypeChange = (newType) => {
    setType(newType);
    onChange({ ...schedule, type: newType });
  };

  return (
    <div className="p-4 border-b border-dark-border">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-3 font-mono">Schedule</div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-300">Send</span>
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="px-2 py-1 bg-dark-hover border border-dark-border rounded-lg text-white text-sm"
        >
          <option value="now">Send Now</option>
          <option value="later">Schedule for Later</option>
        </select>
      </div>
      {type === 'later' && (
        <div className="space-y-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Date</span>
            <input
              type="date"
              value={schedule.date}
              onChange={(e) => onChange({ ...schedule, date: e.target.value })}
              className="px-2 py-1 bg-dark-hover border border-dark-border rounded-lg text-white text-sm"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Time (EAT)</span>
            <input
              type="time"
              value={schedule.time}
              onChange={(e) => onChange({ ...schedule, time: e.target.value })}
              className="px-2 py-1 bg-dark-hover border border-dark-border rounded-lg text-white text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleSelector;
