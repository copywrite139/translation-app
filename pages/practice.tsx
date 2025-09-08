import { useState } from 'react'

const sampleSentences = [
  {
    id: 1,
    spanish: "El perito juró que el informe era fiel a los hechos.",
    english: "The expert witness swore that the report was faithful to the facts.",
    domain: "legal"
  },
  {
    id: 2,
    spanish: "La dosis debe administrarse cada seis horas.",
    english: "The dose must be administered every six hours.",
    domain: "medical"
  },
  {
    id: 3,
    spanish: "Los datos son insuficientes para una conclusión definitiva.",
    english: "The data are insufficient for a definitive conclusion.",
    domain: "academic"
  }
]

export default function Practice() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userTranslation, setUserTranslation] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(0)

  const currentSentence = sampleSentences[currentIndex]

  const checkTranslation = () => {
    setShowAnswer(true)
    // Simple scoring: exact match = 40 points, similar = 20 points
    const userLower = userTranslation.toLowerCase().trim()
    const correctLower = currentSentence.english.toLowerCase()
    
    if (userLower === correctLower) {
      setScore(score + 40)
    } else if (userLower.includes('expert') || userLower.includes('dose') || userLower.includes('data')) {
      setScore(score + 20)
    }
  }

  const nextSentence = () => {
    setCompleted(completed + 1)
    if (currentIndex < sampleSentences.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setUserTranslation('')
      setShowAnswer(false)
    } else {
      alert(`Practice complete! Final score: ${score}/${sampleSentences.length * 40}`)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Translation Practice</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <strong>Progress:</strong> {completed}/{sampleSentences.length} | 
        <strong> Score:</strong> {score} points
      </div>

      <div style={{ border: '1px solid #ccc', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <strong>Domain:</strong> {currentSentence.domain}
        </div>
        
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <strong>Spanish:</strong> {currentSentence.spanish}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label><strong>Your English Translation:</strong></label>
          <textarea
            value={userTranslation}
            onChange={(e) => setUserTranslation(e.target.value)}
            disabled={showAnswer}
            rows={3}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginTop: '10px',
              fontFamily: 'Arial, sans-serif',
              fontSize: '16px'
            }}
            placeholder="Type your translation here..."
          />
        </div>

        {showAnswer && (
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
            <strong>Correct Answer:</strong> {currentSentence.english}
          </div>
        )}

        <div>
          {!showAnswer ? (
            <button
              onClick={checkTranslation}
              disabled={!userTranslation.trim()}
              style={{
                padding: '12px 24px',
                backgroundColor: userTranslation.trim() ? '#0070f3' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: userTranslation.trim() ? 'pointer' : 'not-allowed',
                fontSize: '16px'
              }}
            >
              Check Translation
            </button>
          ) : (
            <button
              onClick={nextSentence}
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
              {currentIndex < sampleSentences.length - 1 ? 'Next Sentence' : 'Finish Practice'}
            </button>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <a href="/" style={{ color: '#0070f3' }}>← Back to Home</a>
      </div>
    </div>
  )
}