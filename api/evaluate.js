import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key is missing on Server' });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { ja, correctEn, userEn } = body || {};

  if (!ja || !userEn) {
    return res.status(400).json({ error: 'Bad Request: missing params' });
  }

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
    
    return res.status(200).json({ isCorrect, message: text });
  } catch (error) {
    console.error("添削エラー:", error);
    return res.status(500).json({ error: 'Failed to evaluate answer.', details: error.message || String(error) });
  }
}
