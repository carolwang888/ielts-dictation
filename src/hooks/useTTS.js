import { useState, useEffect, useRef, useCallback } from 'react';

export function useTTS() {
  const abortRef = useRef(false);
  const speakingRef = useRef(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  
  useEffect(() => {
    const loadVoices = () => {
      let voices = window.speechSynthesis.getVoices();
      
      // 如果 Safari 本地语音不够，尝试触发云端语音加载
      if (voices.length === 0) {
        // Safari 需要短暂延迟才能加载完语音
        setTimeout(() => {
          voices = window.speechSynthesis.getVoices();
          setAvailableVoices(voices);
        }, 100);
      } else {
        setAvailableVoices(voices);
      }
      
      // 尝试恢复保存的语音选择
      const savedVoiceName = localStorage.getItem('selected-voice');
      let voiceToUse = null;
      
      if (savedVoiceName) {
        voiceToUse = voices.find(v => v.name === savedVoiceName);
      }
      
      if (!voiceToUse) {
        // 优先选择云端语音（非本地服务）音质更好
        voiceToUse = voices.find(v => 
          !v.localService && v.lang.startsWith('en-GB')
        ) || voices.find(v => 
          !v.localService && v.lang.startsWith('en')
        );
        
        // 如果没有云端语音，选择英式英语本地语音
        if (!voiceToUse) {
          voiceToUse = voices.find(v => v.lang.startsWith('en-GB')) 
            || voices.find(v => v.lang.startsWith('en'))
            || voices[0];
        }
      }
      
      setSelectedVoice(voiceToUse);
    };
    
    loadVoices();
    // Safari 需要多次监听
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);
  
  const speakWord = useCallback((text, rate = 1.0) => {
    return new Promise((resolve) => {
      if (abortRef.current) {
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.rate = rate;
      utterance.pitch = 1.0; // 标准音调
      utterance.volume = 1.0; // 最大音量
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      }
      
      // Safari 特殊处理：尝试找更好的语音
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari && !selectedVoice) {
        // Safari 下尝试找更清晰的语音
        const voices = window.speechSynthesis.getVoices();
        const siriVoice = voices.find(v => 
          v.name.toLowerCase().includes('siri') || 
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('karen')
        );
        if (siriVoice) {
          utterance.voice = siriVoice;
          utterance.lang = siriVoice.lang;
        }
      }
      
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      
      speakingRef.current = true;
      window.speechSynthesis.speak(utterance);
    });
  }, [selectedVoice]);
  
  const speakWordTwice = useCallback(async (text, rate = 1.0, gap = 300) => {
    await speakWord(text, rate);
    if (abortRef.current) return;
    await new Promise(r => setTimeout(r, gap));
    if (abortRef.current) return;
    await speakWord(text, rate);
  }, [speakWord]);
  
  const playDictation = useCallback(async (words, rate, interval, onWordChange) => {
    abortRef.current = false;
    
    for (let i = 0; i < words.length; i++) {
      if (abortRef.current) break;
      
      onWordChange?.(i);
      await speakWord(words[i].word, rate);
      
      if (i < words.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, interval));
      }
    }
    
    speakingRef.current = false;
  }, [speakWord]);
  
  const stop = useCallback(() => {
    abortRef.current = true;
    window.speechSynthesis.cancel();
    speakingRef.current = false;
  }, []);
  
  const isSpeaking = useCallback(() => {
    return speakingRef.current;
  }, []);
  
  return { 
    speakWord, 
    speakWordTwice, 
    playDictation, 
    stop, 
    isSpeaking, 
    abortRef,
    availableVoices,
    selectedVoice,
    setSelectedVoice
  };
}
