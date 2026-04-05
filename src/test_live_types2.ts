import { LiveServerMessage } from "@google/genai";
function test(msg: LiveServerMessage) {
    const outT = msg.serverContent?.outputTranscription;
    if (outT) {
        console.log(outT.parts?.[0]?.text);
        console.log(outT.text);
    }
}
