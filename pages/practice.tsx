import { useState } from 'react'

const comprehensivePractice = [
  {
    id: 1,
    spanish: 'El congresista mexicano José Ramírez se reunió con el secretario de Estado.',
    english: 'Mexican Congressman José Ramírez met with the Secretary of State.',
    domain: "political",
    difficulty: "B2",
    focus: ["title-capitalization", "proper-names", "government-titles"],
    errors_to_catch: ["Congressman vs congressman", "Secretary of State vs secretary", "Nationality adjectives"]
  },
  {
    id: 2,
    spanish: 'El Congreso de los Estados Unidos aprobó la ley por mayoría.',
    english: 'The United States Congress approved the law by majority.',
    domain: "political", 
    difficulty: "B1",
    focus: ["institution-names", "country-names"],
    errors_to_catch: ["Congress vs congress", "United States formatting"]
  },
  {
    id: 3,
    spanish: 'La senadora demócrata del estado de California criticó la propuesta republicana.',
    english: 'The Democratic senator from the state of California criticized the Republican proposal.',
    domain: "political",
    difficulty: "B2", 
    focus: ["party-names", "state-references", "political-adjectives"],
    errors_to_catch: ["Democratic vs democratic", "Republican vs republican", "California capitalization"]
  },
  {
    id: 4,
    spanish: '"La situación es crítica", declaró el presidente del Banco Central Europeo.',
    english: '"The situation is critical," declared the president of the European Central Bank.',
    domain: "financial",
    difficulty: "B2",
    focus: ["quotation-marks", "institutional-titles", "bank-names"],
    errors_to_catch: ["Quote punctuation", "President vs president", "European Central Bank"]
  },
  {
    id: 5,
    spanish: 'El doctor García, jefe del departamento de cardiología, publicó un estudio en la revista Nature.',
    english: 'Dr. García, head of the cardiology department, published a study in Nature magazine.',
    domain: "medical",
    difficulty: "C1",
    focus: ["professional-titles", "department-names", "publication-names"],
    errors_to_catch: ["Dr. vs Doctor", "Cardiology Department vs department", "Nature italics"]
  },
  {
    id: 6,
    spanish: 'La Universidad de Harvard y el Instituto Tecnológico de Massachusetts colaboran en el proyecto.',
    english: 'Harvard University and the Massachusetts Institute of Technology are collaborating on the project.',
    domain: "academic",
    difficulty: "B2",
    focus: ["university-names", "proper-name-order", "institutional-formatting"],
    errors_to_catch: ["Harvard University vs University of Harvard", "MIT vs spelled out", "Article usage"]
  },
  {
    id: 7,
    spanish: 'El papa Francisco se reunió con el primer ministro italiano en el Vaticano.',
    english: 'Pope Francis met with the Italian Prime Minister at the Vatican.',
    domain: "religious",
    difficulty: "B2", 
    focus: ["religious-titles", "government-titles", "place-names"],
    errors_to_catch: ["Pope vs pope", "Prime Minister vs prime minister", "Italian capitalization"]
  },
  {
    id: 8,
    spanish: 'Según el artículo 23 de la Constitución española, todos los ciudadanos son iguales.',
    english: 'According to Article 23 of the Spanish Constitution, all citizens are equal.',
    domain: "legal",
    difficulty: "B2",
    focus: ["legal-documents", "article-numbering", "nationality-adjectives"],
    errors_to_catch: ["Article vs article", "Spanish Constitution", "Legal formatting"]
  },
  {
    id: 9,
    spanish: 'La empresa IBM anunció una inversión de 50,3 millones de dólares para el primer trimestre.',
    english: 'IBM announced an investment of $50.3 million for the first quarter.',
    domain: "business",
    difficulty: "B2",
    focus: ["company-names", "currency-formatting", "decimal-numbers", "ordinal-numbers"],
    errors_to_catch: ["Dollar sign placement", "Decimal point vs comma", "first quarter vs Q1"]
  },
  {
    id: 10,
    spanish: '"No obstante", agregó el ministro de Economía, "la inflación del 3,2% está controlada".',
    english: '"Nevertheless," added the Minister of Economy, "the 3.2% inflation is under control."',
    domain: "governmental",
    difficulty: "C1",
    focus: ["split-quotations", "ministerial-titles", "percentage-formatting"],
    errors_to_catch: ["Quote interruption punctuation", "Minister vs minister", "Percentage spacing"]
  },
  {
    id: 11,
    spanish: 'El Tratado de Lisboa, firmado en diciembre de 2007, modificó los tratados de la Unión Europea.',
    english: 'The Treaty of Lisbon, signed in December 2007, amended the treaties of the European Union.',
    domain: "legal",
    difficulty: "C1",
    focus: ["treaty-names", "date-formatting", "international-organizations"],
    errors_to_catch: ["Treaty capitalization", "Lisbon vs Lisboa", "European Union formatting"]
  },
  {
    id: 12,
    spanish: 'La Organización Mundial de la Salud (OMS) publicó nuevas directrices sobre la covid-19.',
    english: 'The World Health Organization (WHO) published new guidelines on COVID-19.',
    domain: "medical",
    difficulty: "B2",
    focus: ["organization-names", "acronyms", "disease-names"],
    errors_to_catch: ["WHO vs OMS", "COVID-19 vs covid-19", "World Health Organization"]
  },
  {
    id: 13,
    spanish: 'El juez Smith del Tribunal Supremo de Justicia dictó sentencia el martes pasado.',
    english: 'Justice Smith of the Supreme Court of Justice handed down the ruling last Tuesday.',
    domain: "legal",
    difficulty: "C1",
    focus: ["judicial-titles", "court-names", "day-references"],
    errors_to_catch: ["Justice vs Judge", "Supreme Court formatting", "Tuesday capitalization"]
  },
  {
    id: 14,
    spanish: 'La guerra de Vietnam terminó en abril de 1975, según los historiadores.',
    english: 'The Vietnam War ended in April 1975, according to historians.',
    domain: "historical",
    difficulty: "B1",
    focus: ["war-names", "country-names", "date-formatting"],
    errors_to_catch: ["Vietnam War vs war of Vietnam", "April capitalization", "Date format"]
  },
  {
    id: 15,
    spanish: 'El presidente ejecutivo de Microsoft, Satya Nadella, anunció una nueva estrategia.',
    english: 'Microsoft CEO Satya Nadella announced a new strategy.',
    domain: "business",
    difficulty: "B2",
    focus: ["executive-titles", "company-names", "name-order"],
    errors_to_catch: ["CEO vs President Executive", "Microsoft formatting", "Name spelling"]
  }
]

