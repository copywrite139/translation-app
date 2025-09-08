export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>🌎 Micro Translation Drills</h1>
      <p>ATA-style Spanish to English translation practice</p>
      <div style={{ marginTop: '2rem' }}>
        <h2>Welcome!</h2>
        <p>Your translation practice app is working!</p>
        <button style={{ 
          padding: '10px 20px', 
          backgroundColor: '#0070f3', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          Start Practice (Coming Soon)
        </button>
      </div>
    </div>
  )
}