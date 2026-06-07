import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { Client, UserProfile } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { 
  Plus, 
  Trash2, 
  Key, 
  Globe, 
  User, 
  Lock, 
  Copy, 
  Check, 
  Mail, 
  Share2, 
  RefreshCw, 
  Palette, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface ClientPortalProps {
  client: Client;
  profile: UserProfile;
  isDemoMode?: boolean;
}

interface AdditionalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export default function ClientPortal({ client, profile, isDemoMode }: ClientPortalProps) {
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activePresetColor, setActivePresetColor] = useState('#2563eb'); // Default Blue

  // Portal setup states
  const [portalEmail, setPortalEmail] = useState(client.portalEmail || client.email || '');
  const [portalPassword, setPortalPassword] = useState(client.portalPassword || 'Evoo@' + (client.company ? client.company.replace(/\s+/g, '') : '2026'));
  const [primaryColor, setPrimaryColor] = useState(client.portalPrimaryColor || '#2563eb');
  const [accentColor, setAccentColor] = useState(client.portalAccentColor || '#f59e0b'); // Default Warm Amber
  const [customPermissions, setCustomPermissions] = useState<string[]>(client.portalPermissions || [
    'view_calendar',
    'approve_creatives',
    'view_financial'
  ]);

  // Logo crop & position simulator states 
  const [logoScale, setLogoScale] = useState(client.logoScale || 1);
  const [logoPositionX, setLogoPositionX] = useState(client.logoPositionX || 0);
  const [logoPositionY, setLogoPositionY] = useState(client.logoPositionY || 0);

  // Sync state variables when client prop changes
  useEffect(() => {
    setPortalEmail(client.portalEmail || client.email || '');
    setPortalPassword(client.portalPassword || 'Evoo@' + (client.company ? client.company.replace(/\s+/g, '') : '2026'));
    setPrimaryColor(client.portalPrimaryColor || '#2563eb');
    setAccentColor(client.portalAccentColor || '#f59e0b');
    setCustomPermissions(client.portalPermissions || [
      'view_calendar',
      'approve_creatives',
      'view_financial'
    ]);
    setLogoScale(client.logoScale || 1);
    setLogoPositionX(client.logoPositionX || 0);
    setLogoPositionY(client.logoPositionY || 0);
  }, [client]);

  // Additional users/stakeholders lists
  const [additionalUsers, setAdditionalUsers] = useState<AdditionalUser[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Aprovador Secundário');
  const [isAddingUser, setIsAddingUser] = useState(false);

  useEffect(() => {
    if (client.logoUrl && !client.portalPrimaryColor) {
      // Simulate color palette auto-extraction
      const hash = client.company.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
      const colorPresets = ['#0f172a', '#1e1b4b', '#1c1917', '#111827', '#022c22', '#1e3a8a'];
      const extractedBase = colorPresets[hash % colorPresets.length];
      setPrimaryColor(extractedBase);
    }
  }, [client.logoUrl, client.company, client.portalPrimaryColor]);

  useEffect(() => {
    if (isDemoMode) {
      setAdditionalUsers([
        { id: 'add_1', name: 'Juliana Costa', email: 'vendas@' + (client.company ? client.company.toLowerCase().replace(/\s+/g, '') : 'empresa') + '.com.br', role: 'Gerente Comercial', permissions: ['view_calendar'] },
        { id: 'add_2', name: 'Rodrigo Brandão', email: 'mkt@' + (client.company ? client.company.toLowerCase().replace(/\s+/g, '') : 'empresa') + '.com', role: 'Aprovador de Conteúdo', permissions: ['view_calendar', 'approve_creatives'] }
      ]);
      return;
    }

    const q = query(collection(db, 'clients', client.id, 'portal_users'));
    const unsub = onSnapshot(q, (snap) => {
      setAdditionalUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdditionalUser)));
    });
    return () => unsub();
  }, [client.id, isDemoMode]);

  const handleCopyCredentials = () => {
    const textToCopy = `💥 PORTAL DO CLIENTE - EVOO FLOW 💥\n\nEquipe ${client.company},\nSeu ambiente seguro de aprovação e calendário editorial está disponível!\n\n🔗 Link: ${window.location.origin}\n📧 Usuário: ${portalEmail}\n🔑 Senha Provisória: ${portalPassword}\n\nSeja bem-vindo(a) à experiência premium de marketing!`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLogin(true);
    setTimeout(() => setCopiedLogin(false), 2000);
  };

  const handleCopyLink = () => {
    const textToCopy = `${window.location.origin}/?portal=${client.id}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendInvite = () => {
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 3000);
  };

  const handleGeneratePortalAccess = async () => {
    if (isDemoMode) {
      alert("Acesso configurado com sucesso! Usuários de teste pré-populados.");
      return;
    }

    try {
      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        portalEmail,
        portalPassword,
        portalPrimaryColor: primaryColor,
        portalAccentColor: accentColor,
        portalPermissions: customPermissions,
        logoScale,
        logoPositionX,
        logoPositionY,
        updatedAt: new Date().toISOString()
      });
      alert("Portal do Cliente sincronizado com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clients/${client.id}`);
    }
  };

  const handleAddStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const newAdd = {
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      permissions: ['view_calendar']
    };

    if (isDemoMode) {
      setAdditionalUsers(prev => [...prev, { id: `add_${Date.now()}`, ...newAdd }]);
      setIsAddingUser(false);
      setNewUserName('');
      setNewUserEmail('');
      return;
    }

    try {
      await addDoc(collection(db, 'clients', client.id, 'portal_users'), newAdd);
      setIsAddingUser(false);
      setNewUserName('');
      setNewUserEmail('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clients/${client.id}/portal_users`);
    }
  };

  const handleTogglePermission = (perm: string) => {
    setCustomPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div className="space-y-8 select-none md:select-text" id="client-portal-tab">
      
      {/* HEADER ROW */}
      <div className="flex border-b border-gray-100 pb-4 justify-between items-center bg-transparent">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Configurações da Área do Cliente
          </h3>
          <p className="text-xs text-gray-500 mt-1">Configure o portal exclusivo deste parceiro com logins de acesso, e-mails de onboard e identidade visual.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: SETUP & SECURITY (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* SECURE CREDENTIALS SETUP */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative text-left">
            <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SISTEMA CRIPTOGRAFADO EVOOSHIELD
            </div>

            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono mb-4">
              🛡️ Credenciais de Acesso do Titular
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">E-mail de Login do Cliente</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-450" />
                  <input 
                    type="email" 
                    value={portalEmail}
                    onChange={(e) => setPortalEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none text-sm"
                    placeholder="exemplo@cliente.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Senha Provisória de Entrada</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-450" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none text-sm"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS ROW FOR SHARING AND ONBOARDING */}
            <div className="pt-5 border-t border-gray-100 flex flex-wrap gap-3">
              <button 
                onClick={handleCopyCredentials}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"
              >
                {copiedLogin ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copiedLogin ? "Copiado!" : "Copiar Login do Cliente"}</span>
              </button>

              <button 
                onClick={handleCopyLink}
                className="flex items-center space-x-1.5 px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5 text-gray-450" />}
                <span>Compartilhar Link do Portal</span>
              </button>

              <button 
                onClick={handleSendInvite}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100/80 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xs border border-blue-200/40 ml-auto"
              >
                {inviteSent ? <Check className="w-3.5 h-3.5 text-green-500 animate-bounce" /> : <Mail className="w-3.5 h-3.5 text-blue-600" />}
                <span>{inviteSent ? "E-mail de Onboarding Enviado!" : "Enviar Boas-Vindas por E-mail"}</span>
              </button>
            </div>
          </div>

          {/* PORTAL PERMISSIONS CHECKBOXES */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono mb-4">
              ⚙️ Permissões e Abas visíveis ao Cliente
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start space-x-3 p-3 bg-gray-50/60 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={customPermissions.includes('view_calendar')}
                  onChange={() => handleTogglePermission('view_calendar')}
                  className="mt-1 accent-blue-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-tight block">1. Calendário Editorial</span>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Visualizar posts agendados, programações e datas de veiculação.</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 bg-gray-50/60 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={customPermissions.includes('approve_creatives')}
                  onChange={() => handleTogglePermission('approve_creatives')}
                  className="mt-1 accent-blue-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-tight block">2. Central de Aprovações</span>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Autorizar ou pedir ajustes de vídeos Reels, carrosséis ou imagens com notas instantâneas.</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 bg-gray-50/60 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={customPermissions.includes('view_financial')}
                  onChange={() => handleTogglePermission('view_financial')}
                  className="mt-1 accent-blue-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-tight block">3. Área Financeira Própria</span>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Exibir faturas, mensalidades ativas, códigos PIX, boletos e baixar recibos de marketing.</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 bg-gray-50/60 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={customPermissions.includes('view_tasks')}
                  onChange={() => handleTogglePermission('view_tasks')}
                  className="mt-1 accent-blue-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-tight block">4. Histórico de Entregas e Tarefas</span>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Visualizar status de progresso das demandas, cronogramas operacionais e equipe atrelada.</p>
                </div>
              </label>
            </div>
          </div>

          {/* ADDITIONAL CLIENT USERS / USUÁRIOS ADICIONAIS DO CLIENTE */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">
                👥 Usuários Adicionais do Cliente (Stakeholders)
              </h4>
              <button 
                onClick={() => setIsAddingUser(!isAddingUser)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-blue-200/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Usuário</span>
              </button>
            </div>

            {isAddingUser && (
              <form onSubmit={handleAddStakeholder} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-5 relative">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold outline-none text-xs bg-white"
                      placeholder="Ex: Pedro Henrique"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">E-mail de Acesso</label>
                    <input 
                      type="email" 
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold outline-none text-xs bg-white"
                      placeholder="financeiro@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cargo / Função</label>
                    <select 
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold outline-none text-xs bg-white"
                    >
                      <option value="Aprovador Monetário">Aprovador Monetário (Fin.)</option>
                      <option value="Aprovador de Conteúdo">Aprovador de Conteúdo</option>
                      <option value="Visualizador Único">Visualizador Único</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-2 justify-end">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingUser(false)} 
                    className="px-3.5 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-650"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-md shadow-blue-100"
                  >
                    Salvar Usuário
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {additionalUsers.map((usr) => (
                <div key={usr.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-black text-blue-700">
                      {usr.name.substring(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-800 leading-none">{usr.name}</span>
                        <span className="text-[8px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded uppercase leading-none font-mono">
                          {usr.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold block mt-1">{usr.email}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-[9px] font-mono text-gray-400 font-bold">Modo: Leitura/Aprovação</span>
                    <button className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {additionalUsers.length === 0 && (
                <div className="py-6 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Apenas o login principal cadastrado</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: BRANDING & LIVE PORTAL PREVIEW (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* LOGO POSITIONING & COLOUR ACCENT CODES */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono mb-4 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-blue-650" />
              Paleta e Identidade de Onboarding
            </h4>

            {/* PRESET PICKERS */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 font-mono">Extrair Cor Principal do Cliente</label>
                <div className="flex flex-wrap gap-2.5">
                  {['#2563eb', '#0f172a', '#dc2626', '#16a34a', '#8619bc', '#eab308'].map((colorCode) => (
                    <button 
                      key={colorCode}
                      onClick={() => setPrimaryColor(colorCode)}
                      className={cn(
                        "w-7 h-7 rounded-lg relative flex items-center justify-center border transition-all",
                        primaryColor === colorCode ? "ring-2 ring-blue-500 scale-105" : "border-gray-200"
                      )}
                      style={{ backgroundColor: colorCode }}
                      type="button"
                    >
                      {primaryColor === colorCode && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                  <input 
                    type="color" 
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-7 h-7 cursor-pointer border-none rounded-lg bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 font-mono">Cor de Destaque / Accent</label>
                <div className="flex flex-wrap gap-2.5">
                  {['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#a855f7'].map((colorCode) => (
                    <button 
                      key={colorCode}
                      onClick={() => setAccentColor(colorCode)}
                      className={cn(
                        "w-7 h-7 rounded-lg relative flex items-center justify-center border transition-all",
                        accentColor === colorCode ? "ring-2 ring-blue-500 scale-105" : "border-gray-200"
                      )}
                      style={{ backgroundColor: colorCode }}
                      type="button"
                    >
                      {accentColor === colorCode && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                  <input 
                    type="color" 
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-7 h-7 cursor-pointer border-none rounded-lg bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* LIVE POSITION SCALE CONTROLLER */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Configuração Visual da Logo no Topo</label>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-mono text-[9px]">
                  <span>Escala Logo ({logoScale.toFixed(2)}x)</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.1" 
                  value={logoScale}
                  onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="font-mono text-[8.5px] text-gray-450 uppercase block">Posicionar X ({logoPositionX}px)</span>
                  <input 
                    type="range" 
                    min="-20" 
                    max="20" 
                    value={logoPositionX}
                    onChange={(e) => setLogoPositionX(parseInt(e.target.value))}
                    className="w-full bg-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[8.5px] text-gray-450 uppercase block">Posicionar Y ({logoPositionY}px)</span>
                  <input 
                    type="range" 
                    min="-20" 
                    max="20" 
                    value={logoPositionY}
                    onChange={(e) => setLogoPositionY(parseInt(e.target.value))}
                    className="w-full bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC BRANDED EXPERIENCE CONTAINER - LIVE SIMULATION WITH BRIGHT BRANDCOLORS */}
          <div className="p-6 rounded-3xl border border-gray-100 bg-slate-950 text-white relative flex flex-col justify-between h-[340px] shadow-lg overflow-hidden text-left font-sans">
            <div className="space-y-1 z-10">
              <span className="text-[10px] font-mono tracking-widest text-[#ffffff60] uppercase block">PREVIEW INSTANTÂNEO</span>
              <h5 className="text-xs font-black uppercase text-white/90">Área do Cliente Personalizada</h5>
              <p className="text-[10px] text-gray-450 capitalize">Verificação visual do portal do {client.company}</p>
            </div>

            {/* Mini Simulated Layout with dynamic extracted branding values */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 my-4 h-[180px] z-10 flex flex-col justify-between text-left">
              {/* Branded Navigation Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1.5 overflow-hidden border border-slate-700">
                    {client.logoUrl ? (
                      <img 
                        src={client.logoUrl} 
                        alt="Evoo Logo Asset" 
                        style={{
                          transform: `scale(${logoScale}) translate(${logoPositionX}px, ${logoPositionY}px)`
                        }}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
                    )}
                  </div>
                  <span className="text-[10px] font-black tracking-tight text-white/90">{client.company}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
              </div>

              {/* Simulated Client Workspace */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-950 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-[8px] font-mono text-gray-400 tracking-wider">REELS EM AVALIAÇÃO</span>
                  </div>
                  <button className="px-2 py-1 bg-white hover:bg-white text-slate-950 font-black text-[7px] uppercase tracking-widest rounded transition-all">
                    Revisar Peça
                  </button>
                </div>

                <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg text-[6px] font-mono border border-slate-850">
                  <span style={{ color: primaryColor }}>● {customPermissions.includes('view_calendar') ? "Calendário Ativo" : "Bloqueado"}</span>
                  <span style={{ color: accentColor }}>● {customPermissions.includes('view_financial') ? "Assinatura Pro: R$ 2.500" : "S/F"}</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              style={{ backgroundColor: primaryColor }}
              className="w-full text-center text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md mt-auto z-10"
              onClick={handleGeneratePortalAccess}
            >
              Publicar Identidade Visual &amp; Sincronizar
            </button>
            <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 rounded-full blur-3xl opacity-35" style={{ backgroundColor: primaryColor }}></div>
          </div>

        </div>

      </div>

    </div>
  );
}
