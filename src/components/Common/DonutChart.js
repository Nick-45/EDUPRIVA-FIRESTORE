import React from 'react';

const DonutChart = ({ data, total }) => {
  // Calculate percentages for the donut
  const activePercent = total > 0 ? (data.active / total) * 100 : 0;
  const expiringPercent = total > 0 ? (data.expiring / total) * 100 : 0;
  const suspendedPercent = total > 0 ? (data.suspended / total) * 100 : 0;
  
  // SVG donut calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  
  const activeOffset = circumference - (activePercent / 100) * circumference;
  const expiringOffset = circumference - (expiringPercent / 100) * circumference;
  const suspendedOffset = circumference - (suspendedPercent / 100) * circumference;
  
  return (
    <div className="relative w-24 h-24">
      <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
        {/* Background circle */}
        <circle cx="50" cy="50" r="38" fill="none" stroke="#1a2a1f" strokeWidth="14" />
        {/* Active segment */}
        <circle 
          cx="50" cy="50" r="38" fill="none" stroke="#22c55e" strokeWidth="14"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={activeOffset}
        />
        {/* Expiring segment */}
        <circle 
          cx="50" cy="50" r="38" fill="none" stroke="#f97316" strokeWidth="14"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={expiringOffset + (circumference - (activePercent / 100) * circumference)}
        />
        {/* Suspended segment */}
        <circle 
          cx="50" cy="50" r="38" fill="none" stroke="#ef4444" strokeWidth="14"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={suspendedOffset + (circumference - ((activePercent + expiringPercent) / 100) * circumference)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-white font-bold text-sm">{total}</div>
        <div className="text-gray-500 text-[9px]">schools</div>
      </div>
    </div>
  );
};

export default DonutChart;
