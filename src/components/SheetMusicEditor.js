import React, { useEffect, useRef } from 'react';

export default function SheetMusicEditor({ scoreData, setScoreData, lyrics, setLyrics }) {
  const notationRef = useRef(null);

  // Generates the visual five-staff layout string using standard ABC notation formats
  const generateABCString = () => {
    return `
X:1
T:Gĩkũyũ Studio Workstation Score
M:4/4
L:1/4
K:C
%%staves [1 2 3 4 5]
V:1 name="Voice (Organ)" clef=treble
${scoreData.voice || 'z4'}
w:${lyrics || 'No lyrics added yet'}
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
    // Dynamic import to prevent Server-Side Rendering (SSR) crashes on mobile web deployment
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
      
      {/* Scrollable sheet music viewing container optimized for phone dimensions */}
      <div 
        ref={notationRef} 
        style={{ 
          backgroundColor: '#ffffff', 
          padding: '15px', 
          borderRadius: '4px', 
          color: '#000000',
          overflowX: 'auto',
          minWidth: '100%'
        }}
      />

      {/* Editing Controls Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Edit Song Lyrics (Separate syllables with dashes):
          </label>
          <input 
            type="text" 
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="e.g., Nĩ we-ga Ma-ũ-mũ nĩ tũ-gũ-kena"
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '4px', 
              border: '1px solid #444', 
              backgroundColor: '#333', 
              color: '#fff',
              fontSize: '16px' 
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Quick Workspace Actions:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setScoreData(prev => ({...prev, voice: "C D E F"}))} 
              style={{ 
                flex: 1, 
                backgroundColor: '#333', 
                color: '#fff', 
                border: '1px solid #555', 
                padding: '12px', 
                cursor: 'pointer', 
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
            >
              Reset Voice (C-D-E-F)
            </button>
            
            <button 
              onClick={() => setScoreData(prev => ({
                ...prev, 
                wandindi: "E G A B", 
                coro: "C,, E,, G,, C,", 
                kihembe: "F z F z", 
                kigamba: "z F z F"
              }))} 
              style={{ 
                flex: 1, 
                backgroundColor: '#333', 
                color: '#fff', 
                border: '1px solid #555', 
                padding: '12px', 
                cursor: 'pointer', 
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
            >
              Generate Full Backing Loop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
