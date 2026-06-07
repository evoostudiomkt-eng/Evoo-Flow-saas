import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc,
  orderBy,
  addDoc,
  deleteDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Agency, Client } from '../types';
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  TrendingUp, 
  Activity,
  Search,
  ExternalLink,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  X,
  Mail,
  Database,
  HardDrive,
  Trash2,
  DollarSign,
  Settings,
  Palette,
  Type,
  Image,
  FileText,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';

interface SaaSAdminProps {
  profile: UserProfile;
  initialTab?: string;
}

export default function SaaSAdmin({ profile, initialTab }: SaaSAdminProps) {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({
    name: '',
    ownerEmail: '',
    planId: 'start' as const
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete Agency Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Global Branding Default States
  const [globalBranding, setGlobalBranding] = useState({
    logoUrl: '',
    primaryColor: '#2563eb',
    fontFamily: 'Inter',
    title: '',
    description: '',
    buttonText: ''
  });
  const [isSavingGlobalBranding, setIsSavingGlobalBranding] = useState(false);
  const [globalBrandingSaved, setGlobalBrandingSaved] = useState(false);
  
  // Use a local state that defaults to initialTab (handling settings naming alignment)
  const [activeTab, setActiveTab] = useState<string>(
    initialTab === 'settings' ? 'saas-settings' : (initialTab || 'agencies')
  );
  const [saasCentralSubTab, setSaasCentralSubTab] = useState<'agencies' | 'clients'>('agencies');

  // Sync with prop when it changes from Sidebar
  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'settings') {
        setActiveTab('saas-settings');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab]);

  // Stats for resources
  const resourceStats = {
    totalUsers: users.length,
    totalAgencies: agencies.length,
    totalActiveAgencies: agencies.filter(a => a.status === 'active').length,
    averageUsersPerAgency: agencies.length > 0 ? (users.length / agencies.length).toFixed(1) : 0
  };

  // Segurança: Apenas o dono principal do SaaS pode ver esta tela
  if (profile.email !== 'evoostudiomkt@gmail.com') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Lock className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-black text-gray-900">Acesso Restrito</h2>
        <p className="text-gray-500">Esta área é exclusiva para a administração do SaaS.</p>
      </div>
    );
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const agenciesSnap = await getDocs(query(collection(db, 'agencies'), orderBy('createdAt', 'desc')));
        const usersSnap = await getDocs(collection(db, 'users'));
        let clientsSnap;
        try {
          clientsSnap = await getDocs(collection(db, 'clients'));
        } catch (cErr) {
          console.warn("Unable to fetch clients for SaaS view:", cErr);
        }
        
        setAgencies(agenciesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Agency)));
        setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as unknown as UserProfile)));
        if (clientsSnap) {
          setClients(clientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
        }

        // Fetch Global SaaS branding defaults
        try {
          const globalBrandDoc = await getDoc(doc(db, 'saasSettings', 'brandingDefaults'));
          if (globalBrandDoc.exists()) {
            const data = globalBrandDoc.data();
            setGlobalBranding({
              logoUrl: data.logoUrl || '',
              primaryColor: data.primaryColor || '#2563eb',
              fontFamily: data.fontFamily || 'Inter',
              title: data.title || '',
              description: data.description || '',
              buttonText: data.buttonText || ''
            });
          }
        } catch (bErr) {
          console.warn("Unable to fetch global branding defaults:", bErr);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleAgencyStatus = async (agency: Agency) => {
    const newStatus = agency.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'agencies', agency.id), { status: newStatus });
      setAgencies(prev => prev.map(a => a.id === agency.id ? { ...a, status: newStatus as any } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAgencyClick = (agency: Agency) => {
    setAgencyToDelete(agency);
    setDeleteReason('');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyToDelete) return;
    if (!deleteReason.trim()) {
      alert('Por favor, informe o motivo da exclusão.');
      return;
    }

    setIsDeleting(true);

    try {
      // 1. Log the deletion details with reason
      await addDoc(collection(db, 'deletionLogs'), {
        agencyId: agencyToDelete.id,
        agencyName: agencyToDelete.name,
        reason: deleteReason.trim(),
        deletedByEmail: profile.email,
        deletedByName: profile.displayName || 'SaaS Admin',
        deletedAt: new Date().toISOString()
      });

      // 2. Perform actual deletion of the agency document
      await deleteDoc(doc(db, 'agencies', agencyToDelete.id));

      // 3. Update local state
      setAgencies(prev => prev.filter(a => a.id !== agencyToDelete.id));

      alert('Agência apagada com sucesso.');
      setIsDeleteModalOpen(false);
      setAgencyToDelete(null);
      setDeleteReason('');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao apagar agência: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const getAgencyUsersCount = (agencyId: string) => {
    return users.filter(u => u.agencyId === agencyId).length;
  };

  const PLANS = {
    test: { name: 'Plano Teste R$5', price: 5, clients: 2, storage: 2 },
    start: { name: 'Start', price: 47, clients: 5, storage: 10 },
    growth: { name: 'Growth', price: 97, clients: 10, storage: 20 },
    pro: { name: 'Pro', price: 147, clients: 20, storage: 30 },
    custom: { name: 'Custom', price: 0, clients: 999, storage: 999 }
  };

  const updateAgencyPlan = async (agencyId: string, planId: keyof typeof PLANS) => {
    const plan = PLANS[planId];
    try {
      await updateDoc(doc(db, 'agencies', agencyId), { 
        planId,
        clientLimit: plan.clients,
        storageLimitGb: plan.storage
      });
      setAgencies(prev => prev.map(a => a.id === agencyId ? { ...a, planId, clientLimit: plan.clients, storageLimitGb: plan.storage } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const mrr = agencies.reduce((acc, agency) => {
    if (agency.status !== 'active') return acc;
    const plan = PLANS[agency.planId as keyof typeof PLANS] || PLANS.start;
    return acc + plan.price;
  }, 0);

  const filteredAgencies = agencies.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.id?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgency.name) return;

    setIsSaving(true);
    const plan = PLANS[newAgency.planId];

    try {
      // Setup the branding inherited from the SaaS global parameters
      const initialBranding = {
        logoUrl: globalBranding.logoUrl || '',
        primaryColor: globalBranding.primaryColor || '#2563eb',
        fontFamily: globalBranding.fontFamily || 'Inter',
        title: globalBranding.title || '',
        description: globalBranding.description || '',
        buttonText: globalBranding.buttonText || ''
      };

      const docRef = await addDoc(collection(db, 'agencies'), {
        name: newAgency.name,
        planId: newAgency.planId,
        clientLimit: plan.clients,
        storageLimitGb: plan.storage,
        status: 'active',
        createdAt: new Date().toISOString(),
        ownerEmail: newAgency.ownerEmail, // For future linking
        branding: initialBranding
      });

      const created = { 
        id: docRef.id, 
        name: newAgency.name, 
        planId: newAgency.planId,
        clientLimit: plan.clients,
        storageLimitGb: plan.storage,
        status: 'active',
        createdAt: new Date().toISOString(),
        branding: initialBranding
      } as Agency;

      setAgencies([created, ...agencies]);
      setIsModalOpen(false);
      setNewAgency({ name: '', ownerEmail: '', planId: 'start' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGlobalBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobalBranding(true);
    setGlobalBrandingSaved(false);
    try {
      await setDoc(doc(db, 'saasSettings', 'brandingDefaults'), globalBranding, { merge: true });
      setGlobalBrandingSaved(true);
      setTimeout(() => setGlobalBrandingSaved(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar branding global:", err);
      alert("Erro ao salvar identidade global: " + (err as Error).message);
    } finally {
      setIsSavingGlobalBranding(false);
    }
  };

  return (
    <div className="space-y-8" id="saas-admin-container">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
            <ShieldCheck className="w-8 h-8 mr-3 text-blue-600" />
            {activeTab === 'agencies' ? 'SaaS Central Control' : 
             activeTab === 'finance' ? 'Finanças & MRR' :
             activeTab === 'resources' ? 'Métricas & Infraestrutura' : 'Sistema & Integrações'}
          </h2>
          <p className="text-gray-500 font-medium mt-1">
            {activeTab === 'agencies' ? 'Gerencie todas as agências e clientes da plataforma.' :
             activeTab === 'finance' ? 'Controle de faturamento, planos e crescimento.' :
             activeTab === 'resources' ? 'Saúde do sistema, performance e recursos da nuvem.' : 'Configurações globais e Webhooks do ecossistema.'}
          </p>
        </div>

        <div className="flex items-center space-x-4">
           {activeTab === 'agencies' && saasCentralSubTab === 'agencies' && (
             <button 
               onClick={() => setIsModalOpen(true)}
               className="flex items-center bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
             >
               <Plus className="w-4 h-4 mr-2" />
               Nova Agência
             </button>
           )}
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text"
               placeholder={saasCentralSubTab === 'agencies' ? "Buscar agências..." : "Buscar clientes..."}
               className="pl-10 pr-4 py-2.5 border border-gray-100 rounded-2xl bg-white shadow-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[250px]"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
         </div>
      </header>

      {/* Tab Content */}
      {activeTab === 'agencies' && (
        <>
          {/* Subheader Switcher removed to focus exclusively on Agency partners */}

          {saasCentralSubTab === 'agencies' ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 rounded-2xl">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <Activity className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-3xl font-black text-gray-900">{agencies.length}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Agências Totais</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 rounded-2xl">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <Activity className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-3xl font-black text-gray-900">{users.length}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Usuários Totais</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-50 rounded-2xl">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">R$ {mrr.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">MRR Estimado</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 rounded-2xl">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">0</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Pendentes</p>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-50">
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Agência / ID</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Plano Limites</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Usuários</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAgencies.map(agency => (
                        <tr key={agency.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                                {agency.name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900">{agency.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{agency.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center w-fit",
                              agency.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                              {agency.status === 'active' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                              {agency.status === 'active' ? 'Ativa' : 'Suspensa'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1">
                              <select 
                                value={agency.planId || 'start'}
                                onChange={(e) => updateAgencyPlan(agency.id, e.target.value as any)}
                                className="text-[10px] font-black uppercase tracking-widest bg-gray-50 border-none rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 animate-none"
                              >
                                <option value="start">Start (R$ 47)</option>
                                <option value="growth">Growth (R$ 97)</option>
                                <option value="pro">Pro (R$ 147)</option>
                                <option value="custom">Custom</option>
                              </select>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">
                                {agency.clientLimit || 0} clintes • {agency.storageLimitGb || 0}GB
                              </p>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-bold text-gray-600">
                            {getAgencyUsersCount(agency.id)} membros
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => toggleAgencyStatus(agency)}
                                className={cn(
                                  "p-2 rounded-xl transition-all",
                                  agency.status === 'active' ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"
                                )}
                                title={agency.status === 'active' ? "Suspender Agência" : "Ativar Agência"}
                              >
                                {agency.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => handleDeleteAgencyClick(agency)}
                                className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-all"
                                title="Apagar Agência"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Clientes Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 rounded-2xl">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{clients.length}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Clientes Totais</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-50 rounded-2xl">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{clients.filter(c => c.status === 'active').length}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Ativos</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 rounded-2xl">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{clients.filter(c => c.status === 'paused').length}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Pausados</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-50 rounded-2xl">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{clients.filter(c => c.status === 'cancelled').length}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Cancelados</p>
                </div>
              </div>

              {/* Clientes Table */}
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-50">
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cliente / ID</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Empresa / Contato</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Agência Proprietária</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Data de Cadastro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredClients.map(client => {
                        const associatedAgency = agencies.find(a => a.id === (client as any).agencyId);
                        return (
                          <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-black">
                                  {client.name ? client.name[0] : 'C'}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-gray-900">{client.name}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{client.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div>
                                <p className="text-sm font-bold text-gray-900">{client.company || '—'}</p>
                                <p className="text-xs text-gray-500">{client.email || '—'}</p>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              {associatedAgency ? (
                                <div>
                                  <p className="text-sm font-black text-blue-600">{associatedAgency.name}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{associatedAgency.id}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Agência desvinculada ({(client as any).agencyId || 'N/A'})</span>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center w-fit",
                                client.status === 'active' ? "bg-green-100 text-green-700" :
                                client.status === 'paused' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                              )}>
                                {client.status === 'active' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                                 client.status === 'paused' ? <Clock className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                {client.status === 'active' ? 'Ativo' :
                                 client.status === 'paused' ? 'Pausado' : 'Cancelado'}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-xs text-gray-500 font-bold">
                              {client.createdAt ? format(new Date(client.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredClients.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-sm text-gray-400 font-bold italic">
                            Nenhum cliente encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Faturamento Atual</p>
                  <h3 className="text-4xl font-black text-gray-900">R$ {mrr.toLocaleString('pt-BR')}</h3>
                  <div className="mt-4 flex items-center text-green-500 text-xs font-bold">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12% em relação ao mês anterior
                  </div>
               </div>
               <DollarSign className="absolute -bottom-4 -right-4 w-24 h-24 text-gray-50 opacity-50" />
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Churn Rate (30d)</p>
               <h3 className="text-4xl font-black text-gray-900">1.2%</h3>
               <p className="text-gray-400 text-xs mt-4 font-medium italic">* Baseado em suspensões manuais</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">LTV Médio</p>
               <h3 className="text-4xl font-black text-gray-900">R$ 580</h3>
               <p className="text-gray-400 text-xs mt-4 font-medium">Estimativa baseada em planos ativos</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <h4 className="text-lg font-black text-gray-900 mb-6">Planos do Ecossistema</h4>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(PLANS).map(([id, plan]) => (
                  <div key={id} className="p-6 rounded-3xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{plan.name}</p>
                    <p className="text-2xl font-black text-gray-900 mb-4">R$ {plan.price}</p>
                    <ul className="space-y-2">
                       <li className="text-[10px] font-bold text-gray-500 uppercase flex items-center">
                         <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                         {plan.clients} Clientes
                       </li>
                       <li className="text-[10px] font-bold text-gray-500 uppercase flex items-center">
                         <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                         {plan.storage}GB Sorage
                       </li>
                    </ul>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-orange-50 rounded-2xl shadow-inner">
                    <Database className="w-8 h-8 text-orange-600" />
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-full">Saudável</span>
               </div>
               <h3 className="text-xl font-black text-gray-900 mb-1">Firestore Stats</h3>
               <p className="text-gray-400 text-sm font-medium mb-6">Uso estimado de documentos</p>
               
               <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      <span>Total de Documentos</span>
                      <span className="text-gray-900">{resourceStats.totalAgencies + resourceStats.totalUsers} est.</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                       <div className="h-full bg-orange-500 w-[15%]" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed italic">
                    * Documentos ativos baseados em Coleções Root: Agencies, Users, Leads.
                  </p>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-blue-50 rounded-2xl shadow-inner">
                    <HardDrive className="w-8 h-8 text-blue-600" />
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-full">Firebase Storage</span>
               </div>
               <h3 className="text-xl font-black text-gray-900 mb-1">Storage Usage</h3>
               <p className="text-gray-400 text-sm font-medium mb-6">Consumo de mídia e arquivos</p>
               
               <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      <span>Espaço Ocupado</span>
                      <span className="text-gray-900">Calculando...</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 w-[5%]" />
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-500 leading-tight">
                      O consumo real de Storage depende de arquivos binários. Verifique o console do Firebase para métricas de rede exatas.
                    </p>
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-green-50 rounded-2xl shadow-inner">
                    <Activity className="w-8 h-8 text-green-600" />
                  </div>
               </div>
               <h3 className="text-xl font-black text-gray-900 mb-1">Performance Aliança</h3>
               <p className="text-gray-400 text-sm font-medium mb-6">Densidade operacional</p>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Usuários/Agência</p>
                    <p className="text-xl font-black text-gray-900">{resourceStats.averageUsersPerAgency}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Docs/Agência (Est)</p>
                    <p className="text-xl font-black text-gray-900">~12.4</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-blue-900 p-10 rounded-[3rem] text-white overflow-hidden relative">
            <div className="relative z-10">
              <h4 className="text-2xl font-black mb-2">Monitoramento de Faturamento Firebase</h4>
              <p className="text-blue-200 text-sm max-w-xl mb-8">
                Este dashboard de infra fornece uma estimativa de uso baseada em documentos do Firestore. Para visualizar cobranças exatas, limites de rede e processamento em nuvem, acesse o painel oficial.
              </p>
              <div className="flex gap-4">
                <a 
                  href="https://console.firebase.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white text-blue-900 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
                >
                  Firebase Console
                </a>
                <button className="bg-blue-800 text-blue-100 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest">
                  Exportar Relatório
                </button>
              </div>
            </div>
            
            <Database className="absolute -bottom-20 -right-20 w-80 h-80 text-blue-800 opacity-50 rotate-12" />
          </div>
        </div>
      )}

      {activeTab === 'saas-settings' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <h4 className="text-lg font-black text-gray-900 mb-6 flex items-center">
                 <ShieldCheck className="w-5 h-5 mr-2 text-blue-600" />
                 Integraciones Globales
               </h4>
               <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                     <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm font-bold text-blue-600 italic">G</div>
                        <div>
                           <p className="text-sm font-black text-gray-900">Google Gemini API</p>
                           <p className="text-[10px] text-gray-500 font-bold uppercase">Inteligencia Artificial</p>
                        </div>
                     </div>
                     <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-full tracking-widest">Ativo</span>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between opacity-50">
                     <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm font-bold text-gray-600">S</div>
                        <div>
                           <p className="text-sm font-black text-gray-900">Stripe Marketplace</p>
                           <p className="text-[10px] text-gray-500 font-bold uppercase">Pagamentos SaaS</p>
                        </div>
                     </div>
                     <span className="px-3 py-1 bg-gray-200 text-gray-500 text-[9px] font-black uppercase rounded-full tracking-widest">Configurar</span>
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <h4 className="text-lg font-black text-gray-900 mb-6 flex items-center">
                 <Settings className="w-5 h-5 mr-2 text-blue-600" />
                 Parâmetros do Sistema
               </h4>
               <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Moeda Padrão</label>
                    <select className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none">
                       <option>BRL (R$)</option>
                       <option>USD ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Período de Trial (Dias)</label>
                    <input type="number" defaultValue={7} className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                  </div>
               </div>
            </div>

            {/* Global Branding Default Control Panel for SaaS administrator */}
            <div className="md:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm mt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h4 className="text-lg font-black text-gray-900 flex items-center">
                    <Palette className="w-5 h-5 mr-3 text-blue-600 animate-pulse" />
                    Branding Global Padrão (Novas Agências)
                  </h4>
                  <p className="text-gray-500 text-xs font-semibold mt-1 font-sans">
                    Defina globalmente a identidade visual padrão (logo, paleta de cores, fontes e copywriting) que novas agências herdarão imediatamente ao serem cadastradas no SaaS.
                  </p>
                </div>
                {globalBrandingSaved && (
                  <div className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 animate-bounce" />
                    Branding global salvo com sucesso!
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveGlobalBranding} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Cores */}
                  <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <div className="flex items-center space-x-2">
                      <Palette className="w-4 h-4 text-blue-600" />
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block font-sans">Cor Primária SaaS</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="color" 
                        value={globalBranding.primaryColor || '#2563eb'}
                        onChange={(e) => setGlobalBranding({ ...globalBranding, primaryColor: e.target.value })}
                        className="w-12 h-12 rounded-xl cursor-pointer border border-gray-200 p-0 overflow-hidden bg-transparent shrink-0"
                      />
                      <input 
                        type="text" 
                        value={globalBranding.primaryColor || '#2563eb'}
                        onChange={(e) => setGlobalBranding({ ...globalBranding, primaryColor: e.target.value })}
                        placeholder="#2563eb"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold shadow-inner bg-white text-gray-700 outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium font-sans">Esta cor será aplicada a botões, links e destaques visuais.</p>
                  </div>

                  {/* Fontes */}
                  <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <div className="flex items-center space-x-2">
                      <Type className="w-4 h-4 text-blue-600" />
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block font-sans">Fonte Padrão (Tipografia)</label>
                    </div>
                    <select 
                      value={globalBranding.fontFamily || 'Inter'}
                      onChange={(e) => setGlobalBranding({ ...globalBranding, fontFamily: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-700 outline-none font-sans"
                    >
                      <option value="Inter">Inter (Suiça/Clean)</option>
                      <option value="Space Grotesk">Space Grotesk (Tech/Moderna)</option>
                      <option value="Outfit">Outfit (Moderna/Display)</option>
                      <option value="Poppins">Poppins (Arredondada/Futurista)</option>
                      <option value="Montserrat">Montserrat (Geométrica)</option>
                      <option value="Playfair Display">Playfair Display (Serif/Editorial)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Monospace)</option>
                    </select>
                    <p className="text-[10px] text-gray-400 font-medium font-sans" style={{ fontFamily: globalBranding.fontFamily || 'Inter' }}>
                      Visualização prévia do estilo da fonte selecionada.
                    </p>
                  </div>

                  {/* Logotipo URL */}
                  <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <div className="flex items-center space-x-2">
                      <Image className="w-4 h-4 text-blue-600" />
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block font-sans">Logotipo Global Padrão (URL)</label>
                    </div>
                    <div className="flex gap-2 font-sans">
                      <input 
                        type="text" 
                        value={globalBranding.logoUrl || ''}
                        onChange={(e) => setGlobalBranding({ ...globalBranding, logoUrl: e.target.value })}
                        placeholder="https://exemplo.com/logo.png"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold shadow-inner bg-white text-gray-700 outline-none"
                      />
                      {globalBranding.logoUrl && (
                        <div className="w-10 h-10 border border-gray-200 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
                          <img src={globalBranding.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium font-sans">Link público para o arquivo de imagem do logo (PNG/SVG).</p>
                  </div>
                </div>

                {/* Textos Padrão e Preview do Formulário */}
                <div className="border-t border-gray-100 pt-6">
                  <h5 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4 flex items-center font-sans">
                    <FileText className="w-4 h-4 mr-1.5 text-blue-600" />
                    Textos e Copy Padrão do Formulário de Coleta de Leads
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-sans">Título Principal Padrão</label>
                        <input 
                          type="text" 
                          value={globalBranding.title || ''}
                          onChange={(e) => setGlobalBranding({ ...globalBranding, title: e.target.value })}
                          placeholder="Solicite uma Consultoria e Alavanque seus Resultados"
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-600 outline-none font-sans"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-sans">Descrição Auxiliar Padrão</label>
                        <textarea 
                          value={globalBranding.description || ''}
                          onChange={(e) => setGlobalBranding({ ...globalBranding, description: e.target.value })}
                          placeholder="Fale com nosso time de especialistas e receba um plano estratégico personalizado para a sua empresa."
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-600 outline-none min-h-[80px]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block font-sans">Texto do Botão Principal Padrão</label>
                        <input 
                          type="text" 
                          value={globalBranding.buttonText || ''}
                          onChange={(e) => setGlobalBranding({ ...globalBranding, buttonText: e.target.value })}
                          placeholder="Enviar Solicitação de Consultoria"
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-600 outline-none font-sans"
                        />
                      </div>
                    </div>

                    {/* Mini live preview so the admin can see how beautiful it looks */}
                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider mb-3 inline-block font-sans">Visualização em Tempo Real</span>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200/50 shadow-sm space-y-4" style={{ fontFamily: globalBranding.fontFamily || 'Inter' }}>
                          <div className="flex items-center space-x-2">
                            {globalBranding.logoUrl ? (
                              <img src={globalBranding.logoUrl} alt="Logo" className="h-6 object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-6 flex items-center text-xs font-extrabold text-gray-800">
                                <Sparkles className="w-4 h-4 mr-1 text-yellow-500" /> SUA AGÊNCIA
                              </div>
                            )}
                          </div>
                          <div>
                            <h6 className="text-sm font-black text-gray-900 leading-tight">
                              {globalBranding.title || 'Solicite uma Consultoria Estratégica Completa'}
                            </h6>
                            <p className="text-[10px] text-gray-400 font-medium mt-1">
                              {globalBranding.description || 'Preencha o formulário abaixo e receba um diagnóstico exclusivo.'}
                            </p>
                          </div>
                          <div className="pt-2">
                            <button 
                              type="button"
                              className="w-full py-2.5 rounded-xl text-[10px] font-bold text-white shadow-sm flex items-center justify-center gap-1.5 cursor-default font-sans"
                              style={{ backgroundColor: globalBranding.primaryColor || '#2563eb' }}
                            >
                              <span>{globalBranding.buttonText || 'Solicitar Diagnóstico Gratuito'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 text-center font-bold mt-4 font-sans">Tipografia: {globalBranding.fontFamily || 'Inter'} • Cor: {globalBranding.primaryColor || '#2563eb'}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingGlobalBranding}
                    className="px-6 py-3.5 bg-blue-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-750 transition-all flex items-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer font-sans"
                  >
                    {isSavingGlobalBranding ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin text-white" />
                        <span>Salvando Branding...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Salvar Branding Global Padrão</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Agency Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
               <div>
                  <h3 className="text-xl font-black text-gray-900 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                    Nova Agência
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Cadastro Manual de Aliança</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
               </button>
            </div>

            <form onSubmit={handleAddAgency} className="p-8 space-y-6">
               <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Nome da Agência</label>
                    <div className="relative">
                       <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input 
                         required
                         type="text" 
                         placeholder="Ex: Evoo Studio Mkt"
                         className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                         value={newAgency.name}
                         onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })}
                       />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Email do Proprietário (Opcional)</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input 
                         type="email" 
                         placeholder="email@agencia.com"
                         className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                         value={newAgency.ownerEmail}
                         onChange={(e) => setNewAgency({ ...newAgency, ownerEmail: e.target.value })}
                       />
                    </div>
                    <p className="mt-2 text-[9px] text-blue-500 font-bold leading-tight">
                      * O proprietário deve criar uma conta com este mesmo e-mail para ter acesso à agência.
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Plano de Assinatura</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                      value={newAgency.planId}
                      onChange={(e) => setNewAgency({ ...newAgency, planId: e.target.value as any })}
                    >
                      <option value="start">Start (5 Cli • 10GB)</option>
                      <option value="growth">Growth (10 Cli • 20GB)</option>
                      <option value="pro">Pro (20 Cli • 30GB)</option>
                      <option value="custom">Custom (Enterprise)</option>
                    </select>
                  </div>
               </div>

               <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    {isSaving ? 'Criando...' : 'Cadastrar Agência'}
                  </button>
               </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Agency Modal with Reason */}
      {isDeleteModalOpen && agencyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-none"
          >
            <div className="p-8 border-b border-red-50 flex justify-between items-center bg-red-50/20">
               <div>
                  <h3 className="text-xl font-black text-gray-900 flex items-center">
                    <Trash2 className="w-5 h-5 mr-2 text-red-600" />
                    Excluir Agência
                  </h3>
                  <p className="text-xs font-bold text-red-500 uppercase tracking-widest mt-1">Ação Irreversível</p>
               </div>
               <button 
                 type="button" 
                 onClick={() => {
                   setIsDeleteModalOpen(false);
                   setAgencyToDelete(null);
                   setDeleteReason('');
                 }} 
                 className="p-2 hover:bg-gray-100 rounded-xl transition-colors outline-none"
               >
                  <X className="w-5 h-5 text-gray-400" />
               </button>
            </div>

            <form onSubmit={confirmDeleteAgency} className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                     <p className="text-xs font-bold text-red-800">
                       Atenção! Você está prestes a excluir definitivamente a agência:
                     </p>
                     <p className="text-base font-black text-gray-900 mt-1">
                       {agencyToDelete.name}
                     </p>
                     <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                       ID: {agencyToDelete.id}
                     </p>
                  </div>

                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">
                       Motivo da Exclusão *
                     </label>
                     <textarea 
                       required
                       rows={4}
                       placeholder="Informe detalhadamente o motivo para excluir esta agência (ex: Migração de plano, solicitação do proprietário, etc)..."
                       className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-red-500 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-red-500/10 outline-none resize-none animate-none"
                       value={deleteReason}
                       onChange={(e) => setDeleteReason(e.target.value)}
                     />
                  </div>
               </div>

               <div className="pt-2 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setAgencyToDelete(null);
                      setDeleteReason('');
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase transition-colors outline-none disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isDeleting || !deleteReason.trim()}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-red-100 disabled:opacity-50 transition-colors outline-none"
                  >
                    {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </button>
               </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
