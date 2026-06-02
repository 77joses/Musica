import Head from 'next/head';
import AppLayout from '../components/AppLayout';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Gĩkũyũ Studio MIDI Notation App</title>
        <meta name="description" content="Voice to MIDI Score Editor with Gĩkũyũ Algorithmic Instruments" />
      </Head>

      <main style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
        <h1 style={{ color: '#4CAF50', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Gĩkũyũ Studio Workstation</h1>
        <AppLayout />
      </main>
    </div>
  );
}
