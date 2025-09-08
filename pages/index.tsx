import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>🌎 Micro Translation Drills</h1>
      <p>ATA-style Spanish to English translation practice</p>
      <div style={{ marginTop: '2rem' }}>
        <h2>Welcome!</h2>
        <p>Practice Spanish to English translation with instant feedback</p>
        <Link href="/practice">
          <button style={{ 
            padding: '15px 30px', 
            backgroundColor: '#0070f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Start Practice Now
          </button>
        </Link>
      </div>
    </div>
  )
}