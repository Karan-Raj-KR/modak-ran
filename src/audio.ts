// Web Audio API procedural sound synthesizer for Mushak's Modak Run
// Respectful, joyful festive sound design without external asset dependencies

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    const saved = localStorage.getItem('modak_muted');
    if (saved !== null) {
      this.muted = saved === 'true';
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('modak_muted', String(this.muted));
    } catch {
      // ignore storage failure
    }
    return this.muted;
  }

  // Pickup sound: crisp warm sweet chime
  public playPickup(pitchOffset: number = 0) {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 587.33 * Math.pow(1.08, pitchOffset); // D5 scaled
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Delivery sound: celebratory temple chime / ghantha chord
  public playDelivery() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Harmonic frequencies for bell chime (G4, D5, G5, B5)
    const freqs = [392.00, 587.33, 783.99, 987.77];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.14, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + 1.25);
    });
  }

  // Scurry sound: subtle rushing whoosh
  public playScurry() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.26);
  }

  // Round end gong
  public playRoundEnd() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(261.63, now); // C4
    osc.frequency.exponentialRampToValueAtTime(130.81, now + 0.8);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.85);
  }
}

export const sound = new SoundManager();
