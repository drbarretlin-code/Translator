import { LiveServerMessage } from "@google/genai";
type Keys = keyof LiveServerMessage;
type ServerContentKeys = keyof NonNullable<LiveServerMessage["serverContent"]>;
const k1: Keys = "serverContent";
const k2: ServerContentKeys = "modelTurn";
