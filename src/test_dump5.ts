import { LiveServerMessage } from "@google/genai";
type TranscriptionKeys = keyof NonNullable<NonNullable<LiveServerMessage["serverContent"]>["outputTranscription"]>;
const x: Record<TranscriptionKeys, string> = { invalid_key: "1" };
