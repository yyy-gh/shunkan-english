import { GoogleGenerativeAI } from '@google/generative-ai';

// APIキーの漏洩を防ぐため、本番環境（デプロイ後）は Vercel バックエンド (/api/*) に通信を委譲します。
// ローカルでの開発中のみ、Vercel CLIのローカル起動バグを避けるため直接のGemini通信を並行稼働させます。

export const generateQuestions = async (count = 20, weakPoints = []) => {
  if (!import.meta.env.DEV) {
    // 【本番環境（全世界公開時）】 バックエンド経由で安全に通信
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, weakPoints })
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      
      const questions = await res.json();
      return questions.map(q => ({
        ...q,
        id: crypto.randomUUID(),
        status: 'unanswered',
        reviewLevel: 0,
        nextReviewTime: null,
        mistakes: []
      }));
    } catch (error) {
      console.error("Failed to fetch generated questions:", error);
      throw error;
    }
  }

  // 【ローカル開発環境（npm run dev）】 ブラウザから直接通信
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let weaknessPrompt = "";
  if (weakPoints && weakPoints.length > 0) {
    weaknessPrompt = `
過去にユーザーが以下の内容で間違えました。これらに関連する文法構造や苦手カテゴリを含めた英文を、新しく出題する${count}問のなかに多めに(全体の半分程度)混ぜて作成してください。
【ユーザーの弱点履歴抜粋】:
${weakPoints.join('\n')}
`;
  }

  const prompt = `
あなたはプロの英語教師です。
CEFR B2レベル相当の実践的で自然な「瞬間英作文ターゲット」の問題を ${count} 問、全てJSON形式で生成してください。
返却されるJSONは、以下の形式の配列のみを出力すること。

${weaknessPrompt}

[
  {
    "ja": "もし明日雨が降ったら、試合は延期されるだろう。",
    "en": "If it rains tomorrow, the game will be postponed."
  }
]
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    let responseText = result.response.text();
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(responseText);

    return questions.map(q => ({
      ...q,
      id: crypto.randomUUID(),
      status: 'unanswered',
      reviewLevel: 0,
      nextReviewTime: null,
      mistakes: []
    }));
  } catch (error) {
    console.error("生成エラー:", error);
    throw error;
  }
};

export const evaluateAnswer = async (ja, correctEn, userEn) => {
  if (!import.meta.env.DEV) {
    // 【本番環境】
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ja, correctEn, userEn })
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      return { isCorrect: data.isCorrect, message: data.message };
    } catch (error) {
      console.error("Failed to fetch evaluation:", error);
      throw error;
    }
  }

  // 【ローカル開発環境】
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
あなたはプロの英語教師です。ユーザーがCEFR B2レベルの「瞬間英作文」を行いました。
[お題]: "${ja}"
[模範解答]: "${correctEn || ''}"
[ユーザーの回答]: "${userEn}"

以下のフォーマットで短く日本語で回答してください。
------------------------
【判定】 (Perfect / Good / Needs Work のいずれか)
【フィードバック】 (良かった点、文法ミス、より表現を自然にする提案などを簡潔に2~3文で)
------------------------
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    let isCorrect = true;
    if (text.includes("Needs Work")) {
      isCorrect = false;
    }
    
    return { isCorrect, message: text };
  } catch (error) {
    console.error("添削エラー:", error);
    throw error;
  }
};
