// Original Web Audio arrangement of the public-domain Jingle Bells chorus.
// One 32-beat chorus repeated four times at 128 BPM makes a 60-second loop.
export class BackgroundMusic {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = false;
    this.timer = null;
    this.voices = new Set();
  }

  async start() {
    if (this.enabled) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);
    }
    this.enabled = true;
    try {
      await this.context.resume();
    } catch (error) {
      this.enabled = false;
      throw error;
    }
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(0.16, this.context.currentTime, 0.8);
    this.schedulePhrase();
    return true;
  }

  stop() {
    this.enabled = false;
    clearTimeout(this.timer);
    if (this.context) {
      const stopAt = this.context.currentTime + 0.03;
      for (const oscillator of this.voices) {
        try { oscillator.stop(stopAt); } catch {}
      }
      this.voices.clear();
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.4);
    }
    return false;
  }

  async toggle() {
    return this.enabled ? this.stop() : this.start();
  }

  tone(frequency, start, duration, volume, type = 'sine', bell = false) {
    const play = (hz, level, wave) => {
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = hz;
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.linearRampToValueAtTime(level, start + (bell ? 0.012 : 0.045));
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.04);
      this.voices.add(oscillator);
      oscillator.addEventListener('ended', () => this.voices.delete(oscillator), { once: true });
    };
    play(frequency, volume, type);
    if (bell) play(frequency * 2.01, volume * 0.18, 'sine');
  }

  schedulePhrase() {
    if (!this.enabled) return;
    const beat = 60 / 128;
    const start = this.context.currentTime + 0.12;
    const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
    // Jingle Bells chorus in C major, kept in a comfortable fourth-octave register.
    const melody = [
      [64, 0, 1], [64, 1, 1], [64, 2, 2],
      [64, 4, 1], [64, 5, 1], [64, 6, 2],
      [64, 8, 1], [67, 9, 1], [60, 10, 1], [62, 11, 1], [64, 12, 4],
      [65, 16, 1], [65, 17, 1], [65, 18, 1], [65, 19, 1],
      [65, 20, 1], [64, 21, 1], [64, 22, 1], [64, 23, 0.5], [64, 23.5, 0.5],
      [64, 24, 1], [62, 25, 1], [62, 26, 1], [64, 27, 1], [62, 28, 2], [67, 30, 2],
    ];
    const chords = [
      { bass: 48, notes: [60, 64, 67] }, { bass: 48, notes: [60, 64, 67] },
      { bass: 48, notes: [60, 64, 67] }, { bass: 48, notes: [60, 64, 67] },
      { bass: 41, notes: [57, 60, 65] }, { bass: 41, notes: [57, 60, 65] },
      { bass: 43, notes: [55, 59, 62] }, { bass: 48, notes: [60, 64, 67] },
    ];

    for (let repeat = 0; repeat < 4; repeat++) {
      const offset = repeat * 32;
      melody.forEach(([note, at, length]) => {
        this.tone(hz(note), start + (offset + at) * beat, length * beat * 0.88, 0.052, 'sine', true);
      });
      chords.forEach((chord, bar) => {
        const at = start + (offset + bar * 4) * beat;
        this.tone(hz(chord.bass), at, beat * 0.72, 0.026, 'triangle');
        this.tone(hz(chord.bass), at + beat * 2, beat * 0.72, 0.026, 'triangle');
        chord.notes.forEach((note) => {
          this.tone(hz(note), at + beat, beat * 0.38, 0.008, 'triangle');
          this.tone(hz(note), at + beat * 3, beat * 0.38, 0.008, 'triangle');
        });
      });
    }

    this.timer = setTimeout(() => this.schedulePhrase(), 60000 - 250);
  }
}
