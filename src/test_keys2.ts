import { LiveServerMessage } from "@google/genai";
type ServerContent = NonNullable<LiveServerMessage["serverContent"]>;
const k: keyof ServerContent = "outputTranscription"; // to check if it exists
