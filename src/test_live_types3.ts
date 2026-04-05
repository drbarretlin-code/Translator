import { LiveServerMessage } from "@google/genai";
function test(msg: LiveServerMessage) {
    const outT = msg.serverContent?.outputTranscription;
    if (outT) {
        console.log(outT.text);
        console.log(outT.modelTurn);
    }
}
