class VoiceService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onResult = null;
    this.onError = null;
  }

  init() {
    if (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'sw-KE'; // Swahili + English
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      this.recognition.continuous = false;
      
      this.recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        this.isListening = false;
        if (this.onResult) this.onResult(text);
      };
      
      this.recognition.onerror = (event) => {
        this.isListening = false;
        if (this.onError) this.onError(event.error);
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
      };
      
      return true;
    } else {
      console.warn('Speech recognition not supported');
      return false;
    }
  }

  start() {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      this.recognition.start();
      return true;
    }
    return false;
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}

export const voiceService = new VoiceService();
export default voiceService;
