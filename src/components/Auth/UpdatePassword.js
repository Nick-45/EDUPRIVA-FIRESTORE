import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import toast from 'react-hot-toast';

const UpdatePassword = () => {
const navigate = useNavigate();
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [loading, setLoading] = useState(false);
const [validSession, setValidSession] = useState(false);
const [verifying, setVerifying] = useState(true);
const [oobCode, setOobCode] = useState(null);

useEffect(() => {
const verifyResetLink = async () => {
try {
// Firebase sends code in query params
const params = new URLSearchParams(window.location.search);
const code = params.get('oobCode');


    if (!code) {
      throw new Error('Invalid reset link');
    }

    // Verify the reset code
    await verifyPasswordResetCode(auth, code);

    setOobCode(code);
    setValidSession(true);
    toast.success('Enter your new password');
  } catch (error) {
    console.error(error);
    toast.error('Invalid or expired reset link');
    setTimeout(() => navigate('/login'), 2000);
  } finally {
    setVerifying(false);
  }
};

verifyResetLink();


}, [navigate]);

const handleUpdatePassword = async (e) => {
e.preventDefault();


if (newPassword.length < 8) {
  toast.error('Password must be at least 8 characters');
  return;
}

if (newPassword !== confirmPassword) {
  toast.error('Passwords do not match');
  return;
}

setLoading(true);

try {
  // Confirm password reset
  await confirmPasswordReset(auth, oobCode, newPassword);

  toast.success('Password updated successfully!');

  setTimeout(() => {
    navigate('/login');
  }, 2000);
} catch (error) {
  toast.error(error.message || 'Failed to update password');
  setLoading(false);
}

};

if (verifying) {
return ( <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4"> <div className="text-center"> <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div> <p className="text-gray-300">Verifying your reset link...</p> </div> </div>
);
}

if (!validSession) {
return null;
}

return ( 
   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 rounded-full mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Create New Password
            </h1>
            <p className="text-gray-400 mt-2">Choose a strong password for your account</p>
          </div>

          {/* Password Form */}
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {/* New Password Field */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {newPassword.length >= 8 && newPassword.length > 0 && (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    newPassword.length === 0 ? 'bg-gray-600' :
                    newPassword.length < 6 ? 'bg-red-500' :
                    newPassword.length < 8 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}></div>
                  <span className="text-xs text-gray-500">
                    {newPassword.length}/8+ chars
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                  {confirmPassword && newPassword !== confirmPassword && (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  )}
                </div>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600">
              <p className="text-xs text-gray-400 mb-2">Password requirements:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className={`text-xs ${newPassword.length >= 8 ? 'text-green-400' : 'text-gray-400'}`}>
                    Minimum 8 characters
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-orange-500/25"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Updating Password...</span>
                </div>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/login')}
              className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors duration-200"
            >
              ← Back to Login
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-gray-500 text-xs mt-6">
          This link will expire in 1 hour for security purposes
        </p>
      </div>
    </div>


);
};

export default UpdatePassword;
