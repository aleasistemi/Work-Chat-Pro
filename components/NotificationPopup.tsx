import React, { useEffect } from 'react';
import { Message, MessageType } from '../types';
import { X, Eye, Clock, MessageSquare } from 'lucide-react';

interface NotificationPopupProps {
  message: Message | null;
  onRead: () => void;
  onDismiss: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ message, onRead, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-24 right-4 w-80 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all duration-300 animate-slide-in-right z-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 flex justify-between items-center">
        <div className="flex items-center gap-2 text-white">
          <MessageSquare className="w-4 h-4" />
          <span className="font-semibold text-sm">Nuovo Messaggio</span>
        </div>
        <button onClick={onDismiss} className="text-white/80 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4">
        <h4 className="font-bold text-gray-800 text-lg mb-1">{message.senderName}</h4>
        <div className="text-gray-600 text-sm line-clamp-3 mb-4 min-h-[40px]">
          {message.type === MessageType.TEXT && message.content}
          {message.type === MessageType.AUDIO && "🎤 Messaggio Vocale"}
          {message.type === MessageType.FILE && `📎 File: ${message.fileName}`}
          {message.type === MessageType.BUSY_SIGNAL && "🚫 Non posso rispondere ora."}
        </div>

        <div className="flex gap-2">
          <button 
            onClick={onRead}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Eye className="w-4 h-4" /> Leggi
          </button>
          <button 
            onClick={onDismiss}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Clock className="w-4 h-4" /> Dopo
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;