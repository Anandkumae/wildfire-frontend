/**
 * Audio Alert System for Fire Detection
 * Supports both MP3 file playback and generated siren sounds
 */

class AudioAlertSystem {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
    this.oscillators = [];
    this.gainNodes = [];
    this.audioElement = null;
    this.mp3Path = '/fire-alarm.wav'; // Path to alarm sound file in public folder
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play fire alarm - tries MP3 first, falls back to generated sound
   */
  async playFireAlarm(duration = 3000) {
    if (this.isPlaying) {
      return; // Prevent overlapping alarms
    }

    // Try to play MP3 file first
    const mp3Success = await this.playMP3Alarm();
    
    if (!mp3Success) {
      // Fallback to generated siren if MP3 fails
      console.log('🔊 MP3 not available, using generated siren');
      this.playGeneratedSiren(duration);
    }
  }

  /**
   * Play MP3 fire alarm
   * Returns true if successful, false if MP3 not available
   */
  async playMP3Alarm() {
    try {
      // Create or reuse audio element
      if (!this.audioElement) {
        this.audioElement = new Audio(this.mp3Path);
        this.audioElement.volume = 1.0; // Maximum volume for loud alarm
        this.audioElement.preload = 'auto';
      }

      // Reset to beginning if already loaded
      this.audioElement.currentTime = 0;
      
      this.isPlaying = true;
      
      // Play the audio
      await this.audioElement.play();
      
      console.log('🔊 FIRE ALARM MP3 PLAYING');

      // Set up event listeners
      const onEnded = () => {
        this.isPlaying = false;
        this.audioElement.removeEventListener('ended', onEnded);
        this.audioElement.removeEventListener('error', onError);
      };

      const onError = (e) => {
        console.warn('❌ MP3 playback error:', e);
        this.isPlaying = false;
        this.audioElement.removeEventListener('ended', onEnded);
        this.audioElement.removeEventListener('error', onError);
      };

      this.audioElement.addEventListener('ended', onEnded);
      this.audioElement.addEventListener('error', onError);

      return true;
    } catch (error) {
      console.warn('❌ Could not play MP3 alarm:', error.message);
      this.isPlaying = false;
      return false;
    }
  }

  /**
   * Play a loud emergency siren sound (generated)
   * Creates a multi-tone alarm that's impossible to ignore
   */
  playGeneratedSiren(duration = 3000) {
    this.init();
    this.isPlaying = true;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const endTime = now + (duration / 1000);

    // Create a complex alarm with multiple oscillators for a loud, urgent sound
    const frequencies = [
      { freq: 800, type: 'sine' },      // Base siren
      { freq: 1000, type: 'square' },   // Harsh urgency
      { freq: 1200, type: 'sine' },     // High pitch alert
    ];

    frequencies.forEach(({ freq, type }, index) => {
      // Create oscillator
      const oscillator = ctx.createOscillator();
      oscillator.type = type;
      
      // Create gain node for volume control
      const gainNode = ctx.createGain();
      
      // Connect oscillator -> gain -> output
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Siren effect: oscillate between two frequencies
      const lowFreq = freq;
      const highFreq = freq * 1.5;
      
      // Create repeating siren pattern
      let time = now;
      const cycleTime = 0.4; // 400ms per cycle
      
      while (time < endTime) {
        oscillator.frequency.setValueAtTime(lowFreq, time);
        oscillator.frequency.linearRampToValueAtTime(highFreq, time + cycleTime / 2);
        oscillator.frequency.linearRampToValueAtTime(lowFreq, time + cycleTime);
        time += cycleTime;
      }

      // Volume envelope: fade in quickly, sustain, fade out
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05); // Quick fade in (LOUDER!)
      gainNode.gain.setValueAtTime(0.2, endTime - 0.2); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, endTime); // Fade out

      // Start and stop
      oscillator.start(now);
      oscillator.stop(endTime);

      // Cleanup when done
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        this.oscillators = this.oscillators.filter(osc => osc !== oscillator);
        this.gainNodes = this.gainNodes.filter(gn => gn !== gainNode);
        
        if (this.oscillators.length === 0) {
          this.isPlaying = false;
        }
      };

      this.oscillators.push(oscillator);
      this.gainNodes.push(gainNode);
    });

    // Add a pulsing low-frequency component for extra urgency
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    
    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(200, now);
    
    // Pulse the bass
    let time = now;
    while (time < endTime) {
      bassGain.gain.setValueAtTime(0, time);
      bassGain.gain.linearRampToValueAtTime(0.25, time + 0.1);
      bassGain.gain.linearRampToValueAtTime(0, time + 0.2);
      time += 0.2;
    }
    
    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    
    bassOsc.start(now);
    bassOsc.stop(endTime);
    
    bassOsc.onended = () => {
      bassOsc.disconnect();
      bassGain.disconnect();
    };

    this.oscillators.push(bassOsc);
    this.gainNodes.push(bassGain);

    console.log('🔊 GENERATED FIRE ALARM PLAYING - Duration:', duration, 'ms');
  }

  /**
   * Stop all currently playing alarms
   */
  stopAlarm() {
    // Stop MP3 if playing
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    // Stop generated sounds
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    // Fade out all oscillators quickly
    this.gainNodes.forEach(gainNode => {
      try {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
      } catch (e) {
        console.warn('Error stopping gain node:', e);
      }
    });

    // Stop all oscillators
    this.oscillators.forEach(oscillator => {
      try {
        oscillator.stop(now + 0.1);
      } catch (e) {
        console.warn('Error stopping oscillator:', e);
      }
    });

    this.isPlaying = false;
    console.log('🔇 Fire alarm stopped');
  }

  /**
   * Play a short beep (for testing)
   */
  playTestBeep() {
    this.init();
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 440; // A4 note
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);

    console.log('🔔 Test beep played');
  }
}

// Create singleton instance
const audioAlert = new AudioAlertSystem();

export default audioAlert;

