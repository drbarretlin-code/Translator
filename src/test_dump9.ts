import { LiveConnectConfig } from "@google/genai";
type Compute<T> = { [K in keyof T]: T[K] } & {};
const x: Compute<LiveConnectConfig> = { invalid_key: "1" } as any;
type Keys = keyof LiveConnectConfig;
const k: Keys = "invalid_key";
