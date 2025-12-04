export enum MessageType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  BUSY_SIGNAL = 'BUSY_SIGNAL'
}

export interface User {
  id: string;
  name: string;
  role?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string; // 'ALL' or specific user ID
  content: string; // Text content or Base64 for files
  fileName?: string; // Only for files
  type: MessageType;
  timestamp: number;
  read: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}

export const USERS_LIST: User[] = [
  { id: '1', name: 'Franco C.', role: 'Admin' },
  { id: '2', name: 'Giovanni C.', role: 'Tecnico' },
  { id: '3', name: 'Gennaro M.', role: 'Operaio' },
  { id: '4', name: 'Cristina B.', role: 'Amministrazione' },
  { id: '5', name: 'Alessia C.', role: 'Vendite' },
  { id: '6', name: 'Laura R.', role: 'HR' },
  { id: '7', name: 'Giuseppe G.', role: 'Logistica' },
  { id: '8', name: 'Claudia C.', role: 'Design' },
  { id: '9', name: 'Iacopo C.', role: 'IT' },
  { id: '10', name: 'Fabio L.', role: 'Manager' },
  { id: '11', name: 'Officina', role: 'Reparto' },
  { id: '12', name: 'Magazzino', role: 'Reparto' },
];

// In a real app, these would be hashed/secured.
// For this demo, everyone's password is '1234'.
export const DEFAULT_PIN = '1234';