import React, { useState } from 'react';
import { Minus, Plus, Info, AlertCircle, Users, UserPlus } from 'lucide-react';

const Step4StaffSetup = ({ staff, onChange }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    { 
      id: 'admin', 
      name: '👨‍💼 School Admins', 
      desc: 'Full school management access', 
      min: 1,
      max: 5,
      permissions: ['Manage all modules', 'Access to settings', 'Approve payroll', 'Full financial access']
    },
    { 
      id: 'teacher', 
      name: '📚 Teachers', 
      desc: 'CBC assessment entry + AI remarks', 
      min: 0,
      max: 50,
      permissions: ['Enter assessments', 'Generate AI remarks', 'View student reports', 'Class management']
    },
    { 
      id: 'accountant', 
      name: '💰 Accountants', 
      desc: 'Payments, wallet, fee management', 
      min: 0,
      max: 10,
      permissions: ['Process payments', 'View wallet', 'Manage fees', 'Generate financial reports']
    }
  ];

  const adjustCount = (role, delta) => {
    const roleConfig = roles.find(r => r.id === role);
    const newValue = Math.max(
      roleConfig?.min || 0, 
      Math.min(roleConfig?.max || 99, staff[role] + delta)
    );
    onChange({ [role]: newValue });
  };

  const getTotalStaff = () => {
    return Object.values(staff).reduce((sum, val) => sum + val, 0);
  };

  const getEstimatedCost = () => {
    // Example pricing: KES 500 per staff account
    const total = getTotalStaff();
    return total * 500;
  };

  return (
    <div className="space-y-5">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">
            Set up initial staff accounts. You can add more users anytime from Settings.
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Total Staff</div>
          <div className="text-2xl font-bold text-white">{getTotalStaff()}</div>
        </div>
      </div>

      {/* Staff Roles */}
      <div className="space-y-3">
        {roles.map((role) => (
          <div 
            key={role.id} 
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              selectedRole === role.id 
                ? 'border-orange-500 bg-orange-500/5' 
                : 'border-gray-700 bg-gray-800/30 hover:bg-gray-800/50'
            }`}
            onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{role.name.split(' ')[0]}</span>
                <span className="font-medium text-white">{role.name.split(' ').slice(1).join(' ')}</span>
                {role.min > 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/20">
                    Required
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">{role.desc}</div>
              
              {/* Expanded permissions */}
              {selectedRole === role.id && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-500 mb-2">Permissions:</div>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((perm, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-gray-700/50 rounded-full text-gray-300">
                        {perm}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Min: {role.min} | Max: {role.max}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  adjustCount(role.id, -1);
                }}
                disabled={staff[role.id] <= role.min}
                className={`w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center transition ${
                  staff[role.id] <= role.min 
                    ? 'opacity-30 cursor-not-allowed' 
                    : 'hover:border-orange-500 hover:text-orange-500 text-gray-400'
                }`}
              >
                <Minus size={14} />
              </button>
              
              <span className="font-mono text-white min-w-[32px] text-center text-lg">
                {staff[role.id]}
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  adjustCount(role.id, 1);
                }}
                disabled={staff[role.id] >= role.max}
                className={`w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center transition ${
                  staff[role.id] >= role.max 
                    ? 'opacity-30 cursor-not-allowed' 
                    : 'hover:border-orange-500 hover:text-orange-500 text-gray-400'
                }`}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Parent Accounts Info */}
      <div className="flex items-center justify-between py-3 px-4 bg-gray-800/30 rounded-xl border border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-orange-400" />
            <span className="font-medium text-white">👨‍👩‍👧 Parent Accounts</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">Fee payment + child academic access</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Auto-created</span>
          <UserPlus size={14} className="text-gray-600" />
        </div>
      </div>

      {/* Estimated Cost (Optional) */}
      <div className="flex items-center justify-between py-3 px-4 bg-gray-800/30 rounded-xl border border-gray-700">
        <div>
          <div className="text-xs text-gray-400">Estimated Monthly Cost</div>
          <div className="text-sm text-gray-300">{getTotalStaff()} staff accounts</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">KES {getEstimatedCost().toLocaleString()} / month</div>
          <div className="text-[10px] text-gray-600">*Based on KES 500 per account</div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-orange-500/5 border border-orange-500/15 rounded-lg p-3 text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            Welcome emails with login credentials will be sent to all staff automatically via SMTP.
            <span className="block text-gray-500 mt-1">
              You can also add/remove staff members anytime from the Settings panel after setup.
            </span>
          </div>
        </div>
      </div>

      {/* Quick Add Options */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            // Quick add: 1 admin, 5 teachers, 1 accountant
            onChange({ admin: 1, teacher: 5, accountant: 1 });
          }}
          className="text-xs px-3 py-1.5 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition"
        >
          Quick Setup (1 Admin + 5 Teachers + 1 Accountant)
        </button>
        <button
          onClick={() => {
            // Quick add: 1 admin, 10 teachers, 2 accountants
            onChange({ admin: 1, teacher: 10, accountant: 2 });
          }}
          className="text-xs px-3 py-1.5 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition"
        >
          Medium School (1 Admin + 10 Teachers + 2 Accountants)
        </button>
        <button
          onClick={() => {
            // Quick add: 2 admins, 20 teachers, 3 accountants
            onChange({ admin: 2, teacher: 20, accountant: 3 });
          }}
          className="text-xs px-3 py-1.5 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition"
        >
          Large School (2 Admins + 20 Teachers + 3 Accountants)
        </button>
      </div>
    </div>
  );
};

export default Step4StaffSetup;
