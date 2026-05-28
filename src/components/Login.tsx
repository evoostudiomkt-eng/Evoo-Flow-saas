import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Chrome, Mail, Lock, User, ArrowRight, Check, CheckCircle2, 
  Zap, FolderKanban, ShieldCheck, Layers, DollarSign, HelpCircle, 
  CreditCard, Users, ChevronDown, CheckCircle, Menu, X, ArrowUpRight,
  FileCheck, LayoutDashboard, Database, Sparkles, Building, FileText
} from 'lucide-react';
import Logo from './ui/Logo';

const PLANS_DATA = [
  {
    id: 'test',
    name: 'Plano Teste',
    price: '5',
    clients: 'Até 2 clientes',
    storage: '2 GB de armazenamento',
    features: [
      'Ideal para teste Sandbox ativo',
      'Painel Kanban & CRM integrado',
      'Configurações de API do Asaas integradas',
      'Faturamento Real do Plano faturado',
      'Integração Google Drive Individual',
      'Suporte via e-mail corporativo'
    ],
    popular: false,
    badge: 'Ambiente de Testes 🧪'
  },
  {
    id: 'start',
    name: 'Start',
    price: '47',
    clients: 'Até 5 clientes',
    storage: '10 GB de armazenamento',
    features: [
      'Painel Kanban & CRM integrado',
      'Central de Aprovação de Criativos',
      'Gestão de Leads & Formulários Públicos',
      'Controle de Receitas e Despesas',
      'Integração Google Drive Individual',
      'Suporte via ticket e e-mail'
    ],
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '97',
    clients: 'Até 10 clientes',
    storage: '20 GB de armazenamento',
    features: [
      'Painel Kanban & CRM integrado',
      'Central de Aprovação de Criativos',
      'Gestão de Leads & CRM avançado',
      'Fluxo de Caixa & Recorrências',
      'Integração Google Drive Individual',
      'Cobrança Integrada direta via Asaas',
      'Suporte prioritário via WhatsApp'
    ],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '147',
    clients: 'Até 20 clientes',
    storage: '30 GB de armazenamento',
    features: [
      'Tudo dos planos anteriores',
      'Peças ilimitadas de conteúdo',
      '30 GB de espaço privativo em nuvem',
      'Multi-carteiras e link de cobrança',
      'Integração Google Drive Individual',
      'Cobrança Integrada direta via Asaas',
      'Gerente de Contas dedicado 24/7'
    ],
    popular: false,
  }
];

const FAQ_DATA = [
  {
    question: "Como funciona a integração com o Google Drive?",
    answer: "No Evoo Flow, a privacidade é prioridade. Cada agência nova que se cadastra no sistema pode conectar sua própria conta do Google Drive nas configurações de forma nativa e rápida. Isso garante que a pasta de arquivos dos seus clientes fique completamente sob seu controle e isolada de qualquer outro inquilino do sistema.",
    id: "faq-1"
  },
  {
    question: "O sistema cobra alguma taxa sobre os pagamentos que recebo do Asaas?",
    answer: "Nenhuma taxa sequer! Toda a cobrança emitida para os seus clientes pelo Pix, Boleto ou Cartão de Crédito é feita por meio da sua chave de API própria do Asaas. Você recebe o dinheiro diretamente em sua carteira do Asaas de forma limpa, pagando apenas as taxas padrão da sua conta no próprio Asaas.",
    id: "faq-2"
  },
  {
    question: "Posso gerenciar tarefas com a minha equipe?",
    answer: "Sim! O Evoo Flow conta com um painel Kanban avançado no qual você pode associar profissionais a cada card de conteúdo, definir entregas com marcadores, receber feedback do cliente em tempo real e organizar arquivos finais em um fluxo contínuo.",
    id: "faq-3"
  },
  {
    question: "Como os meus clientes aprovam as publicações de conteúdo?",
    answer: "Seus clientes finais têm acesso a um link ou portal seguro para visualizar as peças desenvolvidas pela sua agência. Eles podem aprovar em 1 clique ou solicitar alterações de textos e mídias sem precisar trocar longas e confusas sequências de e-mails.",
    id: "faq-4"
  }
];

interface LoginProps {
  onEnterDemoMode?: () => void;
  renderInteractiveApp?: (activeScreenshotTab: string) => React.ReactNode;
}

