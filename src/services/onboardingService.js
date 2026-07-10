export const onboardingService = {
  createSchool: async (data) => {
    try {
      const response = await fetch('/.netlify/functions/create-school-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolInfo: data.schoolInfo,
          branding: data.branding,
          curriculum: data.curriculum,
          staff: data.staff,
          plan: data.plan
        })
      });
      
      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
