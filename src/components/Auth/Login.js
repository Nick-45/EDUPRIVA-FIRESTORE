import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';

const Login = () => {
const navigate = useNavigate();
const location = useLocation();
const { login, user, role } = useAuth();

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [errorMsg, setErrorMsg] = useState('');
const [schoolCode, setSchoolCode] = useState('');
const [showSchoolCode, setShowSchoolCode] = useState(false);
const [checkingEmail, setCheckingEmail] = useState(false);
const [userRole, setUserRole] = useState(null);
const [userSchoolId, setUserSchoolId] = useState(null);

// Check email in Firestore
const checkEmailInDatabase = async (emailAddress) => {
if (!emailAddress || !emailAddress.includes('@')) {
setShowSchoolCode(false);
setUserRole(null);
return;
}


setCheckingEmail(true);
try {
  const q = query(
    collection(db, 'users'),
    where('email', '==', emailAddress),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const userData = snapshot.docs[0].data();
    
    setUserRole(userData.role);
    setUserSchoolId(userData.school_id || null);
    setShowSchoolCode(
      userData.role !== 'platform_admin' && userData.role !== 'school_admin'
    );
  } else {
    setUserRole(null);
    setUserSchoolId(null);
    setShowSchoolCode(false);
  }
} catch (error) {
  console.error('Error checking email:', error);
  setShowSchoolCode(false);
  setUserRole(null);
  setUserSchoolId(null);
} finally {
  setCheckingEmail(false);
}


};

// Navigate based on role
const navigateBasedOnRole = useCallback((userRole) => {
let path = '/';
switch (userRole) {
case 'platform_admin': path = '/platform-admin'; break;
case 'school_admin': path = '/school-admin'; break;
case 'teacher': path = '/teacher'; break;
case 'parent': path = '/parent'; break;
case 'student': path = '/student'; break;
case 'accountant': path = '/accountant'; break;
default: path = '/login';
}
navigate(path, { replace: true });
}, [navigate]);

useEffect(() => {
if (user && role) {
navigateBasedOnRole(role);
}
}, [user, role, navigateBasedOnRole]);

// LOGIN
const handleLogin = async () => {
setErrorMsg('');


if (!email || !password) {
  setErrorMsg('Email and password required');
  return;
}

if (showSchoolCode && !schoolCode) {
  setErrorMsg('Enter school code');
  return;
}

setLoading(true);

try {
  // Validate school code if needed
  if (showSchoolCode && userSchoolId) {
    const q = query(
      collection(db, 'schools'),
      where('__name__', '==', userSchoolId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) throw new Error('School not found');
    
    const school = snapshot.docs[0].data();
    
    if (school.school_code?.toUpperCase() !== schoolCode.toUpperCase()) {
      throw new Error('Invalid school code');
    }
  }

  await login(email, password);
  toast.success('Login successful!');
  
} catch (error) {
  setErrorMsg(error.message);
  toast.error(error.message);
} finally {
  setLoading(false);
}


};

// FORGOT PASSWORD
const handleForgot = async () => {
if (!email) {
toast.error('Enter email first');
return;
}


try {
  await sendPasswordResetEmail(auth, email);
  toast.success('Reset link sent!');
} catch (error) {
  toast.error(error.message);
}


};

return ( 
   <div className="login-container">
      {/* Background Canvas */}
      <div className="bg-canvas">
        <div className="grid-lines"></div>
        <div className="orb" style={{ width: '300px', height: '300px', background: 'rgba(255,107,0,.15)', left: '5%', top: '20%', '--dx': '40px', '--dy': '-60px', animationDuration: '18s' }} />
        <div className="orb" style={{ width: '200px', height: '200px', background: 'rgba(255,107,0,.08)', left: '15%', top: '60%', '--dx': '-30px', '--dy': '40px', animationDuration: '22s' }} />
        <div className="orb" style={{ width: '250px', height: '250px', background: 'rgba(255,107,0,.12)', left: '30%', top: '10%', '--dx': '60px', '--dy': '30px', animationDuration: '25s' }} />
      </div>
      
      {/* Main Layout */}
      <div className="wrapper">
        {/* Left Panel - Media Carousel */}
        <div className="left">
          <div className="brand-wordmark">
            <div className="brand-name">Edu<span style={{ color: '#ff6b00' }}>Priva</span></div>
            <div className="brand-tagline">The complete school management super-app</div>
          </div>
          
          <div className="media-carousel">
            {mediaItems[currentMediaIndex].type === 'image' ? (
              <img 
                src={mediaItems[currentMediaIndex].url} 
                alt="EduPriva showcase" 
                className={`carousel-media ${animationClass}`}
                onError={(e) => {
                  e.target.src = 'http://youtube.com/post/Ugkxja2SjvzXRro3LmPSS7NP3WlOxFqS6qeE?si=WcgNvr9Urwo3nshr';
                }}
              />
            ) : (
              <iframe
                src={mediaItems[currentMediaIndex].url}
                title="EduPriva video"
                className={`carousel-media ${animationClass}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            
            <div className="carousel-dots">
              {mediaItems.map((_, idx) => (
                <button
                  key={idx}
                  className={`dot ${currentMediaIndex === idx ? 'active' : ''}`}
                  onClick={() => {
                    setAnimationClass('fade-out');
                    setTimeout(() => {
                      setCurrentMediaIndex(idx);
                      setAnimationClass('fade-in');
                    }, 300);
                  }}
                />
              ))}
            </div>
          </div>
          
          <div className="left-footer">
            <div className="cbc-row">
              <span className="cbc-badge cb-ee">EE</span>
              <span className="cbc-badge cb-me">ME</span>
              <span className="cbc-badge cb-ae">AE</span>
              <span className="cbc-badge cb-be">BE</span>
              <span>CBC competency levels supported</span>
            </div>
            <div>
              KES 12,500 / term subscription &nbsp;·&nbsp; 47+ schools &nbsp;·&nbsp; 14,892 students
            </div>
          </div>
        </div>
        
        {/* Right Panel - Auth Card */}
        <div className="right">
          <div className="auth-card">
            {/* Logo centered above Welcome back */}
            <div className="logo-container">
              <img 
                src="/favicon.ico" 
                alt="EduPriva Logo" 
                className="auth-logo"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="logo-fallback" style={{ display: 'none' }}>
                <span style={{ fontWeight: 'bold', color: '#ff6b00' }}>E</span>
              </div>
            </div>
            
            <div className="form-title">Welcome back</div>
            <div className="form-sub">Sign in to your EduPriva account</div>
            
            {/* Error Message */}
            {errorMsg && (
              <div className="error-msg show">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#ff6b00" strokeWidth="1.2"/>
                  <path d="M7 4v3.5M7 9.5v.5" stroke="#ff6b00" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}
            
            <div className="form-panel active">
              <div className="fgrp">
                <label className="flbl">Email address</label>
                <input 
                  className="finp" 
                  type="email" 
                  placeholder="admin@school.ac.ke" 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setShowSchoolCode(false);
                    setUserRole(null);
                  }}
                  onBlur={() => checkEmailInDatabase(email)}
                />
                {checkingEmail && (
                  <div className="checking-indicator">
                    <span className="spinner-small"></span>
                    <span>Checking...</span>
                  </div>
                )}
              </div>
              
              <div className="fgrp pw-wrap">
                <label className="flbl">Password</label>
                <input 
                  className="finp" 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  onFocus={() => {
                    if (email && !userRole) {
                      checkEmailInDatabase(email);
                    }
                  }}
                />
                <button 
                  className="pw-toggle" 
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    {!showPassword ? (
                      <>
                        <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2"/>
                        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                      </>
                    ) : (
                      <>
                        <path d="M2 2l12 12M6.5 6.7A2.5 2.5 0 0010.3 10M4.5 4.7C3 5.6 1.8 7 1 8c1.5 2.5 4 4 7 4 1.2 0 2.3-.3 3.3-.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        <path d="M8.6 3.1C8.4 3 8.2 3 8 3c-3 0-5.5 2-7 5 .5.8 1.1 1.5 1.8 2.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
              
              {/* School Code Field - Conditionally displayed for non-admin roles */}
              {showSchoolCode && (
                <div className="fgrp">
                  <label className="flbl">School Access Code</label>
                  <input 
                    className="finp" 
                    type="text" 
                    placeholder="Enter your school access code" 
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    maxLength="24"
                    style={{ letterSpacing: '2px', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase' }}
                  />
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                    Ask your school administrator for the access code
                  </div>
                </div>
              )}
              
              <div className="forgot-row">
                <button className="forgot-link" onClick={handleForgot}>
                  Forgot password?
                </button>
              </div>
              
              <button className="submit-btn" onClick={handleLogin} disabled={loading}>
                {loading ? <span className="spinner"></span> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              
              <div className="terms">
                By signing in you agree to our{' '}
                <button className="terms-link" onClick={() => window.open('/terms', '_blank')}>
                  Terms of Service
                </button>{' '}
                and{' '}
                <button className="terms-link" onClick={() => window.open('/privacy', '_blank')}>
                  Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .login-container {
          min-height: 100vh;
          background: #ffffff;
          position: relative;
          overflow: hidden;
        }
        
        .wrapper {
          position: relative;
          z-index: 1;
          height: 100vh;
          display: grid;
          grid-template-columns: 1fr 480px;
        }
        
        .left {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 56px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #fff5eb 0%, #ffffff 100%);
        }
        
        .right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background: #ffffff;
          box-shadow: -4px 0 20px rgba(0,0,0,0.05);
        }
        
        .auth-card {
          width: 100%;
          max-width: 400px;
        }
        
        /* Logo styles */
        .logo-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .auth-logo {
          width: 64px;
          height: 64px;
          object-fit: contain;
          border-radius: 16px;
          transition: transform 0.3s ease;
        }
        
        .auth-logo:hover {
          transform: scale(1.05);
        }
        
        .logo-fallback {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ff6b00 0%, #e66000 100%);
          border-radius: 16px;
          font-size: 32px;
          font-weight: bold;
          color: white;
        }
        
        .form-panel {
          display: block;
          animation: fadeUp .25s ease;
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        
        .form-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
          letter-spacing: -.5px;
          text-align: center;
        }
        
        .form-sub {
          font-size: 14px;
          color: #666;
          margin-bottom: 28px;
          text-align: center;
        }
        
        .fgrp {
          margin-bottom: 18px;
          position: relative;
        }
        
        .flbl {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: .6px;
          margin-bottom: 6px;
          display: block;
          font-family: 'DM Mono', monospace;
        }
        
        .finp {
          width: 100%;
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          color: #1a1a1a;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.3s ease;
        }
        
        .finp:focus {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255,107,0,.12);
        }
        
        .pw-wrap {
          position: relative;
        }
        
        .pw-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #999;
          padding: 4px;
        }
        
        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
          margin-bottom: 20px;
        }
        
        .forgot-link {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          color: #ff6b00;
          text-decoration: none;
          font-family: inherit;
          padding: 0;
        }
        
        .forgot-link:hover {
          text-decoration: underline;
        }
        
        .terms-link {
          background: none;
          border: none;
          cursor: pointer;
          color: #ff6b00;
          font-size: 11px;
          font-family: inherit;
          padding: 0;
          text-decoration: underline;
        }
        
        .terms-link:hover {
          color: #e66000;
        }
        
        .submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: none;
          background: #ff6b00;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all .18s;
        }
        
        .submit-btn:hover {
          background: #e66000;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255,107,0,.25);
        }
        
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        .error-msg {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,107,0,.08);
          border: 1px solid rgba(255,107,0,.2);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          color: #ff6b00;
          margin-bottom: 20px;
        }
        
        .error-msg.show {
          display: flex;
        }
        
        .terms {
          font-size: 11px;
          color: #999;
          text-align: center;
          margin-top: 20px;
          line-height: 1.6;
        }
        
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin .6s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        
        .spinner-small {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255,107,0,.3);
          border-top-color: #ff6b00;
          border-radius: 50%;
          animation: spin .6s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .checking-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #ff6b00;
          margin-top: 6px;
        }
        
        .bg-canvas {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }
        
        .bg-canvas::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 80% at 20% 50%, rgba(255,107,0,.05) 0%, transparent 65%),
                      radial-gradient(ellipse 40% 60% at 80% 30%, rgba(255,107,0,.03) 0%, transparent 60%),
                      radial-gradient(ellipse 50% 40% at 60% 90%, rgba(255,107,0,.04) 0%, transparent 55%);
        }
        
        .bg-canvas::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
          background-size: 200px;
          opacity: .6;
          pointer-events: none;
        }
        
        .grid-lines {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,107,0,.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,107,0,.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        
        .orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(60px);
          animation: drift linear infinite;
          opacity: 0;
        }
        
        @keyframes drift {
          0% { transform: translate(0,0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(var(--dx),var(--dy)); opacity: 0; }
        }
        
        /* Media Carousel Styles */
        .media-carousel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          margin: 40px 0;
          position: relative;
          min-height: 400px;
        }
        
        .carousel-media {
          width: 100%;
          max-width: 500px;
          height: auto;
          min-height: 300px;
          max-height: 400px;
          object-fit: cover;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-in forwards;
        }
        
        .fade-out {
          animation: fadeOut 0.3s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        
        .carousel-dots {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }
        
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ddd;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        
        .dot.active {
          width: 24px;
          border-radius: 4px;
          background: #ff6b00;
        }
        
        .dot:hover {
          background: #ff6b00;
        }
        
        .brand-wordmark {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .brand-name {
          font-size: 36px;
          font-weight: 700;
          color: #1a1a1a;
        }
        
        .brand-tagline {
          font-size: 14px;
          color: #666;
          margin-top: 8px;
        }
        
        .cbc-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .cbc-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          border: 1px solid;
        }
        
        .cb-ee { background: rgba(255,107,0,.08); border-color: rgba(255,107,0,.15); color: #ff6b00; }
        .cb-me { background: rgba(100,160,240,.08); border-color: rgba(100,160,240,.15); color: #4a90e2; }
        .cb-ae { background: rgba(255,165,0,.08); border-color: rgba(255,165,0,.15); color: #ffa500; }
        .cb-be { background: rgba(0,200,81,.08); border-color: rgba(0,200,81,.15); color: #00c851; }
        
        .left-footer {
          font-size: 11px;
          color: #999;
          text-align: center;
          line-height: 1.7;
        }
        
        @media (max-width: 900px) {
          .wrapper { grid-template-columns: 1fr; }
          .left { display: none; }
          .right { min-height: 100vh; border: none; box-shadow: none; }
        }
      `}</style>
    </div>
);
};

export default Login;
