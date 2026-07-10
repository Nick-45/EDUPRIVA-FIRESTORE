import { useState, useCallback, useEffect } from 'react';
import { voiceService } from '../services/voiceService';
import toast from 'react-hot-toast';

export const useVoiceInput = (onResult, onError) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = voiceService.init();
    setIsSupported(supported);
    
    voiceService.onResult = (text) => {
      setIsListening(false);
      if (onResult) onResult(text);
    };
    
    voiceService.onError = (error) => {
      setIsListening(false);
      toast.error(`Voice input error: ${error}`);
      if (onError) onError(error);
    };
    
    return () => {
      voiceService.stop();
    };
  }, [onResult, onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error('Voice input not supported on this device');
      return;
    }
    const started = voiceService.start();
    if (started) {
      setIsListening(true);
      toast.success('Listening... Speak now');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    voiceService.stop();
    setIsListening(false);
  }, []);

  return { isListening, isSupported, startListening, stopListening };
};
