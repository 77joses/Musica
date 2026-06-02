export function frequencyToMidi(frequency) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

export function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;
  let c = 0;
  for (let i = 0; i < SIZE; i++) {
    if (Math.abs(buffer[i]) < 0.01) c++;
  }
  if (c / SIZE > 0.99) return -1;

  let maxSamples = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.02) return -1;

  let correlations = new Array(maxSamples);
  for (let offset = 0; offset < maxSamples; offset++) {
    let correlation = 0;
    for (let i = 0; i < maxSamples; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlations[offset] = correlation;
  }

  let d = 0;
  while (correlations[d] < correlations[d + 1]) d++;
  let minval = 1000000;
  for (let i = d; i < maxSamples; i++) {
    if (correlations[i] < minval) {
      minval = correlations[i];
      bestOffset = i;
    }
  }

  if (bestOffset !== -1) return sampleRate / bestOffset;
  return -1;
}

export const SynthEngines = {
  playChurchOrgan: (ctx, freq, duration) => {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    masterGain.gain.setValueAtTime(0.3, now + duration - 0.05);
    masterGain.gain.linearRampToValueAtTime(0, now + duration);
    masterGain.connect(ctx.destination);

    [1, 2, 3, 4].forEach((h, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * h, now);
      gainNode.gain.setValueAtTime(0.1, now);
      osc.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start(now);
      osc.stop(now + duration);
    });
  },

  playWandindi: (ctx, freq, duration) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(380, now);
    lfo.frequency.setValueAtTime(6, now);
    lfoGain.gain.setValueAtTime(4, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.08);
    gainNode.gain.setValueAtTime(0.25, now + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + duration);
    osc.stop(now + duration);
  },

  playCoro: (ctx, freq, duration) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(5, now);
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + 0.15);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.03);
    gainNode.gain.setValueAtTime(0.35, now + duration - 0.07);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  },

  playKihembe: (ctx, noteType, duration) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    if (noteType === 'bass') {
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.12);
    } else {
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
    }

    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
};
