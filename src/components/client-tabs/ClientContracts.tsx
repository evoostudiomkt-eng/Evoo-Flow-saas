import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Client, Contract, UserProfile } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { Plus, Trash2, FileText, Download, Calendar, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ClientContractsProps {
  client: Client;
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function ClientContracts({ client, profile, isDemoMode }: ClientContractsProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newContract, setNewContract] = useState({ fileUrl: '', status: 'signed', signedAt: new Date().toISOString() });

  useEffect(() => {
    if (isDemoMode) {
      setContracts([
        { id: 'contract_demo_1', fileUrl: 'https://exemplo.com/contrato-prestacao-servicos.pdf', status: 'signed', signedAt: new Date().toISOString() }
      ]);
      return () => {};
    }

    const q = query(collection(db, 'clients', client.id, 'contracts'));
    const unsub = onSnapshot(q, (snap) => {
      setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contract)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `clients/${client.id}/contracts`));
    return () => unsub();
  }, [client.id, isDemoMode]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode) {
      setContracts(prev => [...prev, { id: `contract_demo_${Date.now()}`, ...newContract }]);
      setIsAdding(false);
      setNewContract({ fileUrl: '', status: 'signed', signedAt: new Date().toISOString() });
      return;
    }
    try {
      await addDoc(collection(db, 'clients', client.id, 'contracts'), newContract);
      setIsAdding(false);
      setNewContract({ fileUrl: '', status: 'signed', signedAt: new Date().toISOString() });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clients/${client.id}/contracts`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir registro de contrato?')) return;
    if (isDemoMode) {
      setContracts(prev => prev.filter(c => c.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'clients', client.id, 'contracts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clients/${client.id}/contracts/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-sans">
        <h3 className="font-bold text-gray-900">Documentos e Contratos</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Vincular Contrato</span>
        </button>
      </div>

      <div className="space-y-4">
        {contracts.map((contract) => (
          <div key={contract.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Contrato de Prestação de Serviços</h4>
                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(contract.signedAt).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span className={cn(
                    "flex items-center font-bold px-1.5 py-0.5 rounded-md",
                    contract.status === 'signed' ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50"
                  )}>
                    {contract.status === 'signed' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                    {contract.status === 'signed' ? 'Assinado' : 'Pendente'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <a 
                href={contract.fileUrl} 
                target="_blank" 
                rel="noreferrer"
                className="w-10 h-10 bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center justify-center transition-all"
              >
                <Download className="w-5 h-5" />
              </a>
              <button 
                onClick={() => handleDelete(contract.id)}
                className="w-10 h-10 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {contracts.length === 0 && !isAdding && (
          <div className="py-16 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">Nenhum contrato vinculado</p>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6 font-sans">Vincular Contrato</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">URL do Arquivo (Drive/PDF)</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newContract.fileUrl}
                  onChange={(e) => setNewContract({ ...newContract, fileUrl: e.target.value })}
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
