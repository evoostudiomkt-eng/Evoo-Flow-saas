import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc, getDocs, writeBatch, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ServiceTemplate, Niche, UserProfile, Agency } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  Plus, 
  Trash2, 
  Settings as SettingsIcon, 
  Layers, 
  Tag, 
  FileText, 
  Users,
  User,
  Target,
  Briefcase,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  PieChart,
  HardDrive,
  AlertTriangle,
  Sliders,
  RefreshCw,
  Play,
  Database,
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Smartphone,
  Copy,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { connectGoogleDrive } from '../lib/googleDriveAuth';
import { getSubscriptionStatus } from '../utils/subscription';

export default function Settings({ profile }: { profile: UserProfile }) {
  const [activeTab, setActiveTab ] = useState('profile');
  const [services, setServices] = useState<ServiceTemplate[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [agency, setAgency] = useState<Agency | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState<Partial<ServiceTemplate>>({ name: '', postCount: 0, reelsCount: 0, basePrice: 0 });
  const [newNiche, setNewNiche] = useState('');

  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile management states
  const [profileName, setProfileName] = useState(profile.displayName || '');
  const [profileEmail, setProfileEmail] = useState(profile.email || '');
  const [profilePhone, setProfilePhone] = useState(profile.phone || '');
  const [ownerName, setOwnerName] = useState(profile.ownerName || '');
  const [ownerCpfCnpj, setOwnerCpfCnpj] = useState(profile.ownerCpfCnpj || '');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  useEffect(() => {
    if (agency) {
      setLogoUrl(agency.branding?.logoUrl || '');
      setPrimaryColor(agency.branding?.primaryColor || '#2563eb');
      setTitle(agency.branding?.title || '');
      setDescription(agency.branding?.description || '');
      setButtonText(agency.branding?.buttonText || '');
      setFontFamily(agency.branding?.fontFamily || 'Inter');
    }
  }, [agency]);

  useEffect(() => {
    if (!profile.uid) return;

    // Listen to current user profile doc
    const unsubProfile = onSnapshot(doc(db, 'users', profile.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        setProfileName(data.displayName || '');
        setProfileEmail(data.email || '');
        setProfilePhone(data.phone || '');
        setOwnerName(data.ownerName || '');
        setOwnerCpfCnpj(data.ownerCpfCnpj || '');
      }
    });

    // Listen to current agency doc
    let unsubAgency = () => {};
    if (profile.agencyId) {
      unsubAgency = onSnapshot(doc(db, 'agencies', profile.agencyId), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Agency;
          setAgency({ id: snapshot.id, ...data } as Agency);
          setSelectedPaymentMethod(data.paymentMethod || 'PIX');
        }
      });
    }

    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceTemplate)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'services'));

    const unsubNiches = onSnapshot(collection(db, 'niches'), (snap) => {
      setNiches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Niche)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'niches'));

    return () => { unsubProfile(); unsubAgency(); unsubServices(); unsubNiches(); };
  }, [profile.uid, profile.agencyId]);

  const PLANS = {
    test: { name: 'Plano Teste R$5', price: 5, clients: 2, storage: 2 },
    start: { name: 'Start', price: 47, clients: 5, storage: 10 },
    growth: { name: 'Growth', price: 97, clients: 10, storage: 20 },
    pro: { name: 'Pro', price: 147, clients: 20, storage: 30 }
  };

  const currentPlan = agency?.planId ? PLANS[agency.planId as keyof typeof PLANS] : PLANS.start;

