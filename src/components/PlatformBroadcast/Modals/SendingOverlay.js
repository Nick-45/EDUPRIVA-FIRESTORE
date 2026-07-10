import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, Clock } from 'lucide-react';

const SendingOverlay = ({ isOpen, recipientCount, attachmentCount }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([
    { id: 0, label: 'Connecting to mail server...', status: 'active' },
    { id: 1, label: `Personalising ${recipientCount} emails...`, status: 'pending' },
    { id: 2, label: `Attaching ${attachmentCount || 0} document(s)...`, status: 'pending' },
    { id: 3, label: 'Sending via SMTP...', status: 'pending' },
    { id: 4, label: 'Logging to audit trail...', status: 'pending' }
  ]);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStep(0);
      setSteps(steps.map(s => ({ ...s, status: s.id === 0 ? 'active' : 'pending' })));
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        
        // Update step statuses
        setSteps(prevSteps => 
          prevSteps.map((step, idx) => ({
            ...step,
            status: idx === prev + 1 ? 'active' : idx <= prev ? 'completed' : 'pending'
          }))
        );
        
        setProgress(((prev + 1) / steps.length) * 100);
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isOpen, steps.length, recipientCount, attachmentCount]);

  if (!isOpen) return null;

  const getStepIcon = (status) => {
    if (status === 'completed') return <CheckCircle size={16} className="text-green-400" />;
    if (status === 'active') return <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />;
    return <div className="w-4 h-4 rounded-full bg-dark-hover" />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90">
      <div className="text-center max-w-md w-full px-6">
        <div className="text-6xl mb-5 animate-bounce">📨</div>
        <div className="text-2xl font-serif text-white mb-2">Sending Broadcast</div>
        <div className="text-sm text-gray-400 mb-6" id="sendingSubText">
          Sending to {recipientCount} school{recipientCount !== 1 ? 's' : ''}...
        </div>
        
        <div className="mb-4">
          <div className="h-1.5 bg-dark-hover rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-[10px] text-gray-500 font-mono mt-1">{Math.round(progress)}%</div>
        </div>
        
        <div className="space-y-3 text-left">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {getStepIcon(step.status)}
              <span className={`text-sm ${step.status === 'active' ? 'text-orange-400' : step.status === 'completed' ? 'text-green-400' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SendingOverlay;
