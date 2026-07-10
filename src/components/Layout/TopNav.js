import React from 'react';
import { Menu, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const TopNav = ({ title, user, onMenuClick, liveBadge = false }) => {
  const { logout } = useAuth();

  return (
    <div className="bg-dark-card border-b border-dark-border sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="md:hidden text-gray-400 hover:text-white transition"
          >
            <Menu size={22} />
          </button>
          <div className="logo flex items-center gap-2">
            <span className="text-orange-500 font-bold text-xl">Edu</span>
            <span className="text-white font-bold text-xl">Priva</span>
            {liveBadge && (
              <span className="ml-2 text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 animate-pulse">
                LIVE
              </span>
            )}
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <button className="text-sm text-gray-400 hover:text-orange-400 transition">Overview</button>
          <button className="text-sm text-gray-400 hover:text-orange-400 transition">Schools</button>
          <button className="text-sm text-gray-400 hover:text-orange-400 transition">Revenue</button>
          <button className="text-sm text-gray-400 hover:text-orange-400 transition">Wallet</button>
          <button className="text-sm text-gray-400 hover:text-orange-400 transition">Subscriptions</button>
          <button className="text-sm text-gray-400 hover:text-orange-400 transition">Audit</button>
          <button className="text-sm text-gray-400 hover:text-orange-400 transition">Alerts</button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400 font-mono">LIVE</span>
          </div>
          <span className="hidden md:inline-block text-xs bg-orange-500/10 text-orange-400 px-3 py-1.5 rounded-full border border-orange-500/20">
            PLATFORM ADMIN
          </span>
          <button className="relative">
            <Bell size={18} className="text-gray-400 hover:text-white transition" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.full_name?.[0] || 'PA'}
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-white transition">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
