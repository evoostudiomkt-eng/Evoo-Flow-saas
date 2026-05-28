import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot, writeBatch, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Client, Task, ContentItem, FinancialRecord, Niche, ServiceTemplate, Agency } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { logActivity } from '../lib/activity-logger';
import { MOCK_AGENCY, MOCK_CLIENTS, MOCK_NICHES, MOCK_SERVICES } from '../lib/mockData';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal, 
  FolderOpen, 
  Mail, 
  Filter,
  ExternalLink,
  ChevronRight,
  Phone,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ClientDetail from './ClientDetail';
import { cn } from '../lib/utils';
import { getCachedToken } from '../lib/googleDriveAuth';

interface ClientsProps {
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function Clients({ profile, isDemoMode }: ClientsProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [services, setServices] = useState<ServiceTemplate[]>([]);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  
  const [newClient, setNewClient] = useState({ 
    name: '', 
    company: '', 
    email: '', 
    phone: '',
    cnpj: '', 
    cpfCnpj: '',
    cep: '',
    logradouro: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    address: '', 
    nicheId: '', 
    serviceId: '',
    logoUrl: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  const handleCEPChange = async (cepValue: string) => {
    // Apenas números
    const numbersOnly = cepValue.replace(/\D/g, '');
    let formatted = numbersOnly;
    if (numbersOnly.length > 5) {
      formatted = `${numbersOnly.slice(0, 5)}-${numbersOnly.slice(5, 8)}`;
    }
    
    setNewClient(prev => ({ 
      ...prev, 
      cep: formatted.slice(0, 9)
    }));

    if (numbersOnly.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${numbersOnly}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setNewClient(prev => {
            const finalAddr = `${data.logradouro || ''}, ${prev.number || ''} - ${data.bairro || ''}, ${data.localidade || ''}/${data.uf || ''}`;
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
        console.error("Erro ao carregar endereço por CEP:", err);
      } finally {
        setCepLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      setAgency(MOCK_AGENCY);
      setClients(MOCK_CLIENTS);
      setNiches(MOCK_NICHES);
      setServices(MOCK_SERVICES);
      setLoading(false);
      return () => {};
    }

    if (!profile?.agencyId) return;

    const unsubAgency = onSnapshot(doc(db, 'agencies', profile.agencyId), (doc) => {
      if (doc.exists()) {
        setAgency({ id: doc.id, ...doc.data() } as Agency);
      }
    });

    const unsubClients = onSnapshot(query(
      collection(db, 'clients'),
      where('agencyId', '==', profile.agencyId)
    ), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'clients'));

    const unsubNiches = onSnapshot(collection(db, 'niches'), (snap) => {
      setNiches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Niche)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'niches'));

    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceTemplate)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'services'));

    return () => { unsubAgency(); unsubClients(); unsubNiches(); unsubServices(); };
  }, [profile.agencyId]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.company) return;

    // Check Limit
    const limit = agency?.clientLimit || 5;
    if (clients.length >= limit) {
      alert(`Seu plano atual permite até ${limit} clientes. Faça um upgrade para adicionar mais.`);
      return;
    }

    try {
      const batch = writeBatch(db);
      
      let driveFolderId = '';
      let driveVideoFolderId = '';
      let driveImageFolderId = '';

      if (agency?.googleDriveConnected && !isDemoMode) {
        const token = getCachedToken();
        try {
          const response = await fetch('/api/drive/setup-client-folders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'x-google-token': token } : {})
            },
            body: JSON.stringify({ companyName: newClient.company }),
          });
          const driveData = await response.json();
          if (driveData.success) {
            driveFolderId = driveData.driveFolderId || '';
            driveVideoFolderId = driveData.driveVideoFolderId || '';
            driveImageFolderId = driveData.driveImageFolderId || '';
          }
        } catch (err) {
          console.error("Error creating Google Drive folders automatically:", err);
        }
      }
      
      // 1. Create Client
      const clientRef = doc(collection(db, 'clients'));
      
      const structuredAddress = newClient.logradouro 
        ? `${newClient.logradouro}, ${newClient.number || 'S/N'}${newClient.complement ? ` - ${newClient.complement}` : ''} - ${newClient.neighborhood || ''}, ${newClient.city || ''}/${newClient.state || ''} (CEP: ${newClient.cep || ''})`
        : newClient.address;

      const clientData = {
        ...newClient,
        cnpj: newClient.cnpj || newClient.cpfCnpj || '',
        address: structuredAddress || '',
        agencyId: profile.agencyId,
        status: 'active',
        onboardingStatus: { step: 1, totalSteps: 5, completed: false },
        createdAt: new Date().toISOString(),
        driveFolderId,
        driveVideoFolderId,
        driveImageFolderId,
      };
      batch.set(clientRef, clientData);
      
      // Log Activity
      await logActivity(profile, 'cadastrou um novo cliente', clientRef.id, 'client', clientRef.id);

      // 2. Auto-generate tasks if service selected
      if (newClient.serviceId) {
        const selectedService = services.find(s => s.id === newClient.serviceId);
        if (selectedService && selectedService.templateTasks) {
          selectedService.templateTasks.forEach(taskTitle => {
            const taskRef = doc(collection(db, 'clients', clientRef.id, 'tasks'));
            batch.set(taskRef, {
              title: taskTitle,
              clientId: clientRef.id,
              status: 'todo',
              priority: 'medium',
              dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          });
        }
      }

      await batch.commit();
      setIsAdding(false);
      setNewClient({ 
        name: '', 
        company: '', 
        email: '', 
        phone: '',
        cnpj: '', 
        cpfCnpj: '',
        cep: '',
        logradouro: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        address: '', 
        nicheId: '', 
        serviceId: '',
        logoUrl: '',
        startDate: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'clients');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedClient) {
    return <ClientDetail client={selectedClient} onClose={() => setSelectedClient(null)} profile={profile} isDemoMode={isDemoMode} />;
  }

  return (
    <div className="space-y-8" id="clients-container">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">Hub de Clientes</h2>
          <p className="text-gray-500 mt-1">Gerenciamento centralizado da sua carteira e operações.</p>
        </div>
        <button 
          id="add-client-btn"
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
        >
          <Plus className="w-5 h-5" />
          <span>Cadastrar Cliente</span>
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4" id="clients-filters">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por marca, contato ou nicho..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center justify-center space-x-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl text-gray-600 hover:bg-gray-50 transition-all font-bold">
          <Filter className="w-5 h-5 text-gray-400" />
          <span>Filtros Avançados</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="clients-grid">
        {filteredClients.map((client) => {
          const service = services.find(s => s.id === client.serviceId);
          const niche = niches.find(n => n.id === client.nicheId);
          
          return (
            <motion.div 
              layoutId={client.id}
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm cursor-pointer group hover:border-blue-400 hover:shadow-xl hover:shadow-blue-50/50 transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center border border-blue-50 group-hover:scale-110 transition-transform overflow-hidden">
                  {client.logoUrl ? (
                    <img src={client.logoUrl} alt={client.company} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Building2 className="w-7 h-7 text-blue-600" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] uppercase font-extrabold px-3 py-1.5 rounded-xl tracking-wider",
                  client.status === 'active' ? "bg-green-50 text-green-700" : 
                  client.status === 'paused' ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-500"
                )}>
                  {client.status === 'active' ? 'Ativo' : client.status === 'paused' ? 'Pausado' : 'Cancelado'}
                </span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{client.company}</h3>
                <p className="text-sm font-medium text-gray-400 flex items-center">
                  <Target className="w-3.5 h-3.5 mr-1" />
                  {niche?.name || 'Nicho não definido'}
                </p>
              </div>

              {client.onboardingStatus && !client.onboardingStatus.completed && (
                <div className="mt-4 px-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Onboarding: Passo {client.onboardingStatus.step}/5</span>
                    <span className="text-[9px] font-bold text-gray-400">{Math.round((client.onboardingStatus.step / 5) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                      style={{ width: `${(client.onboardingStatus.step / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500 font-semibold">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                   {service?.name || 'Sem plano'}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="mb-8">
                <h3 className="text-3xl font-bold text-gray-900 font-sans">Novo Cliente</h3>
                <p className="text-gray-500 font-medium">Preencha os dados e ative o fluxo operacional.</p>
              </div>

              <form onSubmit={handleAddClient} className="space-y-8">
                <section className="space-y-4">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-1">Dados Corporativos</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Instituição / Marca</label>
                        <input 
                          type="text" required placeholder="Nome Fantasia"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.company}
                          onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">CNPJ / CPF</label>
                        <input 
                          type="text" placeholder="00.000.000/0001-00"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.cnpj}
                          onChange={(e) => setNewClient({ ...newClient, cnpj: e.target.value })}
                        />
                      </div>
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-1">Contato</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Responsável</label>
                        <input 
                          type="text" required placeholder="Ponto Focal"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.name}
                          onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Telefone</label>
                        <input 
                          type="text" placeholder="(00) 00000-0000"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.phone}
                          onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">E-mail</label>
                        <input 
                          type="email" required placeholder="contato@empresa.com"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.email}
                          onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">URL do Logo / Foto</label>
                        <input 
                          type="url" placeholder="https://exemplo.com/logo.png"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.logoUrl}
                          onChange={(e) => setNewClient({ ...newClient, logoUrl: e.target.value })}
                        />
                      </div>
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-1 flex items-center justify-between">
                     <span>Endereço Comercial</span>
                     {cepLoading && (
                       <span className="text-[10px] text-blue-500 font-extrabold uppercase animate-pulse">Buscando CEP...</span>
                     )}
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">CEP (Busca Automática)</label>
                        <input 
                          type="text" placeholder="00000-000"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                          value={newClient.cep || ''}
                          onChange={(e) => handleCEPChange(e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Logradouro / Rua</label>
                        <input 
                          type="text" placeholder="Av. Paulista, etc."
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.logradouro || ''}
                          onChange={(e) => setNewClient({ ...newClient, logradouro: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Número</label>
                        <input 
                          type="text" placeholder="123"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.number || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewClient(prev => ({
                              ...prev,
                              number: val,
                              address: `${prev.logradouro || ''}, ${val} - ${prev.neighborhood || ''}, ${prev.city || ''}/${prev.state || ''}`
                            }));
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Complemento</label>
                        <input 
                          type="text" placeholder="Sala 401, Bloco B"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.complement || ''}
                          onChange={(e) => setNewClient({ ...newClient, complement: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Bairro</label>
                        <input 
                          type="text" placeholder="Centro"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.neighborhood || ''}
                          onChange={(e) => setNewClient({ ...newClient, neighborhood: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Cidade</label>
                        <input 
                          type="text" placeholder="São Paulo"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newClient.city || ''}
                          onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Estado (UF)</label>
                        <input 
                          type="text" placeholder="SP"
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono animate-fade-in"
                          value={newClient.state || ''}
                          onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                        />
                      </div>
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-1">Contratação & Operação</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Nicho</label>
                        <select 
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[right_1rem_center] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
                          value={newClient.nicheId}
                          onChange={(e) => setNewClient({ ...newClient, nicheId: e.target.value })}
                        >
                          <option value="">Selecione um nicho</option>
                          {niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 ml-1">Serviço/Plano</label>
                        <select 
                          className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[right_1rem_center] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
                          value={newClient.serviceId}
                          onChange={(e) => setNewClient({ ...newClient, serviceId: e.target.value })}
                        >
                          <option value="">Nenhum Plano vinculado</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.basePrice}</option>)}
                        </select>
                      </div>
                   </div>
                </section>

                <div className="flex space-x-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-5 text-gray-500 hover:bg-gray-100 rounded-[1.5rem] transition-all font-sans font-bold"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] hover:bg-blue-700 transition-all font-sans font-bold shadow-2xl shadow-blue-200"
                  >
                    ATIVAR CLIENTE
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Target = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
