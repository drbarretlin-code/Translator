import { LiveConnectConfig } from "@google/genai";
type Compute<T> = { [K in keyof T]: T[K] } & {};
const x: Compute<LiveConnectConfig> = { explicitVadSignal: true };
