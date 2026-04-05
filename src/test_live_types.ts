import { LiveServerMessage } from "@google/genai";
function test(msg: LiveServerMessage) {
    console.log(msg.serverContent?.modelTurn?.parts?.[0]?.text);
    console.log(msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data);
    
    // Test transcription fields
    console.log(msg.serverContent?.outputTranscription);
    console.log(msg.serverContent?.inputTranscription);
    console.log(msg.outputTranscription);
    console.log(msg.inputTranscription);
}
