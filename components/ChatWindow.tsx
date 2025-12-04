import React, { useState, useEffect, useRef } from 'react';
import { User, Message, MessageType, USERS_LIST } from '../types';
import { sendMessage, markAsRead } from '../services/chatService';
import { generateSmartReplies } from '../services/geminiService';
import { 
  Send, Mic, Paperclip, X, Minimize2, Search, 
  User as UserIcon, FileText, Play, Square, Bot 
} from 'lucide-react';

interface ChatWindowProps {
  currentUser: User;
  allMessages: Message[];
  onClose: () => void;
  initialChatPartnerId?: string; // If opening from notification
}

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, allMessages, onClose, initialChatPartnerId }) => {
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter messages for the current view
  const chatMessages = allMessages.filter(msg => 
    (msg.recipientId === currentUser.id && msg.senderId === activeChatUser?.id) ||
    (msg.senderId === currentUser.id && msg.recipientId === activeChatUser?.id)
  );

  useEffect(() => {
    if (initialChatPartnerId) {
      const partner = USERS_LIST.find(u => u.id === initialChatPartnerId);
      if (partner) setActiveChatUser(partner);
    }
  }, [initialChatPartnerId]);

  useEffect(() => {
    // Scroll to bottom on new message
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Mark as read if looking at them
    if (activeChatUser) {
        const unreadIds = chatMessages
            .filter(m => m.recipientId === currentUser.id && !m.read)
            .map(m => m.id);
        if (unreadIds.length > 0) {
            markAsRead(unreadIds);
        }
    }
  }, [chatMessages, activeChatUser, currentUser.id]);

  // Generate Smart Replies when receiving the last message
  useEffect(() => {
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg && lastMsg.recipientId === currentUser.id && lastMsg.type === MessageType.TEXT) {
         setIsGeneratingReplies(true);
         generateSmartReplies(lastMsg.content, lastMsg.senderName, currentUser.name)
            .then(replies => {
                setSmartReplies(replies);
                setIsGeneratingReplies(false);
            });
      } else {
          setSmartReplies([]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.length, currentUser.id]);


  const handleSend = (text: string = inputText, type: MessageType = MessageType.TEXT, fileData?: string, fileName?: string) => {
    if ((!text.trim() && !fileData) || !activeChatUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      recipientId: activeChatUser.id,
      content: text,
      type,
      fileName,
      timestamp: Date.now(),
      read: false
    };

    sendMessage(newMessage);
    setInputText('');
    setSmartReplies([]); // Clear suggestions after sending
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      handleSend(base64, MessageType.FILE, base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) setAudioChunks((prev) => [...prev, e.data]);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const base64 = reader.result as string;
            handleSend(base64, MessageType.AUDIO);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing mic", err);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const renderMessageContent = (msg: Message) => {
      switch (msg.type) {
          case MessageType.TEXT:
            // Convert URLs to links
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const parts = msg.content.split(urlRegex);
            return (
                <p className="whitespace-pre-wrap">
                    {parts.map((part, i) => 
                        part.match(urlRegex) ? (
                            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-200 hover:text-white break-all">{part}</a>
                        ) : part
                    )}
                </p>
            );
          case MessageType.AUDIO:
              return (
                  <audio controls src={msg.content} className="max-w-[200px] h-10" />
              );
          case MessageType.FILE:
              return (
                  <a href={msg.content} download={msg.fileName} className="flex items-center gap-2 bg-white/10 p-2 rounded hover:bg-white/20 transition">
                      <FileText className="w-5 h-5" />
                      <span className="truncate max-w-[150px]">{msg.fileName}</span>
                  </a>
              );
          case MessageType.BUSY_SIGNAL:
              return <p className="italic text-sm opacity-80">🚫 Utente occupato al momento.</p>;
          default:
              return null;
      }
  };

  // Helper to format time
  const formatTime = (ts: number) => {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-4 right-4 w-[800px] h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-300 animate-fade-in-up z-40 font-sans">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <h2 className="font-semibold text-lg">WorkChat Pro</h2>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-gray-300">
                    {currentUser.name}
                </span>
            </div>
            <div className="flex gap-2">
                <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition">
                    <Minimize2 className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar - Users */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Cerca collega..." 
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {USERS_LIST.filter(u => u.id !== currentUser.id).map(user => {
                        const lastMsg = allMessages
                            .filter(m => (m.senderId === user.id && m.recipientId === currentUser.id) || (m.senderId === currentUser.id && m.recipientId === user.id))
                            .sort((a,b) => b.timestamp - a.timestamp)[0];
                        
                        const unreadCount = allMessages.filter(m => m.senderId === user.id && m.recipientId === currentUser.id && !m.read).length;

                        return (
                            <button 
                                key={user.id}
                                onClick={() => setActiveChatUser(user)}
                                className={`w-full p-4 flex items-center gap-3 hover:bg-white transition-colors border-b border-gray-100 ${activeChatUser?.id === user.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                            >
                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold shrink-0">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                                        {lastMsg && <span className="text-xs text-gray-400">{formatTime(lastMsg.timestamp)}</span>}
                                    </div>
                                    <div className="flex justify-between items-center">
                                         <p className="text-sm text-gray-500 truncate max-w-[120px]">
                                            {lastMsg ? (lastMsg.type === MessageType.TEXT ? lastMsg.content : `[${lastMsg.type}]`) : <span className="italic text-xs">Nessun messaggio</span>}
                                        </p>
                                        {unreadCount > 0 && (
                                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-100">
                {activeChatUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white p-4 border-b border-gray-200 shadow-sm flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                    {activeChatUser.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{activeChatUser.name}</h3>
                                    <p className="text-xs text-gray-500">{activeChatUser.role}</p>
                                </div>
                             </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {chatMessages.length === 0 && (
                                <div className="text-center text-gray-400 mt-10">
                                    <p>Inizia la conversazione con {activeChatUser.name}</p>
                                </div>
                            )}
                            {chatMessages.map(msg => {
                                const isMe = msg.senderId === currentUser.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                                            {!isMe && <p className="text-xs font-bold mb-1 opacity-70">{msg.senderName}</p>}
                                            {renderMessageContent(msg)}
                                            <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                                {formatTime(msg.timestamp)} {isMe && (msg.read ? '• Letto' : '• Inviato')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        {/* Smart Replies */}
                        {smartReplies.length > 0 && (
                            <div className="px-6 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
                                <div className="flex items-center text-blue-600 mr-2">
                                    <Bot className="w-4 h-4 animate-bounce" />
                                </div>
                                {smartReplies.map((reply, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => handleSend(reply)}
                                        className="whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full border border-blue-200 transition-colors"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="bg-white p-4 border-t border-gray-200">
                            <div className="flex items-end gap-2">
                                <button 
                                    className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Invia File"
                                >
                                    <Paperclip className="w-5 h-5" />
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        onChange={handleFileUpload} 
                                    />
                                </button>
                                
                                <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent focus-within:bg-white transition-all">
                                    <textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Scrivi un messaggio..."
                                        className="w-full bg-transparent border-none focus:ring-0 outline-none resize-none max-h-24 py-2 text-sm"
                                        rows={1}
                                    />
                                </div>

                                {inputText.trim() ? (
                                    <button 
                                        onClick={() => handleSend()}
                                        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition active:scale-95"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`p-3 rounded-full shadow-lg transition active:scale-95 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'}`}
                                        title="Registra Vocale"
                                    >
                                        {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-slate-50">
                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            <UserIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">Benvenuto in WorkChat</h3>
                        <p className="max-w-xs">Seleziona un collega dalla lista per iniziare a scambiare messaggi, file o note vocali.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ChatWindow;