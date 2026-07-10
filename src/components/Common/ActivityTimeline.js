import React from 'react';

const ActivityTimeline = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No recent activity
      </div>
    );
  }
  
  // Activity type to dot color mapping
  const getDotColor = (action) => {
    if (action.includes('renewed') || action.includes('payment')) return 'bg-green-500';
    if (action.includes('extended') || action.includes('granted')) return 'bg-orange-500';
    if (action.includes('suspended')) return 'bg-red-500';
    if (action.includes('registered') || action.includes('created')) return 'bg-blue-500';
    return 'bg-gray-500';
  };
  
  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div key={index} className="flex gap-3 relative">
          {index !== activities.length - 1 && (
            <div className="absolute left-[7px] top-5 w-px h-full bg-dark-border" />
          )}
          <div className={`w-3 h-3 rounded-full mt-1.5 z-10 ${getDotColor(activity.action)}`} />
          <div className="flex-1 pb-3">
            <div className="text-sm text-gray-300">
              {activity.message || activity.action}
            </div>
            <div className="text-xs text-gray-500 font-mono mt-1">
              {new Date(activity.created_at || activity.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
