export class BackgroundMusic {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = false;
    this.timer = null;
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
    await this.context.resume();
    this.enabled = true;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(0.16, this.context.currentTime, 0.8);
    this.schedulePhrase();
    return true;
  }

  stop() {
    this.enabled = false;
    clearTimeout(this.timer);
    if (this.context) {
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
    };
    play(frequency, volume, type);
    if (bell) play(frequency * 2.01, volume * 0.18, 'sine');
  }

  schedulePhrase() {
    if (!this.enabled) return;
    const beat = 60 / 112;
    const start = this.context.currentTime + 0.12;
    const chords = [
      { bass: 43, notes: [55, 59, 62, 67] },
      { bass: 38, notes: [50, 54, 57, 62] },
      { bass: 40, notes: [52, 55, 59, 64] },
      { bass: 36, notes: [48, 52, 55, 60] },
      { bass: 43, notes: [55, 59, 62, 67] },
      { bass: 38, notes: [50, 54, 57, 62] },
      { bass: 36, notes: [48, 52, 55, 60] },
      { bass: 38, notes: [50, 54, 57, 62] },
    ];
    const melody = [
      [79, 0, 0.5], [79, 1, 0.5], [79, 2, 1], [79, 4, 0.5], [79, 5, 0.5], [79, 6, 1],
      [79, 8, 0.5], [83, 9, 0.5], [74, 10, 0.5], [76, 11, 0.5], [79, 12, 1], [81, 14, 1],
      [84, 16, 1], [84, 18, 0.5], [84, 19, 0.5], [84, 20, 1], [83, 22, 1],
      [83, 24, 0.5], [83, 25, 0.5], [81, 26, 1], [81, 28, 0.5], [81, 29, 0.5], [79, 30, 2],
      [79, 32, 0.5], [79, 33, 0.5], [79, 34, 1], [79, 36, 0.5], [79, 37, 0.5], [79, 38, 1],
      [79, 40, 0.5], [83, 41, 0.5], [74, 42, 0.5], [76, 43, 0.5], [79, 44, 1], [81, 46, 1],
      [84, 48, 1], [84, 50, 0.5], [84, 51, 0.5], [84, 52, 1], [83, 54, 1],
      [81, 56, 0.5], [81, 57, 0.5], [79, 58, 1], [76, 60, 1], [74, 62, 2],
    ];
    const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

    chords.forEach((chord, bar) => {
      const at = start + bar * beat * 4;
      this.tone(hz(chord.bass), at, beat * 1.4, 0.03, 'triangle');
      this.tone(hz(chord.bass + 12), at + beat * 2, beat * 0.8, 0.018, 'triangle');
      chord.notes.forEach((note, i) => {
        this.tone(hz(note), at, beat * 3.8, i === 3 ? 0.012 : 0.016, 'sine');
        this.tone(hz(note + 12), at + beat * 1.5, beat * 0.34, 0.008, 'triangle');
        this.tone(hz(note + 12), at + beat * 3.5, beat * 0.34, 0.008, 'triangle');
      });
    });
    melody.forEach(([note, offset, length]) => this.tone(hz(note), start + offset * beat / 2, length * beat / 2 * 0.9, 0.035, 'sine', true));

    const phraseMs = beat * 32 * 1000;
    this.timer = setTimeout(() => this.schedulePhrase(), phraseMs - 250);
  }
}