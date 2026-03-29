import { useState, useEffect, useRef } from 'react';
import './index.css';

const QUESTIONS = [
  {
    id: 1,
    ja: "そのプロジェクトは来月末までに完了する予定だ。",
    en: "The project is expected to be completed by the end of next month."
  },
  {
    id: 2,
    ja: "もし明日雨が降ったら、試合は延期されるだろう。",
    en: "If it rains tomorrow, the game will be postponed."
  },
  {
    id: 3,
    ja: "彼はその問題の解決策を見つけたに違いない。",
    en: "He must have found a solution to the problem."
  },
  {
    id: 4,
    ja: "彼女のプレゼンテーションは非常に説得力があった。",
    en: "Her presentation was highly convincing."
  },
  {
    id: 5,
    ja: "会議が始まった時、私はちょうど到着したところだった。",
    en: "I had just arrived when the meeting started."
  }
];

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef(null);

  const currentQ = QUESTIONS[currentIndex];

  useEffect(() => {
    if (!showResult && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showResult]);

  const handleCheck = () => {
    if (!userInput.trim()) return;
    setShowResult(true);
  };

  const handleNext = () => {
    setUserInput('');
    setShowResult(false);
    setCurrentIndex((prev) => (prev + 1) % QUESTIONS.length);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (showResult) {
          handleNext();
        } else {
          handleCheck();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResult, userInput]);

  // 簡易判定 (句読点や大文字小文字の違いを吸収するため、全部小文字＆記号除去で比較)
  const normalize = (str) => str.toLowerCase().replace(/[.,!?\s]/g, "");
  const isCorrect = normalize(userInput) === normalize(currentQ.en);

  return (
    <div className="app-container">
      <header className="header">
        <h1>Shunkan English</h1>
        <p className="subtitle">CEFR B2 Level - MVP Version</p>
      </header>

      <main className="main-content">
        <div className="card">
          <div className="progress">Question {currentIndex + 1} / {QUESTIONS.length}</div>
          
          <div className="question-box">
            <h2>{currentQ.ja}</h2>
          </div>

          <div className="input-section">
            <textarea 
              ref={inputRef}
              className="english-input" 
              placeholder="ここに英語を入力してください..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={showResult}
              autoFocus
            />
          </div>

          {showResult ? (
            <div className={`result-box ${isCorrect ? 'correct' : 'review'}`}>
              <h3>{isCorrect ? '✨ Perfect!' : '📝 Review (自己採点)'}</h3>
              <div className="answer-comparison">
                <div className="answer-item">
                  <span className="answer-label">あなたの回答:</span>
                  <p>{userInput}</p>
                </div>
                <div className="answer-item correct-answer">
                  <span className="answer-label">模範解答:</span>
                  <p>{currentQ.en}</p>
                </div>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleNext}
                autoFocus
              >
                次の問題へ (Ctrl + Enter)
              </button>
            </div>
          ) : (
            <div className="action-box">
              <button 
                className="btn btn-primary" 
                onClick={handleCheck}
                disabled={!userInput.trim()}
              >
                判定する (Ctrl + Enter)
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
