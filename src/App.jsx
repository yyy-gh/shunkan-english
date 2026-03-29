import { useState, useEffect, useRef } from 'react';
import { generateQuestions, evaluateAnswer } from './services/aiGenerator';
import { getNextQuestion, recordAnswer, getWeakPoints, addGeneratedQuestions, getProgressStats } from './services/questionService';
import './index.css';

function App() {
  const [currentQ, setCurrentQ] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  
  const [isGenerating, setIsGenerating] = useState(true);
  const [stats, setStats] = useState({ total: 0, learned: 0, review: 0, unanswered: 0 });
  
  const inputRef = useRef(null);

  useEffect(() => {
    initQuestion();
  }, []);

  const initQuestion = async () => {
    setIsGenerating(true);
    let next = getNextQuestion();
    
    // もしローカルにストック問題が枯渇していたら、AIに20問作らせて補充する（オートリフィル機能）
    if (!next) {
      try {
        const weakPoints = getWeakPoints(5); // 過去の間違いトップ5を抽出
        const newQs = await generateQuestions(20, weakPoints);
        addGeneratedQuestions(newQs);
        next = getNextQuestion(); // 補充したので改めて1問目を取得
      } catch (err) {
        console.error("生成エラー", err);
        alert("自動問題生成に失敗しました。APIキーを確認してリロードしてください。");
        setIsGenerating(false);
        return; 
      }
    }
    
    setStats(getProgressStats());
    setCurrentQ(next);
    setUserInput('');
    setShowResult(false);
    setAiFeedback(null);
    setIsGenerating(false);
  };

  useEffect(() => {
    if (!showResult && !isGenerating && currentQ && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showResult, isGenerating, currentQ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 思考中・生成中の時はショートカットを無効化
      if (isEvaluating || isGenerating || !currentQ) return;

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
  }, [showResult, userInput, isEvaluating, isGenerating, currentQ]);

  const handleCheck = async () => {
    if (!userInput.trim() || !currentQ) return;
    
    setShowResult(true);
    setIsEvaluating(true);
    setAiFeedback(null);

    try {
      // AI添削
      const { isCorrect, message } = await evaluateAnswer(currentQ.ja, currentQ.en, userInput);

      setAiFeedback({
        isCorrect,
        message
      });

      // エビングハウス（忘却曲線）の記憶ロジック呼び出し
      // 間違えた場合（Needs Work判定）、どんな英文を入れて間違えたのかを記録して次回の生成プロンプトに活かす
      recordAnswer(currentQ.id, isCorrect, isCorrect ? "" : userInput);

    } catch (error) {
      console.error("AI Error:", error);
      setAiFeedback({
        isCorrect: false,
        message: "⚠️ AIによる添削処理に失敗しました。"
      });
      // フェイルセーフ：エラー時は一旦不正解（1分後復習）扱いにして学習サイクルを止めない
      recordAnswer(currentQ.id, false, "API Error");
    } finally {
      setIsEvaluating(false);
      setStats(getProgressStats()); // 結果に応じた学習進捗数の更新
    }
  };

  const handleNext = () => {
    initQuestion(); // 次の問題へ（枯渇していれば自動でAI思考モードに入る）
  };

  if (isGenerating && !currentQ) {
    return (
      <div className="app-container">
        <header className="header">
          <h1>Shunkan English</h1>
          <p className="subtitle">AI Coach - CEFR B2 Level</p>
        </header>

        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
          <div className="loading-box" style={{ width: '100%', padding: '4rem 1rem' }}>
            <div className="spinner"></div>
            <h3>Generating Questions...</h3>
            <p style={{ marginTop: '1rem', color: '#64748b', textAlign: 'center' }}>
              あなたのための専用問題（20問）をAIが自動構築しています。<br/>
              （初回のみ約10〜15秒ほどかかります）
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Shunkan English</h1>
        <p className="subtitle">AI Coach - Dynamic Ebbinghaus Loop</p>
      </header>

      <main className="main-content">
        <div className="card">
          <div className="progress" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {currentQ?.status === 'review' ? '🔄 復習問題 (Review)' : '🆕 新規出題 (New)'}
            </span>
            <span style={{ color: '#64748B', fontWeight: '500' }}>
               習得済み: {stats.learned} / 未出題: {stats.unanswered} / 復習待ち: {stats.review}
            </span>
          </div>
          
          <div className="question-box">
            <h2>{currentQ?.ja}</h2>
          </div>

          <div className="input-section">
            <textarea 
              ref={inputRef}
              className="english-input" 
              placeholder="ここに英語を入力してください..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={showResult || isEvaluating}
            />
          </div>

          {showResult ? (
            <div className="result-area">
              {isEvaluating ? (
                <div className="loading-box">
                  <div className="spinner"></div>
                  <p>AI Coach is evaluating your sentence...</p>
                </div>
              ) : (
                <div className={`result-box ${aiFeedback?.isCorrect ? 'correct' : 'ai-feedback-box'}`}>
                  <h3>{aiFeedback?.isCorrect ? '✨ Excellent! (完全習得)' : '📝 Needs Work (復習対象)'}</h3>
                  
                  <div className="answer-comparison">
                    <div className="answer-item correct-answer">
                      <span className="answer-label">模範解答例:</span>
                      <p>{currentQ?.en}</p>
                    </div>
                  </div>

                  <div className="ai-message">
                    {aiFeedback?.message.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>

                  <button 
                    className="btn btn-primary mt-4" 
                    onClick={handleNext}
                    disabled={isGenerating}
                  >
                    {isGenerating ? '問題を補充中...' : '次の問題へ (Ctrl + Enter)'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="action-box">
              <button 
                className="btn btn-primary" 
                onClick={handleCheck}
                disabled={!userInput.trim() || isGenerating}
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
