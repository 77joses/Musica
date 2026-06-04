// High-Precision Architectural Audio Engine with Time-Locked Performance Schedulers

export function frequencyToMidi(frequency) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

export const midiToFrequency = (midi) => Math.pow(2, (midi - 69) / 12) * 440;

// High-fidelity McLeod pitch method & autocorrelation matrix
export function pitchTrackerAutocorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.025) return -1; // Ignore signal bleed beneath noise floor

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  }
  for (let i = SIZE - 1; i >= SIZE / 2; i--) {
    if (Math.abs(buffer[i]) < thres) { r2 = i; break; }
  }

  const slicedBuffer = buffer.subarray(r1, r2);
  const ln = slicedBuffer.length;
  let correlations = new Float32Array(Math.floor(ln / 2));

  for (let offset = 0; offset < correlations.length; offset++) {
    let sum = 0;
    for (let i = 0; i < correlations.length; i++) {
      sum += slicedBuffer[i] * slicedBuffer[i + offset];
    }
    correlations[offset] = sum;
  }

  let d = 0;
  while (correlations[d] > correlations[d + 1]) d++;
  
  let maxVal = -1, maxIndex = -1;
  for (let i = d; i < correlations.length; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxIndex = i;
    }
  }

  let pitchIdx = maxIndex;
  if (pitchIdx !== -1 && pitchIdx > 0) {
    return sampleRate / pitchIdx;
  }
  return -1;
}

// Production-grade additive VST Church Organ sound equations
export const scheduleOrganNote = (ctx, midiNote, startTime, duration) => {
  const freq = midiToFrequency(midiNote);
  if (!freq || freq <= 0) return;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, startTime);
  masterGain.gain.linearRampToValueAtTime(0.18, startTime + 0.02); // Clean pipe attack profile
  masterGain.gain.setValueAtTime(0.18, startTime + duration - 0.02);
  masterGain.gain.linearRampToValueAtTime(0, startTime + duration);
  masterGain.connect(ctx.destination);

  const partialHarmonics =;
  const splitVolumes = [0.35, 0.25, 0.15, 0.10, 0.05];

  partialHarmonics.forEach((h, i) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq * h, startTime);
    gainNode.gain.setValueAtTime(splitVolumes[i] || 0.02, startTime);
    
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
};
