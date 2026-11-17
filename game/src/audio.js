// Synthesized sound effects with the Web Audio API: no audio files, no network.
// One small oscillator/noise voice per effect, created lazily on the first user gesture.

export class SoundEngine {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  unlock() {
    if (this.context === null) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) this.context = new AudioCtor();
    }
    if (this.context && this.context.state === 'suspended') this.context.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(frequencyStart, frequencyEnd, duration, type, volume) {
    if (this.muted || this.context === null) return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequencyStart, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequencyEnd), ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  noiseBurst(duration, volume) {
    if (this.muted || this.context === null) return;
    const ctx = this.context;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  playShoot() { this.tone(880, 320, 0.07, 'square', 0.05); }
  playEnemyHit() { this.tone(300, 180, 0.05, 'triangle', 0.06); }
  playExplosion() { this.noiseBurst(0.28, 0.22); this.tone(160, 40, 0.25, 'sawtooth', 0.10); }
  playPlayerHit() { this.noiseBurst(0.18, 0.25); this.tone(220, 60, 0.22, 'sawtooth', 0.16); }
  playPowerup() { this.tone(520, 1040, 0.12, 'sine', 0.12); this.tone(780, 1560, 0.16, 'sine', 0.08); }
  playWaveStart() { this.tone(392, 392, 0.09, 'triangle', 0.10); setTimeout(() => this.tone(587, 587, 0.12, 'triangle', 0.10), 90); }
  playVictory() { this.tone(523, 523, 0.12, 'triangle', 0.12); setTimeout(() => this.tone(784, 784, 0.18, 'triangle', 0.12), 120); }
  playGameOver() { this.tone(330, 55, 0.6, 'sawtooth', 0.14); }
}
