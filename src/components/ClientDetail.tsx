import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Client, Task, ContentItem, FinancialRecord, UserProfile } from '../types';
import { MOCK_TASKS, MOCK_CONTENTS } from '../lib/mockData';
import { 
  ArrowLeft, 
  LayoutGrid, 
  CheckSquare, 
  FileCheck, 
  DollarSign, 
  FolderOpen,
  Calendar,
  ExternalLink,
  Key,
  FileText,
  Edit2,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import ClientTasks from './client-tabs/ClientTasks';
import ClientContent from './client-tabs/ClientContent';
import ClientFinancial from './client-tabs/ClientFinancial';
import ClientFiles from './client-tabs/ClientFiles';
import ClientLogins from './client-tabs/ClientLogins';
import ClientContracts from './client-tabs/ClientContracts';
import ClientPortal from './client-tabs/ClientPortal';

interface ClientDetailProps {
  client: Client;
  onClose: () => void;
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function ClientDetail({ client, onClose, profile, isDemoMode }: ClientDetailProps) {
  const [activeTab, setActiveTab ] = useState('overview');
  const [tasksCount, setTasksCount] = useState(0);
  const [approvalsCount, setApprovalsCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState(client);

  useEffect(() => {
    setEditedClient(client);
  }, [client]);

  const handleDetailCEPChange = async (cepValue: string) => {
    const numbersOnly = cepValue.replace(/\D/g, '');
    let formatted = numbersOnly;
    if (numbersOnly.length > 5) {
      formatted = `${numbersOnly.slice(0, 5)}-${numbersOnly.slice(5, 8)}`;
    }
    
    setEditedClient(prev => ({ ...prev, cep: formatted.slice(0, 9) }));

    if (numbersOnly.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${numbersOnly}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setEditedClient(prev => {
            const finalAddr = `${data.logradouro || ''}, ${prev.number || ''}${prev.complement ? ` - ${prev.complement}` : ''} - ${data.bairro || ''}, ${data.localidade || ''}/${data.uf || ''}`;
            return {
              ...prev,
              logradouro: data.logradouro || '',
              neighborhood: data.bairro || '',
              city: data.localidade || '',
              state: data.uf || '',
              address: finalAddr
            };
          });
        }
      } catch (err) {
        console.error("Erro ao buscar CEP no detalhe:", err);
      }
    }
  };

  const handleUpdateClient = async () => {
    if (isDemoMode) {
      setIsEditing(false);
      return;
    }
    try {
      const clientRef = doc(db, 'clients', client.id);
      
      const structuredAddress = editedClient.logradouro 
        ? `${editedClient.logradouro}, ${editedClient.number || 'S/N'}${editedClient.complement ? ` - ${editedClient.complement}` : ''} - ${editedClient.neighborhood || ''}, ${editedClient.city || ''}/${editedClient.state || ''} (CEP: ${editedClient.cep || ''})`
        : (editedClient.address || '');

      await updateDoc(clientRef, {
        company: editedClient.company,
        name: editedClient.name,
        cnpj: editedClient.cnpj || editedClient.cpfCnpj || '',
        cpfCnpj: editedClient.cpfCnpj || '',
        cep: editedClient.cep || '',
        logradouro: editedClient.logradouro || '',
        number: editedClient.number || '',
        complement: editedClient.complement || '',
        neighborhood: editedClient.neighborhood || '',
        city: editedClient.city || '',
        state: editedClient.state || '',
        address: structuredAddress,
        logoUrl: editedClient.logoUrl || '',
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      setTasksCount(MOCK_TASKS.filter(t => t.clientId === client.id).length);
      setApprovalsCount(MOCK_CONTENTS.filter(c => c.clientId === client.id && c.status === 'approval').length);
      return () => {};
    }

    // Listen for simple counts
    const taskUnsub = onSnapshot(collection(db, 'clients', client.id, 'tasks'), (snap) => {
      setTasksCount(snap.size);
    });
    const contentUnsub = onSnapshot(collection(db, 'clients', client.id, 'contents'), (snap) => {
       setApprovalsCount(snap.docs.filter(d => d.data().status === 'approval').length);
     });
    return () => { taskUnsub(); contentUnsub(); };
  }, [client.id, isDemoMode]);

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutGrid },
    { id: 'contents', label: 'Calendário', icon: Calendar },
    { id: 'approvals', label: 'Aprovações', icon: FileCheck, badge: approvalsCount },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare, badge: tasksCount },
    { id: 'files', label: 'Arquivos', icon: FolderOpen },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'logins', label: 'Logins', icon: Key },
    { id: 'portal', label: 'Área do Cliente', icon: ShieldCheck },
    { id: 'contracts', label: 'Contratos', icon: FileText },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="client-overview">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm col-span-2 space-y-8">
            <div className="flex justify-between items-start">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Informações do Cliente</h3>
               {isEditing ? (
                 <div className="flex space-x-2">
                    <button onClick={() => setIsEditing(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Cancelar</button>
                    <button onClick={handleUpdateClient} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">Salvar Alterações</button>
                 </div>
               ) : (
                 profile.role !== 'client' && (
                   <button onClick={() => setIsEditing(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center">
                     <Edit2 className="w-3 h-3 mr-1" /> Editar
                   </button>
                 )
               )}
            </div>

            <div className="grid grid-cols-2 gap-y-8 gap-x-6">
               <div>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mb-1">Empresa</p>
                 {isEditing ? (
                   <input 
                     className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                     value={editedClient.company || ''}
                     onChange={(e) => setEditedClient({...editedClient, company: e.target.value})}
                   />
                 ) : (
                   <p className="text-base font-bold text-gray-900">{client.company}</p>
                 )}
               </div>
               <div>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mb-1">CNPJ / CPF</p>
                 {isEditing ? (
                   <input 
                     className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                     placeholder="00.000.000/0001-00"
                     value={editedClient.cnpj || ''}
                     onChange={(e) => setEditedClient({...editedClient, cnpj: e.target.value})}
                   />
                 ) : (
                   <p className="text-base font-bold text-gray-900">{client.cnpj || '--'}</p>
                 )}
               </div>
               <div>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mb-1">Responsável</p>
                 {isEditing ? (
                   <input 
                     className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                     value={editedClient.name || ''}
                     onChange={(e) => setEditedClient({...editedClient, name: e.target.value})}
                   />
                 ) : (
                   <p className="text-base font-bold text-gray-900">{client.name}</p>
                 )}
               </div>
               <div>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mb-1">Status Contratual</p>
                 <span className={cn(
                   "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                   client.status === 'active' ? "bg-green-100 text-green-700" :
                   client.status === 'paused' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                 )}>
                   {client.status === 'active' ? 'Ativo' : client.status === 'paused' ? 'Pausado' : 'Cancelado'}
                 </span>
               </div>
               
               {isEditing && (
                 <div className="col-span-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mb-1">URL do Logo</p>
                    <input 
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="https://exemplo.com/logo.png"
                      value={editedClient.logoUrl || ''}
                      onChange={(e) => setEditedClient({...editedClient, logoUrl: e.target.value})}
                    />
                 </div>
               )}

               {/* ENDEREÇO SECTORS */}
               <div className="col-span-2 border-t border-gray-50 pt-6 mt-4">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Endereço Comercial</p>
                 
                 {isEditing ? (
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div className="space-y-1">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">CEP (Busca Automática)</label>
                       <input 
                         type="text"
                         className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                         placeholder="00000-000"
                         value={editedClient.cep || ''}
                         onChange={(e) => handleDetailCEPChange(e.target.value)}
                       />
                     </div>
                     <div className="sm:col-span-2 space-y-1">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Logradouro / Rua</label>
                       <input 
                         type="text"
                         className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                         placeholder="Av. Paulista"
                         value={editedClient.logradouro || ''}
                         onChange={(e) => setEditedClient({...editedClient, logradouro: e.target.value})}
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Número</label>
                       <input 
                         type="text"
                         className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                         placeholder="123"
                         value={editedClient.number || ''}
                         onChange={(e) => setEditedClient({...editedClient, number: e.target.value})}
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Complemento</label>
                       <input 
                         type="text"
                         className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                         placeholder="Apto/Sala"
                         value={editedClient.complement || ''}
                         onChange={(e) => setEditedClient({...editedClient, complement: e.target.value})}
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Bairro</label>
                       <input 
                         type="text"
                         className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                         placeholder="Centro"
                         value={editedClient.neighborhood || ''}
                         onChange={(e) => setEditedClient({...editedClient, neighborhood: e.target.value})}
                       />
                     </div>
                     <div className="sm:col-span-2 space-y-1">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Cidade</label>
                       <input 
                         type="text"
                         className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                         placeholder="Cidade"
                         value={editedClient.city || ''}
                         onChange={(e) => setEditedClient({...editedClient, city: e.target.value})}
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado (UF)</label>
                       <input 
                         type="text"
                         className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                         placeholder="SP"
                         value={editedClient.state || ''}
                         onChange={(e) => setEditedClient({...editedClient, state: e.target.value})}
                       />
                     </div>
                   </div>
                 ) : (
                   <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/80 space-y-1.5 text-sm w-full">
                     {client.cep || client.logradouro ? (
                       <>
                         <p className="text-gray-800 font-bold">
                           {client.logradouro}, {client.number || 'S/N'} {client.complement && <span className="text-gray-500 font-medium">({client.complement})</span>}
                         </p>
                         <p className="text-gray-600 font-medium">
                           {client.neighborhood && <span>{client.neighborhood} — </span>}{client.city}/{client.state}
                         </p>
                         {client.cep && (
                           <p className="text-xs text-blue-600 font-black tracking-widest font-mono uppercase mt-1">CEP {client.cep}</p>
                         )}
                       </>
                     ) : (
                       <p className="text-gray-800 font-medium">
                         {client.address || 'Nenhum endereço cadastrado para este cliente.'}
                       </p>
                     )}
                   </div>
                 )}
               </div>
            </div>

            {client.onboardingStatus && !client.onboardingStatus.completed && (
               <div className="pt-8 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-4">
                     <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-ping"></div>
                        Fluxo de Onboarding
                     </h4>
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passo {client.onboardingStatus.step} de {client.onboardingStatus.totalSteps}</span>
                  </div>
                  <div className="flex space-x-2">
                     {Array.from({ length: client.onboardingStatus.totalSteps }).map((_, i) => (
                        <div 
                           key={i} 
                           className={cn(
                             "h-2 flex-1 rounded-full transition-all duration-500",
                             i < client.onboardingStatus!.step ? "bg-amber-400" : "bg-gray-100"
                           )}
                        ></div>
                     ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                     <p className="text-xs text-gray-500 font-medium italic">
                        {client.onboardingStatus.step === 1 ? 'Coletando ativos da marca (Logo, Identidade)...' : 
                         client.onboardingStatus.step === 2 ? 'Configurando acessos (Meta, Google)...' :
                         client.onboardingStatus.step === 3 ? 'Aprovação de Estratégia de Conteúdo...' :
                         client.onboardingStatus.step === 4 ? 'Treinamento de Fluxo de Aprovação...' : 'Finalizando Setup...'}
                     </p>
                     {profile.role === 'admin' && (
                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                           Próxima Etapa →
                        </button>
                     )}
                  </div>
               </div>
            )}
          </div>
          <div className="bg-blue-600 p-6 rounded-xl shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="font-bold text-lg mb-1">Status da Conta</h3>
               <p className="opacity-90 text-xs">Assinatura ativa / Plano Básico</p>
             </div>
             <div className="mt-8 relative z-10 flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-blue-600 flex items-center justify-center text-[10px] font-bold">ES</div>
                  <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-blue-600 flex items-center justify-center text-[10px] font-bold">JD</div>
                </div>
                <button className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all backdrop-blur-md">
                   Ver Time
                </button>
             </div>
             <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>

          <div 
            onClick={() => setActiveTab('logins')}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer group flex flex-col justify-between"
          >
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                   <Key className="w-5 h-5" />
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180" />
             </div>
             <div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Acessos</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Configurar logins e senhas</p>
             </div>
          </div>

          <div 
            onClick={() => setActiveTab('contracts')}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-pink-200 transition-all cursor-pointer group flex flex-col justify-between"
          >
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                   <FileText className="w-5 h-5" />
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180" />
             </div>
             <div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Contrato</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Documentos e termos legais</p>
             </div>
          </div>

          <div 
            onClick={() => setActiveTab('financial')}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-green-200 transition-all cursor-pointer group flex flex-col justify-between"
          >
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                   <DollarSign className="w-5 h-5" />
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180" />
             </div>
             <div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Financeiro</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Valores e vencimentos</p>
             </div>
          </div>
        </div>
      );
      case 'tasks': return <ClientTasks client={client} profile={profile} isDemoMode={isDemoMode} />;
      case 'contents': return <ClientContent client={client} profile={profile} isDemoMode={isDemoMode} />;
      case 'approvals': return <ClientContent client={client} profile={profile} approvalsOnly isDemoMode={isDemoMode} />;
      case 'financial': return <ClientFinancial client={client} profile={profile} isDemoMode={isDemoMode} />;
      case 'files': return <ClientFiles client={client} profile={profile} isDemoMode={isDemoMode} />;
      case 'logins': return <ClientLogins client={client} profile={profile} isDemoMode={isDemoMode} />;
      case 'portal': return <ClientPortal client={client} profile={profile} isDemoMode={isDemoMode} />;
      case 'contracts': return <ClientContracts client={client} profile={profile} />;
      default: return null;
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
      id="client-detail-container"
    >
      <button 
        id="back-to-clients"
        onClick={onClose}
        className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-colors group mb-4"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-all" />
        <span className="font-medium">Voltar para Clientes</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
            {client.logoUrl ? (
              <img src={client.logoUrl} alt={client.company} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-10 h-10 text-blue-600" />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{client.company}</h2>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-gray-500 text-sm font-medium">{client.name}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="text-blue-600 text-sm font-semibold flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Recorrência Mensal
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {client.driveFolderId ? (
            <a 
              href={`https://drive.google.com/drive/folders/${client.driveFolderId}`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-blue-600 font-bold hover:bg-blue-50 shadow-sm flex items-center transition-all"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Ver no Drive
            </a>
          ) : (
            <button 
              onClick={() => setActiveTab('files')}
              className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-amber-600 font-bold hover:bg-amber-50 shadow-sm flex items-center transition-all"
            >
              <FolderOpen className="w-5 h-5 mr-2" />
              Sincronizar Drive
            </button>
          )}
          <button className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all">
            Editar Visão Geral
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max" id="client-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-all",
                activeTab === tab.id 
                  ? "border-blue-600 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="py-6" id="client-tab-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
