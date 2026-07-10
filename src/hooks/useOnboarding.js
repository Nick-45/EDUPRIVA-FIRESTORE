import { useState, useCallback } from 'react';
import { onboardingService } from '../services/onboardingService';
import toast from 'react-hot-toast';

export const useOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const updateField = useCallback((section, data) => {
    setOnboardingData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  const submitOnboarding = useCallback(async () => {
    setSubmitting(true);
    toast.loading('Setting up your school...');

    try {
      const result = await onboardingService.createSchool(onboardingData);
      if (result.success) {
        toast.dismiss();
        toast.success('School created successfully!');
        setCurrentStep(6);
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.message || 'Failed to create school');
      return { success: false, error: error.message };
    } finally {
      setSubmitting(false);
    }
  }, [onboardingData]);

  return {
    currentStep,
    loading,
    submitting,
    onboardingData,
    updateField,
    nextStep,
    prevStep,
    submitOnboarding
  };
};
