// High-Fidelity Audio Engine with Sample-Accurate Timing Scheduler & Audio Buffer Streams

export function frequencyToMidi(frequency) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

// Convert ABC Notation character into a MIDI pitch index offset
export const abcToMidi = (noteStr) => {
  if (!noteStr || noteStr.includes('z')) return null;
  const clean = noteStr.replace(/[^A-G^,_]/g, '');
  const baseMap = { 'C':60, 'D':62, 'E':64, 'F':65, 'G':67, 'A':69, 'B':71 };
  let base = baseMap[clean.replace(/[^A-G]/g, '')];
  if (!base) return null;
  
  if (clean.includes('^')) base += 1;
  if (clean.includes('_')) base -= 1;
  if (clean.includes(',,')) base -= 24;
  else if (clean.includes(',')) base -= 12;
  return base;
};

export const midiToFrequency = (midi) => Math.pow(2, (midi - 69) / 12) * 440;

// High-precision timing calculation that evaluates exact durations under target time signatures
export const parseDuration = (noteStr, baseLengthDenom = 8) => {
  if (!noteStr) return 1;
  let multiplier = 1;
  const numMatch = noteStr.match(/(\d+)/);
  const slashCount = (noteStr.match(/\//g) || []).length;
  
  if (numMatch) multiplier = parseInt(numMatch[1], 10);
  if (slashCount > 0) multiplier /= Math.pow(2, slashCount);
  if (noteStr.includes('>')) multiplier *= 1.5; // Support dotted formats
  
  return multiplier;
};

export const SynthEngines = {
  playChurchOrgan: (ctx, freq, start, duration) => {
    if (freq <= 0) return;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, start);
    masterGain.gain.linearRampToValueAtTime(0.2, start + 0.03);
    masterGain.gain.setValueAtTime(0.2, start + duration - 0.03);
    masterGain.gain.linearRampToValueAtTime(0, start + duration);
    masterGain.connect(ctx.destination);

    [1, 2, 3, 4].forEach((h, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * h, start);
      g.gain.setValueAtTime(0.08 / h, start);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(start);
      osc.stop(start + duration);
    });
  },

  playWandindi: (ctx, freq, start, duration) => {
    if (freq <= 0) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 2, start); // Wandindi natural high register octave translation

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(420, start);

    lfo.frequency.setValueAtTime(6.5, start);
    lfoGain.gain.setValueAtTime(5, start);

    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(0.2, start + 0.05);
    gainNode.gain.setValueAtTime(0.2, start + duration - 0.04);
    gainNode.gain.linearRampToValueAtTime(0, start + duration);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    lfo.start(start);
    osc.start(start);
    lfo.stop(start + duration);
    osc.stop(start + duration);
  },

  playCoro: (ctx, freq, start, duration) => {
    if (freq <= 0) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, start);

    filter.type = 'bandpass';
    filter.Q.setValueAtTime(6, start);
    filter.frequency.setValueAtTime(1100, start);
    filter.frequency.exponentialRampToValueAtTime(580, start + 0.12);

    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(0.3, start + 0.04);
    gainNode.gain.setValueAtTime(0.3, start + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, start + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  },

  playKihembe: (ctx, isHit, start, duration) => {
    if (!isHit) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, start);
    osc.frequency.exponentialRampToValueAtTime(48, start + 0.14);

    gainNode.gain.setValueAtTime(0.6, start);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  },

  playKigamba: (ctx, isHit, start, duration) => {
    if (!isHit) return;
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, start);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.12, start);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    noise.start(start);
    noise.stop(start + 0.15);
  }
};
