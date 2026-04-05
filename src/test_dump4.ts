import { LiveServerMessage } from "@google/genai";
type TranscriptionKeys = keyof NonNullable<NonNullable<LiveServerMessage["serverContent"]>["outputTranscription"]>;
const x: TranscriptionKeys = "invalid_key";
