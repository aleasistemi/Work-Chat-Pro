import { Message, MessageType } from '../types';

const STORAGE_KEY = 'WORKCHAT_MESSAGES';

export const getHistory = (): Message[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const sendMessage = (message: Message) => {
  const history = getHistory();
  const updated = [...history, message];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  
  // Dispatch a custom event for the current tab
  window.dispatchEvent(new Event('local-storage-update'));
};

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
  const handleStorage = () => {
    callback(getHistory());
  };

  // Listen for changes from other tabs
  window.addEventListener('storage', handleStorage);
  // Listen for changes from this tab
  window.addEventListener('local-storage-update', handleStorage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('local-storage-update', handleStorage);
  };
};

export const markAsRead = (messageIds: string[]) => {
    const history = getHistory();
    const updated = history.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, read: true } : msg
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('local-storage-update'));
};