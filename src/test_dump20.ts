import { GoogleGenAI } from "@google/genai";
type Session = Awaited<ReturnType<GoogleGenAI["live"]["connect"]>>;
const x: Record<keyof Session, string> = { invalid_key: "1" };
