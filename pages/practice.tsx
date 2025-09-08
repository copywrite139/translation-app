import { useState } from 'react'

export default function Practice() {
  const [customSpanish, setCustomSpanish] = useState('')
  const [userTranslation, setUserTranslation] = useState('')
  const [showTranslation, setShowTranslation] = useState(false)
  const [practiceMode, setPracticeMode] = useState('custom') // 'sample' or 'custom'

  const sampleSentences = [
    {
      spanish: "El perito juró que el informe era fiel a los hechos.",
      domain: "legal"
    },
    {
      spanish: "La dosis debe administrarse cada seis horas.",
      domain: "medical"
    }
  ]

  const handleSubmitTranslation = () => {
    setShowTranslation(true)
  }

  const resetPractice = () => {
    setCustomSpanish('')
    setUserTranslation('')
    setShowTranslation(false)
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Translation Practice</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setPracticeMode('custom')}
          style={{
            padding: '10px 20px',
            backgroundColor: practiceMode === 'custom' ? '#0070f3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            marginRight: '10px'
          }}
        >
          Custom Text
        </button>
        <button
          onClick={() => setPracticeMode('sample')}
          style={{
            padding: '10px 20px',
            backgroundColor: practiceMode === 'sample' ? '#0070f3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Sample Sentences
        </button>
      </div>

      {practiceMode === 'custom' && (
        <div style={{ border: '1px solid #ccc', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3>Practice with Your Own Text</h3>
          
          <div style={{ marginBottom: '2rem' }}>
            <label><strong>Spanish Text to Translate:</strong></label>
            <textarea
              value={customSpanish}
              onChange={(e) => setCustomSpanish(e.target.value)}
              rows={6}
              style={{ 
                width: '100%', 
                padding: '10px', 
                marginTop: '10px',
                fontFamily: 'Arial, sans-serif',
                fontSize: '16px'
              }}
              placeholder="Paste your Spanish text here..."
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label><strong>Your English Translation:</strong></label>
            <textarea
              value={userTranslation}
              onChange={(e) => setUserTranslation(e.target.value)}
              rows={6}
              style={{ 
                width: '100%', 
                padding: '10px', 
                marginTop: '10px',
                fontFamily: 'Arial, sans-serif',
                fontSize: '16px'
              }}
              placeholder="Type your English translation here..."
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={handleSubmitTranslation}
              disabled={!customSpanish.trim() || !userTranslation.trim()}
              style={{
                padding: '12px 24px',
                backgroundColor: (customSpanish.trim() && userTranslation.trim()) ? '#0070f3' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: (customSpanish.trim() && userTranslation.trim()) ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                marginRight: '10px'
              }}
            >
              Save Translation
            </button>
            
            <button
              onClick={resetPractice}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              New Practice
            </button>
          </div>

          {showTranslation && (
            <div style={{ padding: '1rem', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
              <h4>Your Translation Saved!</h4>
              <p>You can now review your work or start a new translation.</p>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <a href="/" style={{ color: '#0070f3' }}>← Back to Home</a>
      </div>
    </div>
  )
}