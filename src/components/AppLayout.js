import React, { useState, useRef, useEffect } from 'react';
import SheetMusicEditor from './SheetMusicEditor';
import { pitchTrackerAutocorrelate, frequencyToMidi, scheduleOrganNote } from './AudioEngine';

export default function AppLayout() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyrics, setLyrics] = useState("A a a a");
  const [scoreData, setScoreData] = useState({ voice: "z4", wandindi: "z4", coro: "z4", kihembe: "z4", kigamba: "z4" });

  const audioCtxRef = useRef(null);
  const liveScoreRef = useRef(scoreData);
  const voiceAudioBufferRef = useRef(null); // High-fidelity in-memory audio storage
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Time tracking vectors
  const trackingNotesTimeline = useRef([]);
  const recordingStartTimeRef = useRef(0);

  useEffect(() => { liveScoreRef.current = scoreData; }, [scoreData]);

  const initAudio = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
  };

  const startStudioRecording = async () => {
    await initAudio();
    setIsRecording(true);
    recordedChunksRef.current = [];
    trackingNotesTimeline.current = [];
    voiceAudioBufferRef.current = null;
    recordingStartTimeRef.current = audioCtxRef.current.currentTime;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Pipeline Step A: Raw Audio Stream Capture Engine
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const rawBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await rawBlob.arrayBuffer();
        
        // Decode block to store your uncompressed voice recording safely in memory
        audioCtxRef.current.decodeAudioData(arrayBuffer, (decodedAudioPCM) => {
          voiceAudioBufferRef.current = decodedAudioPCM;
        }, (err) => console.error("PCM Audio Decoding Failure:", err));

        stream.getTracks().forEach(track => track.stop());
      };

      // Pipeline Step B: Real-Time Audio Engine Pitch Extraction
      const sourceNode = audioCtxRef.current.createMediaStreamSource(stream);
      const analyserNode = audioCtxRef.current.createAnalyser();
      analyserNode.fftSize = 2048;
      sourceNode.connect(analyserNode);

      const bufferLength = analyserNode.fftSize;
      const dataWindowArray = new Float32Array(bufferLength);
      let lastIdentifiedMidi = -1;
      let frameHoldCounter = 0;

      const continuousPitchAnalysisLoop = () => {
        analyserNode.getFloatTimeDomainData(dataWindowArray);
        const currentHz = pitchTrackerAutocorrelate(dataWindowArray, audioCtxRef.current.sampleRate);
        
        if (currentHz !== -1 && currentHz > 75 && currentHz < 700) {
          const calculatedMidi = frequencyToMidi(currentHz);
          
          if (calculatedMidi === lastIdentifiedMidi) {
            frameHoldCounter++;
            if (frameHoldCounter === 5) { // Pitch hold validated (approx 100ms stability threshold)
              const timestampOffset = audioCtxRef.current.currentTime - recordingStartTimeRef.current;
              
              const notesDictionary = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];
              let name = notesDictionary[calculatedMidi % 12];
              let octaveFactor = Math.floor(calculatedMidi / 12) - 5;
              if (octaveFactor < 0) name += (octaveFactor === -2) ? ",," : ",";

              // Append validated performance event to tracking timeline
              trackingNotesTimeline.current.push({ midi: calculatedMidi, abc: name, time: timestampOffset });
              
              // Map the tracking timeline arrays back onto your sheet music view component
              const sheetMusicString = trackingNotesTimeline.current.map(item => item.abc).join(" ");
              setScoreData(prev => ({ ...prev, voice: sheetMusicString || 'z4' }));
            }
          } else {
            lastIdentifiedMidi = calculatedMidi;
            frameHoldCounter = 0;
          }
        }
        animationFrameRef.current = requestAnimationFrame(continuousPitchAnalysisLoop);
      };

      mediaRecorderRef.current.start();
      continuousPitchAnalysisLoop();
    } catch (err) {
      alert("Microphone connection failed.");
      setIsRecording(false);
    }
  };

  const stopStudioRecording = () => {
    setIsRecording(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
  };

  // TIMELINE SYNCHRONIZATION ALIGNMENT PLAYBACK ENGINE
  const runSynchronizedPlayback = async () => {
    await initAudio();
    if (isPlaying) return;
    setIsPlaying(true);

    const ctx = audioCtxRef.current;
    // T0 Master Timeline Anchor Timestamp
    const sharedStartTimeAnchor = ctx.currentTime + 0.06; 
    const universalBeatDuration = 0.45; 

    // Stream Track 1: High-fidelity uncompressed voice playback line from memory channel
    if (voiceAudioBufferRef.current) {
      const audioBufferSourceStream = ctx.createBufferSource();
      audioBufferSourceStream.buffer = voiceAudioBufferRef.current;
      audioBufferSourceStream.connect(ctx.destination);
      audioBufferSourceStream.start(sharedStartTimeAnchor); // Fixed straight to master time window execution anchor
    }

    // Stream Track 2: Automated VST MIDI Instrument Notation Engine
    const currentNotesArray = liveScoreRef.current.voice.split(/\s+/);
    
    trackingNotesTimeline.current.forEach((savedNoteEvent, index) => {
      // Use the recorded time offset to trigger notes precisely when they were originally sung
      const executionTimestamp = sharedStartTimeAnchor + savedNoteEvent.time;
      scheduleOrganNote(ctx, savedNoteEvent.midi, executionTimestamp, universalBeatDuration);
    });

    const calculatedTotalSessionLength = trackingNotesTimeline.current.length > 0 
      ? trackingNotesTimeline.current[trackingNotesTimeline.current.length - 1].time + 0.5
      : 2.0;

    setTimeout(() => setIsPlaying(false), (calculatedTotalSessionLength * 1000) + 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={isRecording ? stopStudioRecording : startStudioRecording} style={{ flex: 1, backgroundColor: isRecording ? '#d32f2f' : '#4CAF50', color: '#fff', padding: '16px', fontWeight: 'bold', border: 'none', borderRadius: '6px', fontSize: '15px' }}>
          {isRecording ? '🛑 Stop Recording Session' : '🎤 Record Voice to Notation'}
        </button>
        <button onClick={runSynchronizedPlayback} style={{ flex: 1, backgroundColor: isPlaying ? '#ff9800' : '#2196F3', color: '#fff', padding: '16px', fontWeight: 'bold', border: 'none', borderRadius: '6px', fontSize: '15px' }} disabled={isPlaying || isRecording}>
          ▶️ Play Synced Mix (Voice + Organ)
        </button>
      </div>

      <SheetMusicEditor 
        scoreData={scoreData} setScoreData={setScoreData}
        lyrics={lyrics} setLyrics={setLyrics} timeSignature="4/4" activeDurationModifier="normal"
      />
    </div>
  );
}
