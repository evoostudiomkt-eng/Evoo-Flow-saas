import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { collectionGroup, query, onSnapshot, getDocs, collection, doc, updateDoc, addDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Task, UserProfile, Client } from '../types';
import { sendNotification, notifyAdmins } from '../lib/notifications';
import { MOCK_TASKS, MOCK_CLIENTS } from '../lib/mockData';
import { cn } from '../lib/utils';
import { 
  Plus, 
  Search, 
  Filter, 
  AlertCircle, 
  Calendar, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  X,
  Pause,
  Play,
  CheckCircle2,
  FileText,
  MessageSquare,
  Edit2
} from 'lucide-react';
import { isBefore, isToday, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface KanbanProps {
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function Kanban({ profile, isDemoMode }: KanbanProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [filterClient, setFilterClient] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    clientId: profile.role === 'client' ? profile.clientId || '' : '', 
    priority: 'medium' as Task['priority'], 
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    if (profile.role === 'client' && profile.clientId) {
      setFilterClient(profile.clientId);
    }
  }, [profile]);

  useEffect(() => {
    if (isDemoMode) {
      setTasks(MOCK_TASKS);
      const mapping: Record<string, string> = {};
      MOCK_CLIENTS.forEach(c => mapping[c.id] = c.company);
      setClients(mapping);
      return () => {};
    }

    if (!profile?.agencyId) return;

    let q;
    if (profile.role === 'client' && profile.clientId) {
      q = query(
        collection(db, 'clients', profile.clientId, 'tasks'),
        where('agencyId', '==', profile.agencyId)
      );
    } else {
      q = query(
        collectionGroup(db, 'tasks'),
        where('agencyId', '==', profile.agencyId)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks');
    });

    const fetchClients = async () => {
       try {
         const snap = await getDocs(query(
           collection(db, 'clients'),
           where('agencyId', '==', profile.agencyId)
         ));
         const mapping: Record<string, string> = {};
         snap.docs.forEach(d => mapping[d.id] = d.data().company);
         setClients(mapping);
       } catch (error) {
         handleFirestoreError(error, OperationType.LIST, 'clients');
       }
    };
    fetchClients();

    return () => unsub();
  }, [profile.agencyId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];
    const task = tasks.find(t => t.id === taskId);

    if (task && task.status !== newStatus) {
      await updateTaskStatus(task, newStatus);
    }
  };

  const COLUMNS = [
    { id: 'todo', label: 'A Fazer' },
    { id: 'in_progress', label: 'Em Andamento' },
    { id: 'review', label: 'Revisão' },
    { id: 'done', label: 'Concluído' },
  ] as const;

  const updateTaskStatus = async (task: Task, newStatus: Task['status']) => {
    if (isDemoMode) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
      return;
    }
    try {
      const taskRef = doc(db, 'clients', task.clientId, 'tasks', task.id);
      await updateDoc(taskRef, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      const statusLabel = COLUMNS.find(c => c.id === newStatus)?.label;
      const clientName = clients[task.clientId] || 'Cliente';

      // Notify Admins
      await notifyAdmins(
        'Tarefa Atualizada',
        `A tarefa "${task.title}" do cliente ${clientName} foi movida para ${statusLabel}.`,
        'task',
        `clients/${task.clientId}`
      );

      // Notify Assignee if it's not the one who updated (but we don't handle explicit assignees yet besides 'ES')
    } catch (err) {
      console.error(err);
    }
  };

  const updateTaskDetails = async (task: Task, updates: Partial<Task>) => {
    if (isDemoMode) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      setIsEditing(false);
      return;
    }
    try {
      const taskRef = doc(db, 'clients', task.clientId, 'tasks', task.id);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskPause = async (task: Task) => {
    if (isDemoMode) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isPaused: !task.isPaused, updatedAt: new Date().toISOString() } : t));
      return;
    }
    try {
      const taskRef = doc(db, 'clients', task.clientId, 'tasks', task.id);
      await updateDoc(taskRef, { 
        isPaused: !task.isPaused,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesClient = filterClient === 'all' || t.clientId === filterClient;
    return matchesSearch && matchesClient;
  });

  const isOverdue = (dueDate: string) => {
    const date = parseISO(dueDate);
    return isBefore(date, new Date()) && !isToday(date);
  };

  const moveTask = (task: Task, direction: 'forward' | 'backward') => {
    const currentIndex = COLUMNS.findIndex(c => c.id === task.status);
    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < COLUMNS.length) {
      updateTaskStatus(task, COLUMNS[nextIndex].id as Task['status']);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.clientId) return;

    if (isDemoMode) {
      const added: Task = {
        id: `task_demo_${Date.now()}`,
        clientId: newTask.clientId,
        title: newTask.title,
        status: 'todo',
        priority: newTask.priority,
        dueDate: newTask.dueDate,
        description: newTask.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTasks(prev => [...prev, added]);
      setIsAdding(false);
      setNewTask({ 
        title: '', 
        clientId: profile.role === 'client' ? profile.clientId || '' : '', 
        priority: 'medium', 
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        description: ''
      });
      return;
    }

    try {
      await addDoc(collection(db, 'clients', newTask.clientId, 'tasks'), {
        ...newTask,
        agencyId: profile.agencyId,
        status: 'todo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      const clientName = clients[newTask.clientId];
      await notifyAdmins(
        'Nova Tarefa Global',
        `Uma nova tarefa "${newTask.title}" foi criada para o cliente ${clientName}.`,
        'task',
        `clients/${newTask.clientId}`
      );

      setIsAdding(false);
      setNewTask({ 
        title: '', 
        clientId: profile.role === 'client' ? profile.clientId || '' : '', 
        priority: 'medium', 
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        description: ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8" id="global-kanban">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{profile.role === 'client' ? 'Minhas Tarefas' : 'Quadro Global'}</h2>
          <p className="text-gray-500 mt-1">{profile.role === 'client' ? 'Acompanhe e colabore em seus projetos.' : 'Produtividade operacional em tempo real.'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => {
              setNewTask({
                title: '',
                clientId: profile.role === 'client' ? profile.clientId || '' : '',
                priority: 'medium',
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                description: ''
              });
              setIsAdding(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
          </button>
          {profile.role !== 'client' && (
            <div className="relative group">
              <Filter className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                filterClient === 'all' ? "text-gray-400" : "text-blue-600"
              )} />
              <select 
                className={cn(
                  "pl-10 pr-8 py-2 border border-gray-100 rounded-xl bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none cursor-pointer transition-all hover:border-blue-200 min-w-[200px]",
                  filterClient === 'all' ? "text-gray-600" : "text-blue-700 bg-blue-50/30 border-blue-100"
                )}
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
              >
                <option value="all">Filtro: Todos os Clientes</option>
                <optgroup label="Filtrar por Cliente">
                  {Object.entries(clients).sort((a,b) => a[1].localeCompare(b[1])).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </optgroup>
              </select>
              {filterClient !== 'all' && (
                <button 
                  onClick={() => setFilterClient('all')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Limpar filtro"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar tarefa..." 
              className="pl-9 pr-4 py-2 border border-gray-100 rounded-xl bg-white shadow-sm text-sm outline-none w-48 focus:w-64 transition-all focus:ring-2 focus:ring-blue-500" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-8 items-start h-[calc(100vh-14rem)] custom-scrollbar">
          {COLUMNS.map(col => (
            <DroppableColumn 
              key={col.id} 
              col={col} 
              tasks={filteredTasks.filter(t => t.status === col.id)} 
              clients={clients}
              isOverdue={isOverdue}
              moveTask={moveTask}
              togglePause={toggleTaskPause}
              isAdmin={profile.role !== 'client'}
              onSelectTask={setSelectedTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-80 opacity-80 rotate-3 cursor-grabbing">
              <TaskCard 
                task={activeTask} 
                clientName={clients[activeTask.clientId]} 
                isOverdue={isOverdue(activeTask.dueDate)}
                isDragging
                isAdmin={profile.role !== 'client'}
              />
            </div>
          ) : null}
        </DragOverlay>

        {/* Modal de Detalhes da Tarefa */}
        <AnimatePresence>
          {selectedTask && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Detalhes da Tarefa</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Visualize e adicione observações</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedTask(null);
                      setIsEditing(false);
                    }}
                    className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-900"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{clients[selectedTask.clientId]}</p>
                      <h4 className="text-2xl font-black text-gray-900">{selectedTask.title}</h4>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn(
                        "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest text-white shadow-sm",
                        selectedTask.priority === 'high' ? "bg-red-500" : 
                        selectedTask.priority === 'medium' ? "bg-blue-600" : "bg-gray-400"
                      )}>
                        {selectedTask.priority}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 flex items-center uppercase tracking-widest">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(selectedTask.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                          <FileText className="w-3.5 h-3.5 mr-2" /> Descrição da Tarefa
                       </h5>
                       <div className="bg-gray-50 rounded-2xl p-4 text-sm font-medium text-gray-600 leading-relaxed border border-gray-100">
                          {selectedTask.description || "Nenhuma descrição fornecida."}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <h5 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center">
                          <MessageSquare className="w-3.5 h-3.5 mr-2" /> Observações do Cliente
                       </h5>
                       {isEditing ? (
                         <textarea 
                           autoFocus
                           className="w-full px-6 py-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-700 text-sm resize-none min-h-[120px]"
                           placeholder="Escreva suas observações aqui..."
                           defaultValue={selectedTask.clientNotes || ''}
                           onBlur={(e) => updateTaskDetails(selectedTask, { clientNotes: e.target.value })}
                         />
                       ) : (
                         <div 
                           onClick={() => setIsEditing(true)}
                           className="bg-blue-50/30 rounded-2xl p-6 text-sm font-medium text-blue-900 leading-relaxed border border-blue-100/50 cursor-pointer hover:bg-blue-50 transition-colors group relative"
                         >
                            {selectedTask.clientNotes || "Clique para adicionar uma observação..."}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Edit2 className="w-4 h-4 text-blue-400" />
                            </div>
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex justify-end">
                   <button 
                     onClick={() => {
                       setSelectedTask(null);
                       setIsEditing(false);
                     }}
                     className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95"
                   >
                     Fechar
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </DndContext>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Nova Tarefa</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Vincular ação a um cliente</p>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={createTask} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1">Título da Tarefa</label>
                  <input 
                    autoFocus
                    required
                    type="text"
                    placeholder="O que precisa ser feito?"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-gray-700"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1">Selecionar Cliente</label>
                  <select 
                    required
                    disabled={profile.role === 'client'}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-gray-700 appearance-none cursor-pointer disabled:opacity-60"
                    value={newTask.clientId}
                    onChange={(e) => setNewTask({...newTask, clientId: e.target.value})}
                  >
                    <option value="">Escolha um cliente...</option>
                    {Object.entries(clients).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1">Descrição</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-700 text-sm resize-none"
                    placeholder="Detalhes da tarefa..."
                    rows={3}
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1">Prioridade</label>
                    <select 
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1">Vencimento</label>
                    <input 
                      type="date"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold text-gray-700"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Criar Tarefa
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

// --- Sub-components for DnD ---

interface DroppableColumnProps {
  col: { id: string; label: string };
  tasks: Task[];
  clients: Record<string, string>;
  isOverdue: (date: string) => boolean;
  moveTask: (task: Task, direction: 'forward' | 'backward') => void;
  togglePause: (task: Task) => void;
  isAdmin: boolean;
  onSelectTask: (task: Task) => void;
}

function DroppableColumn({ col, tasks, clients, isOverdue, moveTask, togglePause, isAdmin, onSelectTask }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "min-w-[320px] w-80 flex flex-col max-h-full rounded-3xl transition-colors p-2",
        isOver ? "bg-blue-50/50" : "bg-transparent"
      )}
    >
      <div className="flex items-center justify-between mb-5 px-2">
        <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center">
           <div className={cn(
             "w-2 h-2 rounded-full mr-2",
             col.id === 'todo' ? "bg-gray-400" :
             col.id === 'in_progress' ? "bg-amber-400" :
             col.id === 'review' ? "bg-purple-400" : "bg-green-400"
           )}></div>
           {col.label}
        </h3>
        <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar min-h-[200px]">
         {tasks.map(task => (
           <DraggableTask 
             key={task.id} 
             task={task} 
             clientName={clients[task.clientId]} 
             isOverdue={isOverdue(task.dueDate)}
             moveTask={moveTask}
             togglePause={togglePause}
             isAdmin={isAdmin}
             onSelectTask={onSelectTask}
           />
         ))}
         
         {tasks.length === 0 && (
           <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center text-gray-300">
              <p className="text-xs font-bold uppercase tracking-widest">Sem tarefas</p>
           </div>
         )}
      </div>
    </div>
  );
}

interface DraggableTaskProps {
  task: Task;
  clientName: string;
  isOverdue: boolean;
  moveTask: (task: Task, direction: 'forward' | 'backward') => void;
  togglePause: (task: Task) => void;
  isAdmin: boolean;
  onSelectTask: (task: Task) => void;
}

function DraggableTask({ task, clientName, isOverdue, moveTask, togglePause, isAdmin, onSelectTask }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={cn(isDragging && "opacity-0")}
      onClick={() => onSelectTask(task)}
    >
      <TaskCard 
        task={task} 
        clientName={clientName} 
        isOverdue={isOverdue} 
        moveTask={moveTask} 
        togglePause={togglePause}
        isAdmin={isAdmin}
      />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  clientName: string;
  isOverdue: boolean;
  isDragging?: boolean;
  moveTask?: (task: Task, direction: 'forward' | 'backward') => void;
  togglePause?: (task: Task) => void;
  isAdmin?: boolean;
}

function TaskCard({ task, clientName, isOverdue, isDragging, moveTask, togglePause, isAdmin }: TaskCardProps) {
  const getProgress = (status: Task['status']) => {
    switch(status) {
      case 'todo': return 15;
      case 'in_progress': return 50;
      case 'review': return 85;
      case 'done': return 100;
      default: return 0;
    }
  };

  const progress = getProgress(task.status);

  return (
    <motion.div 
      layoutId={task.id}
      className={cn(
        "bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden",
        isOverdue && task.status !== 'done' && "border-l-4 border-l-red-500 shadow-red-50",
        task.isPaused && "opacity-80 grayscale-[0.5] border-dashed",
        !isDragging && "hover:shadow-xl hover:border-blue-200",
        isDragging && "shadow-2xl border-blue-400 rotate-2"
      )}
    >
       <div className="flex justify-between items-start mb-2">
         <div className="flex flex-col">
           <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wide truncate max-w-[180px]">
             {clientName || 'Carregando...'}
           </p>
           {task.isPaused && (
             <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest flex items-center mt-0.5">
               <Pause className="w-2 h-2 mr-0.5 fill-current" /> Pausada
             </span>
           )}
         </div>
         <div className="flex flex-col items-end gap-1">
           {isOverdue && task.status !== 'done' && (
              <span className="flex items-center text-red-500 font-bold text-[9px] animate-pulse">
                <AlertCircle className="w-3 h-3 mr-1" /> ATRASADA
              </span>
           )}
           {task.status === 'done' && (
             <CheckCircle2 className="w-4 h-4 text-green-500" />
           )}
         </div>
       </div>
       
       <h4 className="text-[15px] font-bold text-gray-900 leading-tight mb-4 group-hover:text-blue-700 transition-colors">
         {task.title}
       </h4>

       {/* Barra de Progresso */}
       <div className="mb-4">
         <div className="flex justify-between items-center mb-1">
           <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Progresso</span>
           <span className="text-[10px] font-black text-gray-700">{progress}%</span>
         </div>
         <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${progress}%` }}
             className={cn(
               "h-full transition-all duration-500",
               task.isPaused ? "bg-amber-400" :
               task.status === 'done' ? "bg-green-500" :
               task.status === 'review' ? "bg-purple-500" : "bg-blue-600"
             )}
           />
         </div>
       </div>
       
       <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
          <div className="flex items-center space-x-3">
            <div className="flex items-center text-[10px] text-gray-400 font-bold">
               <Calendar className="w-3 h-3 mr-1" />
               {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </div>
            <span className={cn(
               "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-tighter",
               task.priority === 'high' ? "bg-red-50 text-red-600" : 
               task.priority === 'medium' ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"
            )}>
              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
             {!isDragging && isAdmin && togglePause && (
               <button 
                 onClick={(e) => { e.stopPropagation(); togglePause(task); }}
                 className={cn(
                   "p-1.5 rounded-lg transition-all",
                   task.isPaused ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "hover:bg-gray-100 text-gray-400 hover:text-amber-600"
                 )}
                 title={task.isPaused ? "Retomar" : "Pausar"}
               >
                 {task.isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
               </button>
             )}
             
             {!isDragging && moveTask && (
               <div className="flex items-center space-x-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveTask(task, 'backward'); }} 
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30"
                    disabled={task.status === 'todo'}
                  >
                     <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveTask(task, 'forward'); }} 
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30"
                    disabled={task.status === 'done'}
                  >
                     <ArrowRight className="w-3.5 h-3.5" />
                  </button>
               </div>
             )}
          </div>
       </div>
    </motion.div>
  );
}
