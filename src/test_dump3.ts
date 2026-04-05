import { LiveServerMessage } from "@google/genai";
function test(msg: LiveServerMessage) {
    const outT = msg.serverContent?.outputTranscription;
    if (outT) {
        const x: { a: 1 } = outT;
    }
}
