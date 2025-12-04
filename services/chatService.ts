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
  limit,
  enableNetwork,
  disableNetwork
} from "firebase/firestore";

// --- CONFIGURAZIONE FIREBASE ---
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
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isConfigured = true;
    console.log("✅ Firebase WorkChat Ufficio connesso");
    
    // Gestione resilienza rete (opzionale ma utile per PC ufficio che vanno in standby)
    window.addEventListener('online', () => enableNetwork(db));
    window.addEventListener('offline', () => disableNetwork(db));

} catch (e) {
    console.error("Errore critico inizializzazione Firebase:", e);
}

const COLLECTION_NAME = 'messages';

// --- FALLBACK LOCALE (Solo in caso di emergenza estrema) ---
let localMockMessages: Message[] = [];

export const sendMessage = async (message: Message) => {
  // 1. Se Firebase non è inizializzato (raro)
  if (!isConfigured || !db) {
      console.warn("Firebase non pronto, uso mock locale");
      localMockMessages.push(message);
      window.dispatchEvent(new Event('local-mock-update'));
      return;
  }

  // 2. Invio reale
  try {
    await addDoc(collection(db, COLLECTION_NAME), message);
  } catch (e: any) {
    console.error("Errore invio messaggio su Firebase:", e);
    
    // Gestione errori specifica
    if (e.code === 'permission-denied') {
        alert("ERRORE PERMESSI:\n\nNon hai abilitato la scrittura nel database.\n1. Vai su console.firebase.google.com\n2. Apri Firestore Database -> Regole\n3. Incolla: allow read, write: if true;\n4. Clicca Pubblica");
    } else if (e.code === 'unavailable') {
        // Silenzioso, probabilmente si riconnetterà da solo
        console.warn("Rete momentaneamente non disponibile, riprovo...");
    } else {
        alert(`Errore invio: ${e.message}`);
    }
  }
};

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
  if (!isConfigured || !db) {
      const handler = () => callback([...localMockMessages]);
      window.addEventListener('local-mock-update', handler);
      // Simula ritardo rete
      setTimeout(() => callback([...localMockMessages]), 500);
      return () => window.removeEventListener('local-mock-update', handler);
  }

  const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "asc"), limit(500));
  
  // Ascolto in tempo reale
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      messages.push({ ...doc.data(), id: doc.id } as Message);
    });
    callback(messages);
  }, (error: any) => {
      console.error("Errore ricezione messaggi:", error);
      if (error.code === 'permission-denied') {
          console.error("ERRORE CRITICO: Regole Firebase non valide. Vedi console per dettagli.");
      }
  });

  return unsubscribe;
};

export const markAsRead = async (messageIds: string[]) => {
    if (!isConfigured || !db) return;

    // Aggiorna lo stato di lettura per ogni messaggio
    // Nota: in produzione ideale usare un batch write, ma per <10 msg va bene così
    messageIds.forEach(async (id) => {
        try {
            const msgRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(msgRef, { read: true });
        } catch (e) {
            console.error("Errore aggiornamento stato lettura:", e);
        }
    });
};