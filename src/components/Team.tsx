import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { MOCK_TEAM } from '../lib/mockData';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Shield, 
  Lock, 
  ChevronRight, 
  Plus, 
  X, 
  Check, 
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TeamProps {
  profile: UserProfile;
  isDemoMode?: boolean;
}

const MODULES = [
  { id: 'dashboard', label: 'Dashboard', description: 'Visão geral e estatísticas' },
  { id: 'clients', label: 'Clientes (CRM)', description: 'Gestão de clientes e arquivos' },
  { id: 'tasks', label: 'Kanban', description: 'Gestão de tarefas operacionais' },
  { id: 'approval', label: 'Aprovações', description: 'Feedback e aprovação de conteúdo' },
  { id: 'leads', label: 'Leads', description: 'Pipeline de vendas e prospects' },
  { id: 'financial', label: 'Financeiro', description: 'Controle de pagamentos e faturas' },
  { id: 'settings', label: 'Configurações', description: 'Ajustes globais do sistema' },
  { id: 'team', label: 'Equipe', description: 'Gestão de membros e permissões' }
];

export default function Team({ profile, isDemoMode }: TeamProps) {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setMembers(MOCK_TEAM);
      setLoading(false);
      return () => {};
    }

    if (!profile?.agencyId) return;

    // Fetch only members of the SAME agency
    const q = query(
      collection(db, 'users'), 
      where('agencyId', '==', profile.agencyId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as UserProfile);
      setMembers(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const togglePermission = async (member: UserProfile, moduleId: string) => {
    if (profile.role !== 'admin') return;
    
    const currentPermissions = member.permissions || [];
    let newPermissions: string[];
    
    if (currentPermissions.includes(moduleId)) {
      newPermissions = currentPermissions.filter(id => id !== moduleId);
    } else {
      newPermissions = [...currentPermissions, moduleId];
    }

    if (isDemoMode) {
      const updated = { ...member, permissions: newPermissions };
      setMembers(prev => prev.map(m => m.uid === member.uid ? updated : m));
      setSelectedMember(updated);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', member.uid), {
        permissions: newPermissions
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${member.uid}`);
    }
  };

  const updateRole = async (member: UserProfile, newRole: 'admin' | 'member') => {
    if (profile.role !== 'admin') return;
    if (member.uid === profile.uid) return; // Prevent self-downgrade

    if (isDemoMode) {
      const updated = { ...member, role: newRole };
      setMembers(prev => prev.map(m => m.uid === member.uid ? updated : m));
      setSelectedMember(updated);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', member.uid), {
        role: newRole
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${member.uid}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="team-module">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-sans">
            Gestão de <span className="text-blue-600">Equipe</span>
          </h2>
          <p className="text-gray-500 font-medium mt-1">Configure o acesso e permissões dos membros da sua agência.</p>
        </div>
        {profile.role === 'admin' && (
          <button className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center">
            <UserPlus className="w-5 h-5 mr-2" /> Convidar Membro
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members List */}
        <div className="lg:col-span-2 space-y-4">
          {members.sort((a, b) => a.role === 'admin' ? -1 : 1).map((member) => (
            <motion.div 
              layout
              key={member.uid}
              onClick={() => setSelectedMember(member)}
              className={cn(
                "bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer group flex items-center justify-between",
                selectedMember?.uid === member.uid && "ring-2 ring-blue-500 border-transparent shadow-lg"
              )}
            >
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl",
                  member.role === 'admin' ? "bg-gradient-to-br from-blue-600 to-indigo-700" : "bg-gradient-to-br from-gray-400 to-gray-600"
                )}>
                  {member.displayName.substring(0, 1)}
                </div>
                <div>
                  <h4 className="font-black text-gray-900 tracking-tight">{member.displayName}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                    {member.role === 'admin' ? <Shield className="w-3 h-3 mr-1 text-blue-500" /> : <Users className="w-3 h-3 mr-1" />}
                    {member.role === 'admin' ? 'Administrador' : 'Equipe'}
                    <span className="mx-2">•</span>
                    {member.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Módulos</p>
                  <div className="flex -space-x-1 justify-end">
                    {member.role === 'admin' ? (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Acesso Total</span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full uppercase">
                        {(member.permissions?.length || 0)} / {MODULES.length}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Permissions Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedMember ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl sticky top-8 overflow-hidden"
              >
                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight mb-4">Configuração de Acesso</h3>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-black">
                      {selectedMember.displayName.substring(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-none">{selectedMember.displayName}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{selectedMember.email}</p>
                    </div>
                  </div>

                  {profile.role === 'admin' && selectedMember.uid !== profile.uid && (
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Nível de Acesso</p>
                      <div className="flex p-1 bg-gray-50 rounded-xl">
                        <button 
                          onClick={() => updateRole(selectedMember, 'member')}
                          className={cn(
                            "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            selectedMember.role === 'member' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
                          )}
                        >
                          Equipe
                        </button>
                        <button 
                          onClick={() => updateRole(selectedMember, 'admin')}
                          className={cn(
                            "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            selectedMember.role === 'admin' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                          )}
                        >
                          Admin
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                    <Lock className="w-3 h-3 mr-1" /> Permissão por Módulo
                  </p>

                  <div className="space-y-2">
                    {MODULES.map((mod) => {
                      const isAllowed = selectedMember.role === 'admin' || selectedMember.permissions?.includes(mod.id);
                      const isDisabled = selectedMember.role === 'admin' || profile.role !== 'admin';
                      
                      return (
                        <div 
                          key={mod.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            isAllowed ? "bg-blue-50/50 border-blue-100" : "bg-white border-gray-50 opacity-60"
                          )}
                        >
                          <div>
                            <p className="text-xs font-bold text-gray-900 mb-0.5">{mod.label}</p>
                            <p className="text-[9px] text-gray-400 font-medium">{mod.description}</p>
                          </div>
                          <button
                            disabled={isDisabled}
                            onClick={() => togglePermission(selectedMember, mod.id)}
                            className={cn(
                              "w-10 h-6 rounded-full relative transition-all outline-none",
                              isAllowed ? "bg-blue-600" : "bg-gray-200",
                              isDisabled && "cursor-not-allowed opacity-50"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                              isAllowed ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedMember.role === 'admin' && (
                  <div className="px-8 pb-8">
                     <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                          Administradores possuem acesso irrestrito a todos os módulos do sistema.
                        </p>
                     </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center sticky top-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-gray-900 font-black tracking-tight">Selecione um membro</h4>
                <p className="text-xs text-gray-400 font-medium mt-2">Clique em um membro da lista para gerenciar suas permissões de acesso.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
