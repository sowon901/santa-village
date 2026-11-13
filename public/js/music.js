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
    const beat = 60 / 120;
    const start = this.context.currentTime + 0.12;
    const chords = [
      { bass: 43, notes: [55, 59, 62, 67] },
      { bass: 48, notes: [48, 52, 55, 60] },
      { bass: 50, notes: [50, 54, 57, 60] },
      { bass: 43, notes: [55, 59, 62, 67] },
      { bass: 43, notes: [55, 59, 62, 67] },
      { bass: 43, notes: [55, 59, 62, 67] },
      { bass: 50, notes: [50, 54, 57, 60] },
      { bass: 50, notes: [50, 54, 57, 60] },
    ];
    const melody = [
      [76, 0, 1], [76, 1, 1], [76, 2, 2],
      [76, 4, 1], [76, 5, 1], [76, 6, 2],
      [76, 8, 1], [79, 9, 1], [72, 10, 1], [74, 11, 1], [76, 12, 4],
      [77, 16, 1], [77, 17, 1], [77, 18, 1], [77, 19, 1],
      [77, 20, 1], [76, 21, 1], [76, 22, 1], [76, 23, 0.5], [76, 23.5, 0.5],
      [76, 24, 1], [74, 25, 1], [74, 26, 1], [76, 27, 1], [74, 28, 2], [79, 30, 2],
    ];
    const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

    for (let bar = 0; bar < 16; bar++) {
      const chord = chords[bar % chords.length];
      const at = start + bar * beat * 4;
      this.tone(hz(chord.bass), at, beat * 0.72, 0.045, 'triangle');
      this.tone(hz(chord.bass + 12), at + beat * 2, beat * 0.58, 0.028, 'triangle');
      chord.notes.forEach((note, i) => {
        const chordVolume = i === 3 ? 0.018 : 0.012;
        this.tone(hz(note), at, beat * 0.62, chordVolume, 'sine');
        this.tone(hz(note), at + beat * 2, beat * 0.48, chordVolume * 0.82, 'sine');
      });
    }
    for (let repeat = 0; repeat < 2; repeat++) {
      melody.forEach(([note, offset, length]) => this.tone(hz(note), start + (offset + repeat * 32) * beat, length * beat * 0.9, 0.04, 'sine', true));
    }

    const phraseMs = beat * 64 * 1000;
    this.timer = setTimeout(() => this.schedulePhrase(), phraseMs - 250);
  }
}