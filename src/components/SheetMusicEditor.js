import React, { useEffect, useRef } from 'react';

export default function SheetMusicEditor({ scoreData, setScoreData, lyrics, setLyrics }) {
  const notationRef = useRef(null);

  // Generates the visual multi-staff layout string using standard musical rendering formats
  const generateABCString = () => {
    return `
X:1
T:Gĩkũyũ Studio Workstation Score
M:4/4
L:1/4
K:C
%%staves [1 2 3 4]
V:1 name="Voice (Organ Synth)" clef=treble
${scoreData.voice || 'z4'}
w:${lyrics || 'No lyrics added yet'}
V:2 name="Wandindi (Fiddle)" clef=treble
${scoreData.wandindi || 'z4'}
V:3 name="Coro (Horn)" clef=treble
${scoreData.coro || 'z4'}
V:4 name="Kĩhembe (Drum)" clef=perc
${scoreData.kihembe || 'z4'}
    `.trim();
  };

  useEffect(() => {
    // Dynamic import to prevent SSR rendering crashes during production
    import('abcjs').then((ABCJS) => {
      if (notationRef.current) {
        ABCJS.default.renderAbc(notationRef.current, generateABCString(), {
          responsive: 'resize',
          add_classes: true,
          scale: 1.0
        });
      }
    });
  }, [scoreData, lyrics]);

  return (
    <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
      <h2 style={{ color: '#4CAF50', marginTop: 0 }}>🎼 Multi-Staff Editor</h2>
      
      {/* Visual Render Window */}
      <div 
        ref={notationRef} 
        style={{ 
          backgroundColor: '#ffffff', 
          padding: '15px', 
          borderRadius: '4px', 
          color: '#000000',
          overflowX: 'auto'
        }}
      />

      {/* Editing Controls & Lyrics Input Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Edit Song Lyrics (Space out syllables):</label>
          <input 
            type="text" 
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="e.g., Nĩ we-ga Ma-ũ-mũ nĩ tũ-gũ-kena"
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#333', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Quick Editor (Manual Notation Tweak):</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setScoreData(prev => ({...prev, voice: "C D E F"}))}
              style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
            >
              Reset Voice to C-D-E-F
            </button>
            <button 
              onClick={() => setScoreData(prev => ({...prev, wandindi: "E G A B", coro: "C,, E,, G,, C,", kihembe: "F z F z"}))}
              style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
            >
              Generate Gĩkũyũ Backing Loop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
