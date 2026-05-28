import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Client, LoginInfo, UserProfile } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { Plus, Trash2, Key, Globe, User, Lock, ExternalLink } from 'lucide-react';

interface ClientLoginsProps {
  client: Client;
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function ClientLogins({ client, profile, isDemoMode }: ClientLoginsProps) {
  const [logins, setLogins] = useState<LoginInfo[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLogin, setNewLogin] = useState({ platform: '', username: '', password: '' });

  useEffect(() => {
    if (isDemoMode) {
      setLogins([
        { id: 'login_demo_1', platform: 'Meta Ads Manager', username: 'gestor@empresa.com', password: '••••••••••••' },
        { id: 'login_demo_2', platform: 'Instagram Business', username: '@instagram_empresa', password: '••••••••••••' }
      ]);
      return () => {};
    }

    const q = query(collection(db, 'clients', client.id, 'logins'));
    const unsub = onSnapshot(q, (snap) => {
      setLogins(snap.docs.map(d => ({ id: d.id, ...d.data() } as LoginInfo)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `clients/${client.id}/logins`));
    return () => unsub();
  }, [client.id, isDemoMode]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode) {
      setLogins(prev => [...prev, { id: `login_demo_${Date.now()}`, ...newLogin }]);
      setIsAdding(false);
      setNewLogin({ platform: '', username: '', password: '' });
      return;
    }
    try {
      await addDoc(collection(db, 'clients', client.id, 'logins'), newLogin);
      setIsAdding(false);
      setNewLogin({ platform: '', username: '', password: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clients/${client.id}/logins`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    if (isDemoMode) {
      setLogins(prev => prev.filter(l => l.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'clients', client.id, 'logins', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clients/${client.id}/logins/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">Acessos e Logins</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Acesso</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {logins.map((login) => (
          <div key={login.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative group overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{login.platform}</h4>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(login.id)}
                className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium overflow-hidden">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{login.username}</span>
                </div>
                <button className="text-[10px] font-bold text-blue-600 hover:underline">Copiar</button>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium overflow-hidden">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">••••••••••••</span>
                </div>
                <button className="text-[10px] font-bold text-blue-600 hover:underline">Ver</button>
              </div>
            </div>
          </div>
        ))}

        {logins.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">Nenhum login cadastrado</p>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6 font-sans">Cadastrar Acesso</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Plataforma</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Instagram, Hotmart, Hosting"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newLogin.platform}
                  onChange={(e) => setNewLogin({ ...newLogin, platform: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Usuário / Email</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newLogin.username}
                  onChange={(e) => setNewLogin({ ...newLogin, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Senha</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newLogin.password}
                  onChange={(e) => setNewLogin({ ...newLogin, password: e.target.value })}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-all font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
