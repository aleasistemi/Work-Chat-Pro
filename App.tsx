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

  useEffect(() => {
    // Subscribe to "network" messages
    const unsubscribe = subscribeToMessages((updatedMessages) => {
      setMessages(updatedMessages);
      
      // Check for new messages for ME that are unread
      if (auth.currentUser) {
        const lastMsg = updatedMessages[updatedMessages.length - 1];
        if (
            lastMsg && 
            lastMsg.recipientId === auth.currentUser.id && 
            !lastMsg.read &&
            Date.now() - lastMsg.timestamp < 5000 // Only notify if recent (prevent spam on reload)
        ) {
            // If chat is open and we are talking to this person, don't popup, just ding
            setIncomingMessage(lastMsg);
            playNotificationSound();
        }
      }
    });
    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleLogin = (user: User) => {
    setAuth({ isAuthenticated: true, currentUser: user });
  };

  const playNotificationSound = () => {
      // Simple beep using AudioContext or HTML5 Audio
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Generic ping
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Ignore play errors (DOMException)
  };

  const handleNotificationDismiss = () => {
      if (!incomingMessage || !auth.currentUser) return;
      
      // Send "Busy" signal
      const busyMsg: Message = {
          id: Date.now().toString(),
          senderId: auth.currentUser.id,
          senderName: auth.currentUser.name,
          recipientId: incomingMessage.senderId,
          content: 'BUSY',
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
          // markAsRead handled inside ChatWindow when it opens
          setIncomingMessage(null);
      }
  };

  if (!auth.isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen w-screen relative pointer-events-none">
      {/* 
        The root div has pointer-events-none so we can see the "Desktop" wallpaper behind it 
        wherever the UI isn't present. We re-enable pointer-events on actual UI elements.
      */}

      {/* System Tray Icon (Simulated) */}
      <div className="fixed bottom-4 right-4 z-30 pointer-events-auto">
         {!isChatOpen && (
             <button 
                onClick={() => setIsChatOpen(true)}
                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-600/40 flex items-center justify-center text-white transition-transform hover:scale-110"
             >
                <MessageSquare className="w-7 h-7" />
                {/* Unread badge logic could go here */}
             </button>
         )}
      </div>

      {/* Main Chat Window */}
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

      {/* Notification Popup */}
      {!isChatOpen && incomingMessage && (
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