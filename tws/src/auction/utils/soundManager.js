// 音效管理器（可选功能）

class SoundManager {
  constructor() {
    this.sounds = new Map();
  }

  /**
   * 预加载音效
   */
  preloadSound(name, url) {
    if (typeof window === 'undefined') return;
    
    const audio = new Audio(url);
    audio.preload = 'auto';
    this.sounds.set(name, audio);
  }

  /**
   * 播放音效
   */
  playSound(name, volume = 0.5) {
    if (typeof window === 'undefined') return;
    
    const sound = this.sounds.get(name);
    if (sound) {
      sound.volume = volume;
      sound.currentTime = 0;
      sound.play().catch(err => {
        console.warn('Failed to play sound:', err);
      });
    }
  }

  /**
   * 播放重锤音效（出价时）
   */
  playHammer() {
    if (typeof window === 'undefined') return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Failed to play hammer sound:', error);
    }
  }

  /**
   * 播放金币音效（交易成功时）
   */
  playCoin() {
    if (typeof window === 'undefined') return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (error) {
      console.warn('Failed to play coin sound:', error);
    }
  }
}

// 导出单例
export const soundManager = new SoundManager();

