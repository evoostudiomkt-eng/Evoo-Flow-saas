import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Send, 
  Building2, 
  User, 
  Mail, 
  Phone,
  Target
} from 'lucide-react';
import { cn } from '../lib/utils';
import Logo from './ui/Logo';

export default function PublicLeadForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    source: 'Formulário Externo'
  });

  const [agencyBranding, setAgencyBranding] = useState<{
    logoUrl?: string;
    primaryColor?: string;
    title?: string;
    description?: string;
    buttonText?: string;
    fontFamily?: string;
  } | null>(null);
  const [agencyName, setAgencyName] = useState('');

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const agencyId = urlParams.get('agency');
        if (agencyId) {
          const agencySnap = await getDoc(doc(db, 'agencies', agencyId));
          if (agencySnap.exists()) {
            const data = agencySnap.data();
            setAgencyName(data.name || '');
            if (data.branding) {
              setAgencyBranding(data.branding);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar branding da agência:", err);
      }
    };
    fetchBranding();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const agencyId = urlParams.get('agency');

      if (!agencyId) {
        throw new Error('Link inválido. Informe o código da agência.');
      }

      await addDoc(collection(db, 'leads'), {
        ...formData,
        agencyId: agencyId,
        status: 'new',
        notes: '',
        createdAt: new Date().toISOString()
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Ocorreu um erro ao enviar seus dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl text-center space-y-6"
        >
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Sucesso!</h2>
            <p className="text-gray-500 font-medium mt-2 leading-relaxed">
              Obrigado por seu interesse. Nossa equipe entrará em contato com você em breve.
            </p>
          </div>
          <button 
            onClick={() => setSubmitted(false)}
            className="w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            style={{ backgroundColor: agencyBranding?.primaryColor || '#1f2937' }}
          >
            Enviar outro formulário
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row shadow-2xl" style={{ fontFamily: agencyBranding?.fontFamily || 'Inter' }}>
      {/* Left Side: Branding/Value Prop */}
      <div 
        className="hidden md:flex w-1/2 p-12 lg:p-20 flex-col justify-between text-white relative overflow-hidden transition-colors duration-300"
        style={{ backgroundColor: agencyBranding?.primaryColor || '#2563eb' }}
      >
        <div className="relative z-10 pt-0">
          <div className="mb-0">
            {agencyBranding?.logoUrl ? (
              <div className="mb-8 max-w-[220px]">
                <img 
                  src={agencyBranding.logoUrl} 
                  className="max-h-16 w-auto object-contain rounded-xl" 
                  alt={agencyName || 'Agency Logo'} 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <Logo variant="white" size="lg" className="-ml-3 -mt-3 animate-pulse" />
            )}
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tighter mb-8 uppercase break-words">
            {agencyBranding?.title || (
              <>
                VAMOS LEVAR SEU<br />NEGÓCIO AO<br />
                <span className="text-blue-200 text-5xl lg:text-6xl italic">PRÓXIMO NÍVEL</span>
              </>
            )}
          </h1>
          
          <div className="space-y-6 max-w-sm">
            <div className="flex items-start space-x-4">
              <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <p className="text-lg font-medium opacity-80 leading-snug text-left">
                {agencyBranding?.description || 'Estratégias personalizadas de tráfego pago, social media e presença digital definitiva.'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center space-x-4">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
               <div key={i} className="w-10 h-10 rounded-full border-2 bg-slate-100 overflow-hidden" style={{ borderColor: agencyBranding?.primaryColor || '#2563eb' }}>
                 <img src={`https://i.pravatar.cc/100?img=${i+14}`} alt="User" />
               </div>
            ))}
          </div>
          <p className="text-sm font-bold opacity-80 text-left">
            {agencyName ? `A equipe da ${agencyName} está pronta para falar com você.` : '+50 clientes já confiam no nosso trabalho.'}
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 blur-[120px] -translate-y-1/2 translate-x-1/4 rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black opacity-10 blur-[120px] translate-y-1/2 -translate-x-1/4 rounded-full"></div>
      </div>

      {/* Right Side: Form */}
      <div className="flex-1 bg-white p-8 md:p-20 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-6 block md:hidden text-center">
            {agencyBranding?.logoUrl ? (
              <div className="flex justify-center mb-4">
                <img 
                  src={agencyBranding.logoUrl} 
                  className="max-h-12 w-auto object-contain rounded-lg" 
                  alt={agencyName || 'Agency Logo'} 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <Logo size="lg" className="justify-center" />
            )}
          </div>

          <header className="mb-6 text-center md:text-left">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-4">Primeiro Passo</h2>
            <p className="text-gray-500 font-medium text-left">Preencha os dados abaixo e entraremos em contato em até 24h úteis.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label 
                className="text-[11px] font-black uppercase tracking-widest ml-1 flex items-center"
                style={{ color: agencyBranding?.primaryColor || '#2563eb' }}
              >
                <User className="w-3 h-3 mr-2" /> Seu Nome
              </label>
              <input 
                required
                type="text" 
                placeholder="Ex: João Silva"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:bg-white transition-all font-bold text-gray-700"
                style={{ '--tw-ring-color': `${agencyBranding?.primaryColor || '#2563eb'}20` } as React.CSSProperties}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label 
                className="text-[11px] font-black uppercase tracking-widest ml-1 flex items-center"
                style={{ color: agencyBranding?.primaryColor || '#2563eb' }}
              >
                <Building2 className="w-3 h-3 mr-2" /> Nome da sua Empresa
              </label>
              <input 
                required
                type="text" 
                placeholder="Ex: Empresa Ltda"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:bg-white transition-all font-bold text-gray-700"
                style={{ '--tw-ring-color': `${agencyBranding?.primaryColor || '#2563eb'}20` } as React.CSSProperties}
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label 
                  className="text-[11px] font-black uppercase tracking-widest ml-1 flex items-center"
                  style={{ color: agencyBranding?.primaryColor || '#2563eb' }}
                >
                  <Mail className="w-3 h-3 mr-2" /> E-mail Profissional
                </label>
                <input 
                  required
                  type="email" 
                  placeholder="exemplo@email.com"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:bg-white transition-all font-bold text-gray-700"
                  style={{ '--tw-ring-color': `${agencyBranding?.primaryColor || '#2563eb'}20` } as React.CSSProperties}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label 
                  className="text-[11px] font-black uppercase tracking-widest ml-1 flex items-center"
                  style={{ color: agencyBranding?.primaryColor || '#2563eb' }}
                >
                  <Phone className="w-3 h-3 mr-2" /> WhatsApp
                </label>
                <input 
                  required
                  type="tel" 
                  placeholder="(00) 00000-0000"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:bg-white transition-all font-bold text-gray-700"
                  style={{ '--tw-ring-color': `${agencyBranding?.primaryColor || '#2563eb'}20` } as React.CSSProperties}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={cn(
                "w-full py-5 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center",
                loading && "opacity-70 cursor-not-allowed"
              )}
              style={{ 
                backgroundColor: agencyBranding?.primaryColor || '#2563eb',
                boxShadow: `0 25px 50px -12px ${agencyBranding?.primaryColor ? `${agencyBranding.primaryColor}30` : 'rgba(37, 99, 235, 0.15)'}`
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {agencyBranding?.buttonText || 'Solicitar Consultoria Gratuita'} <ArrowRight className="w-4 h-4 ml-3" />
                </>
              )}
            </button>
          </form>

          <footer className="mt-12 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
              Ao enviar você concorda com nossos termos de uso e política de privacidade.<br />
              Seus dados estão protegidos por criptografia de ponta a ponta.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
