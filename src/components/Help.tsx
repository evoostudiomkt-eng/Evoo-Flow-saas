import React, { useState } from 'react';
import { 
  Play, 
  BookOpen, 
  MessageCircle, 
  Users, 
  Search, 
  ExternalLink, 
  ChevronRight, 
  Sparkles, 
  HelpCircle, 
  Clock, 
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface HelpProps {
  profile: UserProfile;
}

interface Lesson {
  id: string;
  title: string;
  category: 'iniciante' | 'gestao' | 'financeiro' | 'leads';
  duration: string;
  description: string;
  youtubeId?: string;
  summarySteps: string[];
}

export default function Help({ profile }: HelpProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const categories = [
    { id: 'todos', name: 'Todos' },
    { id: 'iniciante', name: 'Passos Iniciais' },
    { id: 'gestao', name: 'Gestão & Equipe' },
    { id: 'financeiro', name: 'Controle Financeiro' },
    { id: 'leads', name: 'Leads & Vendas' },
  ];

  const lessons: Lesson[] = [
    {
      id: '1',
      title: 'Configurando o Perfil da sua Agência',
      category: 'iniciante',
      duration: '4 min',
      description: 'Aprenda a cadastrar a identidade visual da sua agência, definir configurações globais e ajustar as preferências básicas do sistema.',
      summarySteps: [
        'Acesse as Configurações no canto inferior do menu esquerdo.',
        'Atualize os dados de faturamento e nome institucional.',
        'Envie o logotipo para personalizar as telas de aprovação dos clientes.',
        'Salve as alterações e veja a marca aplicada.'
      ]
    },
    {
      id: '2',
      title: 'Cadastrando e Gerenciando Clientes',
      category: 'gestao',
      duration: '6 min',
      description: 'Veja como criar fichas completas para seus clientes, armazenar referências, e definir parâmetros personalizados para cada conta.',
      summarySteps: [
        'Navegue até a aba "Clientes" e clique em "Novo Cliente".',
        'Preencha informações essenciais como nome da empresa, contato e e-mail.',
        'Configure o logotipo do cliente para personalizar as aprovações dele.',
        'Visualize o dashboard individual de cada cliente após o cadastro.'
      ]
    },
    {
      id: '3',
      title: 'Fluxo Eficiente de Aprovação de Conteúdos',
      category: 'gestao',
      duration: '8 min',
      description: 'Domine a funcionalidade de aprovação compartilhando links públicos externos com seus clientes, eliminando idas e vindas de e-mails.',
      summarySteps: [
        'Organize suas publicações ou materiais na aba "Conteúdo".',
        'Crie um card de aprovação e anexe imagens, textos ou arquivos.',
        'Gere o link público de aprovação rápida.',
        'O cliente aprova ou solicita ajustes em tempo real sem precisar de login.'
      ]
    },
    {
      id: '4',
      title: 'Controlando seu Painel Financeiro',
      category: 'financeiro',
      duration: '5 min',
      description: 'Como monitorar recebíveis de clientes, registrar pagamentos, pendências e prever a receita recorrente mensal (MRR) da sua agência.',
      summarySteps: [
        'Acesse a aba "Financeiro" na visão geral da agência.',
        'Adicione novos registros financeiros dentro da aba de cada cliente.',
        'Acompanhe os gráficos de status de faturamento (Pago, Pendente, Atrasado).',
        'Filtre e exporte os lançamentos em conformidade operacional.'
      ]
    },
    {
      id: '5',
      title: 'Captação e Organização de Leads',
      category: 'leads',
      duration: '7 min',
      description: 'Configure o formulário público da agência para capturar novos clientes diretamente em seu site e organizar suas propostas no funil Kanban.',
      summarySteps: [
        'Na aba "Leads", copie o link oficial do seu formulário público da agência.',
        'Insira ou divulgue o link para seus potenciais clientes responderem.',
        'Cada resposta chega automaticamente como um card na coluna "Novos" do seu Pipeline.',
        'Arraste e avance os leads entre as colunas conforme a negociação progride.'
      ]
    },
    {
      id: '6',
      title: 'Gestão de Tarefas e Colaboração em Equipe',
      category: 'gestao',
      duration: '6 min',
      description: 'Como delegar tarefas aos membros da equipe, estipular prazos e gerenciar a fila operacional com o Kanban ágil.',
      summarySteps: [
        'Na aba "Equipe", certifique-se de que os membros do seu time estejam cadastrados.',
        'Vá em "Tarefas" e crie um novo item definindo o profissional responsável.',
        'Adicione detalhes, prazos e priorização.',
        'Mova os cartões pelas raias (Pendente, Em Produção, Revisão, Concluído).'
      ]
    }
  ];

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(search.toLowerCase()) || 
                          lesson.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || lesson.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12" id="help-page">
      {/* Hero Banner */}
      <div className="bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-900 text-white p-8 md:p-12 rounded-[2.5rem] border border-blue-900/40 relative overflow-hidden shadow-xl shadow-blue-950/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Central de Treinamento</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Como podemos acelerar <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">sua agência</span> hoje?
          </h1>
          <p className="text-blue-200/80 font-medium mt-4 text-base leading-relaxed">
            Explore nossa biblioteca de aulas, aprenda a otimizar seus fluxos de trabalho e conecte-se com nosso suporte dedicado de alto nível para agências de performance.
          </p>
        </div>
      </div>

      {/* Support CTA Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Suporte Direto via WhatsApp</h3>
            <p className="text-gray-500 font-medium text-sm mt-2 leading-relaxed">
              Fale com nosso time de implantação e tire todas as suas dúvidas técnicas ou de fluxo em poucos minutos. Estamos prontos para ajudar sua agência!
            </p>
          </div>
          <div className="mt-8">
            <a 
              href="https://wa.me/5500000000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200/50 transition-all w-full md:w-auto"
            >
              Falar com o Suporte
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Comunidade VIP no WhatsApp</h3>
            <p className="text-gray-500 font-medium text-sm mt-2 leading-relaxed">
              Faça networking inteligente! Compartilhe metodologias, processos operacionais e insights enriquecedores com outros fundadores e líderes de agências do mercado.
            </p>
          </div>
          <div className="mt-8">
            <a 
              href="https://chat.whatsapp.com/G3tGroupPlaceholder" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200/50 transition-all w-full md:w-auto"
            >
              Entrar no Grupo VIP
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        </div>
      </div>

      {/* Course Area Container */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-blue-600 animate-pulse" />
              Treinamento de Uso & Tutoriais
            </h2>
            <p className="text-gray-500 font-medium text-sm mt-1">Aprenda a operar a plataforma em alta velocidade.</p>
          </div>
          
          <div className="relative min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar aula ou tutorial..."
              className="pl-12 pr-4 py-3 border border-gray-100 rounded-2xl bg-gray-50/50 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full transition-all focus:bg-white focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Tab selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                selectedCategory === cat.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Lessons Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map((lesson) => (
            <motion.div
              layout
              key={lesson.id}
              className="bg-gray-50/50 rounded-3xl border border-gray-100/60 p-6 flex flex-col justify-between hover:bg-white hover:shadow-lg hover:shadow-gray-100 hover:border-blue-100 transition-all duration-300 relative group overflow-hidden"
            >
              <div>
                {/* Image Placeholder with elegant Play Overlay */}
                <div className="relative h-44 rounded-2xl bg-gradient-to-tr from-blue-900 to-indigo-950 mb-5 flex flex-col justify-end p-4 text-white overflow-hidden shadow-sm group-hover:brightness-105 transition-all">
                  <div className="absolute inset-0 bg-blue-900/10 mix-blend-multiply" />
                  <div className="absolute top-3 left-3 bg-white/25 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                    {lesson.category}
                  </div>
                  <div className="absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{lesson.duration}</span>
                  </div>
                  
                  {/* Play Button Indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 duration-300">
                      <Play className="w-5 h-5 fill-current ml-1" />
                    </div>
                  </div>

                  <span className="text-gray-300 text-[10px] font-mono tracking-widest uppercase z-10">Aula {lesson.id}</span>
                  <p className="font-black text-sm text-white leading-tight mt-0.5 line-clamp-1 z-10">{lesson.title}</p>
                </div>

                <h4 className="text-base font-black text-gray-900 group-hover:text-blue-600 transition-colors">{lesson.title}</h4>
                <p className="text-gray-500 text-xs font-semibold mt-2.5 leading-relaxed line-clamp-3">
                  {lesson.description}
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-100">
                <button
                  onClick={() => setSelectedLesson(lesson)}
                  className="w-full flex items-center justify-center bg-white border border-gray-100 shadow-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 px-4 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Visualizar Aula & Roteiro
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredLessons.length === 0 && (
          <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
            <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">Nenhum tutorial encontrado para sua busca.</p>
            <button 
              onClick={() => { setSearch(''); setSelectedCategory('todos'); }}
              className="mt-4 text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
            >
              Ver todos os tutoriais
            </button>
          </div>
        )}
      </div>

      {/* Lesson Drawer/Modal Overlay */}
      <AnimatePresence>
        {selectedLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-gray-900/40 backdrop-blur-sm">
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={() => setSelectedLesson(null)} />
            
            <motion.div 
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl h-screen bg-white shadow-2xl z-10 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                    Roteiro Prático
                  </span>
                  <span className="text-gray-400 text-xs font-bold font-mono">
                    {selectedLesson.duration} de conteúdo
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedLesson(null)}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{selectedLesson.title}</h3>
                  <p className="text-gray-500 font-medium text-sm mt-3 leading-relaxed">
                    {selectedLesson.description}
                  </p>
                </div>

                {/* Animated Simulated Video Player */}
                <div className="bg-slate-900 rounded-3xl aspect-video relative overflow-hidden group flex flex-col justify-end p-6 text-white border border-slate-800">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />
                  
                  {/* Glowing background */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
                  
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl cursor-pointer transform hover:scale-110 active:scale-95 transition-all">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </div>
                  </div>

                  <div className="z-10 relative">
                    <p className="text-[10px] font-mono tracking-widest text-blue-400 uppercase">Treinamento Interativo</p>
                    <p className="text-base font-bold text-white mt-1">Conectar vídeo de treinamento oficial</p>
                    <p className="text-xs text-white/60 font-medium mt-1">Nossa equipe pode fornecer links customizados de gravação conforme a demanda da agência.</p>
                  </div>
                </div>

                {/* Step-by-Step interactive guidelines */}
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Roteiro Passo a Passo</h4>
                  <div className="space-y-4">
                    {selectedLesson.summarySteps.map((step, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-xs text-gray-700 font-semibold leading-relaxed">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question / Doubt CTA */}
                <div className="p-6 rounded-3xl border border-dashed border-gray-200 text-center space-y-4">
                  <p className="text-sm text-gray-600 font-semibold">Ficou com alguma dúvida nesta aula ou precisa de ajuda para configurar?</p>
                  <a 
                    href={`https://wa.me/5500000000000?text=Ol%C3%A1%21+Preciso+de+ajuda+com+a+aula+de+%22${encodeURIComponent(selectedLesson.title)}%22+no+sistema.`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-emerald-100 transition-all"
                  >
                    Suporte pelo WhatsApp
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="px-6 py-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Concluir Aula
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
