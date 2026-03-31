import { useState, useEffect, useRef } from 'react';
import { generateQuestions, evaluateAnswer } from './services/aiGenerator';
import { getNextQuestion, recordAnswer, getWeakPoints, addGeneratedQuestions, getProgressStats } from './services/questionService';
import { supabase } from './lib/supabaseClient';
import './index.css';
import LegalModal from './components/LegalModal';

function App() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  
  const [isGenerating, setIsGenerating] = useState(true);
  const [stats, setStats] = useState({ total: 0, learned: 0, review: 0, unanswered: 0 });
  
  const inputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      initQuestion();
    }
  }, [session]);

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

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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

      // === NEW: Supabaseへのデータ永続化 ===
      if (session?.user?.id) {
        try {
          const { error: dbErr } = await supabase.from('learning_history').insert({
            user_id: session.user.id,
            question: currentQ.ja,
            user_answer: userInput,
            is_correct: isCorrect,
            feedback: message
          });
          if (dbErr) console.error("Supabase Save Error:", dbErr);
        } catch (dbErr) {
          console.error("DB Save Exception:", dbErr);
        }
      }

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

  if (isAuthLoading) {
    return (
      <div className="app-container">
        <header className="header">
          <h1>Shunkan English</h1>
        </header>
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
          <div className="loading-box" style={{ width: '100%', padding: '4rem 1rem' }}>
             <div className="spinner"></div>
             <h3>認証情報を確認中...</h3>
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-container">
        <header className="header">
          <h1>Shunkan English</h1>
          <p className="subtitle">AI Coach - Dynamic Ebbinghaus Loop</p>
        </header>

        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '2rem' }}>学習履歴を記録しましょう！</h2>
            <button 
              onClick={signInWithGoogle} 
              className="btn btn-primary" 
              style={{ padding: '0.75rem 1.5rem', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.8rem', margin: '0 auto' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google アカウントでログイン
            </button>
          </div>
        </main>
        <LegalModal />
      </div>
    );
  }

  if (isGenerating && !currentQ) {
    return (
      <div className="app-container">
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Shunkan English</h1>
            <p className="subtitle">AI Coach - CEFR B2 Level</p>
          </div>
          <div className="auth-section">
            <span style={{ fontSize: '0.9rem', color: '#64748B' }}>準備中...</span>
          </div>
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
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Shunkan English</h1>
          <p className="subtitle">AI Coach - Dynamic Ebbinghaus Loop</p>
        </div>
        <div className="auth-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748B' }}>
              こんにちは, {session.user.user_metadata.full_name || 'ゲスト'}さん
            </span>
            <button 
              onClick={signOut} 
              className="btn" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
            >
              ログアウト
            </button>
          </div>
        </div>
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
      
      <LegalModal />
    </div>
  );
}

export default App;
