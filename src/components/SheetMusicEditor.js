import React, { useState, useRef } from 'react';
import SheetMusicEditor from './SheetMusicEditor';
import { autoCorrelate, frequencyToMidi, SynthEngines } from './AudioEngine';

// Utility helper matrix that parses ABC alphabetical letters into specific synthesizer Hertz values
const abcToFrequency = (note) => {
  const clean = note.replace(/[^A-Gz,]/g, '');
  if (clean.includes('z') || !clean) return 0;
  
  const baseFreqs = { 'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.00, 'A': 440.00, 'B': 493.88 };
  let freq = baseFreqs[clean[0]] || 0;
  
  if (note.includes(',,')) freq /= 4;
  else if (note.includes(',')) freq /= 2;
  return freq;
};

export default function AppLayout() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyrics, setLyrics] = useState("Nĩ we-ga Ma-ũ-mũ");
  
  const [scoreData, setScoreData] = useState({
    voice: "C E G F",
    wandindi: "E G A B",
    coro: "C,, G,, C, G,,",
    kihembe: "F z F z",
    kigamba: "z F z F"
  });

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Stabilization values to clean tracking glitches
  const lastMidiRef = useRef(-1);
  const pitchCountRef = useRef(0);
  const detectedNotesArray = useRef([]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const startRecording = async () => {
    initAudio();
    setIsRecording(true);
    detectedNotesArray.current = [];
    pitchCountRef.current = 0;
    lastMidiRef.current = -1;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Float32Array(analyser.fftSize);

      const updatePitchLoop = () => {
        analyser.getFloatTimeDomainData(dataArray);
        const freq = autoCorrelate(dataArray, audioCtxRef.current.sampleRate);
        
        if (freq !== -1 && freq > 80 && freq < 800) {
          const midi = frequencyToMidi(freq);
          
          // Debounce validation filter (Note must match across multiple continuous audio frames)
          if (midi === lastMidiRef.current) {
            pitchCountRef.current++;
            if (pitchCountRef.current === 6) { // Stable hold achieved
              const notesMapping = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
              const mappedNote = notesMapping[midi % 12];
              
              if (detectedNotesArray.current.length < 8) {
                detectedNotesArray.current.push(mappedNote);
                setScoreData(prev => ({
                  ...prev,
                  voice: detectedNotesArray.current.join(" ")
                }));
              }
            }
          } else {
            lastMidiRef.current = midi;
            pitchCountRef.current = 0;
          }
        }
        animationFrameRef.current = requestAnimationFrame(updatePitchLoop);
      };

      updatePitchLoop();
    } catch (err) {
      alert("Microphone connection blocked.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // TRUE STUDIO MULTI-TRACK PLAYBACK: Reads whatever text is currently displayed on screen
  const playDynamicStudio = () => {
    initAudio();
    if (isPlaying) return;
    setIsPlaying(true);

    const ctx = audioCtxRef.current;
    const tempoDelay = 500; // 500ms duration per beat slot

    // Turn space-separated strings into navigable data blocks
    const voiceArr = scoreData.voice.split(" ");
    const wandindiArr = scoreData.wandindi.split(" ");
    const coroArr = scoreData.coro.split(" ");
    const kihembeArr = scoreData.kihembe.split(" ");
    const kigambaArr = scoreData.kigamba.split(" ");

    const maxBeats = Math.max(voiceArr.length, wandindiArr.length, coroArr.length, kihembeArr.length, kigambaArr.length);

    for (let beat = 0; beat < maxBeats; beat++) {
      const timeOffset = beat * tempoDelay;

      setTimeout(() => {
        if (!audioCtxRef.current || !isPlaying) return;

        // 1. Voice Staff -> Organ Synth
        if (voiceArr[beat] && voiceArr[beat] !== 'z') {
          const hz = abcToFrequency(voiceArr[beat]);
          if (hz > 0) SynthEngines.playChurchOrgan(ctx, hz, 0.4);
        }

        // 2. Wandindi Staff
        if (wandindiArr[beat] && wandindiArr[beat] !== 'z') {
          const hz = abcToFrequency(wandindiArr[beat]);
          if (hz > 0) SynthEngines.playWandindi(ctx, hz * 2, 0.4); // Scale higher register octave
        }

        // 3. Coro Staff
        if (coroArr[beat] && coroArr[beat] !== 'z') {
          const hz = abcToFrequency(coroArr[beat]);
          if (hz > 0) SynthEngines.playCoro(ctx, hz, 0.4);
        }

        // 4. Kĩhembe Staff
        if (kihembeArr[beat] && kihembeArr[beat] !== 'z') {
          const type = (beat % 2 === 0) ? 'bass' : 'rim';
          SynthEngines.playKihembe(ctx, type, 0.25);
        }

        // 5. Kĩgamba Staff
        if (kigambaArr[beat] && kigambaArr[beat] !== 'z') {
          SynthEngines.playKigamba(ctx, 0.15);
        }

      }, timeOffset);
    }

    setTimeout(() => setIsPlaying(false), maxBeats * tempoDelay + 100);
  };

  return (
    <div style={{ padding: '5px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{ flex: 1, backgroundColor: isRecording ? '#d32f2f' : '#4CAF50', color: '#fff', padding: '15px', fontWeight: 'bold', border: 'none', borderRadius: '6px', fontSize: '15px' }}
        >
          {isRecording ? '🛑 Stop Rec' : '🎤 Record Voice'}
        </button>

        <button
          onClick={isPlaying ? () => setIsPlaying(false) : playDynamicStudio}
          style={{ flex: 1, backgroundColor: isPlaying ? '#ff9800' : '#2196F3', color: '#fff', padding: '15px', fontWeight: 'bold', border: 'none', borderRadius: '6px', fontSize: '15px' }}
        >
          {isPlaying ? '⏹️ Stop Play' : '▶️ Play Live Engine'}
        </button>
      </div>

      <SheetMusicEditor 
        scoreData={scoreData} 
        setScoreData={setScoreData}
        lyrics={lyrics}
        setLyrics={setLyrics}
      />
    </div>
  );
}
