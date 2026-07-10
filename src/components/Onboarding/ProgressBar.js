import React from 'react';

const ProgressBar = ({ currentStep, totalSteps }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="h-1 bg-dark-hover rounded-full mb-6 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-green-500 to-orange-500 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ProgressBar;
