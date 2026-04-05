import { LiveSendClientContentParameters } from "@google/genai";
type Compute<T> = { [K in keyof T]: T[K] } & {};
const x: Compute<LiveSendClientContentParameters> = { invalid_key: "1" };
