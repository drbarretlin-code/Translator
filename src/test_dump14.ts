import { LiveClientContent } from "@google/genai";
type Compute<T> = { [K in keyof T]: T[K] } & {};
const x: Compute<LiveClientContent> = { invalid_key: "1" } as any;
