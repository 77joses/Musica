import React, { useState, useRef, useEffect } from 'react';
import SheetMusicEditor from './SheetMusicEditor';
import { abcToMidi, midiToFrequency, parseDuration, SynthEngines } from './AudioEngine';

export default function AppLayout() {
  const [timeSignature, setTimeSignature] = useState("6/8"); 
  const [durationMode, setDurationMode] = useState("normal");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyrics, setLyrics] = useState("Nĩ we-ga Ma-ũ-mũ nĩ tũ-gũ-kena");
  
  const [scoreData, setScoreData] = useState({
    voice: "C D E F z z",
    wandindi: "E G A B z z",
    coro: "C,, G,, C, G,, z z",
    kihembe: "F z F z F F",
    kigamba: "z F z F z F"
  });

  const audioCtxRef = useRef(null);
  const liveScoreRef = useRef(scoreData);
  const voiceAudioBufferRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => { liveScoreRef.current = scoreData; }, [scoreData]);

  const initAudio = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
  };

  const toggleRecording = async () => {
    await initAudio();
    if (isRecording) {
      setIsRecording(false);
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    } else {
      setIsRecording(true);
      recordedChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          audioCtxRef.current.decodeAudioData(arrayBuffer, (decodedBuffer) => {
            voiceAudioBufferRef.current = decodedBuffer;
          });
          stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorderRef.current.start();
      } catch (err) {
        alert("Microphone connection failed.");
        setIsRecording(false);
      }
    }
  };

  const playStudioTracks = async () => {
    await initAudio();
    if (isPlaying) return;
    setIsPlaying(true);

    const ctx = audioCtxRef.current;
    const startTime = ctx.currentTime + 0.05; 

    const beatUnitDuration = timeSignature.includes('/8') ? 0.32 : 0.50; 

    const currentData = liveScoreRef.current;
    const tracks = ['voice', 'wandindi', 'coro', 'kihembe', 'kigamba'];
    let globalTimelineOffset = 0;

    // TARGET SYNC INJECTION: Plays recorded vocal tracks exactly in line with the synths
    if (voiceAudioBufferRef.current) {
      const voiceSource = ctx.createBufferSource();
      voiceSource.buffer = voiceAudioBufferRef.current;
      voiceSource.connect(ctx.destination);
      voiceSource.start(startTime);
    }

    const tokenizedTracks = {};
    tracks.forEach(t => { tokenizedTracks[t] = currentData[t].split(/\s+/) });
    const maxBeats = Math.max(...tracks.map(t => tokenizedTracks[t].length));

    for (let i = 0; i < maxBeats; i++) {
      tracks.forEach(track => {
        const noteSymbol = tokenizedTracks[track][i];
        if (!noteSymbol) return;

        const scalar = parseDuration(noteSymbol);
        const noteDuration = beatUnitDuration * scalar;

        if (!noteSymbol.includes('z')) {
          if (track === 'voice') {
            const midi = abcToMidi(noteSymbol);
            if (midi) SynthEngines.playChurchOrgan(ctx, midiToFrequency(midi), startTime + globalTimelineOffset, noteDuration);
          } else if (track === 'wandindi') {
            const midi = abcToMidi(noteSymbol);
            if (midi) SynthEngines.playWandindi(ctx, midiToFrequency(midi), startTime + globalTimelineOffset, noteDuration);
          } else if (track === 'coro') {
            const midi = abcToMidi(noteSymbol);
            if (midi) SynthEngines.playCoro(ctx, midiToFrequency(midi), startTime + globalTimelineOffset, noteDuration);
          } else if (track === 'kihembe') {
            SynthEngines.playKihembe(ctx, true, startTime + globalTimelineOffset, noteDuration);
          } else if (track === 'kigamba') {
            SynthEngines.playKigamba(ctx, true, startTime + globalTimelineOffset, noteDuration);
          }
        }
      });

      let maxStepScalar = 1;
      tracks.forEach(t => {
        if (tokenizedTracks[t][i]) {
          const s = parseDuration(tokenizedTracks[t][i]);
          if (s > maxStepScalar) maxStepScalar = s;
        }
      });
      globalTimelineOffset += beatUnitDuration * maxStepScalar;
    }

    setTimeout(() => setIsPlaying(false), (globalTimelineOffset * 1000) + 200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* Structural Configuration Settings Bar */}
      <div style={{ backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <label style={{ fontSize: '13px', color: '#aaa', marginRight: '8px' }}>Time Signature Meter:</label>
          <select value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="6/8">6/8 (Mũthĩrĩgũ / Compound)</option>
            <option value="12/8">12/8 (Mũgoidi Rhythms)</option>
            <option value="4/4">4/4 (Standard Studio)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '13px', color: '#aaa', marginRight: '8px' }}>Duration Length Modifier Tool:</label>
          <select value={durationMode} onChange={(e) => setDurationMode(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="normal">Normal Duration</option>
            <option value="dotted">Dotted Note (1.5x)</option>
            <option value="double">Double Note (2x)</option>
            <option value="half">Half Note (1/2x)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={toggleRecording} style={{ flex: 1, backgroundColor: isRecording ? '#d32f2f' : '#4CAF50', color: '#fff', padding: '15px', fontWeight: 'bold', border: 'none', borderRadius: '6px' }}>
          {isRecording ? '🛑 Stop Recording' : '🎤 Record Voice Clip'}
        </button>
        <button onClick={playStudioTracks} style={{ flex: 1, backgroundColor: '#2196F3', color: '#fff', padding: '15px', fontWeight: 'bold', border: 'none', borderRadius: '6px' }}>
          ▶️ Play Full Live Mix
        </button>
      </div>

      <SheetMusicEditor 
        scoreData={scoreData} setScoreData={setScoreData}
        lyrics={lyrics} setLyrics={setLyrics}
        timeSignature={timeSignature} activeDurationModifier={durationMode}
      />
    </div>
  );
}