export default function Login({ onEnterDemoMode, renderInteractiveApp }: LoginProps = {}) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerCpfCnpj, setOwnerCpfCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlanForSignUp, setSelectedPlanForSignUp] = useState('start');
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [activeScreenshotTab, setActiveScreenshotTab] = useState('kanban');

  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const handleAgencyNameChange = (val: string) => {
    setAgencyName(val);
    setName(val); // Backwards compatibility if there's any name reference
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error(error);
      setErrorStatus('Erro ao fazer login com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorStatus(null);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: agencyName || name });
        
        // Save initial custom plan pre-selection setup direct to document structure
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const agencyId = `agency_${userCredential.user.uid}`;
          
          let clientLimit = 5;
          let storageLimitGb = 10;
          if (selectedPlanForSignUp === 'test') {
            clientLimit = 2;
            storageLimitGb = 2;
          } else if (selectedPlanForSignUp === 'growth') {
            clientLimit = 10;
            storageLimitGb = 20;
          } else if (selectedPlanForSignUp === 'pro') {
            clientLimit = 20;
            storageLimitGb = 30;
          }

          // Register Agency
          await setDoc(doc(db, 'agencies', agencyId), {
            id: agencyId,
            name: agencyName || name || 'Minha Agência',
            ownerId: userCredential.user.uid,
            ownerName: ownerName,
            ownerCpfCnpj: ownerCpfCnpj,
            ownerEmail: email,
            planId: selectedPlanForSignUp,
            clientLimit,
            storageLimitGb,
            status: 'pending_payment', // starts pending payment, unlocked after first checkout
            createdAt: new Date().toISOString()
          });

          // Register User Profile (so App.tsx loads it perfectly and instantly containing the correct agencyId and displayName)
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: email,
            displayName: agencyName || name || 'Minha Agência', // Identification of agency is the Agency Name itself, never owner name/corporate name!
            ownerName: ownerName,
            ownerCpfCnpj: ownerCpfCnpj,
            role: 'admin',
            agencyId: agencyId,
            permissions: ['dashboard', 'clients', 'tasks', 'content', 'approval', 'leads', 'financial', 'team', 'settings'],
            createdAt: new Date().toISOString(),
          });
        } catch (agencySetupErr) {
          console.warn("Silent fallback on custom selected plan setup:", agencySetupErr);
        }

      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Ocorreu um erro. Tente novamente.';
      
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';

      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential' || errorMessage.includes('invalid-credential')) {
        message = 'E-mail ou senha inválidos.';
      } else if (errorCode === 'auth/email-already-in-use') {
        message = 'Este e-mail já está em uso.';
      } else if (errorCode === 'auth/weak-password') {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('operation-not-allowed')) {
        message = 'Sua conta não pôde ser ativada. Verifique com o administrador.';
      } else {
        message = `Erro: ${errorCode || 'desconhecido'}`;
      }
      setErrorStatus(message);
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectPlanAndSignUp = (planId: string) => {
    setSelectedPlanForSignUp(planId);
    setIsSignUp(true);
    scrollToSection('auth-section');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans antialiased selection:bg-blue-650 selection:text-white" id="landing-page-full">
      
      {/* 1. STUNNING HEADER & GLASS NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-100 px-6 sm:px-12 py-4 flex items-center justify-between transition-all">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('landing-hero')}>
          <Logo size="sm" showText={true} />
        </div>
        
        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-xs font-black uppercase tracking-widest text-gray-400">
          <button onClick={() => scrollToSection('features')} className="hover:text-gray-900 transition-colors">Recursos</button>
          <button onClick={() => scrollToSection('bento-benefits')} className="hover:text-gray-900 transition-colors">Vantagens</button>
          <button onClick={() => scrollToSection('pricing')} className="hover:text-gray-900 transition-colors">Planos</button>
          <button onClick={() => scrollToSection('faq')} className="hover:text-gray-900 transition-colors">FAQ</button>
        </nav>

        <div className="flex items-center gap-3">
          {onEnterDemoMode && (
            <button
              type="button"
              onClick={onEnterDemoMode}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-250 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm hidden sm:flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Modo Demo</span>
            </button>
          )}
          <button 
            type="button" 
            onClick={() => {
              setIsSignUp(false);
              scrollToSection('auth-section');
            }}
            className="px-5 py-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
          >
            Fazer Login
          </button>
          <button 
            type="button" 
            onClick={() => {
              setIsSignUp(true);
              scrollToSection('auth-section');
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-100"
          >
            Começar Grátis
          </button>
        </div>
      </header>

      {/* 2. MAJESTIC HERO SECTION */}
      <section id="landing-hero" className="relative px-6 sm:px-12 pt-20 pb-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex-1 space-y-8 z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-105 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5 animate-bounce" />
            <span>EXCLUSIVO PARA AGÊNCIAS DE MARKETING & SOCIAL MEDIA</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight">
            Gestão Operacional de <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Alta Performance</span> para sua Agência.
          </h1>

          <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
            Acelere os seus processos operacionais. Conecte o seu próprio Google Drive para armazenar os arquivos e configure suas cobranças via Asaas para faturar seus clientes de forma recorrente e automática. Tudo em um único lugar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button
              onClick={() => {
                setIsSignUp(true);
                scrollToSection('auth-section');
              }}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
            >
              <span>Criar Agência Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {onEnterDemoMode && (
              <button
                onClick={onEnterDemoMode}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-650 hover:to-teal-650 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Navegar no Sistema (Modo Demo)</span>
                <Zap className="w-4 h-4 text-amber-200 animate-pulse" />
              </button>
            )}
            <button
              onClick={() => scrollToSection('features')}
              className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-150 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 text-gray-600 transition-all flex items-center justify-center"
            >
              Ver Recursos Completos
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-150 text-left max-w-md mx-auto lg:mx-0">
            <div>
              <p className="text-2xl font-black text-gray-900 tracking-tight">100%</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Seguro e Isolado</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 tracking-tight">Zero</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Taxas s/ Vendas</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 tracking-tight">Nativo</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Asaas & Drive API</p>
            </div>
          </div>
        </div>

        {/* Floating Mockup / Visual Interactive Overview */}
        <div className="flex-1 w-full max-w-lg z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white p-6 rounded-[2.5rem] border border-gray-150 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50/50 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400 block"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-400 block"></span>
                <span className="w-3 h-3 rounded-full bg-green-400 block"></span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-500 uppercase tracking-wider">EvooFlow Dashboard v2</span>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <LayoutDashboard className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Painel Operacional</p>
                  <p className="text-xs font-bold text-gray-800">Visualização de Clientes, Aprovação de Mídias e Financeiro</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <Database className="w-5 h-5 text-emerald-600" />
                <div className="text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seu Google Drive Próprio</p>
                  <p className="text-xs font-bold text-gray-800">Pastas de clientes geradas nativamente no seu próprio armazenamento</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <div className="text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento Direto Asaas</p>
                  <p className="text-xs font-bold text-gray-800">Emita PIX, Boletos ou Cartão e gerencie recorrência de clientes</p>
                </div>
              </div>

              <div className="bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-105">
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase text-blue-200 tracking-widest">Nova Assinatura no Asaas</p>
                  <p className="text-xs font-bold">Planos integrados de faturamento</p>
                </div>
                <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-mono font-black">R$ 47/mês</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* NEW INTERACTIVE WALKTHROUGH: CORE SYSTEM SCREENSHOTS/MOCKUPS */}
      <section className="bg-slate-900 text-white py-24 px-6 sm:px-12 border-t border-slate-800 relative">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto space-y-12 z-10 relative">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
              ⚡ TOUR DA PLATAFORMA POR DENTRO
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-none">
              Diga adeus à bagunça. Veja o sistema <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">por dentro</span>.
            </h2>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">
              Desenvolvemos a ferramenta definitiva para centralizar tudo. Navegue abaixo pelas abas e veja o acabamento, a clareza e o profissionalismo que seus clientes vão experienciar.
            </p>

            {onEnterDemoMode && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="max-w-2xl mx-auto p-4 sm:p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-3 shadow-lg shadow-emerald-500/5 mt-4"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Plataforma 100% Ativa e Interativa</span>
                    </h4>
                    <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed max-w-md">
                      O simulador abaixo já está **totalmente aberto e funcional** para você! Clique nas abas e use as ferramentas em tempo real. Se preferir, clique ao lado para expandir em tela cheia.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onEnterDemoMode}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
                  >
                    <span>Abrir em Tela Cheia</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Interactive Screenshot Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 max-w-4xl mx-auto">
            <button
              onClick={() => setActiveScreenshotTab('kanban')}
              className={`flex-1 min-w-[150px] px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeScreenshotTab === 'kanban' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              📋 CRM & Kanban
            </button>
            <button
              onClick={() => setActiveScreenshotTab('approval')}
              className={`flex-1 min-w-[150px] px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeScreenshotTab === 'approval' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              ✨ Central de Aprovação
            </button>
            <button
              onClick={() => setActiveScreenshotTab('financial')}
              className={`flex-1 min-w-[150px] px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeScreenshotTab === 'financial' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              💰 Faturamento Asaas
            </button>
            <button
              onClick={() => setActiveScreenshotTab('drive')}
              className={`flex-1 min-w-[150px] px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeScreenshotTab === 'drive' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              🔑 Seu Google Drive
            </button>
          </div>

          {/* High Fidelity Simulated Window / App Screenshot */}
          <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl p-4 sm:p-6 overflow-hidden max-w-6xl mx-auto">
            {/* Window Upper Chrome Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-850 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-lg text-[10px] font-mono text-slate-400 border border-slate-800">
                <span>https://app.evooflow.com.br/</span>
                <span className="text-emerald-400 font-bold">● CONEXÃO SEGURA</span>
              </div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20">
                PAINEL OPERACIONAL DA AGÊNCIA
              </span>
            </div>

            {/* SCREENSHOT BODY CONTROLLER */}
            {renderInteractiveApp ? (
              <div className="bg-slate-50 text-slate-900 rounded-2xl overflow-hidden min-h-[550px] transition-all">
                {renderInteractiveApp(activeScreenshotTab)}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeScreenshotTab === 'kanban' && (
                <motion.div
                  key="kanban-screenshot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-white">Quadro Kanban unificado</h3>
                      <p className="text-xs text-slate-400">Arraste os cards de entregáveis pelas etapas de produção e aprovação.</p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-lg self-start">
                      🎯 Sprint Semanal Ativa
                    </span>
                  </div>

                  {/* Simulated Kanban Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
                    {/* Column 1: A Fazer */}
                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850 space-y-3 min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">📝 BRIEFINGS (2)</span>
                        <span className="w-5 h-5 bg-slate-800 rounded-full text-[10px] font-bold flex items-center justify-center">2</span>
                      </div>
                      
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition-all cursor-grab">
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-widest rounded">Instagram</span>
                        <h4 className="text-xs font-bold text-slate-250">Post Carrossel: Benefícios do Produto</h4>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[9px] text-slate-500">Hoje às 18:00</span>
                          <span className="w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full text-[8px] font-bold flex items-center justify-center uppercase">AC</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition-all cursor-grab">
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-widest rounded">Tráfego Pago</span>
                        <h4 className="text-xs font-bold text-slate-250">Criativo de Vídeo: Meta Ads Ofertas</h4>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[9px] text-slate-500">Amanhã</span>
                          <span className="w-5 h-5 bg-teal-600 rounded-full text-[8px] font-bold flex items-center justify-center uppercase">JP</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Em Produção */}
                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850 space-y-3 min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">⚙️ CRIAÇÃO (1)</span>
                        <span className="w-5 h-5 bg-sky-500/10 text-sky-400 rounded-full text-[10px] font-bold flex items-center justify-center">1</span>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-xl border border-sky-950 space-y-2 shadow-lg shadow-sky-950/20 hover:border-sky-800 transition-all cursor-grab">
                        <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-[9px] font-black uppercase tracking-widest rounded">Reels IG</span>
                        <h4 className="text-xs font-bold text-sky-200">Roteiro + Captação de Vídeo Depoimento</h4>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1 text-[9px] text-sky-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
                            <span>Gravando</span>
                          </div>
                          <span className="w-5 h-5 bg-sky-600 rounded-full text-[8px] font-bold flex items-center justify-center uppercase">RL</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Pendente Aprovação */}
                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850 space-y-3 min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">⏳ CLIENTE (1)</span>
                        <span className="w-5 h-5 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-bold flex items-center justify-center">1</span>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-950/50 space-y-2 hover:border-amber-700 transition-all cursor-grab">
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-widest rounded">Landing Page</span>
                        <h4 className="text-xs font-bold text-slate-205">Layout Completo da Página de Clínicas</h4>
                        <div className="bg-slate-900 p-2 rounded text-[10px] text-slate-400 border border-slate-850">
                          <span>Aguardando parecer do Dr. Marcos</span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[9px] text-slate-500">Enviado hórário comercial</span>
                          <span className="w-5 h-5 bg-amber-600 rounded-full text-[8px] font-bold flex items-center justify-center uppercase">MC</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 4: Aprovado */}
                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850 space-y-3 min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">✅ PRONTOS & POSTADOS</span>
                        <span className="w-5 h-5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold flex items-center justify-center">2</span>
                      </div>

                      <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-950/80 space-y-2">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded">Youtube</span>
                        <h4 className="text-xs font-bold text-emerald-300">Thumbnail Vídeo Aula Exclusiva</h4>
                        <p className="text-[9px] text-emerald-500 font-bold">Aprovado pelo Cliente ✅</p>
                      </div>

                      <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-950/80 space-y-2">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded">Blog</span>
                        <h4 className="text-xs font-bold text-emerald-300">Conteúdo de Artigo SEO Otimizado</h4>
                        <p className="text-[9px] text-emerald-500 font-bold">Agendado no WordPress ✅</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeScreenshotTab === 'approval' && (
                <motion.div
                  key="approval-screenshot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-white">Central de Aprovação Limpa (Visão do Cliente)</h3>
                      <p className="text-xs text-slate-400">O cliente clica para aprovar ou pede ajustes. Todas as respostas alimentam o painel de produção da agência em tempo real.</p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold rounded-lg self-start">
                      🔗 Link Externo Seguro ativado
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Creative Media Preview Mock */}
                    <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between min-h-[380px]">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-300">Criativo_EvooFlow_Instagram.png</span>
                        <span className="text-[10px] text-slate-500 font-mono">1080 x 1350 px</span>
                      </div>

                      {/* Geometric Aesthetic Image Placeholder */}
                      <div className="flex-1 rounded-xl bg-slate-950 border border-slate-850 p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute top-1/2 -left-20 w-44 h-44 bg-blue-600/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-1/2 -right-20 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl"></div>
                        
                        <div className="max-w-xs text-center space-y-4 z-10">
                          <Logo size="md" className="mx-auto" />
                          <p className="text-sm font-black text-white tracking-tight leading-tighter">
                            "A evolução da entrega operacional: Controle de Clientes do Zero"
                          </p>
                          <div className="h-1 w-20 bg-blue-500 mx-auto rounded-full"></div>
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">ARTE 1 DE 3 • DUPLICADO DO KANBAN DE HOJE</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <span>💡 Arraste para o lado para ver o restante do carrossel</span>
                        <span className="font-extrabold text-blue-400">Carrossel_Agencia_Final_v3.pdf</span>
                      </div>
                    </div>

                    {/* Client Approval / Response Box */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-850 p-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">FEEDBACK DA ARTE</span>
                          <h4 className="text-sm font-black text-white mt-0.5">Campanha de Novembro</h4>
                        </div>

                        <div className="space-y-3">
                          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-amber-400">Cliente (Academia Fit)</span>
                              <span className="text-[9px] text-slate-500">Há 10 minutos</span>
                            </div>
                            <p className="text-slate-350 leading-relaxed">"O texto ficou excelente! Na segunda imagem, por favor, aumente apenas um pouco o logotipo da marca no topo direito."</p>
                          </div>

                          <div className="p-3.5 bg-blue-950/20 rounded-xl border border-blue-900/40 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-blue-400">Agência EvooFlow</span>
                              <span className="text-[9px] text-slate-400">Respondido agora mesmo</span>
                            </div>
                            <p className="text-slate-300">"Perfeito, Dr. Marcos! Já solicitamos o ajuste à designer Ana Clara e a nova versão em alta já está sendo exportada."</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-6 border-t border-slate-805">
                        <button
                          type="button"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>APROVAR PEÇA 100% ADQUIRIDA</span>
                        </button>
                        <button
                          type="button"
                          className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all"
                        >
                          SOLICITAR NOVO AJUSTE RAPIDAMENTE
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeScreenshotTab === 'financial' && (
                <motion.div
                  key="financial-screenshot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-white">Visualização de Receita Recorrente & Boletos</h3>
                      <p className="text-xs text-slate-400">Emita Pix, boletos registrados e faturas recorrentes integradas faturando pela sua própria API do Asaas.</p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg self-start">
                      💰 Caixa Operacional Ativo
                    </span>
                  </div>

                  {/* Top Stats of Financial Dashboard */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-850 space-y-1">
                      <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">FATURAMENTO ESTE MÊS</span>
                      <p className="text-2xl font-black text-white">R$ 14.850,00</p>
                      <span className="text-[10px] text-emerald-400 font-bold block">✓ +12.3% em relação ao mês anterior</span>
                    </div>

                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-850 space-y-1">
                      <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">COBRANÇAS EM ABERTO</span>
                      <p className="text-2xl font-black text-amber-400">R$ 3.200,00</p>
                      <span className="text-[10px] text-slate-400 font-bold block">⌛ 3 Clientes aguardando pagamento normal</span>
                    </div>

                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-850 space-y-1">
                      <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">ASSINATURAS ATIVAS</span>
                      <p className="text-2xl font-black text-emerald-400">8 de 10 Contratos</p>
                      <span className="text-[10px] text-blue-400 font-bold block">✓ Cobrança Recorrente Automatizada via Asaas</span>
                    </div>
                  </div>

                  {/* Revenue Log & Table Preview */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-850 overflow-hidden">
                    <div className="p-4 bg-slate-900/80 border-b border-slate-850 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider">Histórico de Cobranças Emitidas</span>
                      <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded font-black uppercase tracking-wider">Módulo Integrado Asaas</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-850 text-slate-450 font-black uppercase tracking-wider bg-slate-950/40 text-[9px]">
                            <th className="p-4">Cliente / Contrato</th>
                            <th className="p-4">Valor Nominal</th>
                            <th className="p-4">Tipo/Meio</th>
                            <th className="p-4">Vencimento</th>
                            <th className="p-4">Status Transação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 font-medium">
                          <tr>
                            <td className="p-4 text-white font-bold">Evoo Alimentos LTDA</td>
                            <td className="p-4 text-slate-300">R$ 1.500,00</td>
                            <td className="p-4"><span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-[10px] font-bold rounded">PIX Dinâmico</span></td>
                            <td className="p-4 text-slate-400">25/05/2026</td>
                            <td className="p-4"><span className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 text-[10px] font-black rounded-lg uppercase">Recebido ✅</span></td>
                          </tr>
                          <tr>
                            <td className="p-4 text-white font-bold">Clínica Dr. Marcelo Ribeiro</td>
                            <td className="p-4 text-slate-300">R$ 3.400,00</td>
                            <td className="p-4"><span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded">Boleto Registrado</span></td>
                            <td className="p-4 text-slate-400">30/05/2026</td>
                            <td className="p-4"><span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded-lg uppercase">Aguardando Pagamento ⌛</span></td>
                          </tr>
                          <tr>
                            <td className="p-4 text-white font-bold">Academia Fit & Vida</td>
                            <td className="p-4 text-slate-300">R$ 950,00</td>
                            <td className="p-4"><span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded">Cartão Recorrente</span></td>
                            <td className="p-4 text-slate-400">02/06/2026</td>
                            <td className="p-4"><span className="px-2.5 py-1 bg-sky-500/20 text-sky-400 text-[10px] font-black rounded-lg uppercase">Mapeada no Asaas 🔄</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeScreenshotTab === 'drive' && (
                <motion.div
                  key="drive-screenshot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-white">Integração Própria Google Drive (Nativa por Agência)</h3>
                      <p className="text-xs text-slate-400">Suas pastas de mídias e criativos são estruturadas diretamente no seu próprio ecossistema do Google Drive via API Segura.</p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold rounded-lg self-start">
                      🔑 Conexão OAuth 2.0 Ativa
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Simulated Connection Settings Form */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-850 p-6 space-y-4">
                      <div>
                        <span className="text-[9px] font-black text-slate-405 uppercase tracking-widest block">CHAVE DE CONTROLE</span>
                        <h4 className="text-sm font-black text-white mt-0.5">Parâmetros do Google Drive</h4>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div className="text-left">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ORGANIZAÇÃO ATIVISSIMA</p>
                            <p className="font-bold text-slate-300">Google Drive Compartilhado</p>
                          </div>
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">ATIVO ✅</span>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest">E-mail da sua conta conectado</label>
                          <input
                            type="text"
                            readOnly
                            value="diretoria@minhaagencia.com.br"
                            className="w-full bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs font-bold text-slate-300 outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest">ID da Pasta Raiz no Drive</label>
                          <input
                            type="text"
                            readOnly
                            value="1xp_tU8-gH6p9j2DmlqXv9W0vO_EvooFlow"
                            className="w-full bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-slate-400 outline-none"
                          />
                        </div>
                      </div>

                      <div className="pt-4">
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          Cada cliente cadastrado no seu sistema terá uma pasta criada automaticamente dentro desta pasta raiz do seu próprio Google Drive!
                        </span>
                      </div>
                    </div>

                    {/* Virtual Google Drive Folder Browser Mock */}
                    <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-850 p-6 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-300">Explorador de Arquivos do Drive (Sincronizado)</span>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-black uppercase tracking-widest">Pastas Automáticas</span>
                      </div>

                      {/* Simulated folder directory structure */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                          <div className="flex items-center gap-3">
                            <span className="text-amber-500 text-lg">📁</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-slate-205">📁 Clientes / Evoo Alimentos</p>
                              <p className="text-[9px] text-slate-500">Criado automaticamente via API ao cadastrar o parceiro</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold">Sincronizado ✓</span>
                        </div>

                        <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                          <div className="flex items-center gap-3">
                            <span className="text-amber-500 text-lg">📁</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-slate-205">📁 Clientes / Dr. Marcelo Reinaldo</p>
                              <p className="text-[9px] text-slate-500">Pasta criada contendo subpastas: /Criativos e /Propostas</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold">Sincronizado ✓</span>
                        </div>

                        <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                          <div className="flex items-center gap-3">
                            <span className="text-amber-500 text-lg">📁</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-slate-205">📁 Clientes / Clínica Sorriso Perfeito</p>
                              <p className="text-[9px] text-slate-500">Pasta criada nas chaves locais do Drive da agência</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold">Sincronizado ✓</span>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-950/20 text-blue-400 rounded-xl text-xs flex items-center justify-between border border-blue-900/30">
                        <span>🚀 Seus arquivos são guardados permanentemente em sua própria nuvem.</span>
                        <span className="font-mono text-[10px] font-bold">Espaço ilimitado do seu plano Drive</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            )}
          </div>

        </div>
      </section>

      {/* 3. CORE FEATURES GRID SECTION */}
      <section id="features" className="bg-white border-y border-gray-100 py-24 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">TUDO QUE VOCÊ PRECISA PARA REVOLUCIONAR SUA OPERAÇÃO</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tighter">
              A arquitetura ideal para agências que demandam escala.
            </h2>
            <p className="text-gray-500 font-medium text-sm leading-relaxed">
              Diga adeus à mistura de planilhas, arquivos soltos no WhatsApp e cobranças esquecidas. Tenha uma verdadeira central corporativa sob o seu domínio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Kanban & Gestão de Projetos</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Crie quadros visuais para coordenar as artes, redigir mídias sociais e mover cada card pelos estágios de briefing, criação, revisão e aprovação final.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Google Drive por Agência</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Diferente de outras plataformas, cada agência conecta sua própria chave do Drive na aba de configurações. Estruture pastas para cada cliente de forma isolada e profissional.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Integração Asaas Própria</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Configure as suas faturas usando sua chave Asaas. Emita cobranças via Pix ou boleto aos seus clientes, acesse links de pagamento e receba direto em seu banco de faturamento.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Central de Aprovação Rápida</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Esqueça os PDFs pesados por e-mail. Disponibilize para o seu cliente uma tela prática para visualização da mídia final, com espaço para aprovação simples ou envio de feedback preciso.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Gestão de Leads & CRM</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Capture potenciais novos clientes por meio de um link público ajustado para a sua agência, gerencie contatos e direcione propostas comerciais de maneira estratégica.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Multi-Tenancy Organizado</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Seus colaboradores acessam somente as ações que lhes competem. Mantenha os seus relatórios e permissões sob rédea segura em um painel administrativo.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE PRICE PLANS MATRIX */}
      <section id="pricing" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">PLANOS CLAROS, SEM TAXAS ADICIONAIS OU OCULTAS</p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Escolha o plano ideal para o tamanho da sua operação</h2>
          <p className="text-gray-500 font-medium text-sm">
            Todos os planos incluem acesso completo às funcionalidades centrais. Você escala conforme sua base de clientes e equipe crescem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS_DATA.map((plan) => (
            <div 
              key={plan.id}
              className={`p-6 bg-white rounded-[2rem] border relative flex flex-col justify-between transition-all ${
                plan.popular 
                  ? "border-blue-600 shadow-2xl shadow-blue-50" 
                  : "border-gray-150 hover:shadow-lg"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Campeão de Vendas 🔥
                </span>
              )}

              {plan.badge && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                  {plan.badge}
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900">{plan.name}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{plan.clients}</p>
                </div>

                <div className="flex items-baseline gap-1 py-2">
                  <span className="text-lg font-black text-gray-900">R$</span>
                  <span className="text-5xl font-black text-gray-900 tracking-tighter">{plan.price}</span>
                  <span className="text-xs font-bold text-gray-400">/mês</span>
                </div>

                <p className="text-xs font-bold text-blue-600 bg-blue-50/50 p-3 rounded-xl border border-blue-50 leading-tight">
                  ⚡ Espaço Privado em Nuvem: {plan.storage}
                </p>

                <div className="space-y-3.5 pt-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">O que está incluído:</p>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-600 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => handleSelectPlanAndSignUp(plan.id)}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  Selecionar Plano e Começar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. INTEGRATED COMPACT & SLIDABLE AUTH / LOGIN PANEL */}
      <section id="auth-section" className="scroll-mt-24 py-24 px-6 sm:px-12 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-t border-slate-800 relative overflow-hidden">
        <div className="absolute -top-40 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 z-10 relative">
          
          <div className="flex-1 space-y-6 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tighter">
              Crie a sua Agência hoje mesmo.
            </h2>
            <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-md">
              Entre em instantes ou registre-se para o teste gratuito com o plano selecionado. Não pedimos cartão de crédito antecipado para testar.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-300">Painel com a identidade visual da sua agência</p>
              </div>

              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-300">Sem limites de peças de conteúdo por tarefa</p>
              </div>
            </div>
          </div>

          {/* Interactive Login/SignUp Card Form */}
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 pb-10 text-gray-900 relative">
            
            <div className="flex flex-col items-center mb-6 text-center">
              <Logo size="md" className="-mb-2" />
              <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mt-2">
                {isSignUp ? `Sua agência no plano ${selectedPlanForSignUp.toUpperCase()}` : 'Acesse seu painel operacional'}
              </p>
            </div>

            {errorStatus && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl"
              >
                <p className="text-xs font-bold text-red-600 leading-tight text-center">
                  {errorStatus}
                </p>
              </motion.div>
            )}

            {isSignUp && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-blue-700">Plano Selecionado: {selectedPlanForSignUp.toUpperCase()}</span>
                <button 
                  onClick={() => scrollToSection('pricing')}
                  className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                >
                  Alterar Plano
                </button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* NOME DA AGENCIA */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Agência</label>
                      <div className="relative group">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          required
                          value={agencyName}
                          onChange={(e) => handleAgencyNameChange(e.target.value)}
                          placeholder="NOME DA AGÊNCIA"
                          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-xs font-bold"
                        />
                      </div>
                    </div>

                    {/* NOME DO RESPONSAVEL OU RAZAO SOCIAL */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsável / Razão Social</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          required
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="NOME COMPLETO OU RAZÃO SOCIAL"
                          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-xs font-bold"
                        />
                      </div>
                    </div>

                    {/* CPF OU CNPJ */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CNPJ ou CPF</label>
                      <div className="relative group">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          required
                          value={ownerCpfCnpj}
                          onChange={(e) => setOwnerCpfCnpj(e.target.value)}
                          placeholder="CPF OU CNPJ DO TITULAR"
                          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-xs font-bold font-mono"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@agencia.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Senha</label>
                  {!isSignUp && (
                    <button type="button" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Esqueceu?</button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-xs font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-105 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'Processando...' : isSignUp ? `Validar Plano ${selectedPlanForSignUp.toUpperCase()}` : 'Entrar no Sistema'}</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[9px] font-black uppercase tracking-widest"><span className="bg-white px-4 text-gray-300">ou acesse com</span></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-100 py-3.5 px-4 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              <Chrome className="w-4.5 h-4.5 text-red-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Google Account</span>
            </button>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors"
                type="button"
              >
                {isSignUp ? (
                  <>Já possui sua agência? <span className="text-blue-600 font-extrabold pb-0.5 border-b-2 border-blue-600">Entrar no painel</span></>
                ) : (
                  <>Novo por aqui? <span className="text-blue-600 font-extrabold pb-0.5 border-b-2 border-blue-600">Criar Nova Agência</span></>
                )}
              </button>
            </div>
            
          </div>

        </div>
      </section>

      {/* 6. POLISHED FAQ SECTION */}
      <section id="faq" className="py-24 px-6 sm:px-12 bg-white">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest font-mono">FAQ COMPLETA</p>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Tire suas dúvidas sobre o Evoo Flow</h2>
            <p className="text-gray-500 font-medium text-sm">Controle total operando no seu próprio ecossistema de dados.</p>
          </div>

          <div className="space-y-4">
            {FAQ_DATA.map((faq) => (
              <div 
                key={faq.id} 
                className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                  className="w-full p-6 text-left flex items-center justify-between font-extrabold text-sm text-gray-900 outline-none hover:text-blue-600"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${activeFaq === faq.id ? 'rotate-180 text-blue-600' : ''}`} />
                </button>
                
                <AnimatePresence initial={false}>
                  {activeFaq === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-100/50"
                    >
                      <div className="p-6 text-xs text-gray-500 font-medium leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ELEGANT FOOTER */}
      <footer className="bg-gray-950 text-gray-500 py-16 px-6 sm:px-12 border-t border-gray-900 text-xs text-center md:text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4">
            <Logo size="sm" showText={true} variant="white" />
            <p className="text-xs font-medium text-gray-400 max-w-sm">
              SaaS Operational System de alta fidelidade técnica integrando Google Drive e faturamentos automáticos com Asaas API.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 text-[10px] font-black uppercase tracking-widest">
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Recursos</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Valores</button>
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="mailto:evoostudiomkt@gmail.com" className="hover:text-white transition-colors text-blue-400">Suporte Técnico</a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-gray-900 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 font-medium">
          <p>© 2026 Evoo Flow Corporation. CNPJ Protegido de teste. Todos os direitos reservados.</p>
          <p className="text-[9px] font-black text-gray-650 tracking-widest uppercase">Coded in High Confidence Cloud Native Workspace</p>
        </div>
      </footer>

    </div>
  );
}

