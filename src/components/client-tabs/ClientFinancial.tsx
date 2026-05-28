import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Client, FinancialRecord, UserProfile } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { MOCK_FINANCIALS } from '../../lib/mockData';
import { 
  Plus, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingDown,
  Download,
  CreditCard,
  FileText,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface ClientFinancialProps {
  client: Client;
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function ClientFinancial({ client, profile, isDemoMode }: ClientFinancialProps) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRecord, setNewRecord] = useState({ amount: 0, dueDate: new Date().toISOString().split('T')[0], description: 'Mensalidade', status: 'pending', conditions: '' });

  useEffect(() => {
    if (isDemoMode) {
      setRecords(MOCK_FINANCIALS.filter(r => r.clientId === client.id));
      return () => {};
    }

    const q = query(collection(db, 'clients', client.id, 'financials'));
    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialRecord)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `clients/${client.id}/financials`));
    return () => unsub();
  }, [client.id, isDemoMode]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode) {
      const added: FinancialRecord = {
        id: `fin_demo_${Date.now()}`,
        clientId: client.id,
        amount: newRecord.amount,
        dueDate: newRecord.dueDate,
        status: newRecord.status as any,
        description: newRecord.description,
        conditions: newRecord.conditions,
        createdAt: new Date().toISOString()
      };
      setRecords(prev => [...prev, added]);
      setIsAdding(false);
      setNewRecord({ amount: 0, dueDate: new Date().toISOString().split('T')[0], description: 'Mensalidade', status: 'pending', conditions: '' });
      return;
    }
    try {
      await addDoc(collection(db, 'clients', client.id, 'financials'), {
        ...newRecord,
        clientId: client.id,
        agencyId: profile.agencyId,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewRecord({ amount: 0, dueDate: new Date().toISOString().split('T')[0], description: 'Mensalidade', status: 'pending', conditions: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clients/${client.id}/financials`);
    }
  };

  const toggleStatus = async (record: FinancialRecord) => {
    const newStatus = record.status === 'paid' ? 'pending' : 'paid';
    if (isDemoMode) {
      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: newStatus } : r));
      return;
    }
    try {
      await updateDoc(doc(db, 'clients', client.id, 'financials', record.id), { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clients/${client.id}/financials/${record.id}`);
    }
  };

  const totalPaid = records.filter(r => r.status === 'paid').reduce((acc, r) => acc + r.amount, 0);
  const pending = records.filter(r => r.status !== 'paid').reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-8" id="client-financial">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
           <div>
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Total Recebido</p>
              <h4 className="text-3xl font-black text-gray-900 leading-none">R$ {totalPaid.toLocaleString()}</h4>
           </div>
           <div className="mt-6 flex items-center text-green-600 text-xs font-bold bg-green-50 w-fit px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Tudo em dia
           </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
           <div>
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Pendente</p>
              <h4 className="text-3xl font-black text-amber-500 leading-none">R$ {pending.toLocaleString()}</h4>
           </div>
           <div className="mt-6 flex items-center text-amber-600 text-xs font-bold bg-amber-50 w-fit px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Aguardando pagamento
           </div>
        </div>

        <div className="bg-blue-600 p-6 rounded-[2rem] shadow-xl shadow-blue-100 flex flex-col justify-between text-white">
           <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-extrabold opacity-70 uppercase tracking-widest mb-2">Mensalidade Fixa</p>
                <h4 className="text-2xl font-black">R$ 2.500,00</h4>
              </div>
              <CreditCard className="w-8 h-8 opacity-20" />
           </div>
           <div className="mt-6">
              <p className="text-[10px] font-bold opacity-80 uppercase mb-1">Próximo Vencimento</p>
              <p className="text-sm font-bold">Dia 15 de cada mês</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <h3 className="font-bold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" /> Histórico de Lançamentos
          </h3>
          {profile.role !== 'client' && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-50 hover:bg-blue-700 transition-all font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>Gerar Fatura</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Referência</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Data / Venc</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Valor</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Status</th>
                {profile.role !== 'client' && <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.length > 0 ? records.sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-gray-900">{record.description}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{record.conditions || 'Sem observações'}</p>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-gray-500">
                    {format(new Date(record.dueDate), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-8 py-5 font-black text-gray-900 text-sm">R$ {record.amount.toLocaleString()}</td>
                  <td className="px-8 py-5">
                    <button 
                      onClick={() => profile.role !== 'client' && toggleStatus(record)}
                      disabled={profile.role === 'client'}
                      className={cn(
                        "text-[9px] font-extrabold px-3 py-1.5 rounded-xl uppercase tracking-tighter transition-all",
                        record.status === 'paid' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                        record.status === 'pending' ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                      )}
                    >
                      {record.status === 'paid' ? 'Pago' : record.status === 'pending' ? 'Pendente' : 'Atrasado'}
                    </button>
                  </td>
                  {profile.role !== 'client' && (
                    <td className="px-8 py-5 text-right">
                       <button className="text-gray-300 hover:text-blue-600 transition-all p-2 bg-gray-50 rounded-lg group-hover:bg-white group-hover:shadow-sm">
                          <Download className="w-4 h-4" />
                       </button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <DollarSign className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium mb-1">Nenhum faturamento</p>
                      <p className="text-xs text-gray-300">Gere as mensalidades para acompanhamento financeiro.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
               <h3 className="text-2xl font-bold text-gray-900 mb-8 font-sans">Gerar Faturamento</h3>
               <form onSubmit={handleAdd} className="space-y-5">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Descrição</label>
                    <input 
                      type="text" required placeholder="Ex: Mensalidade Março"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={newRecord.description}
                      onChange={(e) => setNewRecord({...newRecord, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Valor (R$)</label>
                    <input 
                      type="number" required
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                      value={newRecord.amount}
                      onChange={(e) => setNewRecord({...newRecord, amount: parseFloat(e.target.value)})}
                    />
                  </div>
                   <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Data de Vencimento</label>
                    <input 
                      type="date" required
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={newRecord.dueDate}
                      onChange={(e) => setNewRecord({...newRecord, dueDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Condições / Observações</label>
                    <input 
                      type="text"
                      placeholder="Ex: 5% desc Pix, Cartão 3x..."
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={newRecord.conditions}
                      onChange={(e) => setNewRecord({...newRecord, conditions: e.target.value})}
                    />
                  </div>
                  <div className="flex space-x-3 pt-6">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all">Cancelar</button>
                    <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Ativar Lançamento</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
