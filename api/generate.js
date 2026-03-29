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
  const { count = 20, weakPoints = [] } = body || {};

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
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(responseText);

    return res.status(200).json(questions);
  } catch (error) {
    console.error("Generate error:", error);
    return res.status(500).json({ error: 'Failed to generate questions.' });
  }
}
