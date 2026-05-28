import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Client, Task, UserProfile } from '../../types';
import { notifyAdmins } from '../../lib/notifications';
import { MOCK_TASKS } from '../../lib/mockData';
import { 
  Plus, 
  MoreVertical, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientTasksProps {
  client: Client;
  profile: UserProfile;
  isDemoMode?: boolean;
}

const COLUMNS = [
  { id: 'todo', label: 'A Fazer', color: 'bg-gray-100 text-gray-700' },
  { id: 'in_progress', label: 'Em Andamento', color: 'bg-blue-50 text-blue-700' },
  { id: 'review', label: 'Revisão', color: 'bg-amber-50 text-amber-700' },
  { id: 'done', label: 'Concluído', color: 'bg-green-50 text-green-700' },
] as const;

export default function ClientTasks({ client, profile, isDemoMode }: ClientTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setTasks(MOCK_TASKS.filter(t => t.clientId === client.id));
      return () => {};
    }

    const q = query(collection(db, 'clients', client.id, 'tasks'));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
    return () => unsub();
  }, [client.id, isDemoMode]);

  const addTask = async (status: Task['status']) => {
    if (!newTaskTitle.trim()) return;
    if (isDemoMode) {
      const task: Task = {
        id: `task_demo_${Date.now()}`,
        clientId: client.id,
        title: newTaskTitle,
        status,
        description: 'Descrição demonstrativa',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks(prev => [...prev, task]);
      setNewTaskTitle('');
      setIsAdding(false);
      return;
    }
    try {
      await addDoc(collection(db, 'clients', client.id, 'tasks'), {
        clientId: client.id,
        title: newTaskTitle,
        status,
        description: '',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewTaskTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    if (isDemoMode) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
      return;
    }
    await updateDoc(doc(db, 'clients', client.id, 'tasks', taskId), {
      status,
      updatedAt: new Date().toISOString(),
    });

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const statusLabel = COLUMNS.find(c => c.id === status)?.label;
    await notifyAdmins(
      'Tarefa Atualizada',
      `O status da tarefa "${task.title}" (${client.company}) foi alterado para ${statusLabel}.`,
      'task',
      `clients/${client.id}`
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start" id="kanban-board">
      {COLUMNS.map((col) => (
        <div key={col.id} className="flex flex-col h-full" id={`column-${col.id}`}>
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center space-x-2">
              <span className={cn("px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider", col.color)}>
                {col.label}
              </span>
              <span className="text-gray-400 text-xs font-semibold">{tasks.filter(t => t.status === col.id).length}</span>
            </div>
            {profile.role !== 'client' && (
              <button 
                onClick={() => { setIsAdding(true); /* Logic to open modal or inline input */ }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-3 min-h-[500px] bg-gray-50/50 p-2 rounded-xl border border-dashed border-gray-200">
             {tasks.filter(t => t.status === col.id).map((task) => (
               <motion.div
                 key={task.id}
                 layoutId={task.id}
                 className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all group"
                 onClick={() => { /* Open task detail */ }}
               >
                 <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                      task.priority === 'high' ? "bg-red-50 text-red-600" :
                      task.priority === 'medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                 </div>
                 <h4 className="text-sm font-bold text-gray-900 leading-tight mb-3">{task.title}</h4>
                 <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {format(new Date(task.dueDate), 'dd MMM', { locale: ptBR })}
                    </div>
                    {task.assigneeId ? (
                      <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] font-bold">JD</div>
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-300" />
                    )}
                 </div>
               </motion.div>
             ))}
             
             {col.id === 'todo' && !isAdding && profile.role !== 'client' && (
               <button 
                 onClick={() => setIsAdding(true)}
                 className="w-full py-2 flex items-center justify-center text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-gray-300 transition-all"
               >
                 <Plus className="w-4 h-4 mr-1" /> Adicionar tarefa
               </button>
             )}

             {isAdding && col.id === 'todo' && (
               <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
                 <input 
                   autoFocus
                   type="text" 
                   placeholder="Título da tarefa..." 
                   className="w-full text-sm outline-none mb-2"
                   value={newTaskTitle}
                   onChange={(e) => setNewTaskTitle(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && addTask('todo')}
                 />
                 <div className="flex justify-end space-x-2">
                   <button onClick={() => setIsAdding(false)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600">CANCELAR</button>
                   <button onClick={() => addTask('todo')} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">CRIAR</button>
                 </div>
               </div>
             )}
          </div>
        </div>
      ))}
    </div>
  );
}
