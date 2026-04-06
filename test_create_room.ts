import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const userCred = await signInAnonymously(auth);
    console.log("Logged in as", userCred.user.uid);
    const newRoomId = Math.random().toString(36).substring(2, 9);
    await setDoc(doc(db, 'rooms', newRoomId), {
      creatorId: userCred.user.uid,
      createdAt: serverTimestamp()
    });
    console.log("Room created successfully:", newRoomId);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
test();
