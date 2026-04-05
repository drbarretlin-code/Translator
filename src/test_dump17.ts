import { LiveSendRealtimeInputParameters } from "@google/genai";
type Compute<T> = { [K in keyof T]: T[K] } & {};
const x: Compute<LiveSendRealtimeInputParameters> = { invalid_key: "1" } as any;
