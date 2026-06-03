import React, { useEffect, useRef } from 'react';

export default function SheetMusicEditor({ scoreData, setScoreData, lyrics, setLyrics, timeSignature, activeDurationModifier }) {
  const notationRef = useRef(null);

  const generateABCString = () => {
    const baseUnit = timeSignature.includes('/8') ? '1/8' : '1/4';
    return `
X:1
T:Gĩkũyũ Studio Production Score
M:${timeSignature}
L:${baseUnit}
K:C
%%staves [1 2 3 4 5]
V:1 name="Voice (Organ)" clef=treble
${scoreData.voice || 'z4'}
w:${lyrics || ''}
V:2 name="Wandindi" clef=treble
${scoreData.wandindi || 'z4'}
V:3 name="Coro" clef=treble
${scoreData.coro || 'z4'}
V:4 name="Kĩhembe" clef=perc
${scoreData.kihembe || 'z4'}
V:5 name="Kĩgamba" clef=perc
${scoreData.kigamba || 'z4'}
    `.trim();
  };

  useEffect(() => {
    import('abcjs').then((ABCJS) => {
      if (notationRef.current) {
        // Render with explicit drag capabilities enabled for touch interaction matrices
        ABCJS.default.renderAbc(notationRef.current, generateABCString(), {
          responsive: 'resize',
          add_classes: true,
          scale: 0.95,
          dragging: true, // Turns on native vertical note shifting vectors
          clickListener: (abcElem, tuneNumber, classes, analysis, drag) => {
            if (!abcElem || abcElem.el_type !== "note") return;
            
            const staffKeys = ['voice', 'wandindi', 'coro', 'kihembe', 'kigamba'];
            const targetTrack = staffKeys[abcElem.parentStaffIdx];
            if (!targetTrack) return;

            let notesArray = scoreData[targetTrack].split(/\s+/);
            const index = abcElem.tuneNumber - 1;
            if (index < 0 || index >= notesArray.length) return;

            if (drag && drag.step !== 0) {
              // Note Dragged: Recalculate pitch using the drag offset tracking metrics
              let currentMidi = abcToMidiIndex(notesArray[index]) || 60;
              let newMidi = currentMidi - drag.step; 
              notesArray[index] = midiToAbcCharacter(newMidi, targetTrack);
            } else {
              // Note Tapped: Re-apply current selection tool duration lengths
              notesArray[index] = applyDurationModifier(notesArray[index], activeDurationModifier);
            }

            setScoreData(prev => ({ ...prev, [targetTrack]: notesArray.join(" ") }));
          }
        });
      }
    });
  }, [scoreData, lyrics, timeSignature, activeDurationModifier]);

  const abcToMidiIndex = (abc) => {
    if (!abc || abc.includes('z')) return 60;
    const clean = abc.replace(/[^A-G^,_]/g, '');
    const map = { 'C':60, 'D':62, 'E':64, 'F':65, 'G':67, 'A':69, 'B':71 };
    let base = map[clean.replace(/[^A-G]/g, '')] || 60;
    if (clean.includes('^')) base += 1;
    if (clean.includes('_')) base -= 1;
    if (clean.includes(',,')) base -= 24;
    else if (clean.includes(',')) base -= 12;
    return base;
  };

  const midiToAbcCharacter = (midi, track) => {
    if (track === 'kihembe' || track === 'kigamba') return 'F';
    const notes = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];
    let octave = Math.floor(midi / 12) - 5;
    let name = notes[midi % 12];
    if (octave < 0) {
      name += (octave === -2) ? ",," : ",";
    }
    return name;
  };

  const applyDurationModifier = (noteBase, mod) => {
    let cleanNote = noteBase.replace(/[\d\/>]+/g, '');
    if (mod === 'normal') return cleanNote;
    if (mod === 'double') return cleanNote + "2";
    if (mod === 'half') return cleanNote + "/2";
    if (mod === 'dotted') return cleanNote + ">"; // ABC dynamic symbol for dotted notes
    return noteBase;
  };

  return (
    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ color: '#4CAF50', margin: 0, fontSize: '15px' }}>🎼 Interaction Score Matrix</h3>
        <span style={{ fontSize: '11px', color: '#888' }}>Drag notes vertically to change pitch</span>
      </div>
      <div ref={notationRef} style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '4px', overflowX: 'auto' }} />
    </div>
  );
}
