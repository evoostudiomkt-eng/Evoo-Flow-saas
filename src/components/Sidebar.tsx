import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  FileCheck, 
  TrendingUp, 
  DollarSign, 
  LogOut,
  ChevronRight,
  Settings,
  Users2,
  Calendar,
  ShieldCheck,
  Database,
  HelpCircle
} from 'lucide-react';
import { auth } from '../firebase';
import { UserProfile, Agency } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import Logo from './ui/Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserProfile;
  isClientMode: boolean;
  setIsClientMode: (mode: boolean) => void;
  isDemoMode?: boolean;
  agency?: Agency | null;
}

export default function Sidebar({ activeTab, setActiveTab, profile, isClientMode, setIsClientMode, isDemoMode = false, agency }: SidebarProps) {
  const isSuperAdmin = profile.email === 'evoostudiomkt@gmail.com' && !isDemoMode;

  const clientMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'content', label: 'Conteúdo', icon: Calendar },
    { id: 'leads', label: 'Leads (Pipeline)', icon: TrendingUp },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'team', label: 'Equipe', icon: Users2 },
    { id: 'help', label: 'Ajuda', icon: HelpCircle },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const saasAdminItems = [
    { id: 'saas-central', label: 'SaaS Central', icon: ShieldCheck },
    { id: 'saas-finance', label: 'Financeiro SaaS', icon: DollarSign },
    { id: 'saas-infra', label: 'Infraestrutura', icon: Database },
    { id: 'saas-settings', label: 'Configurações', icon: Settings },
  ];

  const menuItems = (isSuperAdmin && !isClientMode) ? saasAdminItems : clientMenuItems;

  const filteredMenuItems = (profile.role === 'admin' || isSuperAdmin) 
    ? menuItems 
    : menuItems.filter(item => profile.role === 'client' ? item.id === 'dashboard' : (profile.permissions?.includes(item.id) || item.id === 'dashboard'));

  const [logoError, setLogoError] = React.useState(false);

  React.useEffect(() => {
    setLogoError(false);
  }, [agency?.branding?.logoUrl]);

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col animate-fade-in" id="sidebar">
      <div className="p-4 border-b border-gray-100 flex flex-col items-center justify-center space-y-3 bg-transparent m-0" id="sidebar-container">
        {/* EvooFlow Logo is mandatory and displayed across all accesses */}
        <Logo 
          size="lg" 
          className="h-16 w-full mx-auto block p-0 m-0 border-0 bg-transparent focus:outline-none" 
          style={{ objectFit: 'contain' }} 
        />
        
        {isSuperAdmin && (
          <div className="w-full bg-gray-100 p-1 rounded-xl flex">
            <button 
              onClick={() => {
                setIsClientMode(false);
                setActiveTab('saas-central');
              }}
              className={cn(
                "flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                !isClientMode ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Admin SAS
            </button>
            <button 
              onClick={() => {
                setIsClientMode(true);
                setActiveTab('dashboard');
              }}
              className={cn(
                "flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                isClientMode ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Modo Cliente
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1" id="sidebar-nav">
        {filteredMenuItems.map((item) => (
          <button
            key={item.id}
            id={`nav-item-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group",
              activeTab === item.id 
                ? "bg-blue-50 text-blue-700 shadow-sm" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <div className="flex items-center space-x-3">
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")} />
              <span className="font-medium">{item.label}</span>
            </div>
            {activeTab === item.id && (
              <motion.div layoutId="active-indicator">
                <ChevronRight className="w-4 h-4 text-blue-500" />
              </motion.div>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100" id="sidebar-footer">
        <div className="flex items-center space-x-3 px-3 py-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
            {profile.displayName.substring(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{profile.displayName}</p>
            <p className="text-xs text-gray-500 truncate capitalize">
              {profile.role === 'admin' ? 'Administrador' : profile.role === 'member' ? 'Equipe' : 'Cliente'}
            </p>
          </div>
        </div>
        <button 
          id="logout-button"
          onClick={() => auth.signOut()}
          className="w-full mt-2 flex items-center space-x-3 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sair do sistema</span>
        </button>
      </div>
    </div>
  );
}
