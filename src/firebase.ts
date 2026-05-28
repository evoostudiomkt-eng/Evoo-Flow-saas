import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error) {
      const errMsg = error.message.toLowerCase();
      if (errMsg.includes('offline') || errMsg.includes('unreachable') || errMsg.includes('client is offline')) {
        console.warn("Aviso: O cliente Firebase está offline ou o banco de dados está inacessível. O aplicativo continuará funcionando usando persistência local offline.");
      } else {
        console.warn("Aviso na conexão de teste com Firebase:", error.message);
      }
    }
  }
}
testConnection();
