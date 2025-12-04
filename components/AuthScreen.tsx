import React, { useState } from 'react';
import { User, USERS_LIST, DEFAULT_PIN } from '../types';
import { ShieldCheck, User as UserIcon } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Seleziona il tuo nome.');
      return;
    }
    if (pin !== DEFAULT_PIN) {
      setError('PIN Errato. (Usa 1234)');
      return;
    }
    const user = USERS_LIST.find(u => u.id === selectedUserId);
    if (user) {
      onLogin(user);
    }
  };

  return (
    // Rimosso bg-black scuro per un look più leggero "floating"
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200/50 ring-1 ring-gray-900/5">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-3 rounded-xl mb-3 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">WorkChat Pro</h1>
          <p className="text-gray-500 text-sm font-medium">Portale Comunicazioni Interne</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Identità</label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all text-gray-700 font-medium cursor-pointer hover:bg-white"
              >
                <option value="">-- Chi sta usando questo PC? --</option>
                {USERS_LIST.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} &mdash; {user.role}
                  </option>
                ))}
              </select>
              <UserIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Codice Accesso</label>
            <div className="flex gap-2 justify-center">
               <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN"
                className="w-full text-center text-xl tracking-[0.5em] font-bold py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:tracking-normal placeholder:font-normal"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg font-medium border border-red-100 animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] mt-2"
          >
            Accedi al Terminale
          </button>
        </form>
    </div>
  );
};

export default AuthScreen;