// ... (rest of helper functions)

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'services'), {
        ...newService,
        templateTasks: [
          'Briefing Inicial',
          'Criação de Estratégia',
          'Configuração de Perfil',
          'Calendário Mensal'
        ]
      });
      setIsAdding(false);
      setNewService({ name: '', postCount: 0, reelsCount: 0, basePrice: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'services');
    }
  };

  const handleAddNiche = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'niches'), { name: newNiche });
      setNewNiche('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'niches');
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!confirm('Excluir?')) return;
    try {
      await deleteDoc(doc(db, coll, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${coll}/${id}`);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.agencyId) return;
    setIsSavingBranding(true);
    setSaveSuccess(false);
    try {
      await updateDoc(doc(db, 'agencies', profile.agencyId), {
        branding: {
          logoUrl,
          primaryColor,
          title,
          description,
          buttonText,
          fontFamily
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `agencies/${profile.agencyId}`);
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveSuccess(false);

    try {
      // 1. Update user document
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        displayName: profileName,
        email: profileEmail,
        phone: profilePhone,
        ownerName: ownerName,
        ownerCpfCnpj: ownerCpfCnpj,
      });

      // 2. Update agency document in sync if applicable
      if (profile.agencyId) {
        const agencyRef = doc(db, 'agencies', profile.agencyId);
        await updateDoc(agencyRef, {
          name: profileName,
          ownerName: ownerName,
          ownerCpfCnpj: ownerCpfCnpj,
          ownerEmail: profileEmail,
          paymentMethod: selectedPaymentMethod,
        });
      }

      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'services', label: 'Serviços', icon: Briefcase },
    { id: 'niches', label: 'Nichos', icon: Target },
    { id: 'public-pipeline', label: 'Formulário de Leads', icon: FileText },
    { id: 'team', label: 'Time (Usuários)', icon: Users },
    { id: 'billing', label: 'Assinatura', icon: CreditCard },
    { id: 'integrations', label: 'Integrações', icon: Layers },
  ];

  const [driveStatus, setDriveStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [isLinkingDrive, setIsLinkingDrive] = useState(false);

  // States for direct Asaas Integration
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasEnv, setAsaasEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [asaasWalletId, setAsaasWalletId] = useState('');
  const [isSavingAsaas, setIsSavingAsaas] = useState(false);
  const [asaasSaveSuccess, setAsaasSaveSuccess] = useState(false);

  // States for Subscription & Expired Data simulation
  const [simStatus, setSimStatus] = useState<'active' | 'suspended'>('active');
  const [simDaysUnpaid, setSimDaysUnpaid] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false);

  // States for Checkout Payment Sandbox Selector
  const [selectedPlanIdForCheckout, setSelectedPlanIdForCheckout] = useState<'test' | 'start' | 'growth' | 'pro' | null>(null);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [simulatedCardNumber, setSimulatedCardNumber] = useState('');
  const [simulatedCardName, setSimulatedCardName] = useState('');
  const [simulatedCardExpiry, setSimulatedCardExpiry] = useState('');
  const [simulatedCardCvv, setSimulatedCardCvv] = useState('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'payment' | 'processing' | 'success' | 'payment_details'>('payment');
  const [checkoutMilestoneIndex, setCheckoutMilestoneIndex] = useState(0);

  // States for real Asaas live billing details
  const [realPixQrCode, setRealPixQrCode] = useState<string | null>(null);
  const [realPixCopyPaste, setRealPixCopyPaste] = useState<string | null>(null);
  const [realInvoiceUrl, setRealInvoiceUrl] = useState<string | null>(null);
  const [holderName, setHolderName] = useState('');
  const [holderCpfCnpj, setHolderCpfCnpj] = useState('');
  const [holderPhone, setHolderPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressNumber, setAddressNumber] = useState('');

  useEffect(() => {
    if (agency?.googleDriveConnected) {
      setDriveStatus('connected');
    } else {
      setDriveStatus('disconnected');
    }

    if (agency) {
      setAsaasApiKey(agency.asaasConfig?.apiKey || '');
      setAsaasEnv(agency.asaasConfig?.environment || 'sandbox');
      setAsaasWalletId(agency.asaasConfig?.walletId || '');
      setSimStatus(agency.status === 'active' ? 'active' : 'suspended');
      
      // Calculate original simulated days if present
      if (agency.subscriptionSuspendedAt) {
        const diff = Date.now() - new Date(agency.subscriptionSuspendedAt).getTime();
        const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
        setSimDaysUnpaid(days);
      } else {
        setSimDaysUnpaid(0);
      }
    }
  }, [agency]);

  const handleConnectDrive = async () => {
    if (!profile.agencyId) return;
    setIsLinkingDrive(true);
    try {
      await connectGoogleDrive(profile.agencyId);
      setDriveStatus('connected');
      alert('Google Drive sincronizado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao sincronizar Google Drive: ${err.message}`);
    } finally {
      setIsLinkingDrive(false);
    }
  };

  const handleSaveAsaasConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.agencyId) return;
    setIsSavingAsaas(true);
    setAsaasSaveSuccess(false);
    try {
      await updateDoc(doc(db, 'agencies', profile.agencyId), {
        asaasConnected: !!asaasApiKey,
        asaasConfig: {
          apiKey: asaasApiKey,
          environment: asaasEnv,
          walletId: asaasWalletId
        }
      });
      setAsaasSaveSuccess(true);
      setTimeout(() => setAsaasSaveSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `agencies/${profile.agencyId}/asaas`);
    } finally {
      setIsSavingAsaas(false);
    }
  };

  const handleApplySimulation = async () => {
    if (!profile.agencyId) return;
    setIsSimulating(true);
    setSimulationLog([]);
    try {
      const agencyRef = doc(db, 'agencies', profile.agencyId);
      if (simStatus === 'active') {
        await updateDoc(agencyRef, {
          status: 'active',
          subscriptionSuspendedAt: null,
          backupStatus: 'none'
        });
        setSimulationLog(["✓ Assinatura restaurada! Status alterado para ATIVO.", "✓ Integrações de Google Drive e Asaas totalmente reativadas."]);
      } else {
        const fakeSuspendedDate = new Date(Date.now() - (simDaysUnpaid * 24 * 60 * 60 * 1000)).toISOString();
        const info = simDaysUnpaid <= 10 
          ? "Período de Graça: integrações continuam ativas por mais " + (10 - simDaysUnpaid) + " dias." 
          : "Período de Backup: integrações DESATIVADAS. Os dados continuarão armazenados por mais " + (70 - simDaysUnpaid) + " dias.";
        
        await updateDoc(agencyRef, {
          status: 'suspended',
          subscriptionSuspendedAt: fakeSuspendedDate,
          backupStatus: simDaysUnpaid > 10 ? 'backed_up' : 'pending'
        });
        setSimulationLog([
          `✓ Assinatura simulada como INADIMPLENTE. Data de suspensão: ${new Date(fakeSuspendedDate).toLocaleDateString()}`,
          `✓ Dias de atraso simulados: ${simDaysUnpaid} dias.`,
          `ℹ Status: ${info}`
        ]);
      }
    } catch (err: any) {
      setSimulationLog([`❌ Falha ao aplicar simulação: ${err.message}`]);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulatePermanentDeletion = async () => {
    if (!profile.agencyId) return;
    setIsSimulating(true);
    setSimulationLog(["Iniciando deleção definitiva simulação...", "Lendo coleções do banco de dados relacionadas à agência..."]);
    
    try {
      // 1. Fetch all clients
      const clientsQuery = query(collection(db, 'clients'), where('agencyId', '==', profile.agencyId));
      const clientsSnap = await getDocs(clientsQuery);
      const clientDocs = clientsSnap.docs;
      
      const newLogs = [`✓ Encontrados ${clientDocs.length} clientes. Iniciando limpeza de dados relacionados...`];
      setSimulationLog(prev => [...prev, ...newLogs]);
      
      const batch = writeBatch(db);
      
      // Deletion counters
      let taskCount = 0;
      let contentCount = 0;
      let leadsCount = 0;
      
      // Iterate over clients to delete tasks, contents, and the clients themselves
      for (const clientDoc of clientDocs) {
        const clientId = clientDoc.id;
        
        // Fetch and delete tasks for this client
        const tasksQuery = query(collection(db, 'tasks'), where('clientId', '==', clientId));
        const tasksSnap = await getDocs(tasksQuery);
        tasksSnap.docs.forEach(td => {
          batch.delete(td.ref);
          taskCount++;
        });

        // Fetch and delete content for this client (content, posts, etc.)
        const contentsQuery = query(collection(db, 'contents'), where('clientId', '==', clientId));
        const contentsSnap = await getDocs(contentsQuery);
        contentsSnap.docs.forEach(cd => {
          batch.delete(cd.ref);
          contentCount++;
        });

        // Delete the client
        batch.delete(clientDoc.ref);
      }
      
      const countsLog = [];
      if (taskCount > 0) countsLog.push(`✓ Agendado exclusão de ${taskCount} tarefas de mídia/produção.`);
      if (contentCount > 0) countsLog.push(`✓ Agendado exclusão de ${contentCount} mídias e posts correspondentes.`);
      if (countsLog.length > 0) setSimulationLog(prev => [...prev, ...countsLog]);
      
      // 2. Fetch and delete leads
      const leadsQuery = query(collection(db, 'leads'), where('agencyId', '==', profile.agencyId));
      const leadsSnap = await getDocs(leadsQuery);
      leadsSnap.docs.forEach(ld => {
        batch.delete(ld.ref);
        leadsCount++;
      });
      if (leadsCount > 0) {
        setSimulationLog(prev => [...prev, `✓ Agendado exclusão de ${leadsCount} leads e históricos do pipeline.`]);
      }
      
      // 3. Fetch users profiles of this agency
      const usersQuery = query(collection(db, 'users'), where('agencyId', '==', profile.agencyId));
      const usersSnap = await getDocs(usersQuery);
      let userCount = 0;
      usersSnap.docs.forEach(ud => {
        if (ud.id !== profile.uid) {
          batch.delete(ud.ref);
          userCount++;
        }
      });
      if (userCount > 0) {
        setSimulationLog(prev => [...prev, `✓ Agendado exclusão de ${userCount} perfis de membros da equipe.`]);
      }

      // 4. Update agency structure simulation to empty configs
      const agencyRef = doc(db, 'agencies', profile.agencyId);
      batch.update(agencyRef, {
        status: 'suspended',
        backupStatus: 'deleted_permanently',
        googleDriveConnected: false,
        googleDriveConfig: null,
        asaasConnected: false,
        asaasConfig: null,
        subscriptionSuspendedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ago simulation
      });
      
      setSimulationLog(prev => [...prev, `✓ Redefinido registro da agência com flag backupStatus como 'deleted_permanently'.`]);
      
      await batch.commit();
      
      setSimulationLog(prev => [
        ...prev, 
        "🎉 SUCESSO! A agência foi totalmente expurgada simulação de acordo com as regras da plataforma:",
        "• Todos os arquivos e históricos de clientes foram deletados definitivamente do Banco de Dados Firestore do SaaS.",
        "• As conexões diretas do Google Drive e as chaves privadas do Asaas foram revogadas e removidas de acordo com a política de 60 dias de backup expirados.",
        "• Os acessos da equipe foram limpos com segurança."
      ]);
    } catch (err: any) {
      setSimulationLog(prev => [...prev, `❌ Erro crítico no expurgo dos dados: ${err.message}`]);
    } finally {
      setIsSimulating(false);
      setShowDeletionConfirm(false);
    }
  };

  const handleSimulatedPayment = async () => {
    if (!profile.agencyId || !selectedPlanIdForCheckout) return;
    setIsProcessingCheckout(true);
    setCheckoutStep('processing');
    setCheckoutMilestoneIndex(0);

    try {
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agencyId: profile.agencyId,
          planId: selectedPlanIdForCheckout,
          billingType: checkoutPaymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD',
          card: checkoutPaymentMethod === 'card' ? {
            holderName: simulatedCardName,
            number: simulatedCardNumber,
            expiryMonth: simulatedCardExpiry,
            ccv: simulatedCardCvv
          } : undefined,
          holderInfo: {
            name: holderName || simulatedCardName || profile.displayName || 'Parceiro SaaS',
            cpfCnpj: holderCpfCnpj || '00000000000',
            phone: holderPhone || '11999999999',
            postalCode: postalCode || '01311000',
            addressNumber: addressNumber || '100'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedErr = errorText;
        try {
          const parsed = JSON.parse(errorText);
          parsedErr = parsed.error || parsedErr;
        } catch (_) {}
        throw new Error(parsedErr);
      }

      const resData = await response.json();

      if (resData.simulated) {
        // Run Simulated milestones animation (No API Key set yet)
        const milestones = [
          "Processando solicitação de assinatura (Sandbox)...",
          "Identificando transação e conciliação de teste...",
          "Processando simulador de webhook de conciliação Asaas...",
          "Ativando conta da agência no Firestore de Produção...",
          "Sincronização de Assinatura concluída com sucesso!"
        ];

        for (let i = 0; i < milestones.length; i++) {
          await new Promise(resolve => setTimeout(resolve, i === 0 ? 800 : 1000));
          setCheckoutMilestoneIndex(i);
        }

        const selectedPlan = PLANS[selectedPlanIdForCheckout];
        const agencyRef = doc(db, 'agencies', profile.agencyId);
        
        await updateDoc(agencyRef, {
          status: 'active',
          planId: selectedPlanIdForCheckout,
          clientLimit: selectedPlan.clients,
          storageLimitGb: selectedPlan.storage,
          subscriptionLastPaidAt: new Date().toISOString(),
          subscriptionSuspendedAt: null,
          backupStatus: 'none'
        });

        setCheckoutStep('success');
      } else {
        // REAL Asaas Flow!
        if (checkoutPaymentMethod === 'pix') {
          setRealPixQrCode(resData.pixQrCode);
          setRealPixCopyPaste(resData.pixCopyPaste);
          setCheckoutStep('payment_details');
        } else {
          // Credit Card
          if (resData.status === 'CONFIRMED' || resData.status === 'RECEIVED') {
            setCheckoutStep('success');
          } else {
            setRealInvoiceUrl(resData.invoiceUrl);
            setCheckoutStep('payment_details');
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar ativação de assinatura: ' + err.message);
      setCheckoutStep('payment');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="space-y-8" id="settings-area">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">Configurações</h2>
          <p className="text-gray-500 mt-1">Gerencie padrões, catálogos e equipe do sistema.</p>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-gray-100 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center space-x-2 px-6 py-4 font-bold text-sm transition-all border-b-2",
              activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div id="settings-tab-content">
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-3 text-blue-600" /> Meu Perfil & Dados da Agência
                </h3>
                <p className="text-xs text-gray-400 mt-1">Gerencie suas credenciais de acesso, dados cadastrais e o método de faturamento recorrente da sua agência.</p>
              </div>

              {profileSaveSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-2xl flex items-center space-x-2 text-sm font-semibold">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Perfil atualizado com sucesso no banco de dados!</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6" id="profile-edit-settings-form">
                {/* DADOS DA AGENCIA */}
                <div className="pt-2">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Identidade da Agência</h4>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome da Agência</label>
                      <input 
                        type="text" 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Ex: Evoo Flow"
                        required
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-gray-800"
                        id="profile-agency-name-input"
                      />
                    </div>
                  </div>
                </div>

                {/* DADOS DO PROPRIETÁRIO */}
                <div className="border-t border-gray-100 pt-6">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Dados Cadastrais & Responsável</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome do Responsável / Razão Social</label>
                      <input 
                        type="text" 
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Ex: Seu Nome Completo ou Razão Social"
                        required
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-gray-800"
                        id="profile-owner-name-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">CPF ou CNPJ (Asaas Requerido)</label>
                      <input 
                        type="text" 
                        value={ownerCpfCnpj}
                        onChange={(e) => setOwnerCpfCnpj(e.target.value)}
                        placeholder="Ex: 000.000.000-00"
                        required
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-gray-800"
                        id="profile-owner-cpfcnpj-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">E-mail de Contato / Acesso (Autenticação)</label>
                      <input 
                        type="email" 
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="Ex: seuemail@suaagência.com"
                        required
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-gray-800 bg-gray-50 text-gray-400 cursor-not-allowed"
                        disabled
                        id="profile-email-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Telefone com DDD / WhatsApp</label>
                      <input 
                        type="text" 
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="Ex: (11) 99999-9999"
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-gray-800"
                        id="profile-phone-input"
                      />
                    </div>
                  </div>
                </div>

                {/* METODO DE PAGAMENTO PREFERENCIAL */}
                <div className="border-t border-gray-100 pt-6">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Método de Faturamento Preferencial</h4>
                  <p className="text-[11px] text-gray-400 mb-4 font-sans">Selecione para atualizar a forma de conciliação do seu plano recorrente no Asaas.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('PIX')}
                      className={cn(
                        "p-5 rounded-2xl border text-left transition-all flex items-start space-x-4",
                        selectedPaymentMethod === 'PIX' 
                          ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/10" 
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      )}
                      id="payment-method-pix-btn"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                        selectedPaymentMethod === 'PIX' ? "border-emerald-500" : "border-gray-300"
                      )}>
                        {selectedPaymentMethod === 'PIX' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 flex items-center">
                          Pix Instantâneo <span className="ml-1.5 px-2 py-0.5 text-[8px] font-black bg-emerald-500 text-white rounded-md uppercase tracking-wider">Recomendado</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1 font-sans">Compensação instantânea e ativação automática com QR Code / Copia e Cola.</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('CREDIT_CARD')}
                      className={cn(
                        "p-5 rounded-2xl border text-left transition-all flex items-start space-x-4",
                        selectedPaymentMethod === 'CREDIT_CARD' 
                          ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/10" 
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      )}
                      id="payment-method-card-btn"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                        selectedPaymentMethod === 'CREDIT_CARD' ? "border-blue-600" : "border-gray-300"
                      )}>
                        {selectedPaymentMethod === 'CREDIT_CARD' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Cartão de Crédito</p>
                        <p className="text-xs text-gray-400 mt-1 font-sans">Faturamento seguro e simplificado direto no seu portal.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* BOTAO PARA CONCLUIR */}
                <div className="border-t border-gray-100 pt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-750 transition-all flex items-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                    id="save-profile-btn"
                  >
                    {isSavingProfile ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Salvando alterações...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-white" />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-blue-600" /> Catálogo de Serviços
              </h3>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                Novo Serviço
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative group overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-bold text-gray-900">{service.name}</h4>
                    <button onClick={() => handleDelete('services', service.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                      <span className="text-gray-500">Valor Base</span>
                      <span className="font-bold text-blue-600">R$ {service.basePrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Posts/Mês</span>
                      <span className="font-semibold text-gray-700">{service.postCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Reels/Mês</span>
                      <span className="font-semibold text-gray-700">{service.reelsCount}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tarefas Iniciais</p>
                    <div className="flex flex-wrap gap-1.5">
                      {service.templateTasks?.map((t, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-medium">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isAdding && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Configurar Serviço</h3>
                  <form onSubmit={handleAddService} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Nome do Plano</label>
                      <input 
                        type="text" required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newService.name}
                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Posts</label>
                        <input 
                          type="number" required
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          value={newService.postCount}
                          onChange={(e) => setNewService({ ...newService, postCount: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Reels</label>
                        <input 
                          type="number" required
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          value={newService.reelsCount}
                          onChange={(e) => setNewService({ ...newService, reelsCount: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Valor Base (R$)</label>
                      <input 
                        type="number" required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newService.basePrice}
                        onChange={(e) => setNewService({ ...newService, basePrice: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-gray-500 font-bold">Cancelar</button>
                      <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Salvar Serviço</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'niches' && (
          <div className="max-w-2xl bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-600" /> Nichos de Atuação
            </h3>
            <form onSubmit={handleAddNiche} className="flex space-x-3 mb-8">
              <input 
                type="text" required
                placeholder="Ex: Medicina, Advocacia, Varejo..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={newNiche}
                onChange={(e) => setNewNiche(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">Adicionar</button>
            </form>
            <div className="flex flex-wrap gap-2">
              {niches.map(niche => (
                <div key={niche.id} className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl flex items-center space-x-3 group animate-in fade-in zoom-in duration-200">
                  <span className="text-sm font-semibold text-gray-700">{niche.name}</span>
                  <button onClick={() => handleDelete('niches', niche.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'public-pipeline' && (
          <div className="space-y-8 animate-in fade-in duration-200" id="public-pipeline-tab">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center">
                    <FileText className="w-5 h-5 mr-3 text-blue-600" />
                    Branding & Formulário de Leads Público
                  </h3>
                  <p className="text-gray-500 text-sm font-medium mt-1">
                    Configure a identidade visual da sua agência para a página pública onde seus leads se cadastram.
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/?form=leads&agency=${profile.agencyId}`;
                      navigator.clipboard.writeText(link);
                      alert('Link copiado com sucesso!');
                    }}
                    className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-gray-100"
                    type="button"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                    Copiar Link Público
                  </button>
                </div>
              </div>

              {/* Public link info banner */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/40 text-xs text-blue-800 font-bold mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shadow-lg shrink-0" />
                  <span>Seu link oficial de captura:</span>
                  <code className="bg-white/80 px-2.5 py-1 rounded-lg border border-blue-100 inline-block text-blue-700 font-mono break-all font-semibold">
                    {window.location.origin}/?form=leads&agency={profile.agencyId}
                  </code>
                </div>
                <a 
                  href={`/?form=leads&agency=${profile.agencyId}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline flex items-center shrink-0 uppercase tracking-widest text-[10px] font-black"
                >
                  Abrir Link <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form column */}
                <form onSubmit={handleSaveBranding} className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Logo da sua Agência (URL)</label>
                    <input 
                      type="url"
                      placeholder="https://sua-agencia.com/logo.png"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-gray-700 text-sm"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                    
                    {/* Visual Preset Logos */}
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2 mb-1.5">Ou selecione uma logo de teste:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { 
                          name: 'Laranja Futurista', 
                          url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60' 
                        },
                        { 
                          name: 'Neblina Roxa', 
                          url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=120&auto=format&fit=crop&q=60' 
                        },
                        { 
                          name: 'Abstrato Néon', 
                          url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=120&auto=format&fit=crop&q=60' 
                        },
                        { 
                          name: 'Símbolo Aqua', 
                          url: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=120&auto=format&fit=crop&q=60' 
                        },
                      ].map((preset, index) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setLogoUrl(preset.url)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                            logoUrl === preset.url 
                              ? 'bg-blue-50 border-blue-500 text-blue-600' 
                              : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-400'
                          }`}
                        >
                          <img src={preset.url} className="w-5 h-5 rounded-full object-cover shrink-0" alt="Preset" />
                          <span>Adicionar {index + 1}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Cor Principal da Marca</label>
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Color Picker input */}
                      <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 shrink-0">
                        <input 
                          type="color"
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                        />
                        <span className="font-mono text-xs font-bold uppercase text-gray-600">{primaryColor}</span>
                      </div>

                      {/* Color Circles Preset */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Azul', hex: '#2563eb' },
                          { name: 'Indigo', hex: '#4f46e5' },
                          { name: 'Emerald', hex: '#059669' },
                          { name: 'Violet', hex: '#7c3aed' },
                          { name: 'Pink', hex: '#e11d48' },
                          { name: 'Amber', hex: '#d97706' },
                          { name: 'Slate', hex: '#475569' },
                          { name: 'Slate Escuro', hex: '#1e293b' },
                        ].map((color) => (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => setPrimaryColor(color.hex)}
                            className="w-7 h-7 rounded-full transition-transform hover:scale-110 relative"
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          >
                            {primaryColor === color.hex && (
                              <span className="absolute inset-0 border-2 border-white rounded-full flex items-center justify-center text-white text-[9px] font-bold font-sans">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Tipografia da Marca (Font Family)</label>
                    <select 
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-gray-700 text-sm font-sans"
                    >
                      <option value="Inter">Inter (Suiça/Clean)</option>
                      <option value="Space Grotesk">Space Grotesk (Tech/Moderna)</option>
                      <option value="Outfit">Outfit (Moderna/Display)</option>
                      <option value="Poppins">Poppins (Arredondada/Futurista)</option>
                      <option value="Montserrat">Montserrat (Geométrica)</option>
                      <option value="Playfair Display">Playfair Display (Serif/Editorial)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Monospace)</option>
                    </select>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1" style={{ fontFamily }}>
                      Visualização prévia do estilo da fonte selecionada
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Título da Reunião / Chamada</label>
                      <input 
                        type="text"
                        placeholder="VAMOS LEVAR SEU NEGÓCIO AO PRÓXIMO NÍVEL"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-gray-700 text-sm"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Texto do Botão CTA</label>
                      <input 
                        type="text"
                        placeholder="Solicitar Consultoria Gratuita"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-gray-700 text-sm"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Descrição Secundária / Proposta de Valor</label>
                    <textarea 
                      rows={3}
                      placeholder="Estratégias personalizadas de tráfego pago, social media e presença digital definitiva..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-semibold text-gray-700 text-sm leading-relaxed"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={isSavingBranding}
                      className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 disabled:opacity-50 transition-all flex items-center"
                    >
                      {isSavingBranding ? 'Salvando...' : 'Salvar Identidade'}
                    </button>
                    
                    {saveSuccess && (
                      <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider flex items-center animate-bounce">
                        ✓ Alterações salvas com sucesso!
                      </span>
                    )}
                  </div>
                </form>

                {/* Live Realtime Preview Column */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Visualização em Tempo Real (Desktop)</div>
                  
                  <div 
                    className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-md bg-white h-[450px] flex flex-col justify-between relative group text-xs text-left"
                    style={{ fontFamily }}
                  >
                    {/* Inner header of mock browser bar */}
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-100 flex items-center gap-2 text-gray-400 font-mono shrink-0">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      <div className="bg-white text-[9px] px-2 py-0.5 rounded-md text-gray-500 flex-1 truncate text-center max-w-[200px] border border-gray-200/40">
                        {agency?.name || 'Agência'}.leads-connect.com
                      </div>
                    </div>

                    {/* Preview page body layout */}
                    <div className="flex flex-1 overflow-hidden">
                      {/* Colored Banner Area */}
                      <div 
                        className="w-1/2 p-4 text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-300"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <div className="space-y-4 relative z-10">
                          {/* Logo */}
                          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                            {logoUrl ? (
                              <img src={logoUrl} className="w-full h-full object-cover" alt="Agency Logo" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                            ) : (
                              <div className="w-3.5 h-3.5 bg-white rounded-full animate-pulse" />
                            )}
                          </div>

                          <h4 className="text-[11px] font-black leading-tight tracking-tight uppercase break-words h-16 overflow-y-auto">
                            {title || 'VAMOS LEVAR SEU NEGÓCIO AO PRÓXIMO NÍVEL'}
                          </h4>

                          <p className="text-[8px] opacity-80 leading-normal line-clamp-3">
                            {description || 'Estratégias personalizadas de tráfego pago e social media.'}
                          </p>
                        </div>
                        
                        <div className="text-[7px] opacity-60 z-10 pt-2 border-t border-white/10 shrink-0 font-medium">
                          +50 clientes confiam no nosso trabalho.
                        </div>

                        {/* Background glowing gradients */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 blur-xl rounded-full"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 blur-lg rounded-full"></div>
                      </div>

                      {/* Mini Lead Form Area */}
                      <div className="flex-1 bg-white p-4 flex flex-col justify-center space-y-2">
                        <div className="text-center shrink-0">
                          <p className="text-[10px] font-black text-gray-900 leading-none">Primeiro Passo</p>
                          <p className="text-[7px] text-gray-400 mt-0.5 font-medium">Preencha e entraremos em contato.</p>
                        </div>

                        <div className="space-y-1 shrink-0">
                          <div className="h-5 bg-gray-50 border border-gray-100 rounded-md p-1 text-[7px] text-gray-400 flex items-center font-semibold">
                            Seu Nome
                          </div>
                          <div className="h-5 bg-gray-50 border border-gray-100 rounded-md p-1 text-[7px] text-gray-400 flex items-center font-semibold">
                            Nome da Empresa
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-[7px] font-black uppercase tracking-widest text-center truncate shadow-sm transition-colors duration-300"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {buttonText || 'Solicitar Consultoria'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center py-20">
             <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-blue-600" />
             </div>
             <h3 className="text-xl font-bold text-gray-900">Gestão de Equipe</h3>
             <p className="text-gray-500 mt-2 max-w-sm mx-auto flex items-center justify-center">Funcionalidade em desenvolvimento para gerenciamento de permissões granulares dos usuários.</p>
          </div>
        )}

        {activeTab === 'billing' && (() => {
          const subInfo = getSubscriptionStatus(agency);
          return (
            <div className="space-y-8">
              {/* GUIA DE TESTES PARA NOVOS CLIENTES */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-8 rounded-[2.5rem] shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <span className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                    <Sparkles className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Guia de Testes do Proprietário da Agência (Acesso & Pagamento)</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">Siga estas instruções para homologar a jornada completa de assinatura</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-3 text-xs">
                  <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-blue-100/50 space-y-1">
                    <p className="font-black text-blue-600 uppercase tracking-wider text-[10px]">Passo 1</p>
                    <p className="font-extrabold text-gray-800">Criar Nova Conta</p>
                    <p className="text-gray-550 leading-relaxed">Clique no botão Sair (logout) na Sidebar e escolha <strong className="text-gray-850">"Criar uma conta"</strong> com e-mail de teste.</p>
                  </div>
                  <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-blue-100/50 space-y-1">
                    <p className="font-black text-blue-600 uppercase tracking-wider text-[10px]">Passo 2</p>
                    <p className="font-extrabold text-gray-800">Acessar Faturamento</p>
                    <p className="text-gray-550 leading-relaxed">Sua nova conta inicia no plano padrão. Vá em Configurações e clique na aba <strong className="text-gray-850">"Assinatura"</strong>.</p>
                  </div>
                  <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-blue-100/50 space-y-1">
                    <p className="font-black text-blue-600 uppercase tracking-wider text-[10px]">Passo 3</p>
                    <p className="font-extrabold text-gray-800">Escolher Plano de R$5</p>
                    <p className="text-gray-550 leading-relaxed">Visualize o novo <strong className="text-gray-850">"Plano Teste R$5"</strong> cadastrado logo abaixo e clique em "Assinar Plano".</p>
                  </div>
                  <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-blue-100/50 space-y-1">
                    <p className="font-black text-blue-600 uppercase tracking-wider text-[10px]">Passo 4</p>
                    <p className="font-extrabold text-gray-800">Simulador Sandbox</p>
                    <p className="text-gray-550 leading-relaxed">Escolha Pagamento via <strong className="text-blue-600">Pix</strong> ou <strong className="text-blue-600">Cartão</strong> dentro do próprio sistema de vendas.</p>
                  </div>
                  <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-blue-100/50 space-y-1">
                    <p className="font-black text-blue-600 uppercase tracking-wider text-[10px]">Passo 5</p>
                    <p className="font-extrabold text-gray-800">Ativação Instantânea</p>
                    <p className="text-gray-550 leading-relaxed">Confirme o pagamento de mentira e veja sua agência ser gravada de forma <strong className="text-gray-850">definitiva no Firestore</strong>.</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Subscription Policy Banners */}
              {subInfo.isUnpaid && (
                <div className={cn(
                  "p-6 rounded-[2rem] border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse-slow",
                  subInfo.policyPhase === 'grace_period' ? "bg-amber-50 border-amber-200 text-amber-900" :
                  subInfo.policyPhase === 'backup_only' ? "bg-orange-50 border-orange-200 text-orange-900" :
                  "bg-red-50 border-red-200 text-red-950"
                )}>
                  <div className="flex items-start space-x-4">
                    <div className={cn(
                      "p-3 rounded-2xl shrink-0",
                      subInfo.policyPhase === 'grace_period' ? "bg-amber-100 text-amber-700" :
                      subInfo.policyPhase === 'backup_only' ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-extrabold text-base">
                        {subInfo.policyPhase === 'grace_period' && "Assinatura Pendente (Período de Graça Ativo)"}
                        {subInfo.policyPhase === 'backup_only' && "Acesso Suspenso (Dados em Backup)"}
                        {subInfo.policyPhase === 'expired_for_deletion' && "Fim do Prazo de Backup - Exclusão Imediata"}
                      </p>
                      <p className="text-xs font-bold opacity-80 mt-1 max-w-2xl">
                        {subInfo.policyPhase === 'grace_period' && `Sua assinatura está atrasada há ${subInfo.daysUnpaid} dias. Pela nossa política, suas integrações diretas do Google Drive e Asaas continuam ATIVAS por mais ${subInfo.daysRemainingGrace} dias. Realize o pagamento para evitar a suspensão.`}
                        {subInfo.policyPhase === 'backup_only' && `Sua assinatura está atrasada há ${subInfo.daysUnpaid} dias. As integrações automáticas do Google Drive e Asaas foram DESATIVADAS. Armazenaremos com segurança seu backup por mais ${subInfo.daysRemainingBackup} dias antes do expurgo permanente.`}
                        {subInfo.policyPhase === 'expired_for_deletion' && `Sua agência está inadimplente há ${subInfo.daysUnpaid} dias (limite de 70 dias ultrapassado). Os backups de segurança foram revogados e as informações estão qualificadas para deleção de vez do banco de dados.`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <button 
                      onClick={() => {
                        setSimStatus('active');
                        setSimDaysUnpaid(0);
                        setTimeout(() => handleApplySimulation(), 100);
                      }} 
                      className="bg-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:scale-105 transition-all outline-none border border-current"
                    >
                      Pagar Fatura
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Plano Atual */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-xl font-black text-gray-900 tracking-tight">Plano Atual</h3>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Status da sua conta SaaS</p>
                        </div>
                        <span className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest",
                          agency?.status === 'active' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                          Plano {currentPlan?.name || 'Start'} ({agency?.status === 'active' ? 'Ativo' : 'Inativo'})
                        </span>
                     </div>
    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Próxima Cobrança</p>
                           <p className="text-lg font-black text-gray-900 font-sans">R$ {currentPlan?.price || 0},00 / mês</p>
                           {agency?.status === 'active' ? (
                             <p className="text-xs text-green-600 font-bold mt-1">
                               ✓ Pagamento em dia (Vence em {(() => {
                                 const baseDateString = agency?.subscriptionLastPaidAt || agency?.createdAt;
                                 if (baseDateString) {
                                   const baseDate = new Date(baseDateString);
                                   const nextDate = new Date(baseDate);
                                   nextDate.setMonth(baseDate.getMonth() + 1);
                                   return nextDate.toLocaleDateString('pt-BR');
                                 }
                                 const defaultDate = new Date();
                                 defaultDate.setMonth(defaultDate.getMonth() + 1);
                                 return defaultDate.toLocaleDateString('pt-BR');
                               })()})
                             </p>
                           ) : (
                             <p className="text-xs text-red-650 font-bold mt-1">⚠️ Fatura pendente de renovação</p>
                           )}
                        </div>
                        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Método de Pagamento</p>
                           <div className="flex items-center space-x-3 mt-1">
                              {agency?.paymentMethod === 'CREDIT_CARD' ? (
                                <>
                                  <div className="w-8 h-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md flex items-center justify-center text-[7px] font-bold text-white uppercase italic">Card</div>
                                  <p className="text-sm font-bold text-gray-900">Cartão final •••• 4242</p>
                                </>
                              ) : (
                                <>
                                  <div className="w-8 h-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-md flex items-center justify-center text-[7.5px] font-black text-white uppercase tracking-widest">Pix</div>
                                  <p className="text-sm font-bold text-gray-900">Pix (Compensação Asaas)</p>
                                </>
                              )}
                           </div>
                        </div>
                     </div>
  
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 border border-gray-100 rounded-3xl">
                           <div className="flex justify-between items-center mb-2">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                               <Users className="w-3 h-3 mr-1" /> Limite de Clientes
                             </p>
                             <span className="text-xs font-bold text-gray-900">{agency?.clientLimit || 5} Clientes</span>
                           </div>
                           <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, ((agency?.clientLimit || 5) / 20) * 100)}%` }}></div>
                           </div>
                        </div>
                        <div className="p-6 border border-gray-100 rounded-3xl">
                           <div className="flex justify-between items-center mb-2">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                               <HardDrive className="w-3 h-3 mr-1" /> Limite de Espaço
                             </p>
                             <span className="text-xs font-bold text-gray-900">{agency?.storageLimitGb || 10} GB</span>
                           </div>
                           <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, ((agency?.storageLimitGb || 10) / 30) * 100)}%` }}></div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* CATALOGO DE PLANOS DISPONIVEIS PARA UPGRADE E TESTE */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">Catalogo de Planos do Ecossistema</h3>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Selecione, altere ou faça upgrade do seu plano quando desejar</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(PLANS).map(([id, p]) => {
                        const isCurrent = agency?.planId === id || (!agency?.planId && id === 'start');
                        return (
                          <div 
                            key={id}
                            className={cn(
                              "p-6 rounded-3xl border transition-all relative flex flex-col justify-between",
                              isCurrent 
                                ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-100" 
                                : "border-gray-100 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200"
                            )}
                          >
                            {id === 'test' && (
                              <span className="absolute top-3 right-3 bg-yellow-400 text-gray-950 font-black text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                <Sparkles className="w-2.5 h-2.5 animate-spin-slow" /> RECOMENDADO PARA TESTES
                              </span>
                            )}
                            
                            <div>
                              <p className="text-sm font-black text-gray-900">{p.name}</p>
                              <div className="flex items-baseline mt-2">
                                <span className="text-2xl font-black text-gray-900">R$ {p.price},00</span>
                                <span className="text-xs text-gray-400 font-bold ml-1">/ mês</span>
                              </div>
                              
                              <ul className="mt-4 space-y-2 text-xs font-medium text-gray-500">
                                <li className="flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2"></span>
                                  Até <strong>{p.clients} {p.clients === 1 ? 'cliente' : 'clientes'}</strong> ativos
                                </li>
                                <li className="flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2"></span>
                                  Limite de <strong>{p.storage} GB</strong> de armazenamento drive
                                </li>
                                <li className="flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2"></span>
                                  10 dias carência + 60 dias backup
                                </li>
                              </ul>
                            </div>

                            <button 
                              type="button"
                              onClick={() => {
                                setSelectedPlanIdForCheckout(id as any);
                                setCheckoutStep('payment');
                                setCheckoutPaymentMethod('pix');
                              }}
                              className={cn(
                                "w-full mt-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all outline-none",
                                isCurrent 
                                  ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                                  : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] shadow-md hover:shadow-blue-200"
                              )}
                              disabled={isCurrent}
                            >
                              {isCurrent ? 'Plano Ativo' : 'Assinar Plano'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SIMULATOR BOARD */}
                  <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-xl border border-gray-800 space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-yellow-500/10 text-yellow-400 rounded-xl">
                        <Sliders className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight flex items-center">
                          Simulador de Política de Cobrança & Expurgo
                          <span className="bg-yellow-500/10 text-yellow-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ml-3 tracking-widest">
                            Ambiente de Testes
                          </span>
                        </h3>
                        <p className="text-gray-400 text-xs mt-0.5">Use este painel para avaliar como as integrações, dados e avisos reagem com o passar do tempo.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-950 p-6 rounded-3xl border border-gray-800">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">1. Simular Pagamento</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSimStatus('active');
                                setSimDaysUnpaid(0);
                              }}
                              className={cn(
                                "py-2.5 rounded-xl text-xs font-bold transition-all border outline-none",
                                simStatus === 'active' 
                                  ? "bg-emerald-600 border-emerald-500 text-white animate-none" 
                                  : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
                              )}
                            >
                              Fatura Paga (Ativo)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimStatus('suspended')}
                              className={cn(
                                "py-2.5 rounded-xl text-xs font-bold transition-all border outline-none",
                                simStatus === 'suspended' 
                                  ? "bg-red-600 border-red-500 text-white animate-none" 
                                  : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
                              )}
                            >
                              Inadimplente (Atraso)
                            </button>
                          </div>
                        </div>

                        {simStatus === 'suspended' && (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">
                              2. Dias Prorrogados Sem Pagar: <span className="text-yellow-400 font-bold font-mono">{simDaysUnpaid} dias</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { val: 5, label: '5 dias (Graça)' },
                                { val: 25, label: '25 dias (Backup)' },
                                { val: 75, label: '75 dias (Deletar)' }
                              ].map(sc => (
                                <button
                                  key={sc.val}
                                  type="button"
                                  onClick={() => setSimDaysUnpaid(sc.val)}
                                  className={cn(
                                    "px-2 py-2 rounded-lg text-[10px] font-mono border transition-all text-center outline-none",
                                    simDaysUnpaid === sc.val 
                                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500" 
                                      : "bg-gray-900 border-gray-800 text-gray-500"
                                  )}
                                >
                                  {sc.label}
                                </button>
                              ))}
                            </div>
                            <input 
                              type="range" min="0" max="90" value={simDaysUnpaid}
                              onChange={(e) => setSimDaysUnpaid(parseInt(e.target.value))}
                              className="w-full accent-yellow-400 mt-2 bg-gray-800 h-1 rounded"
                            />
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            type="button"
                            disabled={isSimulating}
                            onClick={handleApplySimulation}
                            className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-950 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all disabled:opacity-50 outline-none"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {isSimulating ? "Sincronizando..." : "Aplicar Estado Simulado"}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">3. Testar Forçar Expurgo Definitivo</label>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          Se o cliente exceder os 10 dias de graça + 60 dias de backup pendente (total de 70 dias em atraso), a agência e todo seu conteúdo (clientes, mídias, tarefas, leads) serão revogados definitivamente e excluídos de vez do banco de dados do SaaS.
                        </p>

                        <button
                          type="button"
                          onClick={() => setShowDeletionConfirm(true)}
                          className="w-full py-3 border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-100 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all outline-none"
                        >
                          <Database className="w-4 h-4 mr-2" />
                          Testar Deletar de Vez
                        </button>
                      </div>
                    </div>

                    {/* Simulation Console Screen */}
                    {simulationLog.length > 0 && (
                      <div className="bg-black/80 rounded-2xl p-6 border border-gray-800 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto mt-4 space-y-1">
                        <p className="text-gray-500 border-b border-gray-850 pb-1 mb-2 font-black uppercase tracking-wider flex items-center justify-between">
                          <span>CONSOLE DE EXECUÇÃO EM TEMPO REAL</span>
                          <span className="text-yellow-400 animate-pulse">● LIVE</span>
                        </p>
                        {simulationLog.map((log, index) => (
                          <div key={index} className={cn(
                            "py-0.5",
                            log.startsWith('❌') ? "text-red-400 font-bold" :
                            log.startsWith('🎉') || log.startsWith('✓') ? "text-emerald-400" : "text-gray-300"
                          )}>
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                   <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100">
                      <ShieldCheck className="w-12 h-12 mb-4 opacity-50" />
                      <h3 className="text-2xl font-black tracking-tight leading-none mb-2">Suporte Prioritário</h3>
                      <p className="text-blue-100 text-sm font-medium mb-6">Como parceiro da plataforma, você tem acesso direto ao nosso canal de suporte do SaaS para sua agência de marketing.</p>
                      <button className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center">
                         <ExternalLink className="w-4 h-4 mr-2" /> Central de Ajuda
                      </button>
                   </div>
                </div>
              </div>

              {/* CHECKOUT DRAW DE TESTE / SANDBOX */}
              {selectedPlanIdForCheckout && (() => {
                const planToBuy = PLANS[selectedPlanIdForCheckout];
                return (
                  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" id="checkout-modal">
                    <div className="bg-white text-gray-950 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 flex flex-col relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-250">
                      
                      <button 
                        type="button" 
                        onClick={() => {
                          if (!isProcessingCheckout) {
                            setSelectedPlanIdForCheckout(null);
                          }
                        }}
                        className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-all font-bold text-lg p-2 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center"
                        disabled={isProcessingCheckout}
                      >
                        ✕
                      </button>

                      {checkoutStep === 'payment' && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                              <CreditCard className="w-6 h-6" />
                            </span>
                            <div>
                              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Checkout de Assinatura Integrado</h3>
                              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-0.5">Ambiente de Checkout Asaas Inteligente</p>
                            </div>
                          </div>

                          <div className="p-6 bg-blue-50/30 rounded-3xl border border-blue-100/50">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Plano Selecionado</p>
                            <div className="flex justify-between items-center mt-2">
                              <div>
                                <p className="text-base font-black text-gray-900">{planToBuy.name}</p>
                                <p className="text-xs text-gray-400 font-bold">Até {planToBuy.clients} clientes • {planToBuy.storage} GB de armazenamento</p>
                              </div>
                              <span className="text-2xl font-black text-blue-600">R$ {planToBuy.price},00 <span className="text-[10px] text-gray-400 font-bold lowercase">/mês</span></span>
                            </div>
                          </div>

                          {/* Payment Method Selector */}
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Selecione a Forma de Pagamento</label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setCheckoutPaymentMethod('pix')}
                                className={cn(
                                  "py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border outline-none flex flex-col items-center justify-center gap-2",
                                  checkoutPaymentMethod === 'pix' 
                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100" 
                                    : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100"
                                )}
                              >
                                <span>⚡ PIX Instantâneo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCheckoutPaymentMethod('card')}
                                className={cn(
                                  "py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border outline-none flex flex-col items-center justify-center gap-2",
                                  checkoutPaymentMethod === 'card' 
                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100" 
                                    : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100"
                                )}
                              >
                                <span>💳 Cartão de Crédito</span>
                              </button>
                            </div>
                          </div>

                          {/* Billing Information Section (REQUIRED for real Asaas creation) */}
                          <div className="bg-gray-50/55 p-6 rounded-3xl border border-gray-100 space-y-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dados de Informação Adicional (Faturamento Real)</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest mb-1 block">Nome Completo do Titular</label>
                                <input 
                                  type="text"
                                  placeholder="Digite o nome completo"
                                  value={holderName}
                                  onChange={(e) => setHolderName(e.target.value)}
                                  className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-gray-455 uppercase tracking-widest mb-1 block">CPF / CNPJ (Apenas números)</label>
                                <input 
                                  type="text"
                                  placeholder="000.000.000-00"
                                  value={holderCpfCnpj}
                                  onChange={(e) => setHolderCpfCnpj(e.target.value.replace(/\D/g, ''))}
                                  className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-gray-455 uppercase tracking-widest mb-1 block">Telefone / WhatsApp</label>
                                <input 
                                  type="text"
                                  placeholder="Ex: 11999999999"
                                  value={holderPhone}
                                  onChange={(e) => setHolderPhone(e.target.value.replace(/\D/g, ''))}
                                  className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-gray-455 uppercase tracking-widest mb-1 block">CEP Residencial</label>
                                <input 
                                  type="text"
                                  placeholder="Apenas números (Ex: 01311000)"
                                  value={postalCode}
                                  onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                                  className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-gray-455 uppercase tracking-widest mb-1 block">Número do Endereço</label>
                                <input 
                                  type="text"
                                  placeholder="Ex: 15"
                                  value={addressNumber}
                                  onChange={(e) => setAddressNumber(e.target.value)}
                                  className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>

                          {checkoutPaymentMethod === 'pix' ? (
                            <div className="space-y-4 border border-gray-100 rounded-3xl p-6 bg-gray-50/50">
                              <div className="flex flex-col items-center text-center space-y-4">
                                <p className="text-xs font-bold text-gray-650">Abaixo é exibido o simulador rápido para teste padrão offline. <br />Caso você tenha as chaves configuradas, um QR Code real do Asaas será emitido na próxima etapa.</p>
                                
                                <div className="w-36 h-36 bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-center shadow-sm relative group overflow-hidden">
                                  <svg className="w-full h-full text-blue-600" viewBox="0 0 100 100" fill="currentColor">
                                    <path d="M10,10 h25 v5 h-20 v20 h-5 z M10,90 h25 v-5 h-20 v-20 h-5 z M90,10 h-25 v5 h20 v20 h5 z M90,90 h-25 v-5 h20 v-20 h5 z" />
                                    <rect x="25" y="25" width="12" height="12" />
                                    <rect x="63" y="25" width="12" height="12" />
                                    <rect x="25" y="63" width="12" height="12" />
                                    <rect x="44" y="44" width="12" height="12" />
                                    <rect x="42" y="25" width="4" height="8" />
                                    <rect x="25" y="42" width="8" height="4" />
                                  </svg>
                                  <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                    <span className="bg-white/90 text-blue-600 px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm">Simulador Pix</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 border border-gray-100 rounded-3xl p-6 bg-gray-50/50">
                              <div className="bg-gradient-to-br from-gray-800 to-gray-950 p-6 rounded-2xl text-white relative shadow-lg h-44 flex flex-col justify-between overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>
                                <div className="flex items-start justify-between">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dados do Cartão de Crédito</span>
                                  <span className="font-extrabold text-sm text-gray-100">SEGURADO</span>
                                </div>
                                
                                <div className="space-y-1">
                                  <p className="text-xs font-mono text-gray-300">
                                    {simulatedCardNumber || '•••• •••• •••• ••••'}
                                  </p>
                                  <p className="text-[10px] font-sans font-bold text-gray-400">
                                    Vence: {simulatedCardExpiry || 'MM/AA'} • CVV: {simulatedCardCvv || '•••'}
                                  </p>
                                </div>

                                <div className="flex justify-between items-end">
                                  <p className="text-[10px] font-mono tracking-wider truncate uppercase text-gray-300">{simulatedCardName || 'NOME DO TITULAR'}</p>
                                  <div className="w-10 h-6 bg-white/10 rounded-sm"></div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Número do Cartão</label>
                                  <input 
                                    type="text"
                                    placeholder="4532 1122 3443 4242"
                                    value={simulatedCardNumber}
                                    onChange={(e) => setSimulatedCardNumber(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold shadow-xs flex-1 outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Nome do Titular (Como impresso)</label>
                                  <input 
                                    type="text"
                                    placeholder="NOME IGUAL NO CARTÃO"
                                    value={simulatedCardName}
                                    onChange={(e) => setSimulatedCardName(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold shadow-xs flex-1 outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Validade</label>
                                  <input 
                                    type="text"
                                    placeholder="12/29"
                                    maxLength={5}
                                    value={simulatedCardExpiry}
                                    onChange={(e) => setSimulatedCardExpiry(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold shadow-xs flex-1 outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">CVV</label>
                                  <input 
                                    type="password"
                                    placeholder="123"
                                    maxLength={3}
                                    value={simulatedCardCvv}
                                    onChange={(e) => setSimulatedCardCvv(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold shadow-xs flex-1 outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3 pt-4">
                            <button
                              type="button"
                              onClick={() => setSelectedPlanIdForCheckout(null)}
                              className="flex-1 py-3.5 bg-gray-50 text-gray-500 rounded-xl font-bold hover:bg-gray-100 transition-all text-xs uppercase tracking-widest outline-none border border-transparent"
                            >
                              Voltar
                            </button>
                            <button
                              type="button"
                              onClick={handleSimulatedPayment}
                              className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                              <span>Confirmar Transação ({checkoutPaymentMethod === 'pix' ? 'Pix' : 'Cartão'})</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {checkoutStep === 'payment_details' && (
                        <div className="space-y-6 flex flex-col items-center py-6 text-center">
                          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center animate-pulse">
                            <Sparkles className="w-8 h-8" />
                          </div>
                          
                          <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Cobrança Gerada com Sucesso</h3>
                            <p className="text-sm font-bold text-gray-400 mt-1">Sua fatura oficial do Asaas foi emitida</p>
                          </div>

                          {checkoutPaymentMethod === 'pix' ? (
                            <div className="space-y-4 max-w-sm w-full">
                              <div className="bg-white p-4 border border-gray-150 rounded-3xl shadow-sm space-y-2 flex flex-col items-center justify-center">
                                <p className="text-xs font-black text-blue-600 tracking-wider uppercase">Escaneie o QR Code Pix do Asaas</p>
                                {realPixQrCode ? (
                                  <img 
                                    src={`data:image/png;base64,${realPixQrCode}`} 
                                    alt="Asaas Pix QR Code" 
                                    className="w-48 h-48 rounded-xl object-contain border border-gray-100 shadow-xs"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-gray-405 font-bold">Gerando QR Code...</div>
                                )}
                              </div>
                              
                              <div className="w-full space-y-2 text-left">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Chave Copia e Cola Pix</label>
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 w-full">
                                  <input 
                                    type="text" 
                                    readOnly 
                                    value={realPixCopyPaste || ''}
                                    className="bg-transparent border-none focus:ring-0 text-xs font-mono font-medium text-gray-500 truncate flex-1 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(realPixCopyPaste || '');
                                      alert('Chave copiada para a área de transferência!');
                                    }}
                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="p-4 bg-yellow-50 text-yellow-800 text-[11px] font-medium leading-relaxed rounded-2xl border border-yellow-105 flex items-center gap-2 text-left">
                                <span>💡</span>
                                <p>Assim que o pagamento for concluído no seu banco de verdade, nosso webhook ativará a sua agência instantaneamente. Você pode fechar esta tela.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 max-w-sm w-full">
                              <p className="text-xs font-bold text-gray-650 leading-relaxed mb-4">Seu cartão de crédito requer validação complementar do emissor bancário de faturamento:</p>
                              
                              {realInvoiceUrl ? (
                                <a 
                                  href={realInvoiceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full block text-center py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-200"
                                >
                                  Abrir Link de Pagamento Completo ↗
                                </a>
                              ) : (
                                <div className="text-xs text-gray-400">Sem link de redirecionamento disponível.</div>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedPlanIdForCheckout(null)}
                            className="w-full max-w-xs py-3.5 bg-gray-100 hover:bg-gray-250 text-gray-600 rounded-xl font-bold transition-all text-xs uppercase tracking-widest outline-none mt-4"
                          >
                            Fechar Checkout de Ativação
                          </button>
                        </div>
                      )}

                      {checkoutStep === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
                          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin flex items-center justify-center" />
                          <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Processando Assinatura</h3>
                            <p className="text-xs text-gray-400 mt-1">Conectando ao gateway de faturamento do Sandbox...</p>
                          </div>
                          
                          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-150 font-mono text-left text-xs max-w-md w-full space-y-2 mt-4">
                            {[
                              "Processando solicitação de assinatura...",
                              "Identificando transação e conciliação bancária...",
                              "Processando webhook de conciliação Asaas...",
                              "Ativando conta da agência no Firestore de Produção...",
                              "Sincronização de Assinatura concluída com sucesso!"
                            ].map((milestone, idx) => {
                              const isCompleted = checkoutMilestoneIndex > idx;
                              const isActive = checkoutMilestoneIndex === idx;
                              return (
                                <div 
                                  key={idx} 
                                  className={cn(
                                    "flex items-center gap-2.5 transition-all text-[11px]",
                                    isCompleted ? "text-emerald-600 font-bold" :
                                    isActive ? "text-blue-600 animate-pulse font-extrabold" : "text-gray-400 font-medium"
                                  )}
                                >
                                  <span>{isCompleted ? "✓" : isActive ? "➜" : "○"}</span>
                                  <span>{milestone}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {checkoutStep === 'success' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
                          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm animate-bounce">
                            <CheckCircle2 className="w-10 h-10" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Assinatura Ativada!</h3>
                            <p className="text-sm font-bold text-gray-500 mt-1">Seu pagamento de R$ {planToBuy.price},00 foi processado e homologado com sucesso.</p>
                          </div>
                          
                          <div className="p-6 bg-emerald-50/20 border border-emerald-100 rounded-3xl w-full max-w-md text-left space-y-2 text-xs text-gray-500 font-medium">
                            <p className="font-extrabold text-gray-800 text-sm mb-2 text-center">✓ Benefícios Ativados na sua Agência:</p>
                            <li className="list-none flex items-center gap-2"><span>✓</span> Limite ampliado: <strong>{planToBuy.clients} clientes</strong> ativos.</li>
                            <li className="list-none flex items-center gap-2"><span>✓</span> Espaço ampliado: <strong>{planToBuy.storage} GB</strong> de armazenamento drive.</li>
                            <li className="list-none flex items-center gap-2"><span>✓</span> Certificação de backup ativo para prevenção de expurgo.</li>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedPlanIdForCheckout(null)}
                            className="w-full max-w-xs py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-200 transition-all text-xs uppercase tracking-widest outline-none"
                          >
                            Ir para o Painel de Gestão
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })()}

              {/* Confirmation Wipe Modal */}
              {showDeletionConfirm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white text-gray-950 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-red-100 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Confirmar Exclusão Definitiva?</h3>
                    <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                      Esta ação irá simular o expurgo completo dos registros do Firestore após <strong>60 dias</strong> de backup inativo. Serão apagados todos os clientes, mídias, tarefas e usuários vinculados a esta agência.
                    </p>
                    <div className="flex space-x-3 mt-8">
                      <button 
                        type="button" 
                        onClick={() => setShowDeletionConfirm(false)} 
                        className="flex-1 py-3 text-gray-500 font-bold bg-gray-50 rounded-xl hover:bg-gray-100 transition-all text-xs uppercase tracking-widest"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button" 
                        disabled={isSimulating}
                        onClick={handleSimulatePermanentDeletion}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all text-xs uppercase tracking-widest flex items-center justify-center"
                      >
                        {isSimulating ? "Processando..." : "Simular Apagar Tudo"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'integrations' && (() => {
          const subInfo = getSubscriptionStatus(agency);
          return (
            <div className="space-y-8">
              {/* Warnings on integrations tab about active phase */}
              {subInfo.isUnpaid && (
                <div className={cn(
                  "p-6 rounded-[2rem] border flex items-center justify-between gap-4 text-xs font-bold shadow-xs",
                  subInfo.integrationsActive 
                    ? "bg-amber-50 border-amber-200 text-amber-800" 
                    : "bg-red-50 border-red-200 text-red-800"
                )}>
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>
                      {subInfo.integrationsActive 
                        ? `ℹ Assinatura pendente! Suas Integrações (Google Drive e Asaas) continuam ATIVAS temporariamente pelo período de graça de 10 dias (restam ${subInfo.daysRemainingGrace} dias).`
                        : "⚠️ Integrações desativadas devido à falta de pagamento! Seus dados de mídias e clientes continuam salvos em backup. Regularize sua fenda para restabelecer."}
                    </span>
                  </div>
                </div>
              )}

              {/* Google Drive API Integration Card */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center space-x-6">
                     <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                        <HardDrive className="w-8 h-8 text-blue-600" />
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <h3 className="text-xl font-black text-gray-900">Sincronização Google Drive</h3>
                           {subInfo.integrationsActive ? (
                             <span className={cn(
                               "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                               driveStatus === 'connected' ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                             )}>
                               {driveStatus === 'connected' ? 'Conectado' : 'Configuração Pendente'}
                             </span>
                           ) : (
                             <span className="bg-red-50 text-red-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-red-200">
                               Suspenso por Inadimplência
                             </span>
                           )}
                        </div>
                        <p className="text-gray-400 text-sm font-medium mt-1">Sincronização direta de pastas do Google Drive para upload de mídias brutas e roteiros de seus clientes de forma estruturada.</p>
                     </div>
                  </div>
                  <div className="flex items-center space-x-4">
                     <button 
                       type="button"
                       disabled={isLinkingDrive || !subInfo.integrationsActive}
                       onClick={handleConnectDrive}
                       className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {!subInfo.integrationsActive ? 'Integração Bloqueada' : isLinkingDrive ? 'Sincronizando...' : (driveStatus === 'connected' ? 'Reconectar Google Drive' : 'Conectar Google Drive')}
                     </button>
                  </div>
                </div>

                <div className="mt-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                   <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Diretrizes de Expurgo de Integração de Arquivos</h4>
                   <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
                     Este motor cria automaticamente uma estrutura de pastas para cada cliente contendo <code>/videos</code>, <code>/imagens</code> e <code>/documentos</code>. Caso seu plano SaaS passe para o status de inadimplência, essa conexão continua funcionando por <strong>10 dias corridos</strong>, sendo suspensa para leitura/escrita no 11º dia.
                   </p>
                </div>
              </div>

              {/* Asaas Client Billing direct integration card */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center space-x-6">
                   <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100">
                      <CreditCard className="w-8 h-8 text-purple-600" />
                   </div>
                   <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-gray-900">Integração Direta Asaas</h3>
                        {subInfo.integrationsActive ? (
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                            agency?.asaasConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                          )}>
                            {agency?.asaasConnected ? 'Ativo' : 'Desconectado'}
                          </span>
                        ) : (
                          <span className="bg-red-50 text-red-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-red-200">
                            Bloqueado por Inadimplência
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm font-medium mt-1">Configure o seu asaas pessoal (API pública) para cobrar os seus clientes através de boletos, cartões e PIX direto pelo aplicativo.</p>
                   </div>
                </div>

                <form onSubmit={handleSaveAsaasConfig} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-bold text-gray-700 mb-1">Ambiente de Operações</label>
                       <select 
                         value={asaasEnv}
                         disabled={!subInfo.integrationsActive}
                         onChange={(e) => setAsaasEnv(e.target.value as any)}
                         className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                       >
                         <option value="sandbox">Sandbox / Homologação (Testes)</option>
                         <option value="production">Produção (Bandeira Real)</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-700 mb-1">Asaas Wallet ID (ID de Carteira)</label>
                       <input 
                         type="text"
                         placeholder="Ex: d45da178-0cb9-4978-..."
                         value={asaasWalletId}
                         disabled={!subInfo.integrationsActive}
                         onChange={(e) => setAsaasWalletId(e.target.value)}
                         className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-mono text-sm outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                       />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-700 mb-1">Token de Chave de API Asaas (API Key)</label>
                     <input 
                       type="password"
                       placeholder="$asaas_key_prod_..."
                       value={asaasApiKey}
                       disabled={!subInfo.integrationsActive}
                       onChange={(e) => setAsaasApiKey(e.target.value)}
                       className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-mono text-sm outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                     />
                     <span className="text-[10px] text-gray-400 font-medium block mt-1">Essa chave é criptografada e salva de forma segura no Firestore da agência. Permite acionar cobranças automáticas.</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/60">
                    <span className="text-[10px] uppercase font-black text-gray-400">
                      Integração protegida: 10 dias de carência de uso garantidos
                    </span>
                    <button
                      type="submit"
                      disabled={isSavingAsaas || !subInfo.integrationsActive}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all disabled:opacity-50 outline-none"
                    >
                      {isSavingAsaas ? "Salvando..." : asaasSaveSuccess ? "Salvo com sucesso!" : "Salvar Integração Asaas"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
