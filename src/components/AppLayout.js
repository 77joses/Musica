import React, { useState, useRef, useEffect } from 'react';
import SheetMusicEditor from './SheetMusicEditor';
import { autoCorrelate, frequencyToMidi, SynthEngines } from './AudioEngine';

export default function AppLayout() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyrics, setLyrics] = useState("Nĩ we-ga Ma-ũ-mũ nĩ tũ-gũ-kena");
  
  // Custom multi-staff score data tracking including Kĩgamba
  const [scoreData, setScoreData] = useState({
    voice: "C D E F",
    wandindi: "E G A B",
    coro: "C,, E,, G,, C,",
    kihembe: "F z F z",
    kigamba: "z F z F"
  });

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recordedNotesRef = useRef([]);

  // Setup audio context on demand to comply with mobile browser safety security policies
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Live Microphone Input & Real-Time Pitch Tracking Matrix
  const startRecording = async () => {
    initAudio();
    setIsRecording(true);
    recordedNotesRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

      const updatePitchLoop = () => {
        analyser.getFloatTimeDomainData(dataArray);
        const freq = autoCorrelate(dataArray, audioCtxRef.current.sampleRate);
        
        if (freq !== -1 && freq > 60 && freq < 1000) {
          const midi = frequencyToMidi(freq);
          // Convert MIDI numbers to ABC visual letter components simple notation mapping
          const notesMapping = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];
          const noteName = notesMapping[midi % 12];
          
          if (!recordedNotesRef.current.includes(noteName)) {
            recordedNotesRef.current.push(noteName);
            if (recordedNotesRef.current.length <= 8) {
              setScoreData(prev => ({
                ...prev,
                voice: recordedNotesRef.current.join(" ")
              }));
            }
          }
        }
        animationFrameRef.current = requestAnimationFrame(updatePitchLoop);
      };

      updatePitchLoop();
    } catch (err) {
      alert("Microphone connection failed. Please allow mic access on your phone settings.");
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

  // Simultaneous Parallel Studio Multi-Track Playback Logic
  const handlePlayback = () => {
    initAudio();
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const ctx = audioCtxRef.current;
    
    // Play Church Organ Track (Voice Notation Interpretation)
    SynthEngines.playChurchOrgan(ctx, 261.63, 0.4); // C4 Note
    setTimeout(() => SynthEngines.playChurchOrgan(ctx, 293.66, 0.4), 400); // D4 Note
    setTimeout(() => SynthEngines.playChurchOrgan(ctx, 329.63, 0.4), 800); // E4 Note
    setTimeout(() => SynthEngines.playChurchOrgan(ctx, 349.23, 0.4), 1200); // F4 Note

    // Synchronized backing loop execution strings
    // Play Wandindi Fiddle Track
    setTimeout(() => SynthEngines.playWandindi(ctx, 329.63, 0.4), 0);
    setTimeout(() => SynthEngines.playWandindi(ctx, 392.00, 0.4), 400);

    // Play Coro Side-Blown Horn Track
    setTimeout(() => SynthEngines.playCoro(ctx, 130.81, 0.5), 0);
    setTimeout(() => SynthEngines.playCoro(ctx, 196.00, 0.5), 800);

    // Play Rhythmic Kĩhembe Drum Track
    SynthEngines.playKihembe(ctx, 'bass', 0.2);
    setTimeout(() => SynthEngines.playKihembe(ctx, 'rim', 0.15), 400);
    setTimeout(() => SynthEngines.playKihembe(ctx, 'bass', 0.2), 800);

    // Play Metallic Kĩgamba Syncopation Leg Shaker Track
    setTimeout(() => SynthEngines.playKigamba(ctx, 0.25), 200);
    setTimeout(() => SynthEngines.playKigamba(ctx, 0.25), 600);
    setTimeout(() => SynthEngines.playKigamba(ctx, 0.25), 1000);

    setTimeout(() => setIsPlaying(false), 1600);
  };

  return (
    <div style={{ padding: '10px' }}>
      {/* Mobile Top Status Control Panel */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            flex: '1 1 140px',
            backgroundColor: isRecording ? '#d32f2f' : '#4CAF50',
            color: '#fff',
            padding: '16px',
            fontWeight: 'bold',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {isRecording ? '🛑 Stop Recording' : '🎤 Record Voice'}
        </button>

        <button
          onClick={handlePlayback}
          style={{
            flex: '1 1 140px',
            backgroundColor: isPlaying ? '#ff9800' : '#2196F3',
            color: '#fff',
            padding: '16px',
            fontWeight: 'bold',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {isPlaying ? '⏸️ Stop Playback' : '▶️ Play Full Studio'}
        </button>
      </div>

      {isRecording && (
        <div style={{ color: '#ffeb3b', margin: '10px 0', fontWeight: 'bold', animation: 'blink 1s infinite' }}>
          🎙️ Analyzing incoming vocal frequencies in real-time...
        </div>
      )}

      {/* Embedded Notation Interface Workspace Component */}
      <SheetMusicEditor 
        scoreData={scoreData} 
        setScoreData={setScoreData}
        lyrics={lyrics}
        setLyrics={setLyrics}
      />
    </div>
  );
}
