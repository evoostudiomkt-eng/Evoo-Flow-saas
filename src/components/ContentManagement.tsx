import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  where,
  collectionGroup,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ContentItem, UserProfile, Client, ContentHistory, Task } from '../types';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Instagram,
  Video,
  Image as ImageIcon,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  History,
  Send,
  MessageSquare,
  Edit2,
  Trash2,
  Building2,
  LayoutGrid,
  Loader2,
  HardDrive,
  ShieldAlert,
  Play,
  Pause,
  Flame,
  Check,
  CheckSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getCachedToken } from '../lib/googleDriveAuth';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/activity-logger';
import { MOCK_CONTENTS, MOCK_CLIENTS, MOCK_TASKS } from '../lib/mockData';

interface ContentManagementProps {
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function ContentManagement({ profile, isDemoMode }: ContentManagementProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  // Visual Filters & View Types for modern editorial flow
  const [viewType, setViewType] = useState<'monthly' | 'weekly'>('monthly');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // States for creative workspace & premium live feedback
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isCommentPrivate, setIsCommentPrivate] = useState(false);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');
  const [activePreviewVersion, setActivePreviewVersion] = useState<number>(1);
  
  // Form states for adding content
  const [newContent, setNewContent] = useState<Partial<ContentItem>>({
    type: 'post',
    platform: 'Instagram',
    status: 'production',
    publishDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    mediaItems: []
  });

  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const handleUploadToDrive = async (e: React.ChangeEvent<HTMLInputElement>, client?: Client) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!client) {
      alert("Por favor, selecione ou certifique-se de que o cliente está selecionado.");
      return;
    }

    setIsUploadingFile(true);
    try {
      const token = getCachedToken();

      // 1. Resolve folders if they don't exist yet
      let parentFolderId = '';
      let driveVideoFolderId = client.driveVideoFolderId;
      let driveImageFolderId = client.driveImageFolderId;

      const isVideo = file.type.startsWith('video');
      const mediaType = isVideo ? 'video' : 'image';

      if (!client.driveFolderId || !driveVideoFolderId || !driveImageFolderId) {
        const setupResponse = await fetch('/api/drive/setup-client-folders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'x-google-token': token } : {})
          },
          body: JSON.stringify({ companyName: client.company }),
        });
        const setupData = await setupResponse.json();
        if (setupData.success) {
          driveVideoFolderId = setupData.driveVideoFolderId;
          driveImageFolderId = setupData.driveImageFolderId;
          
          await updateDoc(doc(db, 'clients', client.id), {
            driveFolderId: setupData.driveFolderId,
            driveVideoFolderId: setupData.driveVideoFolderId,
            driveImageFolderId: setupData.driveImageFolderId,
          });
        } else {
          throw new Error(setupData.error || 'Falha ao preparar estrutura de pastas no Drive.');
        }
      }

      parentFolderId = isVideo ? driveVideoFolderId! : driveImageFolderId!;

      // 2. Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const resultStr = reader.result as string;
          const base64 = resultStr.split(',')[1];
          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      // 3. Upload file to drive
      const uploadResponse = await fetch('/api/drive/upload-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-google-token': token } : {})
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64Data,
          mediaType,
          parentFolderId
        }),
      });

      const uploadData = await uploadResponse.json();
      if (uploadData.success) {
        setNewContent(prev => ({
          ...prev,
          mediaItems: [...(prev.mediaItems || []), { url: uploadData.url, type: mediaType, webViewLink: uploadData.webViewLink }]
        }));
        alert('Mídia enviada para o Google Drive e anexada ao conteúdo com sucesso!');
      } else {
        throw new Error(uploadData.error || 'Falha ao enviar arquivo.');
      }

    } catch (err: any) {
      alert(`Erro no upload: ${err.message}`);
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      setClients(MOCK_CLIENTS);
      if (!selectedClientId) {
        setContents([]);
      } else {
        const filtered = MOCK_CONTENTS.filter(c => c.clientId === selectedClientId);
        setContents(filtered);
      }
      return () => {};
    }

    if (!profile?.agencyId) return;

    // Fetch Clients
    const fetchClients = async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'clients'),
          where('agencyId', '==', profile.agencyId)
        ));
        setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'clients');
      }
    };
    fetchClients();

    if (!selectedClientId) {
      setContents([]);
      return () => {};
    }

    // Fetch Content based on client selection
    const q = query(
      collection(db, 'clients', selectedClientId, 'contents'),
      where('agencyId', '==', profile.agencyId)
    );

    const unsub = onSnapshot(q, (snap) => {
      setContents(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'contents');
    });

    return () => unsub();
  }, [profile.agencyId, selectedClientId, isDemoMode]);

  useEffect(() => {
    if (!selectedClientId) {
      setTasks([]);
      return () => {};
    }

    if (isDemoMode) {
      const filtered = MOCK_TASKS.filter(t => t.clientId === selectedClientId);
      setTasks(filtered);
      return () => {};
    }

    setTasksLoading(true);
    const qTasks = query(
      collection(db, 'clients', selectedClientId, 'tasks'),
      where('agencyId', '==', profile.agencyId)
    );

    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setTasksLoading(false);
    }, (err) => {
      console.error("Error loading client tasks:", err);
      setTasksLoading(false);
    });

    return () => unsubTasks();
  }, [profile.agencyId, selectedClientId, isDemoMode]);

  useEffect(() => {
    if (selectedItem) {
      setActiveMediaIndex(0);
      setActivePreviewVersion(selectedItem.currentVersion || 1);
    }
  }, [selectedItem?.id, selectedItem?.currentVersion]);

  const handleAddContent = async () => {
    if (!profile || !selectedClientId) {
      alert('Selecione um cliente para prosseguir.');
      return;
    }

    const targetClient = selectedClientId;

    const contentData = {
      ...newContent,
      clientId: targetClient,
      agencyId: profile.agencyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{
        status: 'production',
        note: 'Conteúdo criado e em produção',
        updatedAt: new Date().toISOString(),
        updatedBy: profile.displayName
      }]
    };

    if (isDemoMode) {
      const added: ContentItem = {
        id: `content_demo_${Date.now()}`,
        ...(contentData as any)
      };
      setContents(prev => [...prev, added]);
      setIsAddModalOpen(false);
      setNewContent({
        type: 'post',
        platform: 'Instagram',
        status: 'production',
        publishDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        mediaItems: []
      });
      setNewMediaUrl('');
      return;
    }

    try {
      await addDoc(collection(db, 'clients', targetClient, 'contents'), contentData);
      await logActivity(profile, `criou novo conteúdo: ${contentData.title}`, 'new', 'content', targetClient);
      
      setIsAddModalOpen(false);
      setNewContent({
        type: 'post',
        platform: 'Instagram',
        status: 'production',
        publishDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        mediaItems: []
      });
      setNewMediaUrl('');
    } catch (err) {
      console.error(err);
    }
  };

  const updateContentItem = async (updated: ContentItem) => {
    if (isDemoMode) {
      setContents(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelectedItem(updated);
      return;
    }
    try {
      const itemRef = doc(db, 'clients', updated.clientId, 'contents', updated.id);
      await updateDoc(itemRef, updated as any);
      setSelectedItem(updated);
    } catch (err) {
      console.error("Error updating content item:", err);
    }
  };

  const updateStatus = async (item: ContentItem, newStatus: ContentItem['status'], note: string) => {
    const historyItem: ContentHistory = {
      status: newStatus,
      note,
      updatedAt: new Date().toISOString(),
      updatedBy: profile.displayName
    };

    if (isDemoMode) {
      setContents(prev => prev.map(c => c.id === item.id ? { ...c, status: newStatus, history: [...(c.history || []), historyItem], updatedAt: new Date().toISOString() } : c));
      setSelectedItem(prev => prev ? { ...prev, status: newStatus, history: [...(prev.history || []), historyItem] } : null);
      return;
    }

    try {
      const itemRef = doc(db, 'clients', item.clientId, 'contents', item.id);
      await updateDoc(itemRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        history: arrayUnion(historyItem)
      });

      await logActivity(profile, `alterou status do conteúdo: ${item.title} para ${newStatus}`, item.id, 'content', item.clientId);
      setSelectedItem(prev => prev ? { ...prev, status: newStatus, history: [...(prev.history || []), historyItem] } : null);
    } catch (err) {
      console.error(err);
    }
  };

  // Roles check
  const isClientRole = profile.role === 'client';

  // Apply visibility rules for CLIENT vs AGENCY:
  // Customers only see contents waiting for approval, approved, scheduled, or published.
  const visibleContents = contents.filter(c => {
    if (isClientRole) {
      return ['approval', 'approved', 'scheduled', 'published'].includes(c.status);
    }
    return true; // Agency sees all content, from creation to publication
  });

  // Extract unique assignees from contents for dropdown filtering
  const uniqueAssignees = Array.from(new Set(contents.map(c => c.assignee).filter(Boolean))) as string[];

  // Filtered Content based on user inputs
  const filteredContents = visibleContents.filter(c => {
    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    // Platform filter
    if (platformFilter !== 'all' && c.platform.toLowerCase() !== platformFilter.toLowerCase()) return false;
    // Assignee filter
    if (assigneeFilter !== 'all' && c.assignee !== assigneeFilter) return false;
    // Search filter
    if (searchFilter.trim() !== '') {
      const q = searchFilter.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchBriefing = c.briefing?.toLowerCase().includes(q) || false;
      const matchScript = c.script?.toLowerCase().includes(q) || false;
      return matchTitle || matchBriefing || matchScript;
    }
    return true;
  });

  // Calendar rendering logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getContentsForDay = (day: Date) => {
    return filteredContents.filter(c => isSameDay(new Date(c.publishDate), day));
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return 'Sem prazo';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  const pendingApprovals = visibleContents.filter(c => c.status === 'approval');

  // Operational delay and risk detection logic
  const isDelayed = (content: ContentItem) => {
    if (['approved', 'scheduled', 'published'].includes(content.status)) return false;
    const pubDate = new Date(content.publishDate);
    const now = new Date();
    return pubDate.getTime() < now.getTime();
  };

  const isCriticalMargin = (content: ContentItem) => {
    if (['approved', 'scheduled', 'published'].includes(content.status)) return false;
    const pubDate = new Date(content.publishDate);
    const now = new Date();
    const msRemaining = pubDate.getTime() - now.getTime();
    const hoursRemaining = msRemaining / (1000 * 60 * 60);
    return hoursRemaining > 0 && hoursRemaining <= 24;
  };

  // High quality content media thumbnails & fallback cards
  const getCardMediaPreview = (content: ContentItem) => {
    if (content.mediaItems && content.mediaItems.length > 0) {
      const item = content.mediaItems[0];
      if (item.type === 'video') {
        return (
          <div className="absolute inset-0 bg-slate-900 overflow-hidden flex items-center justify-center">
            <video src={item.url} className="w-full h-full object-cover opacity-60 pointer-events-none" muted />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
            <div className="absolute w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm z-10">
              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
            </div>
          </div>
        );
      } else {
        return (
          <div className="absolute inset-0 bg-zinc-100 overflow-hidden">
            <img src={item.url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-85" />
          </div>
        );
      }
    }

    // High fidelity premium visual styled backgrounds
    const gradients = [
      'from-blue-600 to-indigo-700',
      'from-rose-500 to-amber-500',
      'from-emerald-500 to-teal-700',
      'from-purple-600 to-fuchsia-600',
      'from-amber-500 to-orange-600'
    ];
    const charSum = content.title.charCodeAt(0) + (content.title.charCodeAt(1) || 0);
    const selectedGradient = gradients[charSum % gradients.length];

    return (
      <div className={`absolute inset-0 bg-gradient-to-br ${selectedGradient} opacity-90 flex items-center justify-center p-3`}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
        <div className="z-10 text-center select-none opacity-40 group-hover:opacity-75 transition-opacity duration-300">
          <span className="text-[9px] font-mono tracking-widest text-white/50 uppercase font-bold block mb-1">Evoo Flow</span>
          <span className="text-[10px] font-sans font-black text-white/85 line-clamp-1 truncate block px-2 leading-none uppercase">{content.type}</span>
        </div>
      </div>
    );
  };

  if (!selectedClientId) {
    return (
      <div className="space-y-8" id="client-selection-container">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight font-sans">Calendário Editorial</h2>
          <p className="text-gray-500 font-medium mt-1">Selecione um cliente para planejar cronogramas, criar roteiros e gerenciar aprovações.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <div 
              key={client.id}
              onClick={() => setSelectedClientId(client.id)}
              className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group flex flex-col justify-between min-h-[220px]"
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-[1.2rem] bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden group-hover:scale-105 transition-transform">
                    {client.logoUrl ? (
                      <img src={client.logoUrl} alt={client.company} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Building2 className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 font-sans group-hover:text-blue-600 transition-colors">
                      {client.company}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                      {client.nicheId || 'Geral/Nicho'}
                    </p>
                  </div>
                </div>

                <p className="text-gray-500 text-xs font-semibold leading-relaxed">
                  Gerencie todo o calendário de postagens, scripts de vídeo, criativos em carrossel e acompanhe as pendências para {client.company}.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Workspace Ativo</span>
                </div>
                <span className="text-xs font-black text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                  Acessar Workspace &rarr;
                </span>
              </div>
            </div>
          ))}

          {clients.length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-[2rem] border-2 border-dashed border-gray-200 text-center space-y-4">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-900">Nenhum cliente cadastrado</p>
                <p className="text-xs text-gray-400">Por favor, cadastre clientes na aba correspondente para gerenciar os roteiros.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-8" id="content-mgmt-container">
      {/* Workspace de um Cliente Selecionado */}
      <div className="flex flex-col gap-6">
        {/* Back Button and Client Header Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedClientId('')}
              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl transition-all flex items-center justify-center border border-gray-100 mr-2"
              title="Voltar para Clientes"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden">
               {selectedClient?.logoUrl ? (
                 <img src={selectedClient.logoUrl} alt={selectedClient.company} className="w-full h-full object-cover" />
               ) : (
                 <Building2 className="w-6 h-6 text-blue-600" />
               )}
            </div>
            <div>
               <div className="flex items-center space-x-2">
                 <h2 className="text-xl font-black text-gray-900 font-sans tracking-tight leading-none">{selectedClient?.company}</h2>
                 <span className="bg-blue-50 text-blue-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-100">Workspace Ativo</span>
               </div>
               <p className="text-xs text-gray-400 font-semibold mt-1">Nicho: {selectedClient?.nicheId || 'Geral/Nicho-chave'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Novo Roteiro
            </button>
          </div>
        </div>

        {/* FILTERS & VIEW MODE CONTROLLER BAR */}
        <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-[0_4px_25px_rgb(0,0,0,0.015)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left part: Search and Filters */}
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar conteúdo..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-zinc-50 border border-zinc-200 text-xs font-semibold rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-400 text-zinc-800"
              />
              {searchFilter && (
                <button onClick={() => setSearchFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 text-xs font-bold rounded-2xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-zinc-700 cursor-pointer"
            >
              <option value="all">Todas as Redes</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 text-xs font-bold rounded-2xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-zinc-700 cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              {!isClientRole && <option value="script">Fase de Roteiro</option>}
              {!isClientRole && <option value="production">Em Produção</option>}
              <option value="approval">Aguardando Aprovação</option>
              <option value="revision">Ajustes Solicitados</option>
              <option value="approved">Aprovado</option>
              <option value="scheduled">Agendado</option>
              <option value="published">Publicado</option>
            </select>

            {/* Assignee Filter (Only available to agency) */}
            {!isClientRole && uniqueAssignees.length > 0 && (
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 text-xs font-bold rounded-2xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-zinc-700 cursor-pointer"
              >
                <option value="all">Todos os Responsáveis</option>
                {uniqueAssignees.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Right part: View Switcher (Mensal vs Semanal) */}
          <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200/50 self-start md:self-auto shrink-0">
            <button
              onClick={() => setViewType('monthly')}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                viewType === 'monthly' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-650"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setViewType('weekly')}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                viewType === 'weekly' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-650"
              )}
            >
              Semanal
            </button>
          </div>
        </div>

        {/* Dynamic 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Calendar Grid Section: Col-span 2 on Desktop */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden" id="editorial-calendar">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center space-x-4 flex-wrap gap-2">
                  <h3 className="text-xl font-black text-gray-900 capitalize px-2">
                    {viewType === 'weekly' ? 'Cronograma Semanal' : format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h3>
                  <div className="flex bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                    <button 
                      onClick={() => {
                        if (viewType === 'monthly') {
                          setCurrentDate(subMonths(currentDate, 1));
                        } else {
                          // Go back 7 days
                          setCurrentDate(curr => new Date(curr.getTime() - 7 * 24 * 60 * 60 * 1000));
                        }
                      }}
                      className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600"
                    >
                      Hoje
                    </button>
                    <button 
                      onClick={() => {
                        if (viewType === 'monthly') {
                          setCurrentDate(addMonths(currentDate, 1));
                        } else {
                          // Forward 7 days
                          setCurrentDate(curr => new Date(curr.getTime() + 7 * 24 * 60 * 60 * 1000));
                        }
                      }}
                      className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="hidden sm:flex items-center space-x-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> Produção</div>
                  <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span> Aprovação</div>
                  <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Aprovado</div>
                  <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Ajustes</div>
                </div>
              </div>

              {viewType === 'weekly' ? (
                /* HIGH END WEEKLY EDITORIAL FLOW (Reportei / Frame.io style dashboard) */
                <div className="divide-y divide-zinc-100 bg-slate-50/20" id="weekly-editorial-flow">
                  {(() => {
                    const startWeek = startOfWeek(currentDate, { weekStartsOn: 0 });
                    const endWeek = endOfWeek(currentDate, { weekStartsOn: 0 });
                    const weekDays = eachDayOfInterval({ start: startWeek, end: endWeek });

                    return weekDays.map((day) => {
                      const dayContents = getContentsForDay(day);
                      return (
                        <div 
                          key={day.toString()} 
                          className={cn(
                            "p-6 transition-all flex flex-col md:flex-row gap-6 items-start",
                            isToday(day) && "bg-blue-50/15 border-l-4 border-l-blue-600"
                          )}
                        >
                          {/* Column 1: Date marker (Reportei visual accent) */}
                          <div className="md:w-36 shrink-0 flex md:flex-col items-center md:items-start justify-between gap-1 border-b md:border-b-0 md:border-r border-zinc-100 pb-3 md:pb-0 md:pr-4">
                            <div className="flex md:flex-col items-baseline md:items-start gap-1">
                              <span className={cn(
                                "text-3xl font-black font-mono tracking-tight text-slate-900 leading-none",
                                isToday(day) && "text-blue-600"
                              )}>
                                {format(day, 'd')}
                              </span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-450">
                                {format(day, 'EEEE', { locale: ptBR })}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-400 font-extrabold tracking-widest bg-zinc-50 px-2 py-0.5 rounded">
                              {format(day, "MMM yy", { locale: ptBR }).toUpperCase()}
                            </span>
                          </div>

                          {/* Column 2: Editorial grid content pipeline */}
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                            {dayContents.map((content) => (
                              <div 
                                key={content.id}
                                onClick={() => setSelectedItem(content)}
                                className="group relative h-48 bg-slate-950 rounded-2xl border border-zinc-200/55 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                              >
                                {/* Media cover background with custom placeholders */}
                                {getCardMediaPreview(content)}

                                {/* Core parameters overlay */}
                                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                                  {/* Platform badge */}
                                  <div className="w-6 h-6 rounded-full bg-slate-900/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white" title={content.platform}>
                                    {content.platform === 'Instagram' ? (
                                      <Instagram className="w-3.5 h-3.5" />
                                    ) : (
                                      <Video className="w-3.5 h-3.5 text-red-400" />
                                    )}
                                  </div>

                                  {/* Post time */}
                                  <div className="px-2 py-0.5 bg-slate-900/75 backdrop-blur-sm rounded text-[9px] font-mono font-black tracking-wider text-white border border-white/10 shrink-0">
                                    {format(new Date(content.publishDate), "HH:mm")}h
                                  </div>
                                </div>

                                {/* Content contextual titles & metrics */}
                                <div className="absolute inset-x-3 bottom-3 z-10 text-left space-y-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[8px] bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                                      {content.type === 'carrossel' ? 'Carrossel' : content.type === 'reels' ? 'Reels' : content.type === 'story' ? 'Story' : content.type === 'video' ? 'Vídeo' : 'Feed'}
                                    </span>
                                    <span className={cn(
                                      "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-mono",
                                      content.status === 'production' && "bg-blue-600/90 text-white",
                                      content.status === 'approval' && "bg-amber-500 text-black",
                                      content.status === 'approved' && "bg-emerald-600 text-white",
                                      content.status === 'revision' && "bg-rose-600 text-white",
                                      content.status === 'scheduled' && "bg-purple-600 text-white",
                                      content.status === 'published' && "bg-teal-600 text-white",
                                      content.status === 'script' && "bg-indigo-600 text-white"
                                    )}>
                                      {content.status === 'production' ? 'Em Produção' : content.status === 'approval' ? 'Aprovação' : content.status === 'approved' ? 'Aprovado' : content.status === 'revision' ? 'Ajustes' : content.status === 'scheduled' ? 'Agendado' : content.status === 'published' ? 'Publicado' : 'Roteiro'}
                                    </span>
                                  </div>

                                  <h4 className="text-xs font-black text-white font-sans tracking-tight leading-tight line-clamp-2">
                                    {content.title}
                                  </h4>

                                  {!isClientRole && (
                                    <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[8px] text-zinc-350 font-medium">
                                      <span className="truncate">Resp: {content.assignee || 'Agência'}</span>
                                      {isDelayed(content) ? (
                                        <span className="text-rose-400 font-bold flex items-center gap-1">
                                          <AlertCircle className="w-2.5 h-2.5 animate-pulse" /> Atrasado
                                        </span>
                                      ) : isCriticalMargin(content) ? (
                                        <span className="text-orange-400 font-bold flex items-center gap-0.5">Risco 24h</span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            {dayContents.length === 0 && (
                              <div className="col-span-full py-6 text-center text-zinc-400 text-[10px] font-mono uppercase tracking-widest border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/40 flex items-center justify-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-zinc-300" />
                                Nenhuma postagem editorial
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                /* GRID MONTHLY VIEW WITH DENSE CARD MULTI-THUMBNAILS (Notion Calendar style) */
                <div>
                  <div className="grid grid-cols-7 border-b border-gray-50">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                      <div key={day} className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/30">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 auto-rows-[160px]">
                    {days.map((day, idx) => {
                      const dayContents = getContentsForDay(day);
                      const isOutside = !isSameDay(startOfMonth(day), startOfMonth(currentDate));
                      
                      return (
                        <div 
                          key={day.toString()} 
                          className={cn(
                            "border-r border-b border-gray-50 p-2 relative group hover:bg-gray-50 transition-colors",
                            isOutside && "bg-gray-50/20 opacity-40",
                            isToday(day) && "bg-blue-50/20"
                          )}
                        >
                          <span className={cn(
                            "text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg mb-1",
                            isToday(day) ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400"
                          )}>
                            {format(day, 'd')}
                          </span>

                          <div className="space-y-1.5 overflow-y-auto max-h-[110px] scrollbar-hide">
                            {dayContents.map(content => (
                              <button 
                                key={content.id}
                                onClick={() => setSelectedItem(content)}
                                className="w-full text-left rounded-xl text-[10px] font-bold border border-zinc-200/10 transition-all duration-350 hover:scale-[1.02] active:scale-95 shadow-sm relative overflow-hidden h-9 bg-slate-950 text-white block"
                              >
                                {/* Media Backdrop thumbnail inside monthly grid */}
                                {getCardMediaPreview(content)}

                                {/* Overlay */}
                                <div className="absolute inset-0 p-1 flex items-center justify-between gap-1 bg-gradient-to-t from-black/95 via-black/45 to-transparent">
                                  <div className="flex items-center space-x-1 min-w-0">
                                    <span className="bg-slate-900/60 p-0.5 rounded-full border border-white/20 shrink-0">
                                      {content.platform === 'Instagram' ? (
                                        <Instagram className="w-2 h-2 text-white" />
                                      ) : (
                                        <Video className="w-2 h-2 text-red-500" />
                                      )}
                                    </span>
                                    <span className="truncate font-black text-[9px] text-white leading-none tracking-tight block max-w-[45px] sm:max-w-[70px]">
                                      {content.title}
                                    </span>
                                  </div>

                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse",
                                    content.status === 'production' && "bg-blue-400",
                                    content.status === 'approval' && "bg-amber-400",
                                    content.status === 'revision' && "bg-rose-500",
                                    content.status === 'approved' && "bg-emerald-400",
                                    content.status === 'scheduled' && "bg-purple-400",
                                    content.status === 'published' && "bg-teal-400",
                                    content.status === 'script' && "bg-indigo-400"
                                  )} />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Client Metrics & widgets: Col-span 1 on Desktop */}
          <div className="space-y-6">
            {/* Widget 1: Client Overview & Drive */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                Dados do Cliente
              </h3>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold">EMPRESA:</span>
                  <span className="text-gray-800 font-extrabold">{selectedClient?.company}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold">RESPONSÁVEL:</span>
                  <span className="text-gray-800 font-extrabold">{selectedClient?.name || 'Cliente'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold">ONBOARDING:</span>
                  <span className="text-gray-800 font-extrabold">Etapa {selectedClient?.onboardingStatus?.step || 1} de {selectedClient?.onboardingStatus?.totalSteps || 5}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold">GOOGLE DRIVE:</span>
                  <span className={cn(
                    "font-black uppercase text-[10px]", 
                    selectedClient?.driveFolderId ? "text-green-600" : "text-gray-400"
                  )}>
                    {selectedClient?.driveFolderId ? 'Sincronizado' : 'Não Conectado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Widget 2: Pending Approvals */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-amber-500" />
                  Aprovações Pendentes
                </h3>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  {pendingApprovals.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                {pendingApprovals.map(content => (
                  <div 
                    key={content.id} 
                    onClick={() => setSelectedItem(content)}
                    className="p-4 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-2xl cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-black text-gray-800 truncate block max-w-[150px] group-hover:text-amber-700">
                        {content.title}
                      </h4>
                      <span className="text-[8px] bg-white border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        {content.platform}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                      {content.script || 'Sem roteiro anexado.'}
                    </p>
                    <div className="pt-2 flex justify-between items-center text-[9px] text-amber-800 font-extrabold uppercase tracking-wider">
                      <span>Clique para Analisar</span>
                      <span>&rarr;</span>
                    </div>
                  </div>
                ))}

                {pendingApprovals.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-100">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto opacity-50 mb-2" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tudo em dia!</p>
                    <p className="text-[9px] text-gray-400 font-medium">Nenhum criativo aguardando aprovação.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Widget 3: Client Tasks Column */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                  Tarefas do Cliente
                </h3>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="p-4 bg-white border border-gray-100 rounded-2xl space-y-3 hover:border-gray-200 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-black text-gray-900 line-clamp-2">
                        {task.title}
                      </h4>
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider whitespace-nowrap",
                        task.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
                        task.priority === 'medium' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        "bg-blue-50 text-blue-600 border border-blue-100"
                      )}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[9px] text-gray-400 font-extrabold uppercase">
                      <span className={cn(
                        "font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100",
                        task.status === 'done' && "bg-green-50 text-green-700 border-green-100",
                        task.status === 'in_progress' && "bg-blue-50 text-blue-700 border-blue-100",
                        task.status === 'review' && "bg-amber-50 text-amber-700 border-amber-100"
                      )}>
                        {task.status === 'done' ? 'Concluída' : 
                         task.status === 'in_progress' ? 'Andamento' : 
                         task.status === 'review' ? 'Em Revisão' : 'Pendente'}
                      </span>
                      <span>Prazo: {formatDueDate(task.dueDate)}</span>
                    </div>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-100">
                    <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sem Tarefas</p>
                    <p className="text-[9px] text-gray-400 font-medium">Nenhuma tarefa ativa para este cliente.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 leading-none">Adicionar Novo Roteiro</h3>
                  <p className="text-gray-500 text-sm mt-2">Escreva o roteiro e planeje a publicação do vídeo, carrossel ou post.</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Título do Roteiro</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Roteiro e Ganchos Institucional"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newContent.title || ''}
                      onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tipo de Conteúdo</label>
                    <div className="flex space-x-2">
                      {[
                        { label: 'Vídeo', value: 'video' },
                        { label: 'Carrossel', value: 'carrossel' },
                        { label: 'Post', value: 'post' }
                      ].map(item => (
                        <button 
                          key={item.value}
                          type="button"
                          onClick={() => setNewContent({ ...newContent, type: item.value as any })}
                          className={cn(
                            "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            newContent.type === item.value ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Data de Publicação</label>
                    <input 
                      type="datetime-local" 
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newContent.publishDate}
                      onChange={(e) => setNewContent({ ...newContent, publishDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Rede Social Vinculada</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newContent.platform || 'Instagram'}
                      onChange={(e) => setNewContent({ ...newContent, platform: e.target.value })}
                    >
                      <option>Instagram</option>
                      <option>LinkedIn</option>
                      <option>TikTok</option>
                      <option>Youtube</option>
                      <option>Facebook</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Roteiro / Copy principal</label>
                  <textarea 
                    rows={6}
                    placeholder="Escreva aqui o roteiro, legenda, introdução impactante ou ganchos para retenção..."
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    value={newContent.script || ''}
                    onChange={(e) => setNewContent({ ...newContent, script: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Anexar Mídias (Fotos/Vídeos)</label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="url" 
                      placeholder="URL da imagem ou vídeo..."
                      className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                    />
                    <select 
                      className="px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newMediaType}
                      onChange={(e) => setNewMediaType(e.target.value as any)}
                    >
                      <option value="image">Imagem</option>
                      <option value="video">Vídeo</option>
                    </select>
                    <button 
                      onClick={() => {
                        if (!newMediaUrl) return;
                        setNewContent(prev => ({
                          ...prev,
                          mediaItems: [...(prev.mediaItems || []), { url: newMediaUrl, type: newMediaType }]
                        }));
                        setNewMediaUrl('');
                      }}
                      className="px-6 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase"
                    >
                      Add
                    </button>
                  </div>

                  {(() => {
                    const currentClient = clients.find(c => c.id === (selectedClientId === 'all' ? newContent.clientId : selectedClientId));
                    return currentClient ? (
                      <div className="bg-blue-50/50 border border-dashed border-blue-100 rounded-3xl p-6 mt-4 flex flex-col items-center justify-center text-center gap-4">
                        <HardDrive className="w-8 h-8 text-blue-500 animate-pulse" />
                        <div className="space-y-1">
                          <p className="text-sm font-black text-gray-900 font-sans">Salvar no Google Drive do Cliente</p>
                          <p className="text-[10px] text-gray-400 font-extrabold uppercase">Separado automaticamente por tipo e por data</p>
                        </div>
                        <label className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:bg-blue-700 transition-all">
                           Selecionar Arquivo
                           <input 
                             type="file" 
                             accept="image/*,video/*"
                             className="hidden" 
                             onChange={(e) => handleUploadToDrive(e, currentClient)}
                             disabled={isUploadingFile}
                           />
                        </label>
                        {isUploadingFile && (
                          <div className="flex items-center space-x-2 text-xs text-blue-600 font-bold">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             <span>Enviando e organizando no Google Drive...</span>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}

                  <div className="grid grid-cols-4 gap-2">
                    {newContent.mediaItems?.map((media, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        {media.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Video className="w-6 h-6" />
                          </div>
                        ) : (
                          <img src={media.url} alt="media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        )}
                        <button 
                          onClick={() => setNewContent(prev => ({
                            ...prev,
                            mediaItems: prev.mediaItems?.filter((_, i) => i !== idx)
                          }))}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-100">
                <button 
                  onClick={handleAddContent}
                  className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  Salvar no Calendário
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (() => {
          const clientObj = clients.find(c => c.id === selectedItem.clientId);
          const isClientRole = profile.role === 'client';
          
          // Calculate time remaining till publication
          const pubDate = new Date(selectedItem.publishDate);
          const now = new Date();
          const msRemaining = pubDate.getTime() - now.getTime();
          const hoursRemaining = msRemaining / (1000 * 60 * 60);
          
          // Contingency rule criteria
          const isContingencyEligible = hoursRemaining > 0 && hoursRemaining <= 24;
          const [forceContingency, setForceContingency] = useState(false);
          const activeContingencyMode = isContingencyEligible || forceContingency;

          // Status translation helper
          const getStatusDetails = (status: ContentItem['status']) => {
            switch (status) {
              case 'script':
                return { label: 'Roteiro', color: 'bg-indigo-50 border border-indigo-100 text-indigo-700', bullet: 'bg-indigo-500' };
              case 'production':
                return { label: 'Em Produção', color: 'bg-blue-[5%] border border-blue-100 text-blue-700', bullet: 'bg-blue-500' };
              case 'approval':
                return { label: 'Aguardando Cliente', color: 'bg-amber-[5%] border border-amber-200 text-amber-700', bullet: 'bg-amber-500 font-bold' };
              case 'revision':
                return { label: 'Ajustes Solicitados', color: 'bg-rose-[5%] border border-rose-200 text-rose-700', bullet: 'bg-rose-500' };
              case 'approved':
                return { label: 'Aprovado', color: 'bg-emerald-50 border border-emerald-100 text-emerald-700', bullet: 'bg-emerald-500' };
              case 'scheduled':
                return { label: 'Agendado', color: 'bg-violet-50 border border-violet-100 text-violet-700', bullet: 'bg-violet-500' };
              case 'published':
                return { label: 'Publicado', color: 'bg-teal-50 border border-teal-100 text-teal-700', bullet: 'bg-teal-500' };
              default:
                return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-700', bullet: 'bg-gray-400' };
            }
          };

          const sDetails = getStatusDetails(selectedItem.status);

          // Get checklist items with safe fallbacks
          const itemChecklist = selectedItem.checklist || [
            { text: 'Gravação da mídia de apoio', completed: true },
            { text: 'Tratamento de áudio & legentagem', completed: false },
            { text: 'Escrita de ganchos criativos secundários', completed: false },
            { text: 'Geração do link operacional de Drive', completed: false }
          ];

          // Get comments with version tag safely
          const itemComments = selectedItem.comments || [
            { id: 'c1', author: 'Evoo Studio', role: 'Diretor Geral', text: 'Roteiro finalizado, ganchos organizados para atrair grande volume de cliques nos primeiros 3 segundos.', timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), version: 'V1' },
            { id: 'c2', author: 'Evoo Studio', role: 'Equipe', text: 'Adicionamos a sugestão de CTA focada em clicar no link da bio para impulsionar agendamentos.', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), version: 'V1' }
          ];

          const currentVersionNumber = selectedItem.currentVersion || 1;

          // Handle posting comments within active visual context
          const handlePostCommentLocal = async () => {
            if (!commentText.trim()) return;
            const commentsList = [...(selectedItem.comments || itemComments)];
            const newComment = {
              id: `comment_${Date.now()}`,
              author: profile.displayName,
              role: profile.role === 'client' ? 'Cliente' : profile.role === 'admin' ? 'Agência (Admin)' : 'Agência (Equipe)',
              text: commentText,
              timestamp: new Date().toISOString(),
              version: `V${currentVersionNumber}`,
              isPrivate: profile.role !== 'client' ? isCommentPrivate : false
            };
            commentsList.push(newComment);
            
            const updated = {
              ...selectedItem,
              comments: commentsList,
              updatedAt: new Date().toISOString()
            };
            await updateContentItem(updated);
            setCommentText('');
            setIsCommentPrivate(false);
          };

          // Toggle checklist items
          const handleToggleChecklistLocal = async (idx: number) => {
            const newList = [...itemChecklist];
            newList[idx] = {
              ...newList[idx],
              completed: !newList[idx].completed
            };
            const updated = {
              ...selectedItem,
              checklist: newList,
              updatedAt: new Date().toISOString()
            };
            await updateContentItem(updated);
          };

          // Add checklist item online/offline
          const handleAddChecklistLocal = async () => {
            if (!newChecklistItemText.trim()) return;
            const newList = [...itemChecklist, { text: newChecklistItemText.trim(), completed: false }];
            const updated = {
              ...selectedItem,
              checklist: newList,
              updatedAt: new Date().toISOString()
            };
            await updateContentItem(updated);
            setNewChecklistItemText('');
          };

          // Handle upgrading version (Agência clicks this when uploading changes to prompt review)
          const handleCreateNewVersionLocal = async () => {
            const nextVer = currentVersionNumber + 1;
            const previousVersions = [...(selectedItem.versions || [])];
            
            previousVersions.push({
              version: currentVersionNumber,
              mediaUrl: selectedItem.mediaUrl,
              mediaItems: selectedItem.mediaItems || [],
              script: selectedItem.script,
              caption: selectedItem.caption,
              date: new Date().toISOString(),
              updatedBy: profile.displayName
            });

            const updated = {
              ...selectedItem,
              currentVersion: nextVer,
              versions: previousVersions,
              status: 'approval' as const, // Back to approval
              updatedAt: new Date().toISOString(),
              history: [
                ...(selectedItem.history || []),
                {
                  status: 'approval',
                  note: `Lançada nova versão V${nextVer} pela equipe da agência. Enviado para aprovação do cliente.`,
                  updatedAt: new Date().toISOString(),
                  updatedBy: profile.displayName
                }
              ]
            };
            await updateContentItem(updated);
          };

          return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 15 }}
                className="bg-white w-full max-w-7xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[90vh] border border-gray-100"
              >
                
                {/* LEFT COLUMN: VISUAL PREVIEW & SCRIPT WORKSPACE (Editorial/Product focus) */}
                <div className="lg:w-[50%] bg-slate-50 border-r border-gray-100 flex flex-col h-full relative overflow-hidden">
                  
                  {/* Content Header banner with social network info */}
                  <div className="p-6 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                        {selectedItem.platform === 'Instagram' ? (
                          <Instagram className="w-5 h-5 text-blue-600" />
                        ) : (
                          <CalendarIcon className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none bg-blue-50 px-2 py-0.5 rounded">
                            {selectedItem.platform}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">&#8226; {selectedItem.type.toUpperCase()}</span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 leading-tight mt-1">{selectedItem.title}</h4>
                      </div>
                    </div>
                    
                    {/* Media Type status indicator */}
                    <div className="flex items-center space-x-2">
                      <span className={cn("px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider", sDetails.color)}>
                        {sDetails.label}
                      </span>
                      <button 
                        onClick={() => setSelectedItem(null)} 
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Responsive Scrollable Preview Body */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-20">
                    
                    {/* IF STATUS IS "SCRIPT" (ROTEIRO), show elegant script notepad */}
                    {selectedItem.status === 'script' ? (
                      <div className="bg-amber-50/45 p-8 rounded-[1.8rem] border border-amber-200/50 shadow-inner block max-w-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/10 rounded-full blur-2xl pointer-events-none"></div>
                        
                        <div className="border-b border-amber-200/60 pb-4 mb-6 flex justify-between items-center">
                          <span className="font-mono text-[9px] font-extrabold uppercase tracking-widest text-amber-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Caderno de Roteiros &amp; Copys (v{currentVersionNumber})
                          </span>
                          <span className="bg-amber-100 text-amber-900 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded">PRODUÇÃO INICIAL</span>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-900/60 mb-2 font-mono">Briefing Inicial</h5>
                            <p className="text-slate-800 text-xs font-semibold leading-relaxed bg-[#ffffffbb] p-4 rounded-xl border border-amber-100">
                              {selectedItem.briefing || 'Nenhum briefing extra fornecido pela agência. Focado em atração orgânica e autoridade de marca.'}
                            </p>
                          </div>

                          <div>
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-900/60 mb-2 font-mono">Roteiro Visual &amp; Cenas</h5>
                            <div className="text-slate-800 text-xs font-medium leading-relaxed bg-[#ffffffbb] p-5 rounded-2xl border border-amber-100 whitespace-pre-wrap font-sans">
                              {selectedItem.script || 'Aguardando escrita do roteiro.'}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-900/60 mb-2 font-mono">Legenda Principal / Copy</h5>
                              <div className="text-slate-800 text-xs font-medium leading-relaxed bg-[#ffffffbb] p-4 rounded-xl border border-amber-100 whitespace-pre-wrap">
                                {selectedItem.caption || 'Sem legenda cadastrada.'}
                              </div>
                            </div>
                            <div>
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-900/60 mb-2 font-mono">Chamada para Ação (CTA)</h5>
                              <div className="text-slate-800 text-xs font-bold leading-relaxed bg-amber-100/30 p-4 rounded-xl border border-amber-200/40 text-amber-900">
                                {selectedItem.cta || 'Ex: "Comente CONECTAR abaixo para receber uma demonstração no direct!"'}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex justify-between items-center text-[10px] text-amber-900/40 font-mono">
                            <span>Responsável: {selectedItem.assignee || 'Equipe Editorial'}</span>
                            <span>Prazo Alocado: {format(pubDate, 'dd/MM/yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ELIF ALREADY IN PRODUCTION OR AWAITING APPROVAL, SHOW METICULOUS MEDIA PREVIEWS */
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">Visualizador de Entrega de Mídia</h4>
                          <span className="text-[10px] text-gray-400 font-bold">Mapeado direto de Frame.io e Drive</span>
                        </div>

                        {/* RENDER MEDIA TYPES */}
                        {(() => {
                          const mediaList = selectedItem.mediaItems || [];
                          
                          if (mediaList.length === 0) {
                            return (
                              <div className="aspect-video bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center gap-3 shadow-inner">
                                <ImageIcon className="w-10 h-10 text-gray-300" />
                                <div>
                                  <p className="text-xs font-black text-slate-800">Nenhum arquivo final foi renderizado</p>
                                  <p className="text-[10px] text-slate-400 mt-1">O time da agência está produzindo o material. Você pode revisar o roteiro ao lado.</p>
                                </div>
                              </div>
                            );
                          }

                          const activeMedia = mediaList[activeMediaIndex] || mediaList[0];

                          return (
                            <div className="space-y-4">
                              {/* Central Active Preview frame */}
                              <div className="relative rounded-[2rem] overflow-hidden bg-slate-900 border border-slate-800 shadow-xl aspect-video md:aspect-square max-w-[450px] mx-auto flex items-center justify-center group">
                                {activeMedia.type === 'video' ? (
                                  /* Custom high fidelity simulated vertical Reels/Video player */
                                  <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                                    <video 
                                      src={activeMedia.url} 
                                      className="w-full h-full object-cover opacity-80"
                                      controls
                                    />
                                    {/* Vertical player aesthetic side elements */}
                                    <div className="absolute right-4 bottom-16 flex flex-col items-center space-y-4 text-white z-10 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none">
                                      <div className="bg-black/50 p-2.5 rounded-full backdrop-blur-md flex flex-col items-center">
                                        <div className="w-5 h-5 rounded-full bg-blue-500" />
                                        <span className="text-[8px] font-bold mt-1">Reels</span>
                                      </div>
                                    </div>
                                    <div className="absolute bottom-4 left-4 right-4 z-10 text-white text-xs bg-slate-900/60 p-3 rounded-xl backdrop-blur-sm pointer-events-none text-left">
                                      <p className="font-bold">@evoo_flow</p>
                                      <p className="text-[10px] text-gray-300 mt-1 line-clamp-1">{selectedItem.title}</p>
                                    </div>
                                  </div>
                                ) : (
                                  /* Image Preview */
                                  <img 
                                    src={activeMedia.url} 
                                    alt="Content artwork" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                              </div>

                              {/* Multi-item micro-carousel nav */}
                              {mediaList.length > 1 && (
                                <div className="flex justify-center items-center space-x-3 bg-white p-3 rounded-2xl border border-gray-100 max-w-sm mx-auto shadow-sm">
                                  <button 
                                    disabled={activeMediaIndex === 0}
                                    onClick={() => setActiveMediaIndex(prev => prev - 1)}
                                    className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <span className="text-[10px] font-mono text-gray-500 font-extrabold uppercase">
                                    Carrossel {activeMediaIndex + 1} de {mediaList.length}
                                  </span>
                                  <button 
                                    disabled={activeMediaIndex === mediaList.length - 1}
                                    onClick={() => setActiveMediaIndex(prev => prev + 1)}
                                    className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Secondary Details accordion under visual layout */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 text-left">
                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Legenda Final Programada</h5>
                          <div className="bg-gray-50 p-4 rounded-xl text-xs font-semibold text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                            {selectedItem.caption || 'Sem legenda definida.'}
                            {selectedItem.hashtags && (
                              <p className="text-blue-600 mt-2 font-medium">{selectedItem.hashtags}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operational checklist slider bottom corner */}
                  <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 z-10 flex justify-between items-center px-6">
                    <span className="text-[10px] font-bold text-gray-400 font-mono">EVOO FLOW CLIENT-PORTAL CORE</span>
                    <span className="text-[10px] text-green-600 flex items-center font-bold tracking-tight gap-1 bg-green-50 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Canal de Verificação Sincronizado
                    </span>
                  </div>
                </div>

                {/* RIGHT COLUMN: WORKSPACE DATA, DECISION CENTER AND FEEDBACK (CINEMATOGRAPHIC FLOW) */}
                <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-8 h-full bg-white">
                  
                  {/* METRIC / VERSION SWITCHER TABS */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Controle de Iterações</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="font-mono text-xs text-blue-600 font-black">VERSÃO ATIVA:</span>
                        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                          <button className="px-3 py-1 bg-white text-blue-700 font-black text-[10px] rounded shadow-sm">
                            V{currentVersionNumber}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Button trigger for Agência user to upload a V2 / V3 to customers */}
                    {!isClientRole && (
                      <button 
                        onClick={handleCreateNewVersionLocal}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 border border-slate-750"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" />
                        Subir Nova Versão (V{currentVersionNumber + 1})
                      </button>
                    )}
                  </div>

                  {/* APPROVAL DECISION CENTER - STRICT BUSINESS REQUISITION */}
                  <div className="rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-left">
                    <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                        Painel de Decisões do Cliente
                      </h4>
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded leading-none">
                        REGRAS E EXCEÇÕES
                      </span>
                    </div>

                    <div className="p-6 space-y-6">
                      
                      {/* EMERGENCY CONTINGENCY SYSTEM ALERT IF LESS THAN 24H */}
                      {activeContingencyMode && (
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3 relative overflow-hidden animate-pulse">
                          <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                            <Flame className="w-24 h-24" />
                          </div>
                          
                          <div className="flex items-start space-x-3">
                            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-black text-amber-900 tracking-wide uppercase leading-none">
                                🚨 MODO DE CONTINGÊNCIA / APROVAÇÃO EMERGENCIAL ATIVADO
                              </h5>
                              <p className="text-[10px] text-amber-700 font-semibold leading-relaxed mt-2">
                                Faltam menos de 24 horas para a data programada para publicação ({format(pubDate, "dd/MM 'às' HH:mm")}h), ou o modo manual de demonstração foi ativado. O controle de contingência autoriza a agência a aprovar, ajustar ou forçar status.
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-amber-200 flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                updateStatus(selectedItem, 'approved', '[Contingência] Forçado para APROVADO pela agência devido ao prazo emergencial.');
                                if (forceContingency) setForceContingency(false);
                              }}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                            >
                              Aprovar por Contingência
                            </button>
                            <button
                              onClick={() => {
                                updateStatus(selectedItem, 'published', '[Contingência] Publicado diretamente via módulo emergencial para rede social.');
                                if (forceContingency) setForceContingency(false);
                              }}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                            >
                              Publicar Imediadamente (Force)
                            </button>
                            <button
                              onClick={() => {
                                updateStatus(selectedItem, 'revision', '[Contingência] Marcado para revisão interna crítica.');
                                if (forceContingency) setForceContingency(false);
                              }}
                              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                            >
                              Sinalizar Trava
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STANDARD DECISION BEHAVIOR */}
                      {selectedItem.status === 'approval' ? (
                        <div className="space-y-4">
                          {isClientRole ? (
                            /* If standard CLIENT user logged in: they have absolute approval auth */
                            <div className="space-y-4">
                              <div className="p-4 bg-blue-[3%] border border-blue-100 rounded-xl">
                                <p className="text-xs font-black text-slate-800">Sua autorização é requerida:</p>
                                <p className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">
                                  Como proprietário e aprovador oficial, certifique-se de que os briefings, a mídia entregue e ganchos de vídeo atendem à identidade de sua marca antes de clicar em autorizar.
                                </p>
                              </div>

                              <div className="flex gap-3">
                                <button
                                  onClick={() => updateStatus(selectedItem, 'approved', 'Conteúdo homologado e aprovado do cliente pelo portal oficial.')}
                                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-100 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                                >
                                  <Check className="w-4 h-4" />
                                  Aprovar Criativo
                                </button>
                                <button
                                  onClick={() => updateStatus(selectedItem, 'revision', 'Ajustes de roteiro solicitados pelo cliente.')}
                                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-100 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Solicitar Ajustes
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* If AGENCY user standard view: Display lock state warning */
                            <div className="p-5 bg-amber-50/50 border border-amber-200 text-amber-900 rounded-2xl space-y-4">
                              <div className="flex items-center space-x-2">
                                <ShieldAlert className="w-4.5 h-4.5 text-amber-600" />
                                <span className="text-[10px] font-black uppercase tracking-wider">RESTRITO À APROVAÇÃO DO CLIENTE</span>
                              </div>
                              <p className="text-[10px] text-amber-800 leading-relaxed font-semibold">
                                Sob condições padrão do EVOO Flow, apenas o cliente possui credenciais e autoridade oficial para homologar esse criativo.
                              </p>

                              {!activeContingencyMode && (
                                <div className="pt-3 border-t border-amber-200 flex justify-between items-center bg-transparent">
                                  <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest font-mono">Simulador de Crise:</span>
                                  <button
                                    onClick={() => setForceContingency(true)}
                                    className="px-3 py-1.5 bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest rounded-lg pointer hover:bg-slate-800 transition-colors"
                                  >
                                    Ativar Contingência Manual &larr;
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* If already Approved or in other states */
                        <div className="p-4 bg-blue-[3%] border border-blue-100 text-slate-700 rounded-2xl flex items-center justify-between text-xs gap-4">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <div>
                              <p className="font-black text-slate-800 uppercase text-[10px] tracking-wider">Estágio de Fluxo: {selectedItem.status.toUpperCase()}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-medium">Você pode emitir novos comentários colaborativos no chat permanente ao lado.</p>
                            </div>
                          </div>
                          
                          {/* If agency, let them reset to approval or mark published */}
                          {!isClientRole && (
                            <select
                              value={selectedItem.status}
                              onChange={(e) => updateStatus(selectedItem, e.target.value as any, `Status alterado manualmente pelo especialista para ${e.target.value}.`)}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 focus:outline-none"
                            >
                              <option value="script">Roteiro</option>
                              <option value="production">Em Produção</option>
                              <option value="approval">Aguardando Aprovação</option>
                              <option value="revision">Ajustes Solicitados</option>
                              <option value="approved">Aprovado</option>
                              <option value="scheduled">Agendado</option>
                              <option value="published">Publicado</option>
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COMENTÁRIOS E REVISÕES - FIGS & FRAME STYLE THREAD */}
                  <div className="rounded-3xl border border-gray-100 shadow-sm flex flex-col max-h-[440px] text-left">
                    <div className="p-4 bg-gray-50/55 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        Comentários &amp; Threads Colaborativas 
                        {(() => {
                          const list = itemComments.filter((cmt: any) => !(isClientRole && cmt.isPrivate));
                          return ` (${list.length})`;
                        })()}
                      </h4>
                      <span className="text-[9px] font-black text-gray-400 uppercase font-mono">
                        Evoo Collab System
                      </span>
                    </div>

                    {/* Scrollable chat feedback */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[220px]">
                      {itemComments
                        .filter((cmt: any) => !(isClientRole && cmt.isPrivate))
                        .map((cmt: any, i: number) => {
                          const isCmtClient = cmt.role === 'Cliente';
                          return (
                            <div key={cmt.id || i} className={cn("flex space-x-3 items-start group", cmt.isPrivate && "opacity-95")}>
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold uppercase border shadow-sm flex-shrink-0",
                                isCmtClient ? "bg-purple-100 border-purple-200 text-purple-700" : "bg-blue-100 border-blue-200 text-blue-700",
                                cmt.isPrivate && "bg-amber-100 border-amber-300 text-amber-800"
                              )}>
                                {cmt.author.substring(0, 1)}
                              </div>
                              <div className={cn(
                                "flex-1 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100",
                                cmt.isPrivate && "bg-amber-50/40 border-amber-200/50"
                              )}>
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center space-x-2">
                                    <span className={cn("text-[9px] font-black uppercase tracking-wider", isCmtClient ? "text-purple-700" : "text-slate-800")}>
                                      {cmt.author} <span className="text-[8px] text-gray-400 font-bold font-mono">({cmt.role})</span>
                                    </span>
                                    {cmt.isPrivate && (
                                      <span className="text-[8px] font-mono font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded leading-none shrink-0 border border-amber-250 animate-pulse">
                                        Interno / Privado
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[8px] bg-slate-200/60 text-slate-500 font-extrabold px-1 rounded font-mono leading-none">
                                      {cmt.version || 'V1'}
                                    </span>
                                    <span className="text-[8px] text-gray-400 font-bold font-mono">
                                      {cmt.timestamp ? format(new Date(cmt.timestamp), 'HH:mm') : '00:05'}h
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed font-semibold">{cmt.text}</p>
                              </div>
                            </div>
                          );
                        })}

                      {itemComments.filter((cmt: any) => !(isClientRole && cmt.isPrivate)).length === 0 && (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-gray-100">
                          <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-1 opacity-50" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">Nenhum comentário visível</p>
                          <p className="text-[9px] text-gray-400 font-medium leading-none">Escreva sua observação para compartilhar feedback.</p>
                        </div>
                      )}
                    </div>

                    {/* Write feedback input area */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50/10 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Deixe um comentário contextualizado neste post..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePostCommentLocal();
                          }}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                        />
                        <button
                          onClick={handlePostCommentLocal}
                          className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center flex-shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Only Agency users can toggle private comments */}
                      {!isClientRole && (
                        <div className="flex items-center space-x-2 px-1 pt-1 self-start select-none cursor-pointer">
                          <input 
                            type="checkbox" 
                            id="comment-private-chk"
                            checked={isCommentPrivate}
                            onChange={(e) => setIsCommentPrivate(e.target.checked)}
                            className="w-3.5 h-3.5 rounded bg-zinc-50 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <label htmlFor="comment-private-chk" className="text-[9px] uppercase font-black tracking-widest text-[#a16207] hover:text-amber-800 cursor-pointer">
                            Marcar como comentário interno (O Cliente NÃO visualiza)
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INTERACTIVE OPERATIONAL CHECKLIST - CENTRAL DE PRODUÇÃO (Hiding completely for standard client role) */}
                  {!isClientRole && (
                    <div className="rounded-3xl border border-gray-100 shadow-sm text-left">
                      <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 font-mono">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                          Checklist Operacional de Produção ({itemChecklist.filter(t => t.completed).length}/{itemChecklist.length})
                        </h4>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded leading-none">
                          PIPELINE VIVO
                        </span>
                      </div>

                      <div className="p-6 space-y-4">
                        {/* List checklist items */}
                        <div className="space-y-2.5 max-h-[150px] overflow-y-auto font-sans">
                          {itemChecklist.map((task, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => handleToggleChecklistLocal(idx)}
                              className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
                            >
                              <div className={cn(
                                "w-5 h-5 rounded-lg border flex items-center justify-center text-white transition-all shadow-sm flex-shrink-0",
                                task.completed ? "bg-green-600 border-green-600" : "border-gray-200 group-hover:border-blue-400 bg-white"
                              )}>
                                {task.completed && <Check className="w-3.5 h-3.5 font-bold" />}
                              </div>
                              <span className={cn(
                                "text-xs font-bold transition-all truncate block max-w-sm",
                                task.completed ? "line-through text-gray-400" : "text-slate-800"
                              )}>
                                {task.text}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Add quick task item box */}
                        <div className="flex gap-2 pt-2 border-t border-gray-50">
                          <input
                            type="text"
                            placeholder="Adicionar tarefa operacional rápida..."
                            value={newChecklistItemText}
                            onChange={(e) => setNewChecklistItemText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddChecklistLocal();
                            }}
                            className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <button
                            onClick={handleAddChecklistLocal}
                            className="px-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-800 active:scale-95 transition-all"
                          >
                            Mais
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AUDIT TIMELINE HISTORY LOG */}
                  <div className="rounded-3xl border border-gray-100 shadow-sm p-6 text-left space-y-4">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <History className="w-4 h-4 text-blue-600" />
                      Histórico e Audit Trail Completo
                    </h5>

                    <div className="space-y-4 max-h-[160px] overflow-y-auto custom-scrollbar">
                      {(selectedItem.history || []).slice().reverse().map((audit, i) => (
                         <div key={i} className="flex gap-3 group">
                            <div className="flex flex-col items-center">
                               <div className={cn(
                                 "w-3 h-3 rounded-full border-2 border-white shadow-sm mt-1 mb-1",
                                 audit.status === 'approved' ? "bg-emerald-500" : 
                                 audit.status === 'approval' ? "bg-amber-500 animate-pulse" :
                                 audit.status === 'revision' ? "bg-red-500" : "bg-blue-500"
                               )}></div>
                               {i < (selectedItem.history?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-gray-100 rounded-full"></div>}
                            </div>
                            <div className="flex-1 pb-2">
                               <div className="flex justify-between items-start">
                                  <p className="text-[9px] font-mono font-black text-slate-800 uppercase leading-none">
                                    Status: <span className="text-blue-600">{audit.status.toUpperCase()}</span>
                                  </p>
                                  <span className="text-[8px] font-medium text-gray-400 font-mono">
                                     {format(new Date(audit.updatedAt), 'dd/MM HH:mm')}h
                                  </span>
                               </div>
                               <p className="text-[11px] text-gray-600 mt-1 font-semibold leading-normal">{audit.note}</p>
                               <p className="text-[8px] font-extrabold text-slate-400 mt-1 uppercase font-mono">Efetuado por: {audit.updatedBy}</p>
                            </div>
                         </div>
                      ))}
                      {(!selectedItem.history || selectedItem.history.length === 0) && (
                         <div className="text-center py-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100">
                            <p className="text-[9px] font-black text-gray-450 uppercase tracking-widest">Aguardando logs de evento pioneiro</p>
                         </div>
                      )}
                    </div>
                  </div>

                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
