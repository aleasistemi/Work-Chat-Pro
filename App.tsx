import React, { useState, useEffect } from 'react';
import { User, Message, MessageType, AuthState } from './types';
import AuthScreen from './components/AuthScreen';
import ChatWindow from './components/ChatWindow';
import NotificationPopup from './components/NotificationPopup';
import { subscribeToMessages, sendMessage, markAsRead } from './services/chatService';
import { MessageSquare } from 'lucide-react';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, currentUser: null });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [incomingMessage, setIncomingMessage] = useState<Message | null>(null);

  // Aggiorna il titolo della finestra e Richiede Permessi Notifica
  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Richiesta permesso notifiche Windows
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const unreadCount = messages.filter(m => m.recipientId === auth.currentUser!.id && !m.read).length;
    if (unreadCount > 0) {
        document.title = `(${unreadCount}) WorkChat - Nuovi Messaggi`;
    } else {
        document.title = "WorkChat Pro";
    }
  }, [messages, auth.currentUser]);

  useEffect(() => {
    // Sottoscrizione ai messaggi in tempo reale (Firebase)
    const unsubscribe = subscribeToMessages((updatedMessages) => {
      setMessages(updatedMessages);
      
      if (auth.currentUser) {
        // Trova messaggi per ME che non ho ancora letto e che sono recenti
        const myNewMessages = updatedMessages.filter(m => 
            m.recipientId === auth.currentUser!.id && 
            !m.read && 
            m.senderId !== auth.currentUser!.id
        );

        const lastMsg = myNewMessages[myNewMessages.length - 1];

        // Se c'è un messaggio recente (ultimi 10 sec)
        if (lastMsg && Date.now() - lastMsg.timestamp < 10000) {
            
            // 1. Suono
            playNotificationSound();

            // 2. Logica Notifica
            if (document.visibilityState === 'hidden' || !isChatOpen) {
                // Se l'app è minimizzata o coperta, usa NOTIFICA DI SISTEMA WINDOWS
                sendSystemNotification(lastMsg);
                // Aggiorna anche lo stato interno per quando riapre
                setIncomingMessage(lastMsg);
            } else {
                // Se l'app è aperta e visibile, non disturbare col popup interno se stiamo già chattando
                // ma se stavo chattando con un altro, magari serve un avviso discreto (opzionale)
            }
        }
      }
    });
    return () => unsubscribe();
  }, [auth.currentUser, isChatOpen]);

  const handleLogin = (user: User) => {
    setAuth({ isAuthenticated: true, currentUser: user });
  };

  const playNotificationSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
      audio.volume = 0.5;
      audio.play().catch(() => {});
  };

  const sendSystemNotification = (msg: Message) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      let bodyText = "";
      switch (msg.type) {
        case MessageType.AUDIO: bodyText = "🎤 Messaggio vocale"; break;
        case MessageType.FILE: bodyText = "📎 " + (msg.fileName || "File allegato"); break;
        case MessageType.BUSY_SIGNAL: bodyText = "🚫 Utente occupato"; break;
        default: bodyText = msg.content;
      }

      const notification = new Notification(`Messaggio da ${msg.senderName}`, {
        body: bodyText,
        icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
        tag: 'workchat-msg' // Evita spam di notifiche, sovrascrive la precedente
      });

      notification.onclick = function() {
        window.focus(); // Tenta di portare la finestra in primo piano
        setIsChatOpen(true);
        setIncomingMessage(null); // Rimuovi il popup interno perché l'hai cliccato
        this.close();
      };
    }
  };

  const handleNotificationDismiss = () => {
      // Tasto "Dopo" -> Invia segnale di occupato
      if (!incomingMessage || !auth.currentUser) return;
      
      const busyMsg: Message = {
          id: Date.now().toString(),
          senderId: auth.currentUser.id,
          senderName: auth.currentUser.name,
          recipientId: incomingMessage.senderId,
          content: 'Occupato', 
          type: MessageType.BUSY_SIGNAL,
          timestamp: Date.now(),
          read: false
      };
      sendMessage(busyMsg);
      setIncomingMessage(null);
  };

  const handleNotificationRead = () => {
      if(incomingMessage) {
          setIsChatOpen(true);
          setIncomingMessage(null);
      }
  };

  // Se non loggato, mostra schermata login
  if (!auth.isAuthenticated) {
    return (
        <div className="pointer-events-auto w-full h-full flex items-center justify-center bg-slate-900/10 backdrop-blur-sm">
            <AuthScreen onLogin={handleLogin} />
        </div>
    );
  }

  return (
    <div className="h-screen w-screen relative">
      {/* Icona Flottante "Sempre visibile" se l'app non è minimizzata */}
      <div className="fixed bottom-4 right-4 z-30 pointer-events-auto">
         {!isChatOpen && (
             <button 
                onClick={() => setIsChatOpen(true)}
                className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-full shadow-2xl shadow-blue-900/50 flex items-center justify-center text-white transition-all transform hover:scale-110 border-2 border-white ring-2 ring-blue-400/50"
                title="Apri WorkChat"
             >
                <MessageSquare className="w-7 h-7" />
                {messages.filter(m => m.recipientId === auth.currentUser?.id && !m.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {messages.filter(m => m.recipientId === auth.currentUser?.id && !m.read).length}
                  </span>
                )}
             </button>
         )}
      </div>

      {/* Finestra Principale Chat */}
      {isChatOpen && auth.currentUser && (
          <div className="pointer-events-auto">
            <ChatWindow 
                currentUser={auth.currentUser} 
                allMessages={messages}
                onClose={() => setIsChatOpen(false)}
                initialChatPartnerId={incomingMessage?.senderId}
            />
          </div>
      )}

      {/* 
          Popup Interno (Toast)
          Visibile SOLO se l'utente ha la finestra dell'app aperta ma la chat chiusa.
          Se l'app è minimizzata, vedrà la notifica di Windows gestita sopra.
      */}
      {!isChatOpen && incomingMessage && document.visibilityState === 'visible' && (
          <div className="pointer-events-auto">
            <NotificationPopup 
                message={incomingMessage} 
                onRead={handleNotificationRead}
                onDismiss={handleNotificationDismiss}
            />
          </div>
      )}
    </div>
  );
};

export default App;