import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';

const apiKey = "AIzaSyBlGUk8lIjnqTzi6lASe6ChptOlXKVDh1U"; // user's old key or need to use their current env
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const prompt = `あなたはプロの英語教師です。ユーザーがCEFR B2レベルの「瞬間英作文」を行いました。
[お題]: "このプロジェクトの成功は、チームワークにかかっている。"
[模範解答]: "The success of this project relies on teamwork."
[ユーザーの回答]: "The success of this project rely on the teamwork."

以下のフォーマットで短く日本語で回答してください。
------------------------
【判定】 (Perfect / Good / Needs Work のいずれか)
【フィードバック】 (良かった点、文法ミス、より表現を自然にする提案などを簡潔に2~3文で)
------------------------`;

model.generateContent(prompt).then(res => console.log(res.response.text())).catch(e => console.error(e.message));
