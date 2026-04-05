import { GoogleGenAI } from "@google/genai";
type Session = Awaited<ReturnType<GoogleGenAI["live"]["connect"]>>;
type Compute<T> = { [K in keyof T]: T[K] } & {};
const x: Compute<Session> = { invalid_key: "1" };
