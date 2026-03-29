const STORAGE_KEY = 'shunkan_english_questions';

// エビングハウスの復習スパン（1分, 10分, 1日, 3日, 7日, 14日, 30日）
const REVIEW_INTERVALS = [
  60 * 1000,                   // 1分後
  10 * 60 * 1000,              // 10分後
  24 * 60 * 60 * 1000,         // 1日後
  3 * 24 * 60 * 60 * 1000,     // 3日後
  7 * 24 * 60 * 60 * 1000,     // 7日後
  14 * 24 * 60 * 60 * 1000,    // 14日後
  30 * 24 * 60 * 60 * 1000     // 30日後
];

export const loadAllQuestions = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveAllQuestions = (questions) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
};

export const addGeneratedQuestions = (newQuestions) => {
  const current = loadAllQuestions();
  saveAllQuestions([...current, ...newQuestions]);
};

export const getNextQuestion = () => {
  const all = loadAllQuestions();
  const now = Date.now();

  // 1. 復習タイミングを過ぎているものを探す
  const reviewCandidates = all.filter(q => q.status === 'review' && q.nextReviewTime <= now);
  if (reviewCandidates.length > 0) {
    return reviewCandidates[Math.floor(Math.random() * reviewCandidates.length)];
  }

  // 2. 未回答のものを探す
  const unasked = all.filter(q => q.status === 'unanswered');
  if (unasked.length > 0) {
    return unasked[Math.floor(Math.random() * unasked.length)];
  }

  // 全て枯渇した場合は null を返す（再生成のトリガー）
  return null;
};

export const recordAnswer = (id, isCorrect, mistakeText = "") => {
  const all = loadAllQuestions();
  const idx = all.findIndex(q => q.id === id);
  if (idx === -1) return;

  const q = all[idx];

  if (isCorrect) {
    if (q.status === 'unanswered') {
      q.status = 'learned'; // 1発クリア
      q.reviewLevel = REVIEW_INTERVALS.length;
    } else if (q.status === 'review') {
      q.reviewLevel += 1;
      if (q.reviewLevel >= REVIEW_INTERVALS.length) {
        q.status = 'learned'; // 全ての復習フェーズクリア
      } else {
        q.nextReviewTime = Date.now() + REVIEW_INTERVALS[q.reviewLevel];
      }
    }
  } else {
    // 不正解の場合は復習キューに入る、もしくは復習レベルが巻き戻る
    q.status = 'review';
    q.reviewLevel = 0; 
    q.nextReviewTime = Date.now() + REVIEW_INTERVALS[0];
    
    if (mistakeText) {
      if (!q.mistakes) q.mistakes = [];
      q.mistakes.push(`[お題]: ${q.ja} / [誤答]: ${mistakeText}`);
      // 最大5件保存
      if (q.mistakes.length > 5) q.mistakes.shift();
    }
  }

  all[idx] = q;
  saveAllQuestions(all);
};

export const getWeakPoints = (limit = 10) => {
  const all = loadAllQuestions();
  const mistakes = [];
  all.forEach(q => {
    if (q.mistakes && q.mistakes.length > 0) {
      mistakes.push(...q.mistakes);
    }
  });
  return mistakes.slice(-limit);
};

export const getProgressStats = () => {
  const all = loadAllQuestions();
  return {
    total: all.length,
    learned: all.filter(q => q.status === 'learned').length,
    review: all.filter(q => q.status === 'review').length,
    unanswered: all.filter(q => q.status === 'unanswered').length
  };
};
