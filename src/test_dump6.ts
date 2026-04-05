import { LiveServerMessage } from "@google/genai";
type Compute<T> = { [K in keyof T]: T[K] } & {};
type Transcription = NonNullable<NonNullable<LiveServerMessage["serverContent"]>["outputTranscription"]>;
const x: Compute<Transcription> = { invalid_key: "1" };
