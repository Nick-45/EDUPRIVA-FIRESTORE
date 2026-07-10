import React from 'react';
import { ArrowLeft } from 'lucide-react';

const TopBar = ({ onBack }) => {
  return (
    <div className="bg-dark-card border-b border-dark-border px-5 py-3 flex items-center gap-4 sticky top-0 z-20">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 border border-dark-border px-3 py-1.5 rounded-lg hover:border-gray-600 hover:text-white transition"
      >
        <ArrowLeft size={14} />
        Dashboard
      </button>
      <div>
        <h1 className="text-lg font-serif text-white">Platform Broadcast</h1>
      </div>
      <div className="text-xs text-gray-500 ml-2">Compose & send emails to school administrators</div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">
          PLATFORM ADMIN
        </span>
        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-sm font-bold">
          PA
        </div>
      </div>
    </div>
  );
};

export default TopBar;