export default function Practice() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userTranslation, setUserTranslation] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [sessionStats, setSessionStats] = useState({ completed: 0, correct: 0 })

  const currentSentence = comprehensivePractice[currentIndex]

  const analyzeTranslation = () => {
    setShowAnswer(true)
    
    const userText = userTranslation.trim()
    const correctText = currentSentence.english
    
    let points = 0
    let feedbackItems = []
    
    // Check for exact match
    if (userText === correctText) {
      points = 40
      feedbackItems.push("Perfect translation!")
    } else {
      // Check specific error patterns
      const userLower = userText.toLowerCase()
      const correctLower = correctText.toLowerCase()
      
      // Basic content check
      if (userLower.includes(correctLower.split(' ')[0])) {
        points += 10
        feedbackItems.push("Good start")
      }
      
      // Capitalization checks based on focus areas
      if (currentSentence.focus.includes('title-capitalization')) {
        if (userText.includes('Congressman') || userText.includes('Secretary')) {
          points += 10
          feedbackItems.push("Correct title capitalization")
        } else if (userText.includes('congressman') || userText.includes('secretary')) {
          feedbackItems.push("Check title capitalization")
        }
      }
      
      if (currentSentence.focus.includes('quotation-marks')) {
        if (userText.includes(',"') || userText.includes('."')) {
          points += 5
          feedbackItems.push("Correct quote punctuation")
        } else {
          feedbackItems.push("Review quotation mark placement")
        }
      }
      
      if (currentSentence.focus.includes('percentage-formatting')) {
        if (userText.includes('3.2%') && !userText.includes('3,2%')) {
          points += 5
          feedbackItems.push("Correct percentage format")
        }
      }
      
      // Length similarity check
      const lengthRatio = userText.length / correctText.length
      if (lengthRatio > 0.8 && lengthRatio < 1.2) {
        points += 10
        feedbackItems.push("Appropriate length")
      }
      
      // Vocabulary check
      const userWords = userText.toLowerCase().split(/\W+/)
      const correctWords = correctText.toLowerCase().split(/\W+/)
      const matchedWords = userWords.filter(word => correctWords.includes(word))
      
      if (matchedWords.length / correctWords.length > 0.6) {
        points += 10
        feedbackItems.push("Good vocabulary choices")
      }
    }
    
    setScore(score + points)
    setFeedback(feedbackItems.join('. ') || 'Compare with the expected translation')
    
    if (points >= 25) {
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }))
    }
  }

  const nextSentence = () => {
    setSessionStats(prev => ({ ...prev, completed: prev.completed + 1 }))
    
    if (currentIndex < comprehensivePractice.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setUserTranslation('')
      setShowAnswer(false)
      setFeedback('')
    } else {
      const accuracy = Math.round((sessionStats.correct / comprehensivePractice.length) * 100)
      alert(`Practice Complete!\nFinal Score: ${score}\nAccuracy: ${accuracy}%\nSentences Completed: ${comprehensivePractice.length}`)
    }
  }

  const resetPractice = () => {
    setCurrentIndex(0)
    setUserTranslation('')
    setShowAnswer(false)
    setScore(0)
    setFeedback('')
    setSessionStats({ completed: 0, correct: 0 })
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Professional Translation Practice</h1>
      <h2>Capitalization, Punctuation & Formatting Focus</h2>
      
      {/* Stats Dashboard */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <strong>Progress</strong><br/>
          {currentIndex + 1}/{comprehensivePractice.length}
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>Score</strong><br/>
          {score} points
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>Domain</strong><br/>
          {currentSentence.domain}
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>Level</strong><br/>
          {currentSentence.difficulty}
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>Accuracy</strong><br/>
          {sessionStats.completed > 0 ? Math.round((sessionStats.correct / sessionStats.completed) * 100) : 0}%
        </div>
      </div>

      {/* Practice Interface */}
      <div style={{ border: '2px solid #ddd', padding: '2rem', borderRadius: '12px', marginBottom: '2rem' }}>
        
        {/* Focus Areas */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
          <strong>Focus Areas:</strong> {currentSentence.focus.join(', ')}<br/>
          <strong>Watch for:</strong> {currentSentence.errors_to_catch.join(' • ')}
        </div>

        {/* Spanish Source */}
        <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#e8f4fd', borderRadius: '8px', border: '1px solid #b6d7ff' }}>
          <strong>Spanish Source:</strong><br/>
          <span style={{ fontSize: '18px', lineHeight: '1.4' }}>{currentSentence.spanish}</span>
        </div>

        {/* Translation Input */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            Your Professional Translation:
          </label>
          <textarea
            value={userTranslation}
            onChange={(e) => setUserTranslation(e.target.value)}
            disabled={showAnswer}
            rows={4}
            style={{ 
              width: '100%', 
              padding: '15px', 
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontFamily: 'Arial, sans-serif',
              lineHeight: '1.4'
            }}
            placeholder="Focus on capitalization, punctuation, and formatting..."
          />
        </div>

        {/* Results */}
        {showAnswer && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem', padding: '1.5rem', backgroundColor: '#d4edda', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
              <strong>Professional Translation:</strong><br/>
              <span style={{ fontSize: '18px', lineHeight: '1.4' }}>{currentSentence.english}</span>
            </div>
            
            <div style={{ padding: '1rem', backgroundColor: '#e2e3e5', borderRadius: '6px' }}>
              <strong>Analysis:</strong> {feedback}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {!showAnswer ? (
            <button
              onClick={analyzeTranslation}
              disabled={!userTranslation.trim()}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: userTranslation.trim() ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: userTranslation.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Analyze Translation
            </button>
          ) : (
            <>
              <button
                onClick={nextSentence}
                style={{
                  padding: '15px 30px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {currentIndex < comprehensivePractice.length - 1 ? 'Next Sentence →' : 'Complete Practice'}
              </button>
              <button
                onClick={() => {
                  setUserTranslation('')
                  setShowAnswer(false)
                  setFeedback('')
                }}
                style={{
                  padding: '15px 30px',
                  fontSize: '16px',
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Retry This Sentence
              </button>
            </>
          )}
          
          <button
            onClick={resetPractice}
            style={{
              padding: '15px 30px',
              fontSize: '16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reset Practice
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ textAlign: 'center' }}>
        <a href="/" style={{ color: '#007bff', fontSize: '16px', textDecoration: 'none' }}>
          ← Back to Home
        </a>
      </div>
    </div>
  )
}