import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, Client, Task, ContentItem, FinancialRecord } from '../types';
import { MOCK_CONTENTS, MOCK_CLIENTS, MOCK_TASKS, MOCK_FINANCIALS } from '../lib/mockData';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowUpRight,
  Sparkles,
  Calendar,
  Layers,
  FolderDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Volume2,
  Cpu,
  Bookmark,
  Instagram,
  User,
  Heart,
  Share2,
  X,
  Send,
  Download,
  Flame,
  ThumbsUp,
  LayoutDashboard,
  FileCheck,
  CheckSquare,
  DollarSign,
  Copy,
  Check,
  FileText
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/activity-logger';
import { cn } from '../lib/utils';

interface DashboardProps {
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function Dashboard({ profile, isDemoMode }: DashboardProps) {
  const [clientData, setClientData] = useState<Client | null>(null);
  const [pendingContents, setPendingContents] = useState<ContentItem[]>([]);
  const [allContents, setAllContents] = useState<ContentItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  
  const [portalSection, setPortalSection] = useState<'panel' | 'calendar' | 'approvals' | 'tasks' | 'financial'>('panel');
  const [loading, setLoading] = useState(true);
  
  // High fidelity quick client review states
  const [selectedReview, setSelectedReview] = useState<ContentItem | null>(null);
  const [adjustFeedback, setAdjustFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [reviewTab, setReviewTab] = useState<'design' | 'copy'>('design');

  // Copy success indicator
  const [copiedPix, setCopiedPix] = useState(false);
  
  // Custom modal for invoice visualization
  const [selectedInvoice, setSelectedInvoice] = useState<FinancialRecord | null>(null);

  // Load client portal data (live snapshot or demo values)
  useEffect(() => {
    if (isDemoMode) {
      const matched = MOCK_CLIENTS.find(c => c.id === profile.clientId) || MOCK_CLIENTS[0];
      setClientData(matched);
      setPendingContents(MOCK_CONTENTS.filter(c => c.clientId === matched.id && c.status === 'approval'));
      setAllContents(MOCK_CONTENTS.filter(c => c.clientId === matched.id));
      setTasks(MOCK_TASKS.filter(t => t.clientId === matched.id));
      setFinancials(MOCK_FINANCIALS.filter(r => r.clientId === matched.id));
      setLoading(false);
      return;
    }

    if (!profile?.clientId) {
      // If agency member tries to view client dashboard, load first client as demo
      const fetchFirstClient = async () => {
        try {
          const snap = await getDocs(query(collection(db, 'clients'), where('agencyId', '==', profile.agencyId)));
          if (!snap.empty) {
            const firstDoc = snap.docs[0];
            const clientObj = { id: firstDoc.id, ...firstDoc.data() } as Client;
            setClientData(clientObj);
            
            // Listen for approvals
            const unsubContents = onSnapshot(query(collection(db, 'clients', clientObj.id, 'contents')), (contentsSnap) => {
              const items = contentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
              setAllContents(items);
              setPendingContents(items.filter(i => i.status === 'approval'));
            });

            // Listen for tasks
            const unsubTasks = onSnapshot(collection(db, 'clients', clientObj.id, 'tasks'), (tasksSnap) => {
              setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
            });

            // Listen for financial items
            const unsubFin = onSnapshot(collection(db, 'clients', clientObj.id, 'financials'), (finSnap) => {
              setFinancials(finSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialRecord)));
            });

            return () => { unsubContents(); unsubTasks(); unsubFin(); };
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchFirstClient();
      return;
    }

    // Direct client user snapshot listening
    const unsubClient = onSnapshot(doc(db, 'clients', profile.clientId), (docSnap) => {
      if (docSnap.exists()) {
        setClientData({ id: docSnap.id, ...docSnap.data() } as Client);
      }
    });

    const unsubContentsObj = onSnapshot(collection(db, 'clients', profile.clientId, 'contents'), (contentsSnap) => {
      const items = contentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
      setAllContents(items);
      setPendingContents(items.filter(i => i.status === 'approval'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `clients/${profile.clientId}/contents`);
      setLoading(false);
    });

    const unsubTasksObj = onSnapshot(collection(db, 'clients', profile.clientId, 'tasks'), (tasksSnap) => {
      setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    const unsubFinObj = onSnapshot(collection(db, 'clients', profile.clientId, 'financials'), (finSnap) => {
      setFinancials(finSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialRecord)));
    });

    return () => { unsubClient(); unsubContentsObj(); unsubTasksObj(); unsubFinObj(); };
  }, [profile.clientId, profile.agencyId, isDemoMode]);

  // Handle Client Approval actions directly inside dashboard
  const handleClientAction = async (item: ContentItem, actionStatus: 'approved' | 'revision') => {
    setIsSubmittingFeedback(true);
    if (isDemoMode) {
      setPendingContents(prev => prev.filter(c => c.id !== item.id));
      setAllContents(prev => prev.map(c => c.id === item.id ? { ...c, status: actionStatus === 'approved' ? 'approved' : 'revision', feedback: actionStatus === 'revision' ? adjustFeedback : '' } : c));
      setSelectedReview(null);
      setAdjustFeedback('');
      setIsSubmittingFeedback(false);
      return;
    }
    try {
      const updateData: any = { 
        status: actionStatus === 'approved' ? 'approved' : 'revision', 
        updatedAt: new Date().toISOString() 
      };
      if (actionStatus === 'revision') {
        updateData.feedback = adjustFeedback || 'Solicitado ajuste de criativo pelo portal.';
      }
      await updateDoc(doc(db, 'clients', item.clientId, 'contents', item.id), updateData);
      await logActivity(profile, `${actionStatus === 'approved' ? 'aprovou' : 'rejeitou'} o conteúdo: ${item.title}`, item.id, 'content', item.clientId);
      setSelectedReview(null);
      setAdjustFeedback('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Audience metric dataset
  const growthDataset = [
    { name: 'Semana 17', alcance: 14200, engajamento: 820, cliques: 180 },
    { name: 'Semana 18', alcance: 17800, engajamento: 1100, cliques: 250 },
    { name: 'Semana 19', alcance: 21000, engajamento: 1450, cliques: 320 },
    { name: 'Semana 20', alcance: 28500, engajamento: 1890, cliques: 410 },
    { name: 'Semana 21', alcance: 34200, engajamento: 2400, cliques: 590 },
  ];

  const brandFiles = [
    { name: 'Identidade Visual.pdf', type: 'Guidelines', size: '14.2 MB' },
    { name: 'Logotipo_Vetor_Master.svg', type: 'Logo Assets', size: '1.8 MB' },
    { name: 'Banco de Fotos Institucionais', type: 'Drive Link', size: '54 arquivos' },
  ];

  // Dynamic branding variables with fallbacks
  // Custom client branding extraction values added in setup section
  const brandPrimaryColor = (clientData as any)?.portalPrimaryColor || '#2563eb';
  const brandAccentColor = (clientData as any)?.portalAccentColor || '#f59e0b';
  const logoScaleValue = (clientData as any)?.logoScale || 1;
  const logoXValue = (clientData as any)?.logoPositionX || 0;
  const logoYValue = (clientData as any)?.logoPositionY || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
        <span className="ml-3 font-mono text-xs text-zinc-500 font-bold uppercase tracking-wider">Acessando Portal...</span>
      </div>
    );
  }

  // Derived KPI Counts
  const totalApproved = allContents.filter(c => c.status === 'approved' || c.status === 'scheduled' || c.status === 'published').length;
  const totalInRevision = allContents.filter(c => c.status === 'revision').length;
  const tasksCompleted = tasks.filter(t => t.status === 'done').length;
  const ongoingTasks = tasks.filter(t => t.status !== 'done');
  const activePlanPaymentStatus = financials.some(f => f.status === 'overdue') ? 'Em atraso' : 'Em dia';

  return (
    <div className="space-y-6 select-none md:select-text text-left" id="client-portal-root">
      
      {/* HEADER DE BEM-VINDO: Elegant layout with custom logo integration */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.015)] flex flex-col md:flex-row md:items-center justify-between gap-6" id="client-welcome-card">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center p-2.5 overflow-hidden flex-shrink-0">
            {clientData?.logoUrl ? (
              <img 
                src={clientData.logoUrl} 
                alt={clientData.company} 
                className="w-full h-full object-contain"
                style={{
                  transform: `scale(${logoScaleValue}) translate(${logoXValue}px, ${logoYValue}px)`
                }}
              />
            ) : (
              <Sparkles className="w-8 h-8" style={{ color: brandPrimaryColor }} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="flex h-2 w-2 rounded-full" style={{ backgroundColor: brandAccentColor }}></span>
              <p className="text-[9px] font-mono tracking-widest uppercase text-gray-500 font-black">
                {clientData?.company || 'Evoo Flow'} • Portal do Parceiro
              </p>
            </div>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">
              Olá, <span style={{ color: brandPrimaryColor }}>{clientData?.name ? clientData.name.split(' ')[0] : 'Parceiro'}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Gestão transparente, cronogramas e entregas de escala.</p>
          </div>
        </div>

        {/* Dynamic Drive Connector Link */}
        {clientData?.driveFolderId && (
          <a 
            href={`https://drive.google.com/drive/folders/${clientData.driveFolderId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-mono font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md shadow-slate-950/10"
          >
            <FolderDown className="w-4 h-4 text-gray-300" />
            <span>Google Drive de Ativos</span>
          </a>
        )}
      </div>

      {/* ARC/NOTION-STYLE COMPACT TAB NAVIGATION RAIL */}
      <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex space-x-1.5 overflow-x-auto min-w-max" id="portal-sub-tabs">
        <button 
          onClick={() => setPortalSection('panel')}
          className={cn(
            "flex items-center space-x-2 px-4.5 py-3.5 rounded-xl text-xs font-bold transition-all",
            portalSection === 'panel' 
              ? "text-white shadow-md shadow-blue-500/10" 
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          )}
          style={portalSection === 'panel' ? { backgroundColor: brandPrimaryColor } : undefined}
          type="button"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Painel</span>
        </button>

        <button 
          onClick={() => setPortalSection('calendar')}
          className={cn(
            "flex items-center space-x-2 px-4.5 py-3.5 rounded-xl text-xs font-bold transition-all",
            portalSection === 'calendar' 
              ? "text-white shadow-md shadow-blue-500/10" 
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          )}
          style={portalSection === 'calendar' ? { backgroundColor: brandPrimaryColor } : undefined}
          type="button"
        >
          <Calendar className="w-4 h-4" />
          <span>Calendário Editorial</span>
        </button>

        <button 
          onClick={() => setPortalSection('approvals')}
          className={cn(
            "flex items-center space-x-2 px-4.5 py-3.5 rounded-xl text-xs font-bold transition-all relative",
            portalSection === 'approvals' 
              ? "text-white shadow-md shadow-blue-500/10" 
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          )}
          style={portalSection === 'approvals' ? { backgroundColor: brandPrimaryColor } : undefined}
          type="button"
        >
          <FileCheck className="w-4 h-4" />
          <span>Central de Aprovações</span>
          {pendingContents.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ring-2 ring-white">
              {pendingContents.length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setPortalSection('tasks')}
          className={cn(
            "flex items-center space-x-2 px-4.5 py-3.5 rounded-xl text-xs font-bold transition-all",
            portalSection === 'tasks' 
              ? "text-white shadow-md shadow-blue-500/10" 
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          )}
          style={portalSection === 'tasks' ? { backgroundColor: brandPrimaryColor } : undefined}
          type="button"
        >
          <CheckSquare className="w-4 h-4" />
          <span>Historico &amp; Entregas</span>
        </button>

        <button 
          onClick={() => setPortalSection('financial')}
          className={cn(
            "flex items-center space-x-2 px-4.5 py-3.5 rounded-xl text-xs font-bold transition-all",
            portalSection === 'financial' 
              ? "text-white shadow-md shadow-blue-500/10" 
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          )}
          style={portalSection === 'financial' ? { backgroundColor: brandPrimaryColor } : undefined}
          type="button"
        >
          <DollarSign className="w-4 h-4" />
          <span>Área Financeira</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB BLOCK */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={portalSection}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          
          {/* 1. PORTAL GENERAL PANEL */}
          {portalSection === 'panel' && (
            <div className="space-y-8" id="portal-dashboard">
              
              {/* METRIC SUMMARIES (Notion Cards style) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[9px] font-mono text-gray-400 font-black block uppercase mb-1">Criativos do Mês</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-800">{allContents.length}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">carregados</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[9px] font-mono text-gray-400 font-black block uppercase mb-1">Aprovações Pendentes</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-amber-500">{pendingContents.length}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">revisões</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[9px] font-mono text-gray-400 font-black block uppercase mb-1">Tarefas Concluídas</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-green-600">{tasksCompleted}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">de {tasks.length}</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[9px] font-mono text-gray-400 font-black block uppercase mb-1">Status Financeiro</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-850">{activePlanPaymentStatus}</span>
                  </div>
                </div>
              </div>

              {/* TWO COLUMN CONTENT: pending list vs materials */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Visual Highlights list */}
                <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs text-left">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-3.5 mb-5 select-none">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-gray-400" />
                      Peças em Avaliação Prioritária
                    </h3>
                    <button 
                      onClick={() => setPortalSection('approvals')}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-wider hover:underline flex items-center"
                    >
                      Acessar Central <ChevronRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pendingContents.slice(0, 2).map((content) => (
                      <div 
                        key={content.id}
                        onClick={() => setSelectedReview(content)}
                        className="bg-gray-50 rounded-2xl border border-gray-100/50 p-4 cursor-pointer hover:border-slate-300 transition-all flex flex-col justify-between"
                      >
                        <div className="aspect-video bg-zinc-100 rounded-xl relative overflow-hidden mb-3 border border-gray-200/50">
                          {content.mediaUrl ? (
                            <img src={content.mediaUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Instagram className="w-8 h-8" />
                            </div>
                          )}
                          <span className="absolute top-2 left-2 bg-white px-2 py-0.5 rounded text-[8px] font-mono font-bold text-slate-800 border border-gray-100">
                            {content.platform}
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between text-[9px] font-mono font-bold text-gray-400 mb-0.5">
                            <span>VEICULAÇÃO</span>
                            <span>{new Date(content.publishDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm truncate">{content.title}</h4>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded uppercase font-mono">{content.type}</span>
                          <span className="text-blue-600">Revisar Criativo →</span>
                        </div>
                      </div>
                    ))}

                    {pendingContents.length === 0 && (
                      <div className="col-span-full py-12 text-center flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <CheckCircle className="w-8 h-8 text-green-500/80 mb-2" />
                        <span className="text-xs font-bold text-slate-800">Tudo Aprovado!</span>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">Não há pendências estagnadas nesta semana.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* CS, Contacts and support */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Brand Assets list */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs text-left">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono mb-4 flex items-center gap-1.5 border-b border-gray-50 pb-2.5">
                      <Bookmark className="w-3.5 h-3.5" />
                      Manual de Ativos
                    </h4>
                    <div className="space-y-3.5">
                      {brandFiles.map((file, i) => (
                        <div key={i} className="flex justify-between items-center text-xs border-b border-gray-50/50 pb-2.5 last:border-none last:pb-0">
                          <div>
                            <span className="font-bold text-slate-800 block truncate max-w-[150px]">{file.name}</span>
                            <span className="text-[9px] text-gray-400 font-medium font-mono uppercase">{file.type} • {file.size}</span>
                          </div>
                          <button className="p-1 px-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-[10px] font-bold text-slate-800">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational CS */}
                  <div className="bg-slate-950 text-white p-6 rounded-3xl relative overflow-hidden text-left shadow-lg">
                    <p className="text-[9px] font-mono tracking-widest text-white/50 mb-4 font-black">CONTATO DE MARKETING</p>
                    <div className="flex items-center space-x-3.5 mb-5">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-200 flex items-center justify-center text-xs font-black">
                        EF
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">Evoo Flow Agency</h4>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Suporte Direcional e Insights</span>
                      </div>
                    </div>
                    <a 
                      href="https://wa.me/5511987654321" 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full text-center block bg-white/10 text-white tracking-widest text-[9px] font-black py-3 rounded-xl uppercase hover:bg-white/15 active:scale-95 transition-all"
                    >
                      Falar via WhatsApp Comercial
                    </a>
                  </div>

                </div>

              </div>

              {/* AUDIENCE ACCENT SHEET GROWTH STATS */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs text-left">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2.5 mb-6">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                    📈 Evolução quinzenal de Audiência
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono font-bold">Relatório Integrado de Crescimento</span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthDataset} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={brandPrimaryColor} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={brandPrimaryColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9' }} />
                        <Area type="monotone" name="Alcance Orgânico" dataKey="alcance" stroke={brandPrimaryColor} strokeWidth={2.5} fillOpacity={1} fill="url(#primaryGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-col justify-center space-y-3.5">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150/60">
                      <span className="text-[8.5px] font-black text-gray-450 uppercase tracking-widest block font-mono">Engajamento de Criativos</span>
                      <div className="flex items-baseline space-x-1.5 mt-1">
                        <span className="text-xl font-black text-slate-800">8.4%</span>
                        <span className="text-[9px] text-emerald-500 font-bold font-mono">+1.25%</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150/60">
                      <span className="text-[8.5px] font-black text-gray-450 uppercase tracking-widest block font-mono">Conversões / Cliques</span>
                      <div className="flex items-baseline space-x-1.5 mt-1">
                        <span className="text-xl font-black text-slate-800">1.2K</span>
                        <span className="text-[9px] text-emerald-500 font-bold font-mono">+5.20%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2. COMPREHENSIVE CALENDÁRIO EDITORIAL */}
          {portalSection === 'calendar' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 text-left space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-850 uppercase tracking-widest">
                    📅 Fluxo Editorial de Publicações
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Veja todas as peças criadas pela agência categorizadas por status de veiculação.</p>
                </div>
              </div>

              {allContents.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                  <span className="text-xs text-gray-400">Nenhum conteúdo listado para este cliente</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {allContents.map((content) => (
                    <div 
                      key={content.id}
                      onClick={() => setSelectedReview(content)}
                      className="bg-gray-50 rounded-2xl border border-gray-150/60 p-4.5 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-video bg-zinc-100 rounded-xl relative overflow-hidden mb-4 border border-gray-200/50">
                        {content.mediaUrl ? (
                          <img src={content.mediaUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Instagram className="w-8 h-8" />
                          </div>
                        )}
                        <span className="absolute top-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-0.5 rounded text-[8px] font-mono tracking-widest uppercase text-white font-semibold">
                          {content.platform}
                        </span>
                        
                        {/* Status Label mapping */}
                        <span className={cn(
                          "absolute bottom-2.5 right-2.5 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-md border",
                          content.status === 'approved' || content.status === 'scheduled' || content.status === 'published'
                            ? "bg-green-100 text-green-700 border-green-200"
                            : content.status === 'approval'
                            ? "bg-amber-100 text-amber-700 border-amber-200 animate-pulse"
                            : "bg-red-50 text-red-600 border-red-100"
                        )}>
                          {content.status === 'approved' || content.status === 'scheduled' || content.status === 'published' ? 'Aprovado' :
                           content.status === 'approval' ? 'Aguardando Você' : 'Ajustes solicitados'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[8.5px] font-mono font-black text-gray-400">
                          <span>FORMATO: {content.type.toUpperCase()}</span>
                          <span>DATA: {new Date(content.publishDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{content.title}</h4>
                        <p className="text-[11px] text-gray-400 line-clamp-2">{content.caption || 'Sem legenda inserida.'}</p>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-gray-150/40 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-gray-450 font-mono">V{content.currentVersion || 1}</span>
                        <span className="text-blue-600 hover:underline">Ver Detalhado e Roteiro →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. CENTRAL DE APROVAÇÕES EXCLUSIVA */}
          {portalSection === 'approvals' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 text-left space-y-6">
              <div className="flex border-b border-gray-50 pb-4 justify-between items-center bg-transparent select-none">
                <div>
                  <h3 className="text-sm font-black text-slate-850 uppercase tracking-widest">
                    ✔️ Central de Aprovação de Criativos
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Clique em qualquer criativo abaixo para verificar o texto da legenda, vídeo reels, carrosséis e hashtags de feed.</p>
                </div>
              </div>

              {pendingContents.length === 0 ? (
                <div className="py-16 text-center border bg-gray-50/50 border-gray-150 border-dashed rounded-3xl flex flex-col items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mb-2.5" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-tight font-sans">Sem Conteúdos Pendentes</span>
                  <p className="text-[10px] text-gray-450 mt-1 max-w-sm text-center">Nenhum criativo aguardando aprovação nesta fila. Excelente controle operacional!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                  {pendingContents.map((content) => (
                    <div 
                      key={content.id}
                      onClick={() => setSelectedReview(content)}
                      className="bg-white rounded-3xl border border-gray-200 p-5 cursor-pointer hover:border-blue-400 transition-all flex flex-col md:flex-row gap-5"
                    >
                      <div className="w-full md:w-44 aspect-video md:aspect-square bg-slate-50 border border-gray-100 rounded-2xl overflow-hidden flex-shrink-0 relative">
                        {content.mediaUrl ? (
                          <img src={content.mediaUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Instagram className="w-8 h-8" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 bg-slate-900/95 text-white text-[8px] font-mono px-2 py-0.5 rounded font-black uppercase">
                          {content.platform}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[8.5px] font-mono text-amber-600 font-extrabold block mb-0.5 animate-pulse">● AGUARDANDO REVISÃO</span>
                          <h4 className="font-extrabold text-slate-900 text-base leading-snug">{content.title}</h4>
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mt-1 select-none">{content.caption || 'Sem legenda'}</p>
                        </div>

                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold mt-4 md:mt-0">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded truncate max-w-[100px] font-mono uppercase">{content.type}</span>
                          <span className="text-blue-600 hover:underline">Revisar Peça e Aprovar →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. HISTÓRICO DE TAREFAS E ENTREGAS */}
          {portalSection === 'tasks' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 text-left space-y-6">
              <div className="flex border-b border-gray-50 pb-4 justify-between items-center bg-transparent">
                <div>
                  <h3 className="text-sm font-black text-slate-850 uppercase tracking-widest">
                    📋 Checklist de Entregas e Demandas
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Visualize em tempo real quais demandas operacionais estão em andamento ou já concluídas no mês.</p>
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="py-12 border rounded-2xl text-center text-gray-400 bg-gray-50/50 text-xs">
                  Sem tarefas cadastradas
                </div>
              ) : (
                <div className="space-y-3.5">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors gap-3"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          task.status === 'done' ? "bg-green-50 border-green-400 text-green-600" : "border-gray-300 text-transparent"
                        )}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={cn("text-xs font-bold leading-none", task.status === 'done' ? "text-gray-400 line-through" : "text-slate-800")}>
                              {task.title}
                            </span>
                            
                            {/* Priority tags mapping */}
                            <span className={cn(
                              "text-[7px] font-extrabold font-mono px-1.5 py-0.5 rounded uppercase leading-none",
                              task.priority === 'high' ? "bg-red-100 text-red-700" :
                              task.priority === 'medium' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                            )}>
                              {task.priority === 'high' ? 'Crítico' : task.priority === 'medium' ? 'Médio' : 'Padrão'}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-[10px] text-gray-400 mt-1">{task.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-gray-150/40 text-[10px] font-mono uppercase font-black">
                        <div>
                          <span className="text-gray-400 font-bold">PRAZO: </span>
                          <span className="text-slate-700">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'A definir'}</span>
                        </div>
                        
                        <span className={cn(
                          "px-2 px-2.5 py-0.5 rounded-lg text-[8px] tracking-wide font-sans",
                          task.status === 'done' ? "bg-green-100 text-green-700 font-bold" :
                          task.status === 'review' ? "bg-amber-100 text-amber-700 font-bold" : "bg-blue-50 text-blue-700 font-bold"
                        )}>
                          {task.status === 'done' ? 'Entregue' :
                           task.status === 'review' ? 'Em Revisão' : 'Fabricando'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. ÁREA FINANCEIRA EXCLUSIVA */}
          {portalSection === 'financial' && (
            <div className="space-y-6" id="portal-financial">
              
              {/* CURRENT MONTH STATEMENT AND RECURRING CARD */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Outstanding Payment due */}
                <div className="md:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs text-left relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-[#2563eb] font-black uppercase mb-2 block">PLANO ATIVO RECORRENTE</span>
                    <h3 className="text-2xl font-black text-slate-900 leading-none">R$ 2.500,00 <span className="text-xs text-gray-400 font-medium">/ mês</span></h3>
                    <p className="text-xs text-gray-400 mt-2">Plano de Marketing: <b>Social Media Growth Pro + Tráfego Pago Integrado</b></p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-6 border-t border-gray-50 pt-5">
                    {/* Simulated PIX / bankslip direct action drawer */}
                    <button 
                      onClick={() => {
                        const rec = financials.find(f => f.status === 'pending' || f.status === 'overdue') || financials[0];
                        if (rec) setSelectedInvoice(rec);
                      }}
                      className="px-5 py-3 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                    >
                      Copiar Código PIX / Baixar Boleto
                    </button>
                    
                    <span className="text-xs text-gray-400 font-medium">Vencimento habitual: todo dia 15</span>
                  </div>
                  <div className="absolute right-[-40px] bottom-[-40px] w-32 h-32 rounded-full blur-3xl opacity-20" style={{ backgroundColor: brandPrimaryColor }}></div>
                </div>

                {/* Secure fast PIX barcode copy box */}
                <div className="md:col-span-4 bg-gray-50 p-6 rounded-3xl border border-gray-200 text-left flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono mb-2">⚡ Pague de forma instantânea</h4>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">Use nosso Pix Copia e Cola. A baixa é realizada em até 10 minutos!</p>
                  </div>

                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("00020101021126580014br.gov.bcb.pix0136evoostudiomkt@gmail.com52040000530398654072500.005802BR5915EVOOFlowAgency6009SAOPAULO62070503***6304CAFE");
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2000);
                    }}
                    className={cn(
                      "w-full text-center py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      copiedPix ? "bg-green-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/30"
                    )}
                  >
                    {copiedPix ? "Pix Copiado!" : "Copiar Pix Copia e Cola"}
                  </button>
                </div>

              </div>

              {/* LIST OF HISTORIC TRANSACTIONS & RECEIPTS */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 text-left space-y-4">
                <div className="border-b border-gray-50 pb-2.5 select-none">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">
                    🧾 Histórico Geral de Mensalidades e Recibos
                  </h4>
                </div>

                <div className="space-y-3">
                  {financials.map((record) => (
                    <div 
                      key={record.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/60 hover:border-slate-300 transition-colors gap-3"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-9 h-9 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-slate-700 flex-shrink-0">
                          <DollarSign className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block leading-tight">{record.description || 'Mensalidade de Social Media'}</span>
                          <span className="text-[9px] mt-1 text-gray-400 block font-mono font-bold uppercase">DueDate: {new Date(record.dueDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 text-[10px] font-mono font-black border-t sm:border-t-0 pt-2 border-gray-150/30">
                        <span className="text-slate-800">R$ {record.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        
                        <span className={cn(
                          "px-2 px-2.5 py-0.5 rounded-lg text-[8px] font-sans tracking-wide",
                          record.status === 'paid' ? "bg-green-100 text-green-700 font-bold" :
                          record.status === 'overdue' ? "bg-rose-100 text-rose-700 font-bold" : "bg-amber-100 text-amber-700 font-bold"
                        )}>
                          {record.status === 'paid' ? 'Contabilizado' :
                           record.status === 'overdue' ? 'Vencido' : 'Pendente'}
                        </span>

                        <button 
                          onClick={() => setSelectedInvoice(record)}
                          className="px-2.5 py-1 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-[9px] font-sans text-slate-800"
                        >
                          Visualizar
                        </button>
                      </div>
                    </div>
                  ))}

                  {financials.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                      <p className="text-[10px] text-gray-400 font-mono font-black uppercase tracking-widest">Nenhuma fatura registrada</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* 1. CREATIVE PREVIEW MODAL / HIGH PRECISION REVIEW INTERFACES */}
      <AnimatePresence>
        {selectedReview && (
          <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[85vh] text-left"
            >
              
              {/* Media preview area */}
              <div className="flex-1 bg-zinc-950 flex flex-col justify-between p-6 relative">
                
                {/* Visual indicator header */}
                <div className="flex items-center justify-between text-white border-b border-white/5 pb-4 z-10 select-none">
                  <div className="flex items-center space-x-3.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="bg-white/10 px-2.5 py-1 rounded text-[9px] font-mono text-zinc-200 uppercase tracking-widest font-bold">
                      Aprovador de Criativo
                    </span>
                  </div>
                  <span className="text-xs font-mono text-zinc-450">{reviewTab === 'design' ? 'Foco Visual' : 'Foco em Texto'}</span>
                </div>

                <div className="flex-1 flex items-center justify-center overflow-hidden my-4 select-none">
                  {selectedReview.mediaUrl ? (
                    <img 
                      src={selectedReview.mediaUrl} 
                      className="max-w-full max-h-[55vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
                      alt="" 
                    />
                  ) : (
                    <div className="text-zinc-650 font-mono text-xs text-center flex flex-col items-center">
                      <Instagram className="w-12 h-12 text-zinc-750 mb-2" />
                      Visual de Mídia não carregado
                    </div>
                  )}
                </div>

                {/* Sub-selectors */}
                <div className="bg-zinc-900/50 border border-white/5 p-1 rounded-xl flex space-x-1.5 text-[10px] font-mono font-bold text-white max-w-xs mx-auto z-10 shadow-lg">
                  <button 
                    onClick={() => setReviewTab('design')}
                    className={cn("px-4 py-2 rounded-lg transition", reviewTab === 'design' ? "bg-white text-zinc-900" : "text-zinc-400")}
                  >
                    Visual
                  </button>
                  <button 
                    onClick={() => setReviewTab('copy')}
                    className={cn("px-4 py-2 rounded-lg transition", reviewTab === 'copy' ? "bg-white text-zinc-900" : "text-zinc-400")}
                  >
                    Feed &amp; Legenda
                  </button>
                </div>

              </div>

              {/* Creative adjustments / details panel */}
              <div className="w-full lg:w-[460px] p-8 flex flex-col bg-white overflow-y-auto border-l border-zinc-100 justify-between">
                
                <div>
                  {/* Title panel */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: brandPrimaryColor }}>
                        Agendado para {new Date(selectedReview.publishDate).toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'})}
                      </p>
                      <h3 className="text-xl font-bold text-zinc-900 leading-snug">{selectedReview.title}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedReview(null)}
                      className="p-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-full transition border border-zinc-200/50"
                    >
                      <X className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>

                  {/* Body textual information */}
                  <div className="space-y-6">
                    
                    <div>
                      <span className="text-[10px] font-mono font-black uppercase text-zinc-400 tracking-widest block mb-1.5">
                        Legenda Final (Publicada)
                      </span>
                      <div className="bg-blue-50/10 p-5 rounded-3xl border border-blue-100/30 text-xs text-zinc-800 leading-relaxed font-semibold">
                        {selectedReview.caption || 'Sem legenda associada.'}
                      </div>
                      {selectedReview.hashtags && (
                        <p className="text-[10px] text-blue-600 font-mono font-bold mt-2 break-all">
                          {selectedReview.hashtags}
                        </p>
                      )}
                    </div>

                    {selectedReview.script && (
                      <div>
                        <span className="text-[10px] font-mono font-black uppercase text-zinc-400 tracking-widest block mb-1.5">
                          Instruções / Roteiro da Arte
                        </span>
                        <div className="bg-zinc-50 p-4 text-zinc-600 rounded-2xl text-xs leading-relaxed italic">
                          {selectedReview.script}
                        </div>
                      </div>
                    )}

                    {/* Adjust feedback area if requested */}
                    <div className="pt-4 border-t border-zinc-50">
                      <span className="text-[10px] font-mono font-black uppercase text-zinc-400 tracking-widest block mb-1.5">
                        Solicitar alteração pontual
                      </span>
                      <textarea 
                        rows={3}
                        placeholder="Ex: 'Substituir a foto de capa por uma versão mais escura' ou 'Mudar legenda...'"
                        value={adjustFeedback}
                        onChange={(e) => setAdjustFeedback(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-250/50 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium resize-none shadow-xs"
                      />
                    </div>

                  </div>
                </div>

                {/* Final Client decisions */}
                <div className="mt-8 pt-5 border-t border-zinc-100 grid grid-cols-2 gap-4">
                  <button 
                    disabled={isSubmittingFeedback}
                    onClick={() => handleClientAction(selectedReview, 'revision')}
                    className="py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-xs border border-rose-100"
                  >
                    Pedir Ajuste
                  </button>
                  <button 
                    disabled={isSubmittingFeedback}
                    onClick={() => handleClientAction(selectedReview, 'approved')}
                    className="py-3.5 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-md hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: brandPrimaryColor }}
                  >
                    Aprovar e Agendar
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. DETAILED INVOICE PDF/POPUP SIMULATOR */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl p-8 overflow-hidden shadow-2xl relative text-left"
            >
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="absolute top-5 right-5 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-100 text-gray-400 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-[#2563eb] block font-black">FATURA INDIVIDUAL</span>
                  <h3 className="text-lg font-black text-slate-900">Detalhamento de Cobrança</h3>
                </div>
              </div>

              {/* Invoice receipt specs */}
              <div className="divide-y divide-gray-100 text-xs font-semibold space-y-3.5">
                <div className="flex justify-between pt-3 text-gray-500">
                  <span>Descrição do Serviço</span>
                  <span className="text-slate-800 font-bold">{selectedInvoice.description || 'Mensalidade de Social Media'}</span>
                </div>
                <div className="flex justify-between pt-3 text-gray-500">
                  <span>Data de Vencimento</span>
                  <span className="text-slate-800 font-mono">{new Date(selectedInvoice.dueDate).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between pt-3 text-gray-500">
                  <span>Valor Devido</span>
                  <span className="text-slate-850 font-bold">R$ {selectedInvoice.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between pt-3 text-gray-500">
                  <span>Status do Contratado</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[8.5px] font-bold uppercase",
                    selectedInvoice.status === 'paid' ? "bg-green-150 text-green-700 font-bold" : "bg-amber-100 text-amber-700 font-bold"
                  )}>
                    {selectedInvoice.status === 'paid' ? 'Contabilizado' : 'Aguardando Baixa'}
                  </span>
                </div>
              </div>

              {selectedInvoice.status !== 'paid' && (
                <div className="mt-8 pt-5 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 font-mono mb-4">LEITURA DO PIX DE COBRANÇA DIRETA</p>
                  
                  {/* Mock Pix QR code design */}
                  <div className="w-36 h-36 bg-white border-2 border-slate-900 rounded-xl mx-auto flex items-center justify-center p-2 mb-4">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020101021126580014br.gov.bcb.pix0136evoostudiomkt@gmail.com52040000530398654072500.005802BR5915EVOOFlowAgency6009SAOPAULO62070503***6304CAFE`} 
                      alt="Pix QR Code" 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("00020101021126580014br.gov.bcb.pix0136evoostudiomkt@gmail.com52040000530398654072500.005802BR5915EVOOFlowAgency6009SAOPAULO62070503***6304CAFE");
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2000);
                    }}
                    className={cn(
                      "w-full text-center py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      copiedPix ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100"
                    )}
                  >
                    {copiedPix ? "PIX Copiado com Sucesso!" : "Copiar Chave Copia e Cola"}
                  </button>
                </div>
              )}

              {selectedInvoice.status === 'paid' && (
                <div className="mt-8 pt-5 border-t border-gray-100 text-center space-y-3.5">
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-green-700 text-xs text-center font-bold">
                    Esta fatura foi quitada com sucesso! Recibo fiscal emitido de forma irrevogável.
                  </div>
                  <button 
                    onClick={() => alert("Recibo de marketing baixado com sucesso no dispositivo!")}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Baixar Recibo PDF de Quitação
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
