import { Message } from '../types';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc,
  limit
} from "firebase/firestore";

// --- CONFIGURAZIONE FIREBASE ---
// ISTRUZIONI: 
// 1. Incolla qui sotto i dati che hai copiato dalla Console di Firebase (Project Settings > General > Your apps)
// 2. Assicurati che le virgolette siano corrette.

const firebaseConfig = {
  apiKey: "AIzaSyBQ7oY3ROd8u4Mu9Aa726-gEl4Nx8PFh48",
  authDomain: "workchat-ufficio.firebaseapp.com",
  projectId: "workchat-ufficio",
  storageBucket: "workchat-ufficio.firebasestorage.app",
  messagingSenderId: "228102014910",
  appId: "1:228102014910:web:d390d081826c66a5569bef"
};

// Inizializzazione Database
let db: any = null;
let isConfigured = false;

try {
    // Controllo semplice per vedere se l'utente ha inserito la key reale
    if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("TUA_API_KEY")) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isConfigured = true;
    } else {
        console.warn("⚠️ FIREBASE NON CONFIGURATO: La chat funzionerà solo in locale (Mock Mode). Inserisci le chiavi in services/chatService.ts");
    }
} catch (e) {
    console.error("Errore inizializzazione Firebase:", e);
}

const COLLECTION_NAME = 'messages';

// --- FALLBACK LOCALE (Se non configuri Firebase, l'app non crasha ma non comunica tra PC) ---
let localMockMessages: Message[] = [];

export const sendMessage = async (message: Message) => {
  if (!isConfigured || !db) {
      // Modalità Offline/Test
      console.log("Invio locale (Firebase non configurato):", message);
      localMockMessages.push(message);
      window.dispatchEvent(new Event('local-mock-update'));
      return;
  }

  try {
    await addDoc(collection(db, COLLECTION_NAME), message);
  } catch (e) {
    console.error("Errore invio messaggio su Firebase:", e);
    alert("Errore di connessione: impossibile inviare il messaggio.");
  }
};

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
  if (!isConfigured || !db) {
      // Modalità Offline/Test
      const handler = () => callback([...localMockMessages]);
      window.addEventListener('local-mock-update', handler);
      setTimeout(() => callback([...localMockMessages]), 500); // Fake load
      return () => window.removeEventListener('local-mock-update', handler);
  }

  // Query reale: ascolta tutti i messaggi ordinati per data (ultimi 500 per performance)
  const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "asc"), limit(500));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      messages.push({ ...doc.data(), id: doc.id } as Message);
    });
    callback(messages);
  }, (error) => {
      console.error("Errore sync messaggi:", error);
  });

  return unsubscribe;
};

export const markAsRead = async (messageIds: string[]) => {
    if (!isConfigured || !db) {
        localMockMessages = localMockMessages.map(m => messageIds.includes(m.id) ? {...m, read: true} : m);
        window.dispatchEvent(new Event('local-mock-update'));
        return;
    }

    // Nota: In produzione si userebbe un 'batch commit', qui facciamo un loop semplice
    messageIds.forEach(async (id) => {
        try {
            const msgRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(msgRef, { read: true });
        } catch (e) {
            console.error("Errore aggiornamento stato lettura:", e);
        }
    });
};