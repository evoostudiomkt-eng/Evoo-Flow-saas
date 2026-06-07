import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, orderBy, limit, collectionGroup, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ContentItem, ActivityLog, UserProfile, Client, Lead, Task, ServiceTemplate } from '../types';
import { MOCK_CONTENTS, MOCK_ACTIVITY_LOGS, MOCK_CLIENTS, getMockStats, MOCK_SERVICES } from '../lib/mockData';
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  ArrowRight, 
  Target, 
  TrendingUp, 
  Zap,
  Calendar as CalendarIcon,
  AlertCircle,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Users,
  Activity,
  Maximize2,
  X,
  Plus,
  Send,
  MessageCircle,
  Clock3,
  ThumbsUp,
  FileCheck2,
  Check,
  Sliders,
  HelpCircle,
  Crown,
  Trophy,
  Coins,
  Award,
  ArrowUpRight,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { logActivity } from '../lib/activity-logger';

interface AgencyDashboardProps {
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function AgencyDashboard({ profile, isDemoMode }: AgencyDashboardProps) {
  const [approvals, setApprovals] = useState<ContentItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceTemplate[]>([]);
  const [activeTabLogs, setActiveTabLogs] = useState<'all' | 'content' | 'tasks'>('all');
  const [selectedTaskLoad, setSelectedTaskLoad] = useState<'daily' | 'weekly'>('weekly');
  
  // Quick overview content review modal
  const [selectedReviewContent, setSelectedReviewContent] = useState<ContentItem | null>(null);
  
  // Versioning and comments simulation on quick review
  const [activeVersion, setActiveVersion] = useState<'v1' | 'v2'>('v2');
  const [newCommentText, setNewCommentText] = useState('');
  const [mockComments, setMockComments] = useState<Array<{id: string, author: string, role: string, text: string, time: string}>>([
    { id: 'c1', author: 'Letícia Fernandes (Designer)', role: 'Equipe', text: 'Ajustei os contrastes conforme a nova identidade visual enviada ontem.', time: '1 hora atrás' },
    { id: 'c2', author: 'Rodrigo Medeiros (Copy)', role: 'Equipe', text: 'Roteiro e hashtags estruturados com foco em agendamentos no direct.', time: '30 mins atrás' }
  ]);

  const [stats, setStats] = useState({
    pendingApprovals: 0,
    newLeads: 0,
    urgentTasks: 0,
    activeProjects: 0,
    clientRetention: '98.2%',
    monthlyGoalProgress: 88,
    activeTeamCount: 4
  });

  useEffect(() => {
    if (isDemoMode) {
      setApprovals(MOCK_CONTENTS.filter(c => c.status === 'approval'));
      setLogs(MOCK_ACTIVITY_LOGS);
      const mapping: Record<string, string> = {};
      MOCK_CLIENTS.forEach(c => {
        mapping[c.id] = c.company;
      });
      setClients(mapping);
      setClientsList(MOCK_CLIENTS);
      setServices(MOCK_SERVICES);
      const mockStats = getMockStats();
      setStats({
        pendingApprovals: mockStats.pendingApprovals,
        newLeads: mockStats.newLeads,
        urgentTasks: mockStats.urgentTasks,
        activeProjects: mockStats.activeProjects,
        clientRetention: '98.5%',
        monthlyGoalProgress: 91,
        activeTeamCount: 5
      });
      return;
    }

    if (!profile?.agencyId) return;

    // 1. Fetch Pendencies (Content Approvals) from all agency clients
    const qApprovals = query(
      collectionGroup(db, 'contents'), 
      where('status', '==', 'approval'),
      where('agencyId', '==', profile.agencyId)
    );
    const unsubAppr = onSnapshot(qApprovals, (snap) => {
      setApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'collectionGroup:contents');
    });

    // 2. Fetch Activity Logs
    const qLogs = query(
      collection(db, 'activity_logs'), 
      where('agencyId', '==', profile.agencyId),
      limit(100)
    );
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLogs(docs.slice(0, 15));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'activity_logs');
    });

    // 3. Client mapping & Full list retrieval
    const fetchClients = async () => {
       try {
         const snap = await getDocs(query(
           collection(db, 'clients'),
           where('agencyId', '==', profile.agencyId)
         ));
         const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
         setClientsList(list);
         const mapping: Record<string, string> = {};
         list.forEach(c => {
           mapping[c.id] = c.company;
         });
         setClients(mapping);
         setStats(prev => ({ ...prev, activeProjects: list.length }));
       } catch (error) {
         handleFirestoreError(error, OperationType.LIST, 'clients');
       }
    };
    fetchClients();

    // 3b. Fetch Service Plans
    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceTemplate)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'services');
    });

    // 4. Other stats (Lead count)
    const unsubLeads = onSnapshot(query(
      collection(db, 'leads'), 
      where('agencyId', '==', profile.agencyId),
      where('status', '==', 'new')
    ), (snap) => {
       setStats(prev => ({ ...prev, newLeads: snap.size }));
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'leads');
    });

    return () => { unsubAppr(); unsubLogs(); unsubLeads(); unsubServices(); };
  }, [profile.agencyId]);

  // Handle Quick Action approvals in command center modal
  const handleQuickAction = async (item: ContentItem, status: 'approved' | 'revision', feedback?: string) => {
    if (isDemoMode) {
      setApprovals(prev => prev.filter(c => c.id !== item.id));
      setSelectedReviewContent(null);
      return;
    }
    try {
      const updateData: any = { 
        status, 
        updatedAt: new Date().toISOString() 
      };
      if (feedback) {
        updateData.feedback = feedback;
      }
      await updateDoc(doc(db, 'clients', item.clientId, 'contents', item.id), updateData);
      await logActivity(profile, `${status === 'approved' ? 'aprovou em lote' : 'solicitou ajuste em'} conteúdo: ${item.title}`, item.id, 'content', item.clientId);
      setSelectedReviewContent(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setMockComments(prev => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        author: profile.displayName,
        role: 'Líder / Admin',
        text: newCommentText.trim(),
        time: 'Agora mesmo'
      }
    ]);
    setNewCommentText('');
  };

  // Luxury high-performance synthetic stats for operational graphs
  const performanceHistory = [
    { label: 'Semana 17', aprovados: 18, pendentes: 4, refacao: 2, receita: 14500 },
    { label: 'Semana 18', aprovados: 22, pendentes: 2, refacao: 1, receita: 16800 },
    { label: 'Semana 19', aprovados: 29, pendentes: 3, refacao: 4, receita: 21000 },
    { label: 'Semana 20', aprovados: 35, pendentes: 5, refacao: 1, receita: 24500 },
    { label: 'Semana 21', aprovados: 40, pendentes: approvals.length, refacao: 2, receita: 28200 },
  ];

  const recentDeliveries = [
    { title: 'Anúncio Nutrologia Integral', client: 'Bella Pelle Clínicas', type: 'Social Video', time: 'Há 10m', status: 'delivered' },
    { title: 'Carrossel Lançamento Burger', client: 'Burger Lab Co.', type: 'Carrossel', time: 'Há 1h', status: 'delivered' },
    { title: 'Briefing LP Private Brokers', client: 'Mendes Private Brokers', type: 'Documento', time: 'Há 4h', status: 'review' }
  ];

  const teamMembersActivity = [
    { name: 'Letícia Fernandes', role: 'UI/UX Design', avatar: 'LF', status: 'online', activeLoad: '92%', taskCount: 8, glowColor: 'shadow-emerald-500/10' },
    { name: 'Rodrigo Medeiros', role: 'Copywriter Enterprise', avatar: 'RM', status: 'offline', activeLoad: '60%', taskCount: 4, glowColor: 'shadow-zinc-500/10' },
    { name: 'Juliana Vasconcelos', role: 'Growth & Ads', avatar: 'JV', status: 'online', activeLoad: '85%', taskCount: 7, glowColor: 'shadow-blue-500/10' }
  ];

  const filteredLogs = logs.filter(l => {
    if (activeTabLogs === 'all') return true;
    if (activeTabLogs === 'content') return l.action.toLowerCase().includes('conteúdo') || l.action.toLowerCase().includes('post') || l.action.toLowerCase().includes('aprovou') || l.action.toLowerCase().includes('reprovou');
    if (activeTabLogs === 'tasks') return l.action.toLowerCase().includes('tarefa') || l.action.toLowerCase().includes('concluiu');
    return true;
  });

  // Process client ranking sorted by billing price (faturamento)
  const billingRanking = clientsList.map(client => {
    const service = services.find(s => s.id === client.serviceId);
    const basePrice = service ? service.basePrice : 0;
    return {
      ...client,
      basePrice,
      planName: service ? service.name : 'Sem plano vinculado'
    };
  }).sort((a, b) => b.basePrice - a.basePrice);

  const totalMRR = billingRanking.reduce((sum, item) => sum + item.basePrice, 0);
  const averageTicket = billingRanking.length ? Math.round(totalMRR / billingRanking.length) : 0;
  const topClient = billingRanking.length > 0 && billingRanking[0].basePrice > 0 ? billingRanking[0] : null;

  return (
    <div className="space-y-8 select-none md:select-text" id="agency-command-center">
      {/* HEADER DE COMANDO: Swiss Minimalist & High Contrast */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100/80 pb-6" id="dashboard-header">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 font-bold uppercase">
              SISTEMA DA AGÊNCIA OPERACIONAL • SINC COM FIRESTORE • {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
            </p>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 font-sans">
            Comando de Operações, <span className="text-blue-600 font-extrabold">{profile.displayName.split(' ')[0]}</span>
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Alta octanagem de entregas, aprovações de criativos e pipeline em tempo real.</p>
        </div>

        {/* Dynamic Global Health Display widget */}
        <div className="bg-white px-5 py-3.5 rounded-2xl border border-zinc-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center space-x-6">
          <div className="text-left border-r border-zinc-100 pr-5">
            <p className="text-[9px] text-zinc-400 font-mono font-bold tracking-wider uppercase mb-0.5">SLA de Aprovação</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-black text-zinc-900">1.8h</span>
              <span className="text-[10px] text-emerald-500 font-bold">Excelente</span>
            </div>
          </div>
          <div className="text-left pr-1">
            <p className="text-[9px] text-zinc-400 font-mono font-bold tracking-wider uppercase mb-0.5">Retenção de Clientes</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-black text-rose-500">{stats.clientRetention}</span>
              <span className="text-[10px] text-zinc-400 font-medium">Trimestral</span>
            </div>
          </div>
        </div>
      </div>

      {/* METRICS BENTO GRID SECTOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="metrics-bento">
        
        {/* Metric 1: Pending approvals (Amber Alert Glow) */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="bg-white p-6 rounded-[24px] border border-zinc-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
            <FileCheck2 className="w-20 h-20 text-yellow-600" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600 border border-yellow-100/50">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono bg-yellow-50 text-yellow-700 font-black px-2 py-0.5 rounded-full border border-yellow-100/30">
              Ação Requerida
            </span>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Revisão do Diretor</p>
          <h4 className="text-4xl font-extrabold text-zinc-900 mt-1.5 font-sans leading-none">
            {approvals.length} <span className="text-lg text-zinc-400 font-light font-sans">posts</span>
          </h4>
          <p className="text-xs text-zinc-500 mt-3 font-medium flex items-center">
            <Zap className="w-3.5 h-3.5 mr-1 text-yellow-500 fill-yellow-500" /> 
            Sugerindo aprovação em lote rápida
          </p>
        </motion.div>

        {/* Metric 2: New Leads / Opportunities (Indigo Premium) */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="bg-white p-6 rounded-[24px] border border-zinc-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
            <Target className="w-20 h-20 text-blue-600" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 font-black px-2 py-0.5 rounded-full border border-blue-100/30">
              Negociações
            </span>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Novas Oportunidades</p>
          <h4 className="text-4xl font-extrabold text-zinc-900 mt-1.5 font-sans leading-none">
            {stats.newLeads} <span className="text-lg text-zinc-400 font-light">leads novos</span>
          </h4>
          <p className="text-xs text-zinc-500 mt-3 font-medium flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1 text-blue-500" /> 
            Pipeline de vendas ativo e saudável
          </p>
        </motion.div>

        {/* Metric 3: Active Projects / Clients (Emerald Success) */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="bg-white p-6 rounded-[24px] border border-zinc-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-300">
            <Briefcase className="w-20 h-20 text-emerald-600" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/30">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-full border border-emerald-100/30">
              SaaS Ativo
            </span>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Projetos em Execução</p>
          <h4 className="text-4xl font-extrabold text-zinc-900 mt-1.5 font-sans leading-none">
            {stats.activeProjects} <span className="text-lg text-zinc-400 font-light">empresas</span>
          </h4>
          <p className="text-xs text-zinc-500 mt-3 font-medium flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> 
            Todos os contratos em dia
          </p>
        </motion.div>

        {/* Metric 4: Goal Achievement Progres (Purple Tech Accent) */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="bg-zinc-900 p-6 rounded-[24px] border border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.2)] relative overflow-hidden group text-white"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-300">
            <Sliders className="w-20 h-20 text-indigo-400" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-300 border border-indigo-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-200 font-black px-2 py-1 rounded-full border border-indigo-500/30 tracking-tight">
              META MENSAL
            </span>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Produtividade Agência</p>
          <h4 className="text-4xl font-extrabold text-white mt-1.5 font-sans leading-none">
            {stats.monthlyGoalProgress}% 
            <span className="text-xs text-zinc-400 font-normal ml-2 font-mono">v1.0.8</span>
          </h4>
          
          <div className="mt-4 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full" style={{width: `${stats.monthlyGoalProgress}%`}}></div>
          </div>
        </motion.div>

      </div>

      {/* DETAILED AREA GRAPH SECTION: Clean Trends & Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="graphs-panel">
        
        {/* Core Operational Analytics (occupies 2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[28px] border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[9px] font-mono text-blue-600 font-black tracking-widest uppercase">Inteligência de Dados</p>
              <h3 className="text-lg font-bold text-zinc-900">Histórico de Performance & Escalabilidade</h3>
            </div>
            <div className="flex space-x-2 text-xs font-semibold bg-zinc-50 p-1.5 rounded-xl border border-zinc-100">
              <button 
                onClick={() => setSelectedTaskLoad('daily')}
                className={cn("px-3 py-1.5 rounded-lg transition-all", selectedTaskLoad === 'daily' ? "bg-white text-zinc-900 shadow-sm font-bold" : "text-zinc-400 hover:text-zinc-600")}
              >
                Volumetria
              </button>
              <button 
                onClick={() => setSelectedTaskLoad('weekly')}
                className={cn("px-3 py-1.5 rounded-lg transition-all", selectedTaskLoad === 'weekly' ? "bg-white text-zinc-900 shadow-sm font-bold" : "text-zinc-400 hover:text-zinc-600")}
              >
                Estabilidade Fin.
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {selectedTaskLoad === 'weekly' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      backgroundColor: 'rgba(255,255,255,0.92)', 
                      border: '1px solid rgba(228,228,231,0.6)', 
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.06)' 
                    }} 
                  />
                  <Area type="monotone" name="Receita Acumulada (R$)" dataKey="receita" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReceita)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      backgroundColor: 'rgba(255,255,255,0.92)', 
                      border: '1px solid rgba(228,228,231,0.6)', 
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.06)' 
                    }} 
                  />
                  <Bar dataKey="aprovados" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Criativos Aprovados" />
                  <Bar dataKey="pendentes" stackId="a" fill="#eab308" name="Aguardando Aprovação" />
                  <Bar dataKey="refacao" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Recusados em Refação" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span className="flex items-center"><Activity className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Sincronização em tempo real ativa</span>
            <span className="font-mono">Total Registros: {performanceHistory.length}S</span>
          </div>
        </div>

        {/* Deliveries Real-time Feed */}
        <div className="bg-white p-6 rounded-[28px] border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono text-zinc-400 font-extrabold tracking-widest uppercase">Status Recente</span>
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm animate-pulse"></span>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-5">Operações de Onboarding</h3>
            
            <div className="space-y-4">
              {recentDeliveries.map((delivery, index) => (
                <div key={index} className="flex p-3 rounded-2xl bg-zinc-50/50 hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100/50">
                  <div className="w-8 h-8 rounded-xl bg-white border border-zinc-100 flex items-center justify-center font-mono font-bold text-[10px] text-zinc-600 shrink-0 shadow-sm">
                    {delivery.client.charAt(0)}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter truncate">{delivery.client}</p>
                      <span className="text-[9px] text-zinc-400 font-medium">{delivery.time}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-zinc-900 truncate leading-snug mt-0.5">{delivery.title}</h4>
                    <span className="inline-flex items-center text-[8px] font-bold uppercase text-zinc-400 mt-1">
                      {delivery.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl relative overflow-hidden flex items-center justify-between border border-blue-100/30">
              <div>
                <p className="text-xs font-bold text-blue-900">Novo cliente se cadastrando?</p>
                <p className="text-[10px] text-blue-700/80 font-medium">Link do Formulário de Onboarding público</p>
              </div>
              <a 
                href="/?form=leads" 
                target="_blank" 
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg shadow-blue-200/50 text-blue-600 hover:scale-110 transition-transform"
              >
                <Maximize2 className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* SECTOR 2.5: RANKING DE FATURAMENTO DA AGÊNCIA */}
      <div className="bg-white p-8 rounded-[28px] border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-6" id="agency-revenue-ranking">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
          <div>
            <div className="flex items-center gap-1.5 mb-1 bg-zinc-50 border border-zinc-200/50 rounded-full w-fit px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              <p className="text-[9px] font-mono tracking-widest text-zinc-650 font-black uppercase">Desempenho Financeiro</p>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 font-sans tracking-tight">Ranking de Faturamento de Clientes</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-snug">Comparativo de performance, ticket e participação de cada cliente ativo no faturamento mensal consolidado (MRR).</p>
          </div>
          
          <div className="flex items-center space-x-3 text-xs bg-zinc-50 px-4 py-2.5 rounded-xl border border-zinc-150/60 font-semibold text-zinc-650">
            <Coins className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>MRR Consolidado da Carteira:</span>
            <span className="font-extrabold text-zinc-900 text-sm font-mono">
              R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Leaderboard Table (occupies 2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] font-bold text-zinc-400 font-mono uppercase tracking-wider">
                    <th className="pb-3 pl-2 w-16 text-center">Posição</th>
                    <th className="pb-3">Cliente / Empresa</th>
                    <th className="pb-3 text-center">Contrato / Plano</th>
                    <th className="pb-3 text-right">Mensalidade</th>
                    <th className="pb-3 pr-2 text-right w-24">Participação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50/70">
                  {billingRanking.map((item, index) => {
                    const sharePercentage = totalMRR > 0 ? ((item.basePrice / totalMRR) * 100).toFixed(1) : '0';
                    
                    return (
                      <tr 
                        key={item.id} 
                        className="group hover:bg-zinc-50/50 transition-colors"
                      >
                        {/* POSITION COL */}
                        <td className="py-4 pl-2 text-center">
                          <div className="flex justify-center items-center">
                            {index === 0 ? (
                              <div className="w-7 h-7 bg-amber-50 text-amber-950 rounded-full flex items-center justify-center font-bold text-xs border border-amber-200 shadow-sm relative group-hover:scale-105 transition-transform" title="Líder (Ouro)">
                                <Crown className="w-3.5 h-3.5 text-amber-500 absolute -top-2 -rotate-12" />
                                <span className="mt-0.5">1º</span>
                              </div>
                            ) : index === 1 ? (
                              <div className="w-7 h-7 bg-zinc-100 text-zinc-805 rounded-full flex items-center justify-center font-bold text-xs border border-zinc-200 shadow-sm" title="Prata">
                                <Trophy className="w-3.5 h-3.5 text-zinc-400 mr-0.5 shrink-0" />
                                <span>2º</span>
                              </div>
                            ) : index === 2 ? (
                              <div className="w-7 h-7 bg-orange-50 text-orange-900 rounded-full flex items-center justify-center font-bold text-xs border border-orange-200" title="Bronze">
                                <Award className="w-3.5 h-3.5 text-orange-500 mr-0.5 shrink-0" />
                                <span>3º</span>
                              </div>
                            ) : (
                              <span className="text-xs font-mono font-black text-zinc-400">
                                {index + 1}º
                              </span>
                            )}
                          </div>
                        </td>

                        {/* CLIENT BRAND COL */}
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative font-sans">
                              {item.logoUrl ? (
                                <img src={item.logoUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="font-bold text-[11px] text-zinc-500 uppercase">{item.company.charAt(0)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-zinc-900 text-sm group-hover:text-blue-605 transition-colors truncate">
                                  {item.company}
                                </h4>
                                {item.status === 'paused' ? (
                                  <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-200/55 font-black px-1.5 py-0.25 rounded uppercase tracking-tight font-mono">Pausado</span>
                                ) : item.status === 'cancelled' ? (
                                  <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-200/55 font-black px-1.5 py-0.25 rounded uppercase tracking-tight font-mono">Inativo</span>
                                ) : (
                                  <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-205/35 font-black px-1.5 py-0.25 rounded uppercase tracking-tight font-mono">Ativo</span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400 font-medium truncate leading-tight mt-0.5">{item.name}</p>
                            </div>
                          </div>
                        </td>

                        {/* PLAN NAME COL */}
                        <td className="py-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-50 text-zinc-650 border border-zinc-105">
                            {item.planName}
                          </span>
                        </td>

                        {/* MONTHLY MENSALIDADE COL */}
                        <td className="py-4 text-right">
                          <p className="text-xs font-mono font-black text-zinc-955 group-hover:text-blue-600 transition-colors">
                            R$ {item.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest font-mono">mensal</p>
                        </td>

                        {/* MRR PERCENTAGE STACK COL */}
                        <td className="py-4 pr-2 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-zinc-900 font-mono">
                              {sharePercentage}%
                            </span>
                            <div className="w-16 bg-zinc-100 h-1 rounded-full overflow-hidden mt-1 border border-zinc-200/30">
                              <div 
                                className="h-full bg-blue-600 rounded-full" 
                                style={{ width: `${sharePercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                      </tr>
                    );
                  })}

                  {billingRanking.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-400 text-xs font-mono uppercase tracking-widest pl-2">
                        <AlertCircle className="w-8 h-8 text-zinc-250 mx-auto mb-2" />
                        Nenhum faturamento registrado em contratos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side stats summary cards (1 column) */}
          <div className="space-y-4">
            
            {/* MRR estimate tracker */}
            <div className="bg-zinc-50/50 p-5 rounded-2xl border border-zinc-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Estabilidade</span>
                  <Coins className="w-4 h-4 text-zinc-400" />
                </div>
                <h4 className="text-xs font-bold text-zinc-700">Previsão Recorrente Mensal</h4>
                <p className="text-2xl font-black text-zinc-950 mt-1 font-mono leading-none">
                  R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                <span>Contratos em dia: {billingRanking.filter(b => b.status === 'active').length}</span>
                <span className="text-emerald-500 font-bold flex items-center"><ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Saudável</span>
              </div>
            </div>

            {/* Average ticket tracker */}
            <div className="bg-zinc-50/50 p-5 rounded-2xl border border-zinc-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Valor Médio</span>
                  <Percent className="w-4 h-4 text-zinc-400" />
                </div>
                <h4 className="text-xs font-bold text-zinc-700">Ticket Médio de Contratos</h4>
                <p className="text-2xl font-black text-zinc-950 mt-1 font-mono leading-none">
                  R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-200 text-[11px] text-zinc-400 font-medium leading-normal">
                <span>Indicadores ótimos para cross-selling de serviços na agência.</span>
              </div>
            </div>

            {/* Leader Highlight */}
            {topClient && (
              <div className="bg-zinc-900 text-white p-5 rounded-3xl relative overflow-hidden group shadow-lg shadow-zinc-905/20 border border-zinc-800">
                <div className="absolute -right-3 -bottom-3 opacity-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Crown className="w-24 h-24 text-amber-400" />
                </div>
                
                <div className="flex items-center space-x-1.5">
                  <span className="bg-amber-400/20 px-2 py-0.5 rounded text-[8px] font-black font-mono tracking-widest uppercase text-amber-300 border border-amber-400/20">
                    LÍDER DE FATURAMENTO
                  </span>
                </div>
                
                <h4 className="text-base font-black truncate mt-3">{topClient.company}</h4>
                <p className="text-[11px] text-zinc-400">Principal contratante do portfólio</p>
                
                <div className="mt-5 pt-3 border-t border-zinc-805 flex items-center justify-between text-xs font-mono font-bold">
                  <span>Plano {topClient.planName}</span>
                  <span className="text-amber-400 font-mono">R$ {topClient.basePrice.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* THIRD ROW BENTO: Active Team workload and Live Approval Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="agency-collab">
        
        {/* Core Quick Approval Queue (occupies 2 columns for netflix premium feel) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-zinc-500" />
              Fila de Liberação Rápida
              <span className="bg-yellow-100 text-yellow-800 text-[9px] font-mono font-bold px-2.0 py-0.5 rounded-full border border-yellow-200/55">
                {approvals.length} pendentes
              </span>
            </h3>
            <p className="text-xs text-zinc-400 font-medium">Clique para revisar e enviar</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {approvals.map((item, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={item.id}
                onClick={() => setSelectedReviewContent(item)}
                className="bg-white p-4 rounded-[20px] border border-zinc-100 shadow-[0_4px_25px_rgb(0,0,0,0.01)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.06)] hover:border-blue-200 group transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div className="aspect-video relative rounded-xl overflow-hidden bg-zinc-50 border border-zinc-100/50 mb-3.5">
                  {item.mediaUrl ? (
                    <img src={item.mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                      <Layers className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[8px] font-bold text-blue-600 uppercase tracking-widest shadow-sm">
                      {item.platform}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter mb-0.5 truncate max-w-[120px]">
                      {clients[item.clientId] || 'Carregando...'}
                    </p>
                    <span className="text-[8px] font-mono text-zinc-400 font-bold">
                      {format(new Date(item.publishDate), 'dd/MM/yy')}
                    </span>
                  </div>
                  <h4 className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-1">{item.title}</h4>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-50 flex items-center justify-between">
                  <span className="text-[9px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-lg border border-zinc-100 font-bold uppercase">{item.type}</span>
                  <button className="flex items-center space-x-1 text-xs font-bold text-blue-600 group-hover:translate-x-1.5 transition-transform">
                    <span>Revisar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}

            {approvals.length === 0 && (
              <div className="col-span-full py-16 text-center bg-zinc-50/50 rounded-3xl border border-dashed border-zinc-200 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-100 mb-3" />
                <p className="text-zinc-400 font-mono font-bold uppercase text-[9px] tracking-widest">Fila Completada</p>
                <p className="text-[11px] text-zinc-400 mt-1">Nenhum criativo aguarda a liberação das agências.</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Activity and Active load widget */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-zinc-500" />
              Alocação da Equipe
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono font-bold">Online</span>
          </div>

          <div className="bg-white p-5 rounded-[24px] border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
            {teamMembersActivity.map((member, i) => (
              <div key={i} className="flex items-center justify-between pb-4 border-b border-zinc-50 last:pb-0 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full bg-zinc-100 border-2 border-white shadow-md flex items-center justify-center font-bold text-xs text-zinc-700 shrink-0",
                    member.glowColor
                  )}>
                    {member.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 flex items-center">
                      {member.name}
                      {member.status === 'online' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5 animate-pulse"></span>
                      )}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-medium">{member.role}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-800 font-mono">{member.activeLoad}</span>
                  <p className="text-[8px] text-zinc-400 font-mono uppercase tracking-tighter">Carga de Tarefas</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CORE FOURTH ROW: Activity Log Feed with filterable navigation tabs */}
      <div className="space-y-4" id="recent-logs-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-50 pb-3">
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-400" />
            Rastro de Auditoria Operacional (Logs)
          </h3>
          <div className="flex space-x-1 bg-zinc-100/80 p-1 rounded-xl border border-zinc-100 text-[10px]">
            <button 
              onClick={() => setActiveTabLogs('all')}
              className={cn("px-2.5 py-1 rounded-lg font-bold transition-all", activeTabLogs === 'all' ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-650")}
            >
              Todos
            </button>
            <button 
              onClick={() => setActiveTabLogs('content')}
              className={cn("px-2.5 py-1 rounded-lg font-bold transition-all", activeTabLogs === 'content' ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-650")}
            >
              Aprovações
            </button>
            <button 
              onClick={() => setActiveTabLogs('tasks')}
              className={cn("px-2.5 py-1 rounded-lg font-bold transition-all", activeTabLogs === 'tasks' ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-650")}
            >
              Tarefas
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-zinc-100 p-6 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.005)] relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLogs.slice(0, 6).map((log, i) => (
              <div key={log.id || i} className="flex space-x-4 p-3 bg-zinc-50/50 rounded-2xl hover:bg-zinc-50 transition-colors border border-zinc-100/30">
                <div className="w-8 h-8 rounded-full bg-blue-100/50 border border-blue-200/50 shadow-sm flex items-center justify-center font-bold text-xs text-blue-700 shrink-0 select-none">
                  {log.userName.substring(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-950 font-semibold leading-tight break-words">
                    <span className="text-blue-600 font-extrabold">{log.userName}</span> {log.action}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1 font-bold">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
                <p className="text-xs uppercase tracking-widest font-mono">Nenhum evento neste filtro</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK PREVIEW / QUALITY CONTROL DIALOG SIDE-DRAWER */}
      <AnimatePresence>
        {selectedReviewContent && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-white w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[85vh]"
            >
              {/* Left Side: Creative Media Canvas Preview */}
              <div className="flex-1 bg-zinc-950 flex flex-col justify-between p-6 relative">
                
                {/* Media frame header info */}
                <div className="flex items-center justify-between text-white border-b border-white/10 pb-4 z-10">
                  <div className="flex items-center space-x-3">
                    <span className="bg-white/10 px-2.5 py-1.0 rounded-lg text-[8px] font-mono font-bold uppercase tracking-wider text-white">
                      VERSÃO PREVIEW v2 (ATUAL)
                    </span>
                    <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-ping"></span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-zinc-400 font-mono uppercase font-bold">
                    <span>9:16 ratio</span>
                    <span>•</span>
                    <span>1080x1920 HD</span>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 overflow-hidden my-4">
                  {selectedReviewContent.mediaUrl ? (
                    <img 
                      src={selectedReviewContent.mediaUrl} 
                      className="max-w-full max-h-[55vh] object-contain rounded-2xl shadow-2xl skew-y-1 hover:skew-y-0 transition-transform duration-500 border border-white/5" 
                      alt="" 
                    />
                  ) : (
                    <div className="text-zinc-600 font-mono text-xs">SEM MÍDIA DISPONÍVEL</div>
                  )}
                </div>

                {/* Media frame controls footer */}
                <div className="z-10 bg-zinc-900/40 p-4 border border-white/5 rounded-2xl flex items-center justify-between text-zinc-400 text-[10px] font-mono">
                  <span>Qualidade de Envio: 100% Ótimo</span>
                  <span>Extensão: .JPEG</span>
                </div>
              </div>

              {/* Right Side: Creative Review Dashboard (Comments history, changes, approval state) */}
              <div className="w-full lg:w-[460px] p-8 flex flex-col bg-white overflow-y-auto border-l border-zinc-100">
                
                {/* Review Header info */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block mb-0.5">
                      {clients[selectedReviewContent.clientId]}
                    </span>
                    <h3 className="text-xl font-bold text-zinc-900 leading-tight">
                      {selectedReviewContent.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedReviewContent(null)}
                    className="p-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-full transition-colors border border-zinc-200/50"
                  >
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>

                {/* Swapper system for V1 vs V2 Comparison */}
                <div className="bg-zinc-100 p-1.5 rounded-xl flex mb-6 border border-zinc-200/30 text-xs text-zinc-600 font-bold">
                  <button 
                    type="button"
                    onClick={() => setActiveVersion('v1')}
                    className={cn("flex-1 py-1.5 rounded-lg text-center font-mono uppercase tracking-tight transition-all", activeVersion === 'v1' ? "bg-white text-zinc-900 shadow-xs font-black" : "text-zinc-400")}
                  >
                    Versão Anterior (v1)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveVersion('v2')}
                    className={cn("flex-1 py-1.5 rounded-lg text-center font-mono uppercase tracking-tight transition-all", activeVersion === 'v2' ? "bg-white text-zinc-900 shadow-xs font-black" : "text-zinc-500")}
                  >
                    Versão Atual (v2)
                  </button>
                </div>

                {/* Substantive comments or scripts review */}
                <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                  
                  {activeVersion === 'v2' ? (
                    <>
                      {/* Operational Guidelines script details */}
                      <div>
                        <h4 className="text-[9px] font-mono text-zinc-400 font-black tracking-widest uppercase mb-2 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                          Roteiro Criativo e Conceito
                        </h4>
                        <div className="bg-zinc-50 p-4 rounded-2xl text-xs font-medium text-zinc-700 whitespace-pre-wrap leading-relaxed border border-zinc-100">
                          {selectedReviewContent.script || 'Nem roteiro ou conceito textual foram atrelados.'}
                        </div>
                      </div>

                      {/* Legends/Copy details */}
                      <div>
                        <h4 className="text-[9px] font-mono text-zinc-400 font-black tracking-widest uppercase mb-2 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                          Legenda Estruturada (Copy)
                        </h4>
                        <div className="bg-blue-50/20 p-4 rounded-2xl text-xs font-semibold text-blue-900 whitespace-pre-wrap leading-relaxed border border-blue-100/30">
                          {selectedReviewContent.caption || 'Sem legenda associada.'}
                        </div>
                        {selectedReviewContent.hashtags && (
                          <p className="text-[10px] text-blue-600 font-mono font-bold mt-2 break-all">
                            {selectedReviewContent.hashtags}
                          </p>
                        )}
                      </div>

                      {/* Comments stream */}
                      <div className="border-t border-zinc-100 pt-5 mt-5">
                        <h4 className="text-[9px] font-mono text-zinc-400 font-black tracking-widest uppercase mb-3 flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-zinc-400" />
                          Instruções da Equipe ({mockComments.length})
                        </h4>
                        
                        <div className="space-y-3.5 max-h-[180px] overflow-y-auto pr-1">
                          {mockComments.map(comment => (
                            <div key={comment.id} className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100/50">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-extrabold text-zinc-800">{comment.author}</span>
                                <span className="text-[8px] text-zinc-400 font-mono">{comment.time}</span>
                              </div>
                              <p className="text-xs text-zinc-650 leading-relaxed">{comment.text}</p>
                            </div>
                          ))}
                        </div>

                        {/* Leave a quick comment */}
                        <form onSubmit={handleAddComment} className="mt-3.5 flex gap-2">
                          <input 
                            type="text"
                            placeholder="Adicionar instrução pontual..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                          />
                          <button 
                            type="submit"
                            className="bg-blue-600 text-white rounded-xl px-3 flex items-center justify-center hover:bg-blue-700 transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <div className="bg-zinc-50 p-6 rounded-2xl text-center border border-zinc-100 text-zinc-450 text-xs">
                      <Clock3 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="font-bold uppercase tracking-tight">Registro de Histórico v1</p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Aprovados inicialmente pela equipe, mas alterados ontem. Todos os criativos mantêm integridade operacional.
                      </p>
                    </div>
                  )}

                </div>

                {/* Quality action buttons panel */}
                <div className="mt-8 pt-5 border-t border-zinc-100 grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      const feedback = prompt('Descreva detalhadamente o ajuste solicitado à equipe:');
                      if (feedback) handleQuickAction(selectedReviewContent, 'revision', feedback);
                    }}
                    className="py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-[11px] uppercase tracking-wide border border-rose-100/30 hover:bg-rose-100 transition"
                  >
                    Solicitar Ajustes
                  </button>
                  <button 
                    onClick={() => handleQuickAction(selectedReviewContent, 'approved')}
                    className="py-3 bg-zinc-900 text-white rounded-2xl font-bold text-[11px] uppercase tracking-wide hover:bg-zinc-800 shadow-md transition"
                  >
                    Aprovar Arte
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
