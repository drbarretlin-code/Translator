import { GoogleGenAI } from "@google/genai";
async function test() {
    const ai = new GoogleGenAI({});
    const session = await ai.live.connect({ model: "test", callbacks: { onmessage: () => {} } });
    const keys = Object.keys(session);
}
