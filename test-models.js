import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Actually the SDK might not expose a simple listModels without REST API, but there's a trick or we can just try to make a tiny request to a few models
    const modelsToTest = ['gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-2.0-pro-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    console.log("Testing available models for your API key...");
    for (const m of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const res = await model.generateContent('hi');
        console.log(`✅ ${m}: Working!`);
      } catch (err) {
        let msg = err.message;
        if (msg.includes('429') || msg.includes('quota')) msg = 'Quota Exceeded / Limit 0';
        else if (msg.includes('not found')) msg = 'Not Found';
        console.log(`❌ ${m}: ${msg}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

listModels();
