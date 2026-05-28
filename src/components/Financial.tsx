import React, { useState, useEffect } from 'react';
import { collectionGroup, query, onSnapshot, getDocs, collection, where } from 'firebase/firestore';
import { db } from '../firebase';
import { FinancialRecord, UserProfile } from '../types';
import { MOCK_FINANCIALS, MOCK_CLIENTS } from '../lib/mockData';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Calendar,
  Filter,
  PieChart,
  Activity,
  ArrowUpRight,
  Target,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface FinancialProps {
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function Financial({ profile, isDemoMode }: FinancialProps) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setRecords(MOCK_FINANCIALS);
      const mapping: Record<string, string> = {};
      MOCK_CLIENTS.forEach(c => mapping[c.id] = c.company);
      setClients(mapping);
      setLoading(false);
      return () => {};
    }

    if (!profile?.agencyId) return;

    const q = query(
      collectionGroup(db, 'financials'),
      where('agencyId', '==', profile.agencyId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialRecord)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'all_financials'));

    const fetchClients = async () => {
       try {
         const snap = await getDocs(query(
           collection(db, 'clients'),
           where('agencyId', '==', profile.agencyId)
         ));
         const mapping: Record<string, string> = {};
         snap.docs.forEach(d => mapping[d.id] = d.data().company);
         setClients(mapping);
       } catch (err) {
         handleFirestoreError(err, OperationType.LIST, 'clients');
       }
    };
    fetchClients();

    return () => unsub();
  }, [profile?.agencyId]);

  const totalPaid = records.filter(r => r.status === 'paid').reduce((acc, r) => acc + r.amount, 0);
  const totalPending = records.filter(r => r.status === 'pending').reduce((acc, r) => acc + r.amount, 0);
  const totalLate = records.filter(r => r.status === 'overdue' || (r.status === 'pending' && new Date(r.dueDate) < new Date())).reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-8" id="global-financial">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Fluxo Financeiro</h2>
          <p className="text-gray-500 mt-1">Consolidação de faturamento e recebíveis da agência.</p>
        </div>
        <div className="flex space-x-3">
           <button className="flex items-center space-x-2 bg-white border border-gray-100 px-5 py-3 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
             <Download className="w-5 h-5 text-gray-400" />
             <span>Exportar Tudo</span>
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="financial-metrics">
         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8">
               <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                  <TrendingUp className="w-6 h-6" />
               </div>
            </div>
            <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] mb-2">Receita Confirmada</h4>
            <p className="text-4xl font-black text-gray-900">R$ {totalPaid.toLocaleString()}</p>
            <div className="mt-6 flex items-center text-xs font-bold text-green-600">
               <ArrowUpRight className="w-4 h-4 mr-1" />
               8.4% vs mês anterior
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
               <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                  <Activity className="w-6 h-6" />
               </div>
            </div>
            <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] mb-2">Previsão de Receita</h4>
            <p className="text-4xl font-black text-amber-500">R$ {totalPending.toLocaleString()}</p>
            <div className="mt-6 flex items-center text-xs font-bold text-amber-500">
               Total a liquidar
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
               <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                  <AlertCircle className="w-6 h-6" />
               </div>
            </div>
            <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] mb-2">Inadimplência / Atraso</h4>
            <p className="text-4xl font-black text-red-500">R$ {totalLate.toLocaleString()}</p>
            <div className="mt-6 flex items-center text-xs font-bold text-red-500">
               Ações imediatas requeridas
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="px-10 py-8 border-b border-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/20">
            <h3 className="font-bold text-gray-900 text-xl font-sans">Lançamentos Consolidados</h3>
            <div className="flex items-center space-x-2">
               <div className="relative">
                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input type="text" placeholder="Filtrar lançamentos..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
            </div>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-left">
            <thead>
              <tr className="bg-white">
                <th className="px-10 py-6 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-10 py-6 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="px-10 py-6 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Valor</th>
                <th className="px-10 py-6 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-10 py-6 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map(record => (
                <tr key={record.id} className="hover:bg-gray-50/50 transition-all group">
                   <td className="px-10 py-6">
                      <div className="flex items-center space-x-3">
                         <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px]">
                            {clients[record.clientId]?.[0] || 'C'}
                         </div>
                         <span className="font-bold text-gray-900">{clients[record.clientId] || 'Cliente'}</span>
                      </div>
                   </td>
                   <td className="px-10 py-6 text-sm text-gray-500 font-medium">
                      {record.description}
                   </td>
                   <td className="px-10 py-6 font-black text-gray-900 text-sm">
                      R$ {record.amount.toLocaleString()}
                   </td>
                   <td className="px-10 py-6 text-sm text-gray-400 font-bold">
                     <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-2 opacity-50" />
                        {format(new Date(record.dueDate), 'dd / MM / yyyy')}
                     </div>
                   </td>
                   <td className="px-10 py-6 text-right">
                      <span className={cn(
                        "text-[9px] font-extrabold px-3 py-1.5 rounded-xl uppercase tracking-tighter shadow-sm",
                        record.status === 'paid' ? "bg-green-100 text-green-700" :
                        record.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      )}>
                         {record.status === 'paid' ? 'Liquidado' : record.status === 'pending' ? 'Pendente' : 'Em Atraso'}
                      </span>
                   </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-24 text-center">
                      <div className="max-w-xs mx-auto opacity-30">
                         <Target className="w-12 h-12 mx-auto mb-4" />
                         <p className="text-sm font-bold uppercase tracking-widest">Sem movimentações</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
