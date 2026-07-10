import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

const VoiceInput = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.lang = 'sw-KE';
      recognitionInstance.interimResults = false;
      recognitionInstance.maxAlternatives = 1;
      
      recognitionInstance.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setIsListening(false);
        if (onResult) onResult(text);
      };
      
      recognitionInstance.onerror = () => {
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, [onResult]);

  const toggleListening = () => {
    if (!recognition) {
      alert('Voice input not supported on this device');
      return;
    }
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <button
      onClick={toggleListening}
      className={`fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
        isListening ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
      }`}
    >
      {isListening ? <MicOff size={24} color="white" /> : <Mic size={24} color="white" />}
    </button>
  );
};

export default VoiceInput;
