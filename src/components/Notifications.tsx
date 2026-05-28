import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Notification, UserProfile } from '../types';
import { 
  Bell, 
  Check, 
  Trash2, 
  Clock, 
  AlertCircle, 
  Target, 
  Calendar,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface NotificationsProps {
  profile: UserProfile;
}

export default function Notifications({ profile }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      // Sort manually to avoid index requirement
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(docs.slice(0, 20));
    }, (error) => {
      console.error("Firestore Error in Notifications:", error);
    });

    return () => unsub();
  }, [profile.uid]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead': return <Target className="w-4 h-4 text-blue-500" />;
      case 'task': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'content': return <Calendar className="w-4 h-4 text-purple-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition-all group"
      >
        <Bell className={cn("w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors", unreadCount > 0 && "animate-pulse")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-96 bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Notificações</h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">{unreadCount} não lidas</p>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                  >
                    Ler todas
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((n) => (
                  <div 
                    key={n.id}
                    className={cn(
                      "p-5 flex items-start space-x-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors relative group",
                      !n.read && "bg-blue-50/20"
                    )}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                        {getIcon(n.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h4 className="text-xs font-black text-gray-900 leading-tight mb-1">{n.title}</h4>
                      <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{n.message}</p>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-2">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className="absolute top-5 right-5 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(n.id)}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="py-20 text-center">
                    <Bell className="w-10 h-10 text-gray-100 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhuma notificação</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-4 bg-gray-50/30 text-center border-t border-gray-50">
                   <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">
                      Ver histórico completo
                   </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
