import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { UserProfile, Agency } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AgencyDashboard from './components/AgencyDashboard';
import Team from './components/Team';
import Clients from './components/Clients';
import Kanban from './components/Kanban';
import ContentApproval from './components/ContentApproval';
import ContentManagement from './components/ContentManagement';
import Leads from './components/Leads';
import Financial from './components/Financial';
import Settings from './components/Settings';
import SaaSAdmin from './components/SaaSAdmin';
import Help from './components/Help';
import Login from './components/Login';
import Notifications from './components/Notifications';
import PublicLeadForm from './components/PublicLeadForm';
import CheckoutPaywall from './components/CheckoutPaywall';
import { Search, Menu, Zap, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Logo from './components/ui/Logo';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isClientMode, setIsClientMode] = useState(false);

  // States to facilitate a full interactive, responsive system-wide Demo exploration
  const [isDemoExplorerActive, setIsDemoExplorerActive] = useState(false);
  const [demoDevice, setDemoDevice] = useState<'desktop' | 'notebook' | 'tablet' | 'mobile'>('desktop');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSimulatedMobile = isDemoExplorerActive && (demoDevice === 'mobile' || demoDevice === 'tablet');
  const isActualMobile = windowWidth < 1024;
  const isResponsiveMobileLayout = isSimulatedMobile || isActualMobile;

  const isFormView = window.location.search.includes('form=leads');

  useEffect(() => {
    if (profile) {
      const isSuperAdmin = profile.email === 'evoostudiomkt@gmail.com';
      if (isSuperAdmin) {
        setIsClientMode(false);
        setActiveTab('saas-central');
      } else {
        setIsClientMode(true);
        setActiveTab('dashboard');
      }
    }
  }, [profile?.email]);

  useEffect(() => {
    if (isFormView) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        let profileDoc;
        try {
          profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        } catch (getErr: any) {
          console.warn("Unable to fetch online profile. This is common when the server is offline or unreachable:", getErr);
          
          const isOfflineError = !navigator.onLine || 
                                 getErr?.message?.includes('offline') || 
                                 getErr?.message?.includes('unreachable') || 
                                 getErr?.code === 'unavailable' ||
                                 getErr?.code === 'permission-denied';
          
          if (isOfflineError) {
            console.info("Activating safe offline fallback profile for demo and sandbox visualization.");
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'offline_user@gmail.com',
              displayName: firebaseUser.displayName || 'Usuário Local',
              role: 'admin',
              agencyId: `agency_${firebaseUser.uid}`,
              permissions: ['dashboard', 'clients', 'tasks', 'content', 'approval', 'leads', 'financial', 'team', 'settings'],
              createdAt: new Date().toISOString(),
            };
            setProfile(fallbackProfile);
            setUser(firebaseUser);
            setLoading(false);
            return;
          }

          // Try server-only fetch in case of cache issues
          try {
            const { getDocFromServer } = await import('firebase/firestore');
            profileDoc = await getDocFromServer(doc(db, 'users', firebaseUser.uid));
          } catch (serverErr: any) {
            console.warn("Critical online server fetch failed. Activating fallback profile:", serverErr);
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'offline_user@gmail.com',
              displayName: firebaseUser.displayName || 'Usuário Local (Offline)',
              role: 'admin',
              agencyId: `agency_${firebaseUser.uid}`,
              permissions: ['dashboard', 'clients', 'tasks', 'content', 'approval', 'leads', 'financial', 'team', 'settings'],
              createdAt: new Date().toISOString(),
            };
            setProfile(fallbackProfile);
            setUser(firebaseUser);
            setLoading(false);
            return;
          }
        }
        
        if (profileDoc && profileDoc.exists()) {
          const data = profileDoc.data() as UserProfile;
          
          if (!data.agencyId) {
            // Auto-migration for legacy users
            const agencyId = `agency_${firebaseUser.uid}`;
            
            const newAgency: Agency = {
              id: agencyId,
              name: `Agência de ${data.displayName || 'Usuário'}`,
              ownerId: firebaseUser.uid,
              planId: 'start',
              clientLimit: 5,
              storageLimitGb: 10,
              status: 'active',
              createdAt: new Date().toISOString()
            };

            const updatedProfile = {
              ...data,
              agencyId: agencyId,
              permissions: data.permissions || ['dashboard', 'clients', 'tasks', 'content', 'approval', 'leads', 'financial', 'team', 'settings']
            };

            try {
              await setDoc(doc(db, 'agencies', agencyId), newAgency);
              await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile);
            } catch (writeErr) {
              console.warn("Silent fallback on profile auto-migration write failure:", writeErr);
            }
            
            setProfile(updatedProfile);
          } else {
            setProfile(data);
          }
        } else {
          // SaaS Registration: Create or Link Agency
          let agencyId;
          
          try {
            if (firebaseUser.email) {
              const agenciesRef = collection(db, 'agencies');
              const q = query(agenciesRef, where('ownerEmail', '==', firebaseUser.email), limit(1));
              const agencySnap = await getDocs(q);
              
              if (!agencySnap.empty) {
                // Found pre-created agency
                const agencyDoc = agencySnap.docs[0];
                agencyId = agencyDoc.id;
                const existingAgencyData = agencyDoc.data();
                
                // Link user to this agency if not already linked
                if (!existingAgencyData.ownerId) {
                  await updateDoc(doc(db, 'agencies', agencyId), { 
                    ownerId: firebaseUser.uid 
                  });
                }
              }
            }
          } catch (fetchAgenciesErr) {
            console.warn("Unable to check existing agency from database, choosing direct creation key:", fetchAgenciesErr);
          }
          
          if (!agencyId) {
            // SaaS Registration: Create Default Agency
            agencyId = `agency_${firebaseUser.uid}`;
            
            const newAgency: Agency = {
              id: agencyId,
              name: `Agência de ${firebaseUser.displayName || 'Novo Usuário'}`,
              ownerId: firebaseUser.uid,
              planId: 'start',
              clientLimit: 5,
              storageLimitGb: 10,
              status: 'pending_payment',
              createdAt: new Date().toISOString()
            };

            try {
              await setDoc(doc(db, 'agencies', agencyId), newAgency);
            } catch (agencyWriteErr) {
              console.warn("Silent fallback on default agency setDoc failure:", agencyWriteErr);
            }
          }

          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Usuário',
            role: 'admin',
            agencyId: agencyId,
            permissions: ['dashboard', 'clients', 'tasks', 'content', 'approval', 'leads', 'financial', 'team', 'settings'],
            createdAt: new Date().toISOString(),
          };

          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          } catch (profileWriteErr) {
            console.warn("Silent fallback on profile setDoc failure:", profileWriteErr);
          }
          
          setProfile(newProfile);
        }
        setUser(firebaseUser);
      } catch (err: any) {
        console.error("Detailed error in onAuthStateChanged:", err);
        // If it's a permission error, it might be rule propagation delay
        if (err.code === 'permission-denied') {
          console.warn("Possible permission delay, retrying profile fetch in 2s...");
          setTimeout(() => {
            setLoading(true);
            // Trigger a minor state change to re-run effect if needed
            setUser(null); 
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile?.agencyId) {
      setAgency(null);
      return;
    }

    const agencyRef = doc(db, 'agencies', profile.agencyId);
    const unsubscribe = onSnapshot(agencyRef, (snapshot) => {
      if (snapshot.exists()) {
        setAgency(snapshot.data() as Agency);
      } else {
        setAgency(null);
      }
    }, (error) => {
      console.warn("Unable to listen to real-time agency updates:", error);
      getDoc(agencyRef).then(snap => {
        if (snap.exists()) {
          setAgency(snap.data() as Agency);
        }
      }).catch(err => console.error("Standard fallback error:", err));
    });

    return () => unsubscribe();
  }, [profile?.agencyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.5, 1, 0.5] 
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        >
          <Logo size="xl" />
        </motion.div>
      </div>
    );
  }

  if (isFormView) {
    return <PublicLeadForm />;
  }

  // Create a robust Mock / Placeholder User Profile for the demo tour
  const rawProfileObj = profile || (isDemoExplorerActive ? {
    uid: 'demo_user',
    email: 'evoostudiomkt@gmail.com', // Let's use this email to unlock all admin and platform visual features!
    displayName: 'Agência de Marketing (Demo)',
    role: 'admin',
    agencyId: 'demo_agency',
    permissions: ['dashboard', 'clients', 'tasks', 'content', 'approval', 'leads', 'financial', 'team', 'settings'],
    createdAt: new Date().toISOString()
  } as UserProfile : null);

  const currentProfile = rawProfileObj ? {
    ...rawProfileObj,
    displayName: (rawProfileObj.role === 'admin' && agency?.name) ? agency.name : (rawProfileObj.displayName || 'Usuário')
  } as UserProfile : null;

  // If they clicked "Demo Mode" on the landing page, we bypass the sign in step completely!
  if (!isDemoExplorerActive && (!user || !profile)) {
    const demoProfile = {
      uid: 'demo_user',
      email: 'evoostudiomkt@gmail.com',
      displayName: 'Agência de Marketing (Demo)',
      role: 'admin',
      agencyId: 'demo_agency',
      permissions: ['dashboard', 'clients', 'tasks', 'content', 'approval', 'leads', 'financial', 'team', 'settings'],
      createdAt: new Date().toISOString()
    } as UserProfile;

    return (
      <Login 
        onEnterDemoMode={() => {
          setIsDemoExplorerActive(true);
          setActiveTab('dashboard');
        }} 
        renderInteractiveApp={(activeScreenshotTab) => {
          const isDemoMode = true;
          switch (activeScreenshotTab) {
            case 'kanban':
              return (
                <div className="h-[550px] overflow-y-auto text-left text-gray-900 bg-gray-55 border-t border-gray-200">
                  <Kanban profile={demoProfile} isDemoMode={isDemoMode} />
                </div>
              );
            case 'approval':
              return (
                <div className="h-[550px] overflow-y-auto text-left text-gray-900 bg-gray-55 border-t border-gray-200">
                  <ContentApproval profile={demoProfile} isDemoMode={isDemoMode} />
                </div>
              );
            case 'financial':
              return (
                <div className="h-[550px] overflow-y-auto text-left text-gray-900 bg-gray-55 border-t border-gray-200">
                  <Financial profile={demoProfile} isDemoMode={isDemoMode} />
                </div>
              );
            case 'drive':
              return (
                <div className="h-[550px] overflow-y-auto text-left text-gray-900 bg-gray-55 border-t border-gray-200">
                  <Clients profile={demoProfile} isDemoMode={isDemoMode} />
                </div>
              );
            default:
              return null;
          }
        }}
      />
    );
  }

  const isSuperAdmin = currentProfile?.email === 'evoostudiomkt@gmail.com';

  // Render a loading state while agency is being fetched for the admin
  if (currentProfile?.role === 'admin' && !agency && !isSuperAdmin && !isDemoExplorerActive) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-400">
        <motion.div 
          animate={{ scale: [0.98, 1.02, 0.98], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-3"
        >
          <Logo size="lg" variant="white" showText={true} />
          <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500">Conectando ao Asaas...</p>
        </motion.div>
      </div>
    );
  }

  // Paywall intercept for pending payment agencies - bypassed if navigating in Demo mode
  if (!isSuperAdmin && currentProfile?.role === 'admin' && agency && agency.status === 'pending_payment' && !isDemoExplorerActive) {
    return (
      <CheckoutPaywall 
        agency={agency} 
        profile={currentProfile} 
        onLogout={() => signOut(auth)} 
        onEnterDemoMode={() => {
          setIsDemoExplorerActive(true);
          setActiveTab('dashboard');
        }} 
      />
    );
  }

  const renderContent = () => {
    const isDemoMode = (currentProfile?.email === 'evoostudiomkt@gmail.com' && isClientMode) || isDemoExplorerActive;
    if (!currentProfile) return null;
    switch (activeTab) {
      // Client/Agency Tabs
      case 'dashboard': 
        return currentProfile.role === 'admin' ? <AgencyDashboard profile={currentProfile} isDemoMode={isDemoMode} /> : <Dashboard profile={currentProfile} isDemoMode={isDemoMode} />;
      case 'clients': return <Clients profile={currentProfile} isDemoMode={isDemoMode} />;
      case 'tasks': return <Kanban profile={currentProfile} isDemoMode={isDemoMode} />;
      case 'approval': return <ContentManagement profile={currentProfile} isDemoMode={isDemoMode} />;
      case 'content': return <ContentManagement profile={currentProfile} isDemoMode={isDemoMode} />;
      case 'leads': return <Leads profile={currentProfile} isDemoMode={isDemoMode} />;
      case 'financial': return <Financial profile={currentProfile} isDemoMode={isDemoMode} />;
      case 'team': return <Team profile={currentProfile} isDemoMode={isDemoMode} />;
      case 'help': return <Help profile={currentProfile} />;
      case 'settings': return <Settings profile={currentProfile} />;
      
      // SaaS Admin Tabs
      case 'saas-central': return <SaaSAdmin profile={currentProfile} initialTab="agencies" />;
      case 'saas-finance': return <SaaSAdmin profile={currentProfile} initialTab="finance" />;
      case 'saas-infra': return <SaaSAdmin profile={currentProfile} initialTab="resources" />;
      case 'saas-settings': return <SaaSAdmin profile={currentProfile} initialTab="settings" />;
      
      default: return <Dashboard profile={currentProfile} />;
    }
  };

  const renderAppLayout = () => {
    if (!currentProfile) return null;
    return (
      <div className={cn("flex bg-gray-50 flex-1 relative overflow-hidden", isDemoExplorerActive ? "h-full w-full" : "h-screen w-full")} id="main-layout">
        {/* Responsive Drawer/Overlay Sidebar */}
        <div 
          className={cn(
            "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-50 overflow-hidden",
            isResponsiveMobileLayout 
              ? "fixed inset-y-0 left-0 w-64 shadow-2xl h-full" 
              : "relative w-64 h-full",
            isResponsiveMobileLayout && !isMobileSidebarOpen ? "-translate-x-full" : "translate-x-0"
          )}
          id="sidebar-container"
        >
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (isResponsiveMobileLayout) {
                setIsMobileSidebarOpen(false);
              }
            }} 
            profile={currentProfile} 
            isClientMode={isClientMode}
            setIsClientMode={setIsClientMode}
            isDemoMode={isDemoExplorerActive}
          />
        </div>

        {/* Sidebar overlay dark backdrop */}
        {isResponsiveMobileLayout && isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity" 
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
          <header className={cn(
            "bg-white/50 backdrop-blur-md border-b border-gray-100 flex items-center justify-between flex-shrink-0 z-40 transition-all",
            isResponsiveMobileLayout ? "h-16 px-4" : "h-20 px-8"
          )}>
            <div className="flex items-center gap-3">
              {isResponsiveMobileLayout && (
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-750 transition-all active:scale-95 flex items-center justify-center shrink-0 border border-gray-200"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              
              <div className={cn(
                "flex items-center bg-gray-100/50 px-4 py-2 rounded-2xl w-96 group focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all border border-transparent focus-within:border-blue-200",
                isResponsiveMobileLayout && "hidden sm:flex w-auto"
              )}>
                <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600 mr-2" />
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Notifications profile={currentProfile} />
              <div className="h-8 w-px bg-gray-100 mx-1"></div>
              <div className="text-right hidden sm:block shrink-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentProfile.role === 'admin' ? 'Administrador' : 'Equipe'}</p>
                <p className="text-xs font-bold text-gray-900 leading-snug">{currentProfile.displayName}</p>
              </div>
            </div>
          </header>

          <main className={cn("flex-1 overflow-y-auto", isResponsiveMobileLayout ? "p-4" : "p-8")} id="content-area">
            {renderContent()}
          </main>
        </div>
      </div>
    );
  };

  if (isDemoExplorerActive) {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-900 select-none md:select-text text-slate-100" id="demo-explorer-page">
        {/* Dynamic Premium Controller Header */}
        <header className="h-14 bg-slate-950 text-white flex items-center justify-between px-4 sm:px-6 border-b border-white/5 relative z-50 flex-shrink-0 shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-200">
                Modo Demo Interativo
              </span>
              <span className="text-[9px] text-emerald-400 font-bold uppercase hidden sm:inline-block bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                VALIDAÇÃO DE SUCESSO
              </span>
            </div>
          </div>

          {/* Device Controls Selector */}
          <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1">
            <button
              onClick={() => setDemoDevice('desktop')}
              className={cn(
                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                demoDevice === 'desktop' ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
            >
              <span className="hidden sm:inline">🖥️</span>
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setDemoDevice('notebook')}
              className={cn(
                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                demoDevice === 'notebook' ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
            >
              <span className="hidden sm:inline">💻</span>
              <span>Notebook</span>
            </button>
            <button
              onClick={() => setDemoDevice('tablet')}
              className={cn(
                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                demoDevice === 'tablet' ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
            >
              <span className="hidden sm:inline">📟</span>
              <span>Tablet</span>
            </button>
            <button
              onClick={() => setDemoDevice('mobile')}
              className={cn(
                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                demoDevice === 'mobile' ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
            >
              <span className="hidden sm:inline">📱</span>
              <span>Celular</span>
            </button>
          </div>

          {/* Action to quit Demo and return to checkout */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDemoExplorerActive(false)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3 sm:px-4 py-1.5 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/20 flex items-center gap-1 sm:gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Ativar Plataforma</span>
            </button>
          </div>
        </header>

        {/* Embedded Dynamic Interactive Viewport Container */}
        {demoDevice === 'desktop' ? (
          <div className="flex-1 overflow-hidden relative w-full h-full bg-slate-900 border-t border-white/5">
            {renderAppLayout()}
          </div>
        ) : (
          <div className="flex-1 bg-slate-900/40 p-4 sm:p-8 overflow-y-auto flex items-center justify-center relative min-h-0 select-none md:select-text border-t border-white/5">
            {/* Visual device wrapper frame with screen boundaries */}
            <div 
              style={{ contentVisibility: 'auto' }}
              className={cn(
                "bg-slate-950 shadow-2xl transition-all duration-300 relative flex flex-col border-slate-800 border-opacity-90 overflow-hidden shrink-0",
                demoDevice === 'notebook' && "w-[1280px] h-[768px] max-w-full rounded-2xl border-[12px]",
                demoDevice === 'tablet' && "w-[768px] h-[1024px] max-w-full max-h-full rounded-[2rem] border-[14px]",
                demoDevice === 'mobile' && "w-[380px] h-[812px] max-w-full max-h-full rounded-[2.5rem] border-[12px] pt-4"
              )}
            >
              {/* Optional Phone Notch decoration */}
              {demoDevice === 'mobile' && (
                <div className="absolute top-0 inset-x-0 mx-auto w-28 h-4 bg-slate-800 rounded-b-xl z-50 flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-950 rounded-full mb-1"></div>
                </div>
              )}
              
              <div className="flex-1 w-full h-full relative overflow-hidden bg-gray-50 flex flex-col">
                {renderAppLayout()}
              </div>
              
              {/* Optional Tablet home button decoration */}
              {demoDevice === 'tablet' && (
                <div className="absolute bottom-1 inset-x-0 mx-auto w-3 h-3 bg-slate-800/80 rounded-full"></div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return renderAppLayout();
}
