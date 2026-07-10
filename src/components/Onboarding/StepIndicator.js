import React from 'react';
import { Check, Circle, CheckCircle } from 'lucide-react';

const StepIndicator = ({ currentStep, totalSteps }) => {
  const steps = [
    { number: 1, label: 'School Info', icon: '🏫' },
    { number: 2, label: 'Branding', icon: '🎨' },
    { number: 3, label: 'Curriculum', icon: '📚' },
    { number: 4, label: 'Staff Setup', icon: '👥' },
    { number: 5, label: 'Plan & Pay', icon: '💳' }
  ];

  return (
    <div className="w-full mb-8">
      {/* Desktop Steps */}
      <div className="hidden sm:flex items-center justify-between relative">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isUpcoming = step.number > currentStep;

          return (
            <div key={step.number} className="flex-1 relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-0.5 transition-all duration-500 ${
                    isCompleted ? 'bg-orange-500' : 'bg-gray-700'
                  }`}
                  style={{ transform: 'translateY(-50%)' }}
                />
              )}

              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : isActive
                      ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400 shadow-lg shadow-orange-500/10'
                      : 'bg-gray-800 border-2 border-gray-700 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={18} className="text-white" />
                  ) : (
                    <span className="text-sm font-semibold">{step.number}</span>
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-medium transition-colors duration-300 ${
                      isActive
                        ? 'text-orange-400'
                        : isCompleted
                        ? 'text-orange-300'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    {step.icon}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Steps - Compact View */}
      <div className="sm:hidden flex items-center justify-between gap-1">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <div key={step.number} className="flex-1 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-orange-500 text-white'
                    : isActive
                    ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400'
                    : 'bg-gray-800 border-2 border-gray-700 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <Check size={14} className="text-white" />
                ) : (
                  <span className="text-xs font-semibold">{step.number}</span>
                )}
              </div>
              <div
                className={`text-[8px] mt-1 text-center ${
                  isActive ? 'text-orange-400' : isCompleted ? 'text-orange-300' : 'text-gray-500'
                }`}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Text */}
      <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
        <span>Step {currentStep} of {totalSteps}</span>
        <span className="text-orange-400">
          {Math.round((currentStep / totalSteps) * 100)}% complete
        </span>
      </div>
    </div>
  );
};

export default StepIndicator;
