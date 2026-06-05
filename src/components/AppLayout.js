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
  const voiceAudioBufferRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const animationFrameRef = useRef(null);

  const trackingNotesTimeline = useRef([]);
  const recordingStartTimeRef = useRef(0);
  const currentActiveNoteRef = useRef(null); 

  useEffect(() => { liveScoreRef.current = scoreData; }, [scoreData]);

  const initAudio = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
  };

  const calculateABCLengthSuffix = (durationSeconds, beatUnit = 0.3) => {
    const ratio = durationSeconds / beatUnit;
    if (ratio >= 3.5) return "4";      
    if (ratio >= 1.7) return "2";      
    if (ratio >= 1.3) return ">";      
    if (ratio <= 0.6) return "/2";     
    return "";                         
  };

  const startStudioRecording = async () => {
    await initAudio();
    setIsRecording(true);
    recordedChunksRef.current = [];
    trackingNotesTimeline.current = [];
    voiceAudioBufferRef.current = null;
    currentActiveNoteRef.current = null;
    recordingStartTimeRef.current = audioCtxRef.current.currentTime;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const rawBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await rawBlob.arrayBuffer();
        
        audioCtxRef.current.decodeAudioData(arrayBuffer, (decodedAudioPCM) => {
          voiceAudioBufferRef.current = decodedAudioPCM;
        }, (err) => console.error("PCM Decode Error:", err));

        stream.getTracks().forEach(track => track.stop());
      };

      const sourceNode = audioCtxRef.current.createMediaStreamSource(stream);
      const analyserNode = audioCtxRef.current.createAnalyser();
      analyserNode.fftSize = 1024; 
      sourceNode.connect(analyserNode);

      const dataWindowArray = new Float32Array(analyserNode.fftSize);
      let lastIdentifiedMidi = -1;
      let frameHoldCounter = 0;

      const continuousPitchAnalysisLoop = () => {
        analyserNode.getFloatTimeDomainData(dataWindowArray);
        const currentHz = pitchTrackerAutocorrelate(dataWindowArray, audioCtxRef.current.sampleRate);
        const loopTime = audioCtxRef.current.currentTime;
        
        if (currentHz !== -1 && currentHz > 75 && currentHz < 700) {
          const calculatedMidi = frequencyToMidi(currentHz);
          
          if (calculatedMidi === lastIdentifiedMidi) {
            frameHoldCounter++;
            if (frameHoldCounter === 3) { 
              const relativeStartTime = loopTime - recordingStartTimeRef.current;

              if (currentActiveNoteRef.current && currentActiveNoteRef.current.midi !== calculatedMidi) {
                const finishedNote = currentActiveNoteRef.current;
                finishedNote.duration = loopTime - finishedNote.absoluteStartTime;
                finishedNote.abc += calculateABCLengthSuffix(finishedNote.duration);
                trackingNotesTimeline.current.push(finishedNote);
                currentActiveNoteRef.current = null;
              }

              if (!currentActiveNoteRef.current) {
                // FIXED: Array closed correctly below to avoid build errors
                const notesDictionary = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];
                let name = notesDictionary[calculatedMidi % 12];
                let octaveFactor = Math.floor(calculatedMidi / 12) - 5;
                if (octaveFactor < 0) name += (octaveFactor === -2) ? ",," : ",";

                currentActiveNoteRef.current = {
                  midi: calculatedMidi,
                  abc: name,
                  time: relativeStartTime,
                  absoluteStartTime: loopTime
                };
              }
            }
          } else {
            lastIdentifiedMidi = calculatedMidi;
            frameHoldCounter = 0;
          }
        } else {
          if (currentActiveNoteRef.current) {
            const finishedNote = currentActiveNoteRef.current;
            finishedNote.duration = loopTime - finishedNote.absoluteStartTime;
            finishedNote.abc += calculateABCLengthSuffix(finishedNote.duration);
            trackingNotesTimeline.current.push(finishedNote);
            currentActiveNoteRef.current = null;

            const sheetMusicString = trackingNotesTimeline.current.map(item => item.abc).join(" ");
            setScoreData(prev => ({ ...prev, voice: sheetMusicString || 'z4' }));
          }
          lastIdentifiedMidi = -1;
          frameHoldCounter = 0;
        }
        animationFrameRef.current = requestAnimationFrame(continuousPitchAnalysisLoop);
      };

      mediaRecorderRef.current.start();
      continuousPitchAnalysisLoop();
    } catch (err) {
      alert("Microphone configuration failed.");
      setIsRecording(false);
    }
  };

  const stopStudioRecording = () => {
    setIsRecording(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (currentActiveNoteRef.current && audioCtxRef.current) {
      const finishedNote = currentActiveNoteRef.current;
      finishedNote.duration = audioCtxRef.current.currentTime - finishedNote.absoluteStartTime;
      finishedNote.abc += calculateABCLengthSuffix(finishedNote.duration);
      trackingNotesTimeline.current.push(finishedNote);
      currentActiveNoteRef.current = null;
    }

    const sheetMusicString = trackingNotesTimeline.current.map(item => item.abc).join(" ");
    setScoreData(prev => ({ ...prev, voice: sheetMusicString || 'z4' }));
    
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
  };

  const runSynchronizedPlayback = async () => {
    await initAudio();
    if (isPlaying) return;
    setIsPlaying(true);

    const ctx = audioCtxRef.current;
    const sharedStartTimeAnchor = ctx.currentTime + 0.08; 
    const baselineDefaultDuration = 0.45;

    if (voiceAudioBufferRef.current) {
      const audioBufferSourceStream = ctx.createBufferSource();
      audioBufferSourceStream.buffer = voiceAudioBufferRef.current;
      audioBufferSourceStream.connect(ctx.destination);
      audioBufferSourceStream.start(sharedStartTimeAnchor); 
    }

    trackingNotesTimeline.current.forEach((savedNoteEvent) => {
      const executionTimestamp = sharedStartTimeAnchor + savedNoteEvent.time;
      const adaptiveDuration = savedNoteEvent.duration || baselineDefaultDuration;
      scheduleOrganNote(ctx, savedNoteEvent.midi, executionTimestamp, adaptiveDuration);
    });

    const calculatedTotalSessionLength = trackingNotesTimeline.current.length > 0 
      ? trackingNotesTimeline.current[trackingNotesTimeline.current.length - 1].time + 1.5
      : 2.0;

    setTimeout(() => setIsPlaying(false), (calculatedTotalSessionLength * 1000));
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
