import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CheckCircle, ArrowRight, Download, Mail, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const SuccessScreen = ({ schoolName, schoolId, adminEmail, adminPassword }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [schoolData, setSchoolData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
        if (schoolDoc.exists()) {
          setSchoolData(schoolDoc.data());
        }
      } catch (error) {
        console.error('Error fetching school data:', error);
      }
      setLoading(false);
    };

    fetchSchoolData();
  }, [schoolId]);

  const checklist = [
    { id: 'profile', label: 'School profile created', icon: '🏫' },
    { id: 'curriculum', label: 'Curriculum configured', icon: '📚' },
    { id: 'staff', label: 'Staff accounts created', icon: '👥' },
    { id: 'wallet', label: 'School wallet initialized', icon: '💰' },
    { id: 'payments', label: 'Payment system connected', icon: '💳' },
    { id: 'emails', label: 'Welcome emails sent to all staff', icon: '📧' }
  ];

  const handleCopyCredentials = () => {
    const credentials = `
      School Name: ${schoolName}
      School ID: ${schoolId || 'N/A'}
      Admin Email: ${adminEmail || 'N/A'}
      Admin Password: ${adminPassword || 'N/A'}
      Login URL: ${window.location.origin}/login
    `;
    
    navigator.clipboard.writeText(credentials).then(() => {
      setCopied(true);
      toast.success('Credentials copied to clipboard');
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      toast.error('Failed to copy credentials');
    });
  };

  const handleDownloadCredentials = () => {
    const content = `
      ============================================
      EDUPRIVA SCHOOL ACCOUNT
      ============================================
      
      School Name: ${schoolName}
      School ID: ${schoolId || 'N/A'}
      Admin Email: ${adminEmail || 'N/A'}
      Admin Password: ${adminPassword || 'N/A'}
      
      Login URL: ${window.location.origin}/login
      
      ============================================
      IMPORTANT SECURITY NOTICE
      ============================================
      
      Please change your password immediately after first login.
      Keep this information secure and do not share it with unauthorized individuals.
      
      ============================================
      SUPPORT CONTACT
      ============================================
      
      Email: support@edupriva.com
      Phone: +254 700 000 000
      
      ============================================
      Generated on: ${new Date().toLocaleString()}
      ============================================
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EduPriva_Credentials_${schoolName.replace(/\s/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Credentials downloaded');
  };

  const getSubscriptionExpiry = () => {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 3); // 3 months from now
    return expiry.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">Loading your school data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        {/* Success Icon */}
        <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/25 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle size={48} className="text-green-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">🎉 Welcome to EduPriva!</h1>
        <p className="text-gray-400 mb-6">
          Your school <b className="text-white">{schoolName}</b> has been set up successfully. 
          Welcome emails have been sent to all staff members.
        </p>

        {/* Setup Checklist */}
        <div className="bg-gray-800 rounded-xl p-5 mb-6 text-left border border-gray-700">
          <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider mb-3">
            ✅ Setup Complete
          </h3>
          <div className="space-y-2.5">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="text-green-400">✓</span>
                <span className="flex-1">{item.label}</span>
                <span className="text-base">{item.icon}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials Card */}
        {adminEmail && (
          <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase text-orange-400 font-semibold tracking-wider">
                🔑 Admin Credentials
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCredentials}
                  className="p-1.5 rounded-lg hover:bg-gray-700 transition text-gray-400 hover:text-white"
                  title="Copy credentials"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={handleDownloadCredentials}
                  className="p-1.5 rounded-lg hover:bg-gray-700 transition text-gray-400 hover:text-white"
                  title="Download credentials"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="text-xs font-mono text-gray-400 space-y-1">
              <div>Email: <span className="text-white">{adminEmail}</span></div>
              <div>Password: <span className="text-orange-400">{adminPassword || '••••••••'}</span></div>
            </div>
            <div className="mt-2 text-[10px] text-orange-400/60">
              ⚠️ Please change your password after first login
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => navigate('/school-admin')}
            className="py-3 bg-orange-500 rounded-xl text-white font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-2"
          >
            Go to Dashboard →
          </button>
          <button
            onClick={() => navigate('/school-admin/settings')}
            className="py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 font-semibold hover:bg-gray-700 transition"
          >
            ⚙️ Settings
          </button>
        </div>

        {/* School Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>School ID: {schoolId || 'N/A'}</div>
          <div>Subscription: Active until {getSubscriptionExpiry()}</div>
          <div className="pt-2 border-t border-gray-800">
            <span className="text-gray-600">Need help?</span>{' '}
            <a href="mailto:support@edupriva.com" className="text-orange-400 hover:underline">
              support@edupriva.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessScreen;
