import React, { useState } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import StepIndicator from '../../components/Onboarding/StepIndicator';
import ProgressBar from '../../components/Onboarding/ProgressBar';
import Step1SchoolInfo from './Step1SchoolInfo';
import Step2Branding from './Step2Branding';
import Step3Curriculum from './Step3Curriculum';
import Step4StaffSetup from './Step4StaffSetup';
import Step5Plan from './Step5Plan';
import SuccessScreen from './SuccessScreen';
import toast from 'react-hot-toast';

const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    schoolInfo: {
      name: '',
      county: 'Nairobi',
      level: 'Primary School (Pre-Primary – Grade 9)',
      email: '',
      phone: '',
      knecCode: '',
      studentCount: 0
    },
    branding: {
      motto: '',
      logoUrl: '',
      logoFile: null
    },
    curriculum: 'cbc',
    staff: {
      admin: 1,
      teacher: 5,
      accountant: 1
    },
    plan: 'standard'
  });
  const [submitting, setSubmitting] = useState(false);

  const stepMeta = {
    1: { icon: '🏫', title: 'School Information', sub: 'Tell us about your school' },
    2: { icon: '🎨', title: 'Branding & Identity', sub: 'Customize your school appearance' },
    3: { icon: '📚', title: 'Curriculum Selection', sub: 'Choose your grading system' },
    4: { icon: '👥', title: 'Staff Setup', sub: 'How many staff accounts do you need?' },
    5: { icon: '💳', title: 'Subscription Plan', sub: 'Choose a plan to get started' }
  };

  const updateSchoolInfo = (data) => {
    setOnboardingData(prev => ({ ...prev, schoolInfo: { ...prev.schoolInfo, ...data } }));
  };

  const updateBranding = (data) => {
    setOnboardingData(prev => ({ ...prev, branding: { ...prev.branding, ...data } }));
  };

  const updateCurriculum = (curriculum) => {
    setOnboardingData(prev => ({ ...prev, curriculum }));
  };

  const updateStaff = (staff) => {
    setOnboardingData(prev => ({ ...prev, staff: { ...prev.staff, ...staff } }));
  };

  const updatePlan = (plan) => {
    setOnboardingData(prev => ({ ...prev, plan }));
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const createSchoolAdmin = async (email, password, schoolName) => {
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile
      await updateProfile(user, {
        displayName: `${schoolName} Admin`
      });

      return user;
    } catch (error) {
      console.error('Error creating school admin:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!onboardingData.schoolInfo.name) {
      toast.error('Please enter school name');
      setCurrentStep(1);
      return;
    }
    if (!onboardingData.schoolInfo.email) {
      toast.error('Please enter school email');
      setCurrentStep(1);
      return;
    }
    if (!onboardingData.schoolInfo.phone) {
      toast.error('Please enter school phone');
      setCurrentStep(1);
      return;
    }
    if (!onboardingData.branding.motto) {
      toast.error('Please enter school motto');
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Setting up your school...');

    try {
      const { schoolInfo, branding, curriculum, staff, plan } = onboardingData;
      const schoolId = `school_${Date.now()}`;

      // Create school document
      const schoolRef = doc(db, 'schools', schoolId);
      await setDoc(schoolRef, {
        name: schoolInfo.name,
        county: schoolInfo.county,
        level: schoolInfo.level,
        email: schoolInfo.email,
        phone: schoolInfo.phone,
        knec_code: schoolInfo.knecCode || '',
        motto: branding.motto,
        logo_url: branding.logoUrl || '',
        curriculum: curriculum,
        staff_counts: staff,
        plan: plan,
        status: 'active',
        wallet_balance: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Create default admin user
      const adminPassword = `EduPriva${Math.random().toString(36).slice(-8)}!`;
      const adminUser = await createSchoolAdmin(
        schoolInfo.email,
        adminPassword,
        schoolInfo.name
      );

      // Create user document
      const userRef = doc(db, 'users', adminUser.uid);
      await setDoc(userRef, {
        uid: adminUser.uid,
        email: schoolInfo.email,
        full_name: `${schoolInfo.name} Admin`,
        role: 'school_admin',
        school_id: schoolId,
        phone: schoolInfo.phone,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Create user consent record
      const consentRef = doc(db, 'user_consents', `${adminUser.uid}_${schoolId}`);
      await setDoc(consentRef, {
        user_id: adminUser.uid,
        school_id: schoolId,
        terms_accepted: true,
        data_processing_accepted: true,
        communications_accepted: false,
        consent_date: new Date(),
        created_at: serverTimestamp()
      });

      // Create default subscription
      const subscriptionRef = doc(db, 'subscriptions', `${schoolId}_subscription`);
      const expiryDate = new Date();
      if (plan === 'trial') {
        expiryDate.setDate(expiryDate.getDate() + 30);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 3);
      }

      await setDoc(subscriptionRef, {
        school_id: schoolId,
        plan: plan,
        status: 'active',
        expiry_date: expiryDate,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      toast.dismiss(loadingToast);
      toast.success('School created successfully!');
      setCurrentStep(6); // Show success screen

    } catch (error) {
      console.error('Error creating school:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to create school. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1SchoolInfo data={onboardingData.schoolInfo} onChange={updateSchoolInfo} />;
      case 2:
        return <Step2Branding data={onboardingData.branding} onChange={updateBranding} />;
      case 3:
        return <Step3Curriculum value={onboardingData.curriculum} onChange={updateCurriculum} />;
      case 4:
        return <Step4StaffSetup staff={onboardingData.staff} onChange={updateStaff} />;
      case 5:
        return <Step5Plan value={onboardingData.plan} onChange={updatePlan} />;
      case 6:
        return <SuccessScreen schoolName={onboardingData.schoolInfo.name} />;
      default:
        return null;
    }
  };

  if (currentStep === 6) {
    return <SuccessScreen schoolName={onboardingData.schoolInfo.name} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-orange-500 text-3xl font-bold mb-2">Edu<span className="text-white">Priva</span></div>
          <h1 className="text-3xl font-serif text-white">Set up your school</h1>
          <p className="text-gray-500 mt-2">Complete these steps to get started — takes about 5 minutes</p>
        </div>

        <ProgressBar currentStep={currentStep} totalSteps={5} />
        <StepIndicator currentStep={currentStep} totalSteps={5} />

        {/* Wizard Card */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-gray-700">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">
              {stepMeta[currentStep].icon}
            </div>
            <div>
              <h2 className="font-bold text-white">{stepMeta[currentStep].title}</h2>
              <p className="text-xs text-gray-500">{stepMeta[currentStep].sub}</p>
            </div>
          </div>

          <div className="p-6">
            {renderStep()}
          </div>

          <div className="flex justify-between items-center p-4 border-t border-gray-700 bg-gray-800/50">
            <div className="text-xs text-gray-500">Step {currentStep} of 5</div>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <button onClick={prevStep} className="px-4 py-2 bg-transparent border border-gray-700 rounded-lg text-gray-400 hover:text-white transition">
                  ← Back
                </button>
              )}
              <button 
                onClick={nextStep} 
                disabled={submitting}
                className="px-5 py-2 bg-orange-500 rounded-lg text-white font-semibold hover:bg-orange-600 transition disabled:opacity-50"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : currentStep === 5 ? '🚀 Launch School' : 'Continue →'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-5 text-xs text-gray-600">
          System designed and maintained by EduPriva (info.edupriva@gmail.com)
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
