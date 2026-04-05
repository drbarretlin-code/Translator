import { LiveConnectConfig } from "@google/genai";
type Keys = keyof LiveConnectConfig;
const k: Record<Keys, string> = {} as any;
k.invalid_key;
