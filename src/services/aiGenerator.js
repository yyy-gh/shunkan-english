import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

export const generateQuestions = async (count = 20, weakPoints = []) => {
  if (!genAI) throw new Error("API Key is missing or invalid");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let weaknessPrompt = "";
  if (weakPoints.length > 0) {
    weaknessPrompt = `
過去にユーザーが以下の内容で間違えました。これらに関連する文法構造や苦手カテゴリを含めた英文を、新しく出題する${count}問のなかに多めに(全体の半分程度)混ぜて作成してください。
【ユーザーの弱点履歴抜粋】:
${weakPoints.join('\n')}
`;
  }

  const prompt = `
あなたはプロの英語教師です。
CEFR B2レベル相当の実践的で自然な「瞬間英作文ターゲット」の問題をなんと ${count} 問、全てJSON形式で生成してください。
返却されるJSONは、必ず以下の形式の配列のみを出力してください（Markdownの記法等は含めず、生テキストとしてパース可能なJSONのみ出力すること）。

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
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    let responseText = result.response.text();
    // もしAIがMarkdownのコードブロック（```json）を含めてきた場合の安全な除去
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(responseText);
    
    // UUID等の専用処理を追加
    return questions.map(q => ({
      id: crypto.randomUUID(),
      ja: q.ja,
      en: q.en,
      status: 'unanswered',
      reviewLevel: 0,
      nextReviewTime: null,
      mistakes: []
    }));

  } catch (error) {
    console.error("Failed to generate questions:", error);
    throw error;
  }
};

export const evaluateAnswer = async (ja, correctEn, userEn) => {
  if (!genAI) throw new Error("API Key is missing");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const prompt = `
あなたはプロの英語教師です。ユーザーがCEFR B2レベルの「瞬間英作文」を行いました。
[お題]: "${ja}"
[模範解答]: "${correctEn}"
[ユーザーの回答]: "${userEn}"

以下のフォーマットで短く日本語で回答してください。
------------------------
【判定】 (Perfect / Good / Needs Work のいずれか)
【フィードバック】 (良かった点、文法ミス、より表現を自然にする提案などを簡潔に2~3文で)
------------------------
`;
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Needs Work なら不正解扱い（忘却曲線の対象）とする
  let isCorrect = true;
  if (text.includes("Needs Work")) {
    isCorrect = false;
  }
  
  return { isCorrect, message: text };
};
