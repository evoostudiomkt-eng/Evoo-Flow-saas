import React, { useState, useEffect, useRef } from 'react';
import { collectionGroup, query, onSnapshot, getDocs, doc, updateDoc, collection, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ContentItem, UserProfile, Client } from '../types';
import { 
  FileCheck, 
  Clock, 
  CheckCircle, 
  XCircle,
  Instagram,
  Filter,
  Search,
  MessageSquare,
  Eye,
  Check,
  X,
  ExternalLink,
  Calendar,
  Layers,
  Sparkles,
  History,
  CornerDownRight,
  Pin,
  MapPin,
  ChevronRight,
  Send,
  Sliders,
  HelpCircle,
  FolderOpen,
  SplitSquareVertical,
  ThumbsUp,
  AlertOctagon,
  PenTool,
  Clock3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/activity-logger';
import { MOCK_CONTENTS, MOCK_CLIENTS } from '../lib/mockData';

interface ContentApprovalProps {
  profile: UserProfile;
  isDemoMode?: boolean;
}

interface VisualMarker {
  id: string;
  x: number; // percentage from left
  y: number; // percentage from top
  text: string;
  author: string;
  time: string;
}

export default function ContentApproval({ profile, isDemoMode }: ContentApprovalProps) {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [activePlatformFilter, setActivePlatformFilter] = useState<'all' | 'Instagram' | 'Facebook' | 'LinkedIn'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Interactive feedback elements inside giant media preview modal
  const [activeTabPanel, setActiveTabPanel] = useState<'creative' | 'timeline' | 'checklist'>('creative');
  const [versionIndex, setVersionIndex] = useState<number>(0); // v1, v2 index
  const [visualMarkers, setVisualMarkers] = useState<VisualMarker[]>([]);
  const [markerDraftText, setMarkerDraftText] = useState('');
  const [activeDraftCoords, setActiveDraftCoords] = useState<{x: number, y: number} | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<'approved' | 'revision' | 'approved_partial' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isCommitingAction, setIsCommitingAction] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isDemoMode) {
      setContents(MOCK_CONTENTS);
      const mapping: Record<string, string> = {};
      MOCK_CLIENTS.forEach(c => mapping[c.id] = c.company);
      setClients(mapping);
      return () => {};
    }

    if (!profile?.agencyId) return;

    const q = query(
      collectionGroup(db, 'contents'),
      where('agencyId', '==', profile.agencyId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setContents(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'collectionGroup:contents');
    });

    const fetchClients = async () => {
       try {
         const snap = await getDocs(query(
           collection(db, 'clients'),
           where('agencyId', '==', profile.agencyId)
         ));
         const mapping: Record<string, string> = {};
         snap.docs.forEach(d => {
           const data = d.data() as Client;
           mapping[d.id] = data.company;
         });
         setClients(mapping);
       } catch (err) {
         handleFirestoreError(err, OperationType.GET, 'clients');
       }
    };
    fetchClients();

    return () => unsub();
  }, [profile.agencyId, isDemoMode]);

  // Set up mock coordinates for markers on select items
  useEffect(() => {
    if (selectedItem) {
      // Simulate existing revision/comments timeline markers
      setVisualMarkers([
        { id: 'm1', x: 28, y: 35, text: 'O contraste do texto está um pouco baixo em relação a essa luz.', author: 'Vanessa (Cliente)', time: 'Ontem' },
        { id: 'm2', x: 74, y: 68, text: 'Adicionar o novo logotipo vetorizado aqui por favor.', author: 'Letícia (Equipe)', time: 'Há 2h' }
      ]);
      setVersionIndex(1); // Default to latest version (V2)
      setActiveDraftCoords(null);
      setMarkerDraftText('');
      setSelectedActionType(null);
      setActionNotes('');
    }
  }, [selectedItem]);

  const handleAction = async (item: ContentItem, status: 'approved' | 'revision' | 'approved_partial') => {
    setIsCommitingAction(true);
    const labelStatus = 
      status === 'approved' ? 'aprovado' : 
      status === 'approved_partial' ? 'aprovado parcialmente com ressalvas' : 'solicitado ajustes';
    
    const textNote = actionNotes.trim() || `Qualidade concluída: ${labelStatus}`;

    if (isDemoMode) {
      setContents(prev => prev.map(c => c.id === item.id ? { ...c, status: status === 'approved' ? 'approved' : status === 'approved_partial' ? 'production' : 'revision', updatedAt: new Date().toISOString() } : c));
      setSelectedItem(null);
      setIsCommitingAction(false);
      return;
    }
    try {
      // approved_partial falls back to 'production' as active state with notes
      const dbStatus = status === 'approved' ? 'approved' : status === 'approved_partial' ? 'production' : 'revision';
      await updateDoc(doc(db, 'clients', item.clientId, 'contents', item.id), { 
        status: dbStatus,
        feedback: textNote,
        updatedAt: new Date().toISOString()
      });
      await logActivity(profile, `${status === 'approved' ? 'aprovou' : status === 'approved_partial' ? 'aprovou com ressalva' : 'solicitou ajuste em'} conteúdo: ${item.title}`, item.id, 'content', item.clientId);
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCommitingAction(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setActiveDraftCoords({ x: Math.round(x), y: Math.round(y) });
  };

  const handleSaveMarker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDraftCoords || !markerDraftText.trim()) return;
    
    setVisualMarkers(prev => [
      ...prev,
      {
        id: `marker_${Date.now()}`,
        x: activeDraftCoords.x,
        y: activeDraftCoords.y,
        text: markerDraftText.trim(),
        author: profile.displayName.split(' ')[0],
        time: 'Agora mesmo'
      }
    ]);
    setActiveDraftCoords(null);
    setMarkerDraftText('');
  };

  const pending = contents.filter(c => c.status === 'approval');
  
  const filteredContents = pending.filter(item => {
    const matchesPlatform = activePlatformFilter === 'all' || item.platform === activePlatformFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (clients[item.clientId] || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  // Mock timeline of version iterations
  const mockTimelineHistory = [
    { version: 'v2 (Atual)', author: 'Letícia Fernandes', action: 'Arte finalizada com marcas de correção corrigidas', time: 'Há 2h', active: true },
    { version: 'v1 (Anterior)', author: 'Adriano Castro', action: 'Diretor solicitou mudança no contraste dos textos', time: 'Ontem', active: false },
    { version: 'Rascunho Inicial', author: 'Letícia Fernandes', action: 'Criação de matriz e paleta', time: '2 dias atrás', active: false }
  ];

  const mockChecklistItems = [
    { task: 'Verificação Ortográfica & Gramática', checked: true },
    { task: 'Logotipo Correto na Resolução Master', checked: true },
    { task: 'Margens de Segurança (9:16 Instagram Story)', checked: true },
    { task: 'Legenda com CTA de engajamento ativo', checked: false }
  ];

  return (
    <div className="space-y-8 select-none md:select-text" id="creative-approvals-console">
      {/* HEADER SECTION: Clean Display Layout */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
            <p className="text-[10px] font-mono tracking-widest text-[#2563eb] font-extrabold uppercase">
              REVISÃO MÁXIMA CORPORATIVA • CONTROLE ENTERPRISE
            </p>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 font-sans">
            Controle de Qualidade Criativa
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Revisão cirúrgica de legendas, designs e vídeos antes da disponibilização no Portal de Clientes.
          </p>
        </div>

        {/* Aggregate counts metric */}
        <div className="flex space-x-3">
          <div className="bg-white border border-zinc-100 px-5 py-3 rounded-2xl flex items-center space-x-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-left">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] text-zinc-400 font-mono font-bold tracking-wider uppercase mb-0.5">Aguardando Avaliação</p>
              <h4 className="text-xl font-black text-zinc-900 leading-none">{pending.length} artes</h4>
            </div>
          </div>
        </div>
      </header>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-zinc-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)]" id="toolkit-toolbar">
        {/* Search */}
        <div className="flex items-center bg-zinc-50 border border-zinc-100 px-3.5 py-1.5 rounded-xl flex-1 max-w-sm">
          <Search className="w-4 h-4 text-zinc-400 mr-2" />
          <input 
            type="text" 
            placeholder="Pesquisar por post ou marca..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-xs w-full font-medium text-zinc-800"
          />
        </div>

        {/* Platform tabs filters */}
        <div className="flex space-x-1.5 bg-zinc-100 p-1 rounded-xl text-[10px] font-bold">
          {['all', 'Instagram', 'Facebook', 'LinkedIn'].map((platform) => (
            <button
              key={platform}
              onClick={() => setActivePlatformFilter(platform as any)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg transition-all",
                (platform === 'all' && activePlatformFilter === 'all') || activePlatformFilter === platform
                  ? "bg-white text-zinc-900 shadow-xs font-extrabold"
                  : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              {platform === 'all' ? 'Ver Todas' : platform}
            </button>
          ))}
        </div>
      </div>

      {/* VISUAL CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="approvals-grid">
        {filteredContents.map((item, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={item.id}
            className="bg-white rounded-[24px] border border-zinc-100 shadow-[0_4px_30px_rgba(0,0,0,0.01)] overflow-hidden flex flex-col group hover:shadow-[0_20px_50px_rgba(59,130,246,0.05)] hover:border-zinc-200 transition-all duration-300"
          >
            {/* Aspect Ratio Preview */}
            <div className="aspect-video relative overflow-hidden bg-zinc-50 border-b border-zinc-50 select-none">
              {item.mediaUrl ? (
                <img src={item.mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300 bg-gradient-to-br from-zinc-50 to-zinc-100">
                  <Instagram className="w-12 h-12 stroke-1" />
                </div>
              )}
              {/* Floating Platform Tag */}
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-black text-blue-600 uppercase tracking-widest shadow-sm">
                  {item.platform}
                </span>
              </div>
              <button 
                onClick={() => setSelectedItem(item)}
                className="absolute inset-0 bg-zinc-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-xs"
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg text-zinc-900 group-hover:scale-110 transition-transform">
                  <Eye className="w-5 h-5" />
                </div>
              </button>
            </div>
            
            {/* Description and Title */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter truncate max-w-[150px]">
                    {clients[item.clientId] || 'Carregando...'}
                  </p>
                  <span className="text-[9px] font-mono font-bold text-zinc-400">
                    SLA: {format(new Date(item.publishDate), 'dd MMM yyyy')}
                  </span>
                </div>
                <h4 className="font-bold text-zinc-900 text-lg leading-snug tracking-tight mt-1 truncate">
                  {item.title}
                </h4>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mt-2 select-none pointer-events-none">
                  {item.caption || 'Sem legenda associada.'}
                </p>
              </div>

              {/* Footer and primary revision actions */}
              <div className="mt-6 pt-4 border-t border-zinc-50/80 flex items-center justify-between">
                <span className="text-[9px] font-mono bg-zinc-50 text-zinc-500 px-2.5 py-1 rounded-lg border border-zinc-100 font-extrabold uppercase">
                  {item.type}
                </span>
                <button 
                  onClick={() => setSelectedItem(item)}
                  className="px-4.5 py-2.0 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                >
                  Abrir Console
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        
        {filteredContents.length === 0 && (
          <div className="col-span-full py-24 text-center bg-zinc-50/50 rounded-[32px] border border-dashed border-zinc-200/80 flex flex-col items-center justify-center">
            <CheckCircle className="w-14 h-14 text-emerald-100 mb-4" />
            <p className="text-zinc-500 font-mono font-black uppercase text-xs tracking-[0.15em]">Nada pendente aqui!</p>
            <p className="text-zinc-400 text-xs mt-1.5 font-medium">Sua fila de revisão está impecável e atualizada.</p>
          </div>
        )}
      </div>

      {/* GIANT HIGH-FIDELITY MEDIA REVIEW CONSOLE (MODAL WRAPPER) */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-white w-full max-w-7xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[88vh]"
            >
              
              {/* LEFT CANVAS: Gigante Media Preview with Visual marker annotations */}
              <div className="flex-1 bg-zinc-950 flex flex-col justify-between p-6 relative select-none">
                
                {/* Media header instructions */}
                <div className="flex items-center justify-between text-white border-b border-white/5 pb-4 z-10">
                  <div className="flex items-center space-x-3">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-300 uppercase">
                      Clique em qualquer ponto do criativo para ancorar um feedback visual ({visualMarkers.length} anotados)
                    </span>
                  </div>
                  <div className="flex space-x-1.5 text-[10px] font-mono text-zinc-400">
                    <button 
                      onClick={() => setVersionIndex(0)}
                      className={cn("px-2.5 py-1.0 rounded-lg", versionIndex === 0 ? "bg-white/10 text-white font-extrabold" : "")}
                    >
                      v1
                    </button>
                    <button 
                      onClick={() => setVersionIndex(1)}
                      className={cn("px-2.5 py-1.0 rounded-lg", versionIndex === 1 ? "bg-white/10 text-white font-extrabold" : "")}
                    >
                      v2 (Atual)
                    </button>
                  </div>
                </div>

                {/* Giant canvas frame */}
                <div className="flex-1 flex items-center justify-center relative overflow-hidden my-4">
                  <div 
                    onClick={handleCanvasClick}
                    className="relative cursor-crosshair max-w-full max-h-[60vh] select-none shadow-2xl"
                  >
                    {selectedItem.mediaUrl ? (
                      <img 
                        ref={imageRef}
                        src={selectedItem.mediaUrl} 
                        className="max-w-full max-h-[58vh] object-contain rounded-2xl border border-white/5 pointer-events-auto" 
                        alt="media review" 
                      />
                    ) : (
                      <div className="w-[300px] h-[400px] rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-mono text-xs">
                        PRÉVIA DA ARTE
                      </div>
                    )}

                    {/* Render visual pulsing markers */}
                    {visualMarkers.map((marker) => (
                      <div 
                        key={marker.id}
                        style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                        className="absolute w-7 h-7 -ml-3.5 -mt-3.5 bg-rose-600 rounded-full text-white font-mono text-[10px] font-black flex items-center justify-center border-2 border-white cursor-pointer hover:scale-125 transition-transform group shadow-lg shadow-rose-600/30"
                        title={`${marker.author}: ${marker.text}`}
                      >
                        <Pin className="w-3.5 h-3.5 fill-white" />
                        
                        {/* Hover comment bubble */}
                        <div className="absolute left-8 bg-zinc-900 text-white rounded-xl p-3 w-56 text-xs leading-normal opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity border border-zinc-800 z-50 shadow-2xl text-left font-sans select-text">
                          <p className="font-extrabold text-[10px] text-zinc-400 font-mono flex items-center justify-between mb-0.5">
                            <span>{marker.author}</span>
                            <span>{marker.time}</span>
                          </p>
                          <p className="font-semibold text-zinc-100">{marker.text}</p>
                        </div>
                      </div>
                    ))}

                    {/* Active drafting marker marker */}
                    {activeDraftCoords && (
                      <div 
                        style={{ left: `${activeDraftCoords.x}%`, top: `${activeDraftCoords.y}%` }}
                        className="absolute w-7 h-7 -ml-3.5 -mt-3.5 bg-blue-600 rounded-full text-white flex items-center justify-center border-2 border-white z-40 animate-bounce cursor-pointer shadow-lg shadow-blue-500/50"
                      >
                        <PenTool className="w-3.5 h-3.5 fill-white animate-pulse" />
                        
                        {/* Interactive draft input block overlay */}
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-9 bg-white text-zinc-900 rounded-[20px] p-3.5 w-64 border border-zinc-150 z-50 text-left font-sans shadow-2xl shrink-0"
                        >
                          <h5 className="text-[9px] font-mono font-black text-zinc-450 uppercase mb-2">Comentário Ancorado ({activeDraftCoords.x}%, {activeDraftCoords.y}%)</h5>
                          <form onSubmit={handleSaveMarker} className="space-y-2">
                            <input 
                              type="text"
                              autoFocus
                              placeholder="Descreva o ajuste cirúrgico..."
                              value={markerDraftText}
                              onChange={(e) => setMarkerDraftText(e.target.value)}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-zinc-800 font-semibold"
                            />
                            <div className="flex space-x-2.5">
                              <button 
                                type="button"
                                onClick={() => setActiveDraftCoords(null)}
                                className="px-2.5 py-1.5 bg-zinc-50 text-zinc-400 font-bold rounded-lg text-[9px] uppercase tracking-tighter"
                              >
                                Canc
                              </button>
                              <button 
                                type="submit"
                                className="flex-1 py-1.5 bg-blue-600 font-bold text-white rounded-lg text-[9px] uppercase tracking-wider text-center"
                              >
                                Salvar Marca
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer specs metadata */}
                <div className="z-10 bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex items-center justify-between text-zinc-400 text-[9px] font-mono">
                  <span>Operação: Auditoria de Agência</span>
                  <span>Dispositivo: Render Mock</span>
                </div>
              </div>

              {/* RIGHT REVIEW AUDIT CONTROLS (COMMENTS / DETAILS / STATS) */}
              <div className="w-full lg:w-[460px] p-8 flex flex-col bg-white overflow-y-auto border-l border-zinc-100 justify-between">
                
                {/* Header review details */}
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-extrabold text-blue-600 tracking-wider uppercase block mb-1">
                        {clients[selectedItem.clientId]}
                      </span>
                      <h3 className="text-xl font-bold text-zinc-900 leading-snug tracking-tight">
                        {selectedItem.title}
                      </h3>
                      <div className="flex items-center space-x-2.5 text-[10px] font-mono text-zinc-400 mt-1.5 uppercase font-bold">
                        <span>{selectedItem.platform} • {selectedItem.type}</span>
                        <span>•</span>
                        <span>Publica {format(new Date(selectedItem.publishDate), 'dd/MM')}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedItem(null)}
                      className="p-1.5 hover:bg-zinc-50 rounded-full transition border border-zinc-100"
                    >
                      <X className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>

                  {/* Core Review Navigation Tabs */}
                  <div className="flex bg-zinc-100 p-1.0 rounded-xl mb-6 text-xs text-zinc-600 font-bold border border-zinc-200/30">
                    <button 
                      onClick={() => setActiveTabPanel('creative')}
                      className={cn("flex-1 py-1.5 rounded-lg text-center transition-all", activeTabPanel === 'creative' ? "bg-white text-zinc-900 shadow-xs font-extrabold" : "text-zinc-400")}
                    >
                      Legenda & Copy
                    </button>
                    <button 
                      onClick={() => setActiveTabPanel('timeline')}
                      className={cn("flex-1 py-1.5 rounded-lg text-center transition-all", activeTabPanel === 'timeline' ? "bg-white text-zinc-900 shadow-xs font-extrabold" : "text-zinc-400")}
                    >
                      Histórico ({mockTimelineHistory.length})
                    </button>
                    <button 
                      onClick={() => setActiveTabPanel('checklist')}
                      className={cn("flex-1 py-1.5 rounded-lg text-center transition-all", activeTabPanel === 'checklist' ? "bg-white text-zinc-900 shadow-xs font-extrabold" : "text-zinc-400")}
                    >
                      Checklist
                    </button>
                  </div>

                  {/* CONTENT CORRESPONDING TO THE TABS */}
                  <div className="space-y-6 max-h-[38vh] overflow-y-auto pr-1">
                    
                    {activeTabPanel === 'creative' && (
                      <>
                        {/* Copy guidelines section */}
                        <div>
                          <span className="text-[9px] font-mono font-black text-zinc-400 uppercase tracking-widest block mb-2">
                            Copys / Legenda de publicação
                          </span>
                          <div className="bg-blue-50/10 p-5 rounded-3xl border border-blue-100/30 text-xs text-zinc-800 font-semibold leading-relaxed whitespace-pre-wrap select-text">
                            {selectedItem.caption || 'Nenhuma legenda atrelada.'}
                          </div>
                          {selectedItem.hashtags && (
                            <p className="text-[10px] text-blue-600 font-mono font-bold mt-2 break-all select-text">
                              {selectedItem.hashtags}
                            </p>
                          )}
                        </div>

                        {/* Conception details section */}
                        {selectedItem.script && (
                          <div>
                            <span className="text-[9px] font-mono font-black text-zinc-400 uppercase tracking-widest block mb-2">
                              Roteiro Criativo e Direcionamento
                            </span>
                            <div className="bg-zinc-50 p-4 rounded-2xl text-xs font-normal text-zinc-650 italic leading-relaxed whitespace-pre-wrap">
                              {selectedItem.script}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {activeTabPanel === 'timeline' && (
                      <div className="space-y-4">
                        <span className="text-[9px] font-mono font-black text-zinc-400 uppercase tracking-widest block mb-1">Linha do Tempo de Alterações</span>
                        <div className="relative pl-5 space-y-5 border-l-2 border-zinc-100">
                          {mockTimelineHistory.map((historyItem, index) => (
                            <div key={index} className="relative text-left">
                              {/* Glowing circle indicator */}
                              <span className={cn(
                                "absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10",
                                historyItem.active ? "bg-blue-500 ring-4 ring-blue-100" : "bg-zinc-300"
                              )}></span>
                              <div className="text-xs">
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-zinc-800">{historyItem.version}</span>
                                  <span className="text-[9px] text-zinc-400 font-mono font-medium">• {historyItem.time}</span>
                                </div>
                                <p className="text-zinc-600 leading-normal mt-0.5">{historyItem.action}</p>
                                <p className="text-[9px] text-zinc-400 font-mono mt-0.5">Por {historyItem.author}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTabPanel === 'checklist' && (
                      <div className="space-y-3.5">
                        <span className="text-[9px] font-mono font-black text-zinc-400 uppercase tracking-widest block mb-1">Checks Manuais de Qualidade</span>
                        {mockChecklistItems.map((checklistObj, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-100/50 text-xs">
                            <span className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center border shrink-0",
                              checklistObj.checked ? "bg-emerald-50 text-emerald-500 border-emerald-200" : "bg-white text-zinc-300 border-zinc-200"
                            )}>
                              {checklistObj.checked ? <Check className="w-3.5 h-3.5" /> : <X className="w-3" />}
                            </span>
                            <span className="font-bold text-zinc-700">{checklistObj.task}</span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Decision select input block */}
                  <div className="border-t border-zinc-120 pt-5 mt-5 space-y-4">
                    <span className="text-[9px] font-mono font-black text-zinc-400 uppercase tracking-widest block">Configurar Parecer de Auditoria</span>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => setSelectedActionType('approved')}
                        className={cn(
                          "py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-tight flex flex-col items-center justify-center gap-1.5 transition-all",
                          selectedActionType === 'approved' ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs" : "bg-zinc-50 text-zinc-500 border-zinc-200/60"
                        )}
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        Aprovar Total
                      </button>

                      <button 
                        onClick={() => setSelectedActionType('approved_partial')}
                        className={cn(
                          "py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-tight flex flex-col items-center justify-center gap-1.5 transition-all",
                          selectedActionType === 'approved_partial' ? "bg-amber-50 text-amber-700 border-amber-300 shadow-xs" : "bg-zinc-50 text-zinc-500 border-zinc-200/60"
                        )}
                      >
                        <Clock className="w-4 h-4 text-amber-500" />
                        Com Ressalvas
                      </button>

                      <button 
                        onClick={() => setSelectedActionType('revision')}
                        className={cn(
                          "py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-tight flex flex-col items-center justify-center gap-1.5 transition-all",
                          selectedActionType === 'revision' ? "bg-rose-50 text-rose-700 border-rose-300 shadow-xs" : "bg-zinc-50 text-zinc-500 border-zinc-200/60"
                        )}
                      >
                        <XCircle className="w-4 h-4 text-rose-500" />
                        Refação / Ajuste
                      </button>
                    </div>

                    {selectedActionType && (
                      <div className="pt-2 animate-fadeIn">
                        <textarea 
                          rows={2.5}
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder={
                            selectedActionType === 'approved' ? "Adicionar palavras de parabenização ou feedback (Opcional)..." :
                            selectedActionType === 'approved_partial' ? "Quais ressalvas devem ser seguidas para a liberação..." : "Descreva detalhadamente o ajuste de copy ou arte..."
                          }
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-zinc-900 font-semibold resize-none shadow-inner"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirm and Commit Auditor Decisions */}
                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-end">
                  <button 
                    disabled={!selectedActionType || isCommitingAction}
                    onClick={() => handleAction(selectedItem, selectedActionType!)}
                    className="w-full py-4 bg-zinc-950 hover:bg-zinc-850 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg hover:shadow-zinc-950/20 shadow-zinc-50"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Confirmar Parecer Crítico</span>
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
