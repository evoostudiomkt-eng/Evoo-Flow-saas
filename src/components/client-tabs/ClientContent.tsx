import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Client, ContentItem, UserProfile } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { sendNotification, notifyAdmins } from '../../lib/notifications';
import { MOCK_CONTENTS } from '../../lib/mockData';
import { 
  Plus, 
  ExternalLink, 
  MessageSquare, 
  CheckCircle, 
  XCircle,
  Clock,
  Instagram,
  Facebook,
  Monitor,
  Type,
  Hash,
  FileText,
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientContentProps {
  client: Client;
  profile: UserProfile;
  approvalsOnly?: boolean;
  isDemoMode?: boolean;
}

export default function ClientContent({ client, profile, approvalsOnly = false, isDemoMode = false }: ClientContentProps) {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [newContent, setNewContent] = useState<Partial<ContentItem>>({ 
    title: '', 
    type: 'post', 
    platform: 'Instagram', 
    status: 'production',
    script: '',
    caption: '',
    hashtags: '',
    mediaItems: []
  });
  
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      let data = MOCK_CONTENTS.filter(item => item.clientId === client.id);
      if (approvalsOnly) {
        data = data.filter(item => item.status === 'approval');
      }
      setContents(data);
      return () => {};
    }

    let q = query(collection(db, 'clients', client.id, 'contents'));
    
    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
      if (approvalsOnly) {
        data = data.filter(item => item.status === 'approval');
      }
      setContents(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `clients/${client.id}/contents`);
    });
    return () => unsub();
  }, [client.id, approvalsOnly, isDemoMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode) {
      const added: ContentItem = {
        id: `content_demo_${Date.now()}`,
        clientId: client.id,
        title: newContent.title || 'Sem título',
        type: newContent.type || 'post',
        platform: newContent.platform || 'Instagram',
        status: newContent.status || 'production',
        script: newContent.script || '',
        caption: newContent.caption || '',
        hashtags: newContent.hashtags || '',
        mediaItems: newContent.mediaItems || [],
        mediaUrl: newContent.mediaUrl || '',
        publishDate: selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setContents(prev => [...prev, added]);
      setIsAdding(false);
      setSelectedDate(null);
      setNewContent({ title: '', type: 'post', platform: 'Instagram', status: 'production', script: '', caption: '', hashtags: '', mediaItems: [] });
      setNewMediaUrl('');
      return;
    }
    try {
      await addDoc(collection(db, 'clients', client.id, 'contents'), {
        ...newContent,
        clientId: client.id,
        publishDate: selectedDate?.toISOString() || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsAdding(false);
      setSelectedDate(null);
      setNewContent({ title: '', type: 'post', platform: 'Instagram', status: 'production', script: '', caption: '', hashtags: '', mediaItems: [] });
      setNewMediaUrl('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clients/${client.id}/contents`);
    }
  };

  const updateStatus = async (id: string, status: ContentItem['status'], feedback?: string) => {
    if (isDemoMode) {
      setContents(prev => prev.map(c => c.id === id ? { ...c, status, feedback: feedback !== undefined ? feedback : c.feedback, updatedAt: new Date().toISOString() } : c));
      setSelectedContent(null);
      return;
    }
    try {
      const updateData: any = { status, updatedAt: new Date().toISOString() };
      if (feedback !== undefined) updateData.feedback = feedback;
      await updateDoc(doc(db, 'clients', client.id, 'contents', id), updateData);
      
      const contentItem = contents.find(c => c.id === id);
      if (!contentItem) return;

      if (status === 'approval') {
        // Find client users
        const qUsers = query(collection(db, 'users'), where('clientId', '==', client.id));
        const snap = await getDocs(qUsers);
        snap.docs.forEach(u => {
          sendNotification(
            u.id,
            'Conteúdo para Aprovação',
            `O post "${contentItem.title}" está aguardando sua revisão.`,
            'content',
            'dashboard'
          );
        });
      } else if (status === 'approved' || status === 'revision') {
        await notifyAdmins(
          `Conteúdo ${status === 'approved' ? 'Aprovado' : 'Reprovado'}`,
          `O cliente ${client.company} ${status === 'approved' ? 'aprovou' : 'solicitou ajustes no'} conteúdo "${contentItem.title}".`,
          'content',
          'approval'
        );
      }

      setSelectedContent(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clients/${client.id}/contents/${id}`);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getContentsForDay = (day: Date) => contents.filter(c => isSameDay(new Date(c.publishDate), day));

  return (
    <div className="space-y-6" id="editorial-calendar">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {approvalsOnly ? 'Aguardando Aprovação' : 'Calendário Editorial'}
          </h3>
          {!approvalsOnly && (
             <div className="flex items-center space-x-4 mt-2">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full">
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <span className="font-bold text-gray-700 min-w-[140px] text-center capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
             </div>
          )}
        </div>
        
        {!approvalsOnly && profile.role !== 'client' && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center space-x-2 hover:bg-blue-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Conteúdo</span>
          </button>
        )}
      </div>

      <div className={cn(
        "grid gap-4",
        approvalsOnly ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-7"
      )}>
        {!approvalsOnly && ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase pb-2">{d}</div>
        ))}

        {!approvalsOnly && Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-gray-50/50 rounded-2xl"></div>
        ))}

        {approvalsOnly ? (
          contents.map(item => (
            <div 
              key={item.id}
              onClick={() => setSelectedContent(item)}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-blue-500 transition-all group"
            >
              <div className="aspect-video bg-gray-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                {item.mediaUrl ? (
                  <img src={item.mediaUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <CalendarIcon className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <h4 className="font-bold text-gray-900 truncate">{item.title}</h4>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{item.platform}</span>
                <span className="text-[10px] font-bold text-gray-400">{format(new Date(item.publishDate), 'dd/MM/yy')}</span>
              </div>
            </div>
          ))
        ) : (
          days.map(day => {
            const dayContents = getContentsForDay(day);
            return (
              <div 
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); setIsAdding(true); }}
                className={cn(
                  "aspect-square p-2 border rounded-2xl transition-all cursor-pointer group flex flex-col items-start space-y-1 overflow-hidden",
                  isSameDay(day, new Date()) ? "border-blue-600 bg-blue-50/30" : "border-gray-100 bg-white hover:border-blue-200"
                )}
              >
                <span className={cn(
                  "text-[10px] font-bold",
                  isSameDay(day, new Date()) ? "text-blue-600" : "text-gray-400"
                )}>{format(day, 'd')}</span>
                <div className="w-full space-y-1">
                  {dayContents.map(c => (
                    <div 
                      key={c.id} 
                      onClick={(e) => { e.stopPropagation(); setSelectedContent(c); }}
                      className={cn(
                        "w-full px-1.5 py-1 rounded text-[8px] font-bold truncate",
                        c.status === 'approved' ? "bg-green-100 text-green-700" :
                        c.status === 'approval' ? "bg-amber-100 text-amber-700" :
                        c.status === 'revision' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {c.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {selectedContent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh] lg:h-[800px]"
             >
                {/* Media Preview */}
                <div className="flex-1 bg-gray-50 flex items-center justify-center p-8 border-r border-gray-100 relative group overflow-hidden">
                  <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {selectedContent.mediaItems && selectedContent.mediaItems.length > 0 ? (
                      selectedContent.mediaItems.map((media, idx) => (
                        <div key={idx} className="relative rounded-2xl overflow-hidden shadow-lg bg-black/5">
                           {media.type === 'video' ? (
                             <video src={media.url} controls className="w-full h-auto max-h-[600px] bg-black" />
                           ) : (
                             <img src={media.url} alt="content media" className="w-full h-auto" referrerPolicy="no-referrer" />
                           )}
                        </div>
                      ))
                    ) : selectedContent.mediaUrl ? (
                      <div className="relative rounded-2xl overflow-hidden shadow-lg">
                        <img src={selectedContent.mediaUrl} className="w-full h-auto" alt="" />
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <Monitor className="w-20 h-20 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">Visualização prévia indisponível</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedContent(null)}
                    className="absolute top-4 left-4 bg-white/80 hover:bg-white p-2 rounded-full shadow-sm z-10"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-900" />
                  </button>
                </div>

                {/* Content Details */}
                <div className="w-full md:w-[450px] flex flex-col bg-white">
                  <div className="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar">
                    <div>
                      <div className="flex items-center space-x-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 mb-2">
                        {selectedContent.type === 'post' ? <Monitor className="w-3 h-3" /> : selectedContent.type === 'reels' ? <Instagram className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{selectedContent.platform} • {selectedContent.type}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 leading-tight">{selectedContent.title}</h3>
                    </div>

                    {selectedContent.script && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center">
                          <FileText className="w-3 h-3 mr-1.5" /> Roteiro
                        </label>
                        <div className="p-5 bg-gray-50 rounded-2xl text-sm text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-wrap italic">
                          {selectedContent.script}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center">
                        <Type className="w-3 h-3 mr-1.5" /> Legenda
                      </label>
                      <div className="p-5 bg-blue-50/30 rounded-2xl text-sm text-gray-800 leading-relaxed border border-blue-100 whitespace-pre-wrap">
                        {selectedContent.caption || "Sem legenda cadastrada."}
                      </div>
                    </div>

                    {selectedContent.hashtags && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center">
                          <Hash className="w-3 h-3 mr-1.5" /> Hashtags
                        </label>
                        <div className="text-xs text-blue-600 font-medium break-words leading-relaxed">
                          {selectedContent.hashtags}
                        </div>
                      </div>
                    )}

                    {selectedContent.feedback && (
                      <div className="p-5 rounded-2xl bg-red-50 border border-red-100">
                        <label className="text-[10px] font-bold text-red-600 uppercase mb-2 block">Solicitação de Ajuste:</label>
                        <p className="text-sm text-red-900 leading-relaxed">"{selectedContent.feedback}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                    {selectedContent.status === 'approval' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => {
                            const feedback = prompt('Descreva o que precisa ser ajustado:');
                            if (feedback) updateStatus(selectedContent.id, 'revision', feedback);
                          }}
                          className="flex items-center justify-center py-4 bg-white border-2 border-red-100 text-red-500 rounded-2xl font-bold hover:bg-red-50 transition-all"
                        >
                          <XCircle className="w-5 h-5 mr-2" /> REPROVAR
                        </button>
                        <button 
                          onClick={() => updateStatus(selectedContent.id, 'approved')}
                          className="flex items-center justify-center py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" /> APROVAR
                        </button>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                         <span className={cn(
                           "px-4 py-2 rounded-xl text-xs font-bold uppercase",
                           selectedContent.status === 'approved' ? "bg-green-100 text-green-700" :
                           selectedContent.status === 'revision' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                         )}>
                            Status: {
                               selectedContent.status === 'approved' ? 'Aprovado' : 
                               selectedContent.status === 'revision' ? 'Ajustes' : 'Em Produção'
                             }
                         </span>
                         {profile.role !== 'client' && (selectedContent.status as string) !== 'approval' && (
                           <button 
                             onClick={() => updateStatus(selectedContent.id, 'approval')}
                             className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all font-sans"
                           >
                             Enviar para Aprovação
                           </button>
                         )}
                      </div>
                    )}
                  </div>
                </div>
             </motion.div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Agendar Conteúdo</h3>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Título</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newContent.title}
                      onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Tipo</label>
                    <select 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newContent.type}
                      onChange={(e) => setNewContent({ ...newContent, type: e.target.value as any })}
                    >
                      <option value="post">Post (Feed)</option>
                      <option value="reels">Reels</option>
                      <option value="story">Story</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Plataforma</label>
                    <select 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newContent.platform}
                      onChange={(e) => setNewContent({ ...newContent, platform: e.target.value })}
                    >
                      <option>Instagram</option>
                      <option>Facebook</option>
                      <option>LinkedIn</option>
                      <option>TikTok</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Para o dia</label>
                    <div className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 font-medium">
                      {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Selecione no calendário'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700 ml-1">Roteiro / Instruções</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    value={newContent.script}
                    onChange={(e) => setNewContent({ ...newContent, script: e.target.value })}
                  ></textarea>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700 ml-1">Legenda Final</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    value={newContent.caption}
                    onChange={(e) => setNewContent({ ...newContent, caption: e.target.value })}
                  ></textarea>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700 ml-1">Hashtags</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newContent.hashtags}
                    onChange={(e) => setNewContent({ ...newContent, hashtags: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700 ml-1">Anexar Mídias (Fotos/Vídeos)</label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      placeholder="URL da mídia..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                    />
                    <select 
                      className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newMediaType}
                      onChange={(e) => setNewMediaType(e.target.value as any)}
                    >
                      <option value="image">Imagem</option>
                      <option value="video">Vídeo</option>
                    </select>
                    <button 
                      type="button"
                      onClick={() => {
                        if (!newMediaUrl) return;
                        setNewContent(prev => ({
                          ...prev,
                          mediaItems: [...(prev.mediaItems || []), { url: newMediaUrl, type: newMediaType }]
                        }));
                        setNewMediaUrl('');
                      }}
                      className="px-4 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase"
                    >
                      Add
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {newContent.mediaItems?.map((media, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                        {media.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                             <Instagram className="w-6 h-6" />
                          </div>
                        ) : (
                          <img src={media.url} alt="media" className="w-full h-full object-cover" />
                        )}
                        <button 
                          type="button"
                          onClick={() => setNewContent(prev => ({
                            ...prev,
                            mediaItems: (prev.mediaItems || []).filter((_, i) => i !== idx)
                          }))}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => { setIsAdding(false); setSelectedDate(null); }}
                    className="flex-1 py-4 text-gray-500 hover:bg-gray-100 rounded-2xl font-bold transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-blue-200 transition-all"
                  >
                    CRIAR CONTEÚDO
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
