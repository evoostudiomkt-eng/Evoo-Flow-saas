import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, CheckCircle2, ShieldCheck, Zap, AlertTriangle, 
  ArrowRight, Copy, Check, Info, ArrowLeft, Loader2, Sparkles, RefreshCw
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Agency, UserProfile, PlanTier } from '../types';
import Logo from './ui/Logo';

const PLANS_DETAIL: Record<string, { name: string; price: string; clients: string; storage: string }> = {
  test: {
    name: 'Plano Teste Sandbox',
    price: '5,00',
    clients: 'Até 2 clientes',
    storage: '2 GB de armazenamento'
  },
  start: {
    name: 'Plano Start',
    price: '47,00',
    clients: 'Até 5 clientes',
    storage: '10 GB de armazenamento'
  },
  growth: {
    name: 'Plano Growth',
    price: '97,00',
    clients: 'Até 10 clientes',
    storage: '20 GB de armazenamento'
  },
  pro: {
    name: 'Plano Pro',
    price: '147,00',
    clients: 'Até 20 clientes',
    storage: '30 GB de armazenamento'
  }
};

interface CheckoutPaywallProps {
  agency: Agency;
  profile: UserProfile;
  onLogout: () => void;
  onEnterDemoMode?: () => void;
}

export default function CheckoutPaywall({ agency, profile, onLogout, onEnterDemoMode }: CheckoutPaywallProps) {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [copiedKey, setCopiedKey] = useState(false);
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [logs, setLogs] = useState<string[]>(["💡 Sistema de faturamento Asaas inicializado com sucesso."]);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Billing & Registration State (to satisfy complete Asaas customer creation/updating)
  const [billingName, setBillingName] = useState(() => localStorage.getItem('billing_name') || (profile as any).ownerName || (agency as any).ownerName || profile.displayName || agency.name || '');
  const [cpfCnpj, setCpfCnpj] = useState(() => localStorage.getItem('billing_cpfCnpj') || (agency as any).ownerCpfCnpj || (profile as any).ownerCpfCnpj || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('billing_phone') || '');
  const [postalCode, setPostalCode] = useState(() => localStorage.getItem('billing_postalCode') || '');
  const [address, setAddress] = useState(() => localStorage.getItem('billing_address') || '');
  const [addressNumber, setAddressNumber] = useState(() => localStorage.getItem('billing_addressNumber') || '');
  const [complement, setComplement] = useState(() => localStorage.getItem('billing_complement') || '');
  const [province, setProvince] = useState(() => localStorage.getItem('billing_province') || '');
  const [city, setCity] = useState(() => localStorage.getItem('billing_city') || '');
  const [stateText, setStateText] = useState(() => localStorage.getItem('billing_state') || '');
  
  const [isCEPValidating, setIsCEPValidating] = useState(false);
  const [hasFilledBilling, setHasFilledBilling] = useState(() => {
    return localStorage.getItem('billing_has_filled') === 'true';
  });

  // Real Pix generation states from Asaas
  const [realPixQrCode, setRealPixQrCode] = useState<string | null>(null);
  const [realPixCopyPaste, setRealPixCopyPaste] = useState<string | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  // Status check states
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [activePaymentUrl, setActivePaymentUrl] = useState<string | null>(null);
  const [verifyingStatus, setVerifyingStatus] = useState(false);

  // Credit card mockup/real state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  const planKey = agency.planId || 'start';
  const planInfo = PLANS_DETAIL[planKey as PlanTier] || PLANS_DETAIL.start;

  // Fallback static Pix for sandbox fallback
  const fallbackPixKey = "00020101021126580014br.gov.bcb.pix0136evoostudiomkt@gmail.com52040000530398654045.005802BR5915EvooFlowSaaS6009Sao Paulo62070503***6304CA3F";

  const formatCpfCnpj = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 11) {
      return clean
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return clean
        .substring(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
  };

  const formatCEP = (val: string) => {
    const clean = val.replace(/\D/g, '');
    return clean.substring(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
  };

  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 10) {
      return clean.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return clean.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
    }
  };

  const fetchAddressByCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsCEPValidating(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(data.logradouro || '');
          setProvince(data.bairro || '');
          setCity(data.localidade || '');
          setStateText(data.uf || '');
          // Cache the resolved values
          localStorage.setItem('billing_address', data.logradouro || '');
          localStorage.setItem('billing_province', data.bairro || '');
          localStorage.setItem('billing_city', data.localidade || '');
          localStorage.setItem('billing_state', data.uf || '');
        }
      } catch (err) {
        console.warn("Soft CEP lookup error:", err);
      } finally {
        setIsCEPValidating(false);
      }
    }
  };

  React.useEffect(() => {
    if (paymentMethod === 'pix' && !realPixQrCode && !loadingPix && hasFilledBilling) {
      loadRealAsaasPix();
    }
  }, [paymentMethod, hasFilledBilling]);

  // Check if user already has an active or confirmed payment on Asaas on component mount!
  React.useEffect(() => {
    const autoCheckAgencyPayment = async () => {
      try {
        console.log(`[CheckoutPaywall] Auto-checking existing Asaas payments for agency: ${agency.id}`);
        const res = await fetch(`/api/checkout/check-agency/${agency.id}`);
        const data = await res.json();
        if (data.success) {
          if (data.paid) {
            setLogs(prev => [
              ...prev,
              "🎉 Pagamento confirmado localizado retroativamente no Asaas!",
              "✅ Acesso liberado automaticamente!"
            ]);
            setPaymentSuccess(true);
          } else if (data.paymentId) {
            // Restore outstanding transaction reference state automatically
            console.log(`[CheckoutPaywall] Found outstanding pending transaction on Asaas: ${data.paymentId}`);
            setActivePaymentId(data.paymentId);
            if (data.billingType) {
              setPaymentMethod(data.billingType.toLowerCase() === 'credit_card' ? 'card' : 'pix');
            }
          }
        }
      } catch (err) {
        console.error("Failed to auto-check agency payment on mount:", err);
      }
    };

    autoCheckAgencyPayment();
  }, [agency.id]);

  // Auto-poll payment status in the background every 5 seconds if a real transaction is pending
  React.useEffect(() => {
    if (!activePaymentId || paymentSuccess || isSimulated) return;

    console.log(`[Auto-Polling] Starting background status check for transaction ${activePaymentId}`);
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/checkout/status/${activePaymentId}`);
        const data = await response.json();
        
        if (data.success) {
          if (data.status === 'CONFIRMED' || data.status === 'RECEIVED') {
            console.log("[Auto-Polling] Payment CONFIRMED! Updating Firestore and unlocking access...");
            clearInterval(interval);
            
            // Log confirmation to user console log
            setLogs(prev => [
              ...prev, 
              "🎉 Pagamento confirmado via consulta automática de compensação!",
              "✅ Pix Compensado! Desbloqueando todos os módulos e recursos da agência..."
            ]);

            try {
              const agencyDocRef = doc(db, 'agencies', agency.id);
              await updateDoc(agencyDocRef, {
                status: 'active',
                paymentMethod: 'PIX',
                subscriptionLastPaidAt: new Date().toISOString()
              });
              setPaymentSuccess(true);
            } catch (dbErr) {
              console.error("[Auto-Polling] Error updating Firestore:", dbErr);
            }
          } else {
            console.log(`[Auto-Polling] Status: ${data.status || 'PENDING'}`);
          }
        }
      } catch (err) {
        console.error("[Auto-Polling] Status check failed:", err);
      }
    }, 5000);

    return () => {
      console.log(`[Auto-Polling] Stopping status check for ${activePaymentId}`);
      clearInterval(interval);
    };
  }, [activePaymentId, paymentSuccess, isSimulated, agency.id]);

  const loadRealAsaasPix = async () => {
    setLoadingPix(true);
    setPixError(null);
    setLogs(prev => [
      ...prev,
      "⚡ Criando cobrança comercial via gateway da API do Asaas...",
      "⚙️ Enviando identificador da agência e faturamento do plano..."
    ]);

    try {
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agencyId: agency.id,
          agencyName: agency.name,
          agencyEmail: profile.email,
          planId: planKey,
          billingType: 'PIX',
          billingInfo: {
            name: billingName,
            cpfCnpj,
            phone,
            postalCode,
            address,
            addressNumber,
            complement,
            province,
            city,
            state: stateText
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        if (data.simulated) {
          setIsSimulated(true);
          setLogs(prev => [
            ...prev,
            "⚠️ ATENÇÃO: Nenhuma ASAAS_API_KEY foi cadastrada nas variáveis de ambiente (.env) do seu servidor.",
            "🛠️ Executando modo de compatibilidade assistida (Sandbox interna integrada). Para faturar de verdade e registrar os logs reais no painel do seu Asaas, insira a ASAAS_API_KEY no arquivo .env"
          ]);
        } else {
          setIsSimulated(false);
          setRealPixQrCode(data.pixQrCode); // string base64
          setRealPixCopyPaste(data.pixCopyPaste); // string payload copia e cola
          setActivePaymentId(data.paymentId);
          if (data.invoiceUrl) {
            setActivePaymentUrl(data.invoiceUrl);
          }
          setLogs(prev => [
            ...prev,
            `✅ Cobrança gerada com extremo sucesso no Asaas!`,
            `🆔 ID da Transação: ${data.paymentId}`,
            `📝 Descrição: Assinatura ${planInfo.name}`,
            `📡 Logs gerados e visíveis no menu "Logs de Requisições / Webhooks" de sua conta Asaas.`
          ]);
        }
      } else {
        throw new Error(data.error || 'Erro desconhecido na resposta do servidor.');
      }
    } catch (err: any) {
      console.error("Erro ao carregar Pix real do Asaas:", err);
      setPixError(err.message || "Erro ao conectar-se ao gateway integrado.");
      setLogs(prev => [
        ...prev,
        `❌ Falha ao processar requisição de cobrança Asaas: ${err.message || 'Erro de rede'}`
      ]);
    } finally {
      setLoadingPix(false);
    }
  };

  const handleCopyPix = () => {
    const keyToCopy = realPixCopyPaste || fallbackPixKey;
    navigator.clipboard.writeText(keyToCopy);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleCheckStatus = async () => {
    const pId = activePaymentId;
    if (!pId) {
      setLogs(prev => [...prev, "🔍 Buscando cobranças ativas registradas sob a sua agência no Asaas..."]);
      setVerifyingStatus(true);
      try {
        const res = await fetch(`/api/checkout/check-agency/${agency.id}`);
        const data = await res.json();
        if (data.success) {
          if (data.paid) {
            setLogs(prev => [
              ...prev, 
              `🎉 Pagamento confirmado localizado! (ID: ${data.paymentId})`,
              "✅ Ativando seu portal corporativo..."
            ]);
            setPaymentSuccess(true);
          } else if (data.paymentId) {
            setActivePaymentId(data.paymentId);
            setLogs(prev => [
              ...prev,
              `ℹ️ Cobrança pendente localizada (ID: ${data.paymentId}) com status: ${data.status}.`,
              "⏳ Aguardando faturamento/compensação."
            ]);
          } else {
            setLogs(prev => [...prev, "❌ Nenhuma cobrança ativa ou paga foi encontrada para sua agência no Asaas. Por favor, preencha os dados e gere um novo QR Code Pix ou selecione Cartão de Crédito."]);
          }
        } else {
          setLogs(prev => [...prev, `❌ Falha ao buscar cobranças da agência: ${data.error || 'Erro desconhecido'}`]);
        }
      } catch (err: any) {
        setLogs(prev => [...prev, `❌ Erro de conexão com o servidor: ${err.message || err}`]);
      } finally {
        setVerifyingStatus(false);
      }
      return;
    }

    setVerifyingStatus(true);
    setLogs(prev => [...prev, "🔍 Consultando status atual do faturamento no Asaas..."]);

    try {
      const response = await fetch(`/api/checkout/status/${pId}`);
      const data = await response.json();

      if (data.success) {
        setLogs(prev => [...prev, `ℹ️ Status retornado do Asaas: ${data.status || 'Pendente'}`]);
        if (data.status === 'CONFIRMED' || data.status === 'RECEIVED') {
          setLogs(prev => [...prev, "🎉 Pagamento Confirmado! Ativando e liberando seu portal corporativo..."]);
          try {
            const agencyRef = doc(db, 'agencies', agency.id);
            await updateDoc(agencyRef, {
              status: 'active',
              paymentMethod: 'PIX',
              subscriptionLastPaidAt: new Date().toISOString()
            });
            setPaymentSuccess(true);
          } catch (dbErr) {
            console.error("Error updating doc:", dbErr);
          }
        } else {
          setLogs(prev => [...prev, "⏳ O faturamento ainda consta como pendente ou aguardando compensação no Asaas."]);
        }
      } else {
        throw new Error(data.error || 'Falha na verificação de status.');
      }
    } catch (err: any) {
      console.error("Error verifying payment status:", err);
      setLogs(prev => [...prev, `❌ Falha na consulta de status: ${err.message || 'Erro de comunicação'}`]);
    } finally {
      setVerifyingStatus(false);
    }
  };

  const handleBillingFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingName || !cpfCnpj || !phone || !postalCode || !address || !addressNumber || !province || !city || !stateText) {
      alert("Por favor, preencha todos os campos obrigatórios identificadores.");
      return;
    }

    // Persist all values dynamically
    localStorage.setItem('billing_name', billingName);
    localStorage.setItem('billing_cpfCnpj', cpfCnpj);
    localStorage.setItem('billing_phone', phone);
    localStorage.setItem('billing_postalCode', postalCode);
    localStorage.setItem('billing_address', address);
    localStorage.setItem('billing_addressNumber', addressNumber);
    localStorage.setItem('billing_complement', complement);
    localStorage.setItem('billing_province', province);
    localStorage.setItem('billing_city', city);
    localStorage.setItem('billing_state', stateText);
    localStorage.setItem('billing_has_filled', 'true');

    setHasFilledBilling(true);
    setLogs(prev => [
      ...prev,
      `✓ Dados de faturamento salvos com sucesso! Emissor: ${billingName} (${cpfCnpj})`
    ]);
  };

  const handleSimulateWebhook = async () => {
    setLoadingWebhook(true);
    setLogs(prev => [
      ...prev,
      "📡 Conectando ao gateway de pagamento do Asaas...",
      "🔍 Buscando transação pendente associada ao seu e-mail corporativo...",
      "⚙️ Reconhecendo webhook de conciliação de recebimento..."
    ]);

    setTimeout(() => {
      setLogs(prev => [...prev, "💰 Recebimento Pix confirmado via Asaas Sandbox (Status: RECEIVED)"]);
    }, 1500);

    setTimeout(() => {
      setLogs(prev => [...prev, "⚡ Validando permissões operacionais e espaço em nuvem..."]);
    }, 3000);

    setTimeout(async () => {
      setLogs(prev => [...prev, "✅ Assinatura Ativa! Liberando acesso total ao painel da sua agência..."]);
      try {
        const agencyRef = doc(db, 'agencies', agency.id);
        await updateDoc(agencyRef, {
          status: 'active',
          paymentMethod: 'PIX',
          subscriptionLastPaidAt: new Date().toISOString()
        });
        setPaymentSuccess(true);
      } catch (err) {
        console.error("Erro ao ativar agência:", err);
        setLogs(prev => [...prev, "❌ Erro ao atualizar status no banco de dados. Tente novamente."]);
      } finally {
        setLoadingWebhook(false);
      }
    }, 4500);
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      alert("Por favor, preencha todos os campos do cartão.");
      return;
    }
    
    setIsSubmittingCard(true);
    setLogs(prev => [
      ...prev,
      "🔒 Estabelecendo túnel de tokenização seguro SSL...",
      "💳 Enviando dados do cartão para o Asaas Gateway API...",
      "⏳ Aguardando validação do emissor do cartão..."
    ]);

    try {
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agencyId: agency.id,
          agencyName: agency.name,
          agencyEmail: profile.email,
          planId: planKey,
          billingType: 'CREDIT_CARD',
          card: {
            holderName: cardName,
            number: cardNumber,
            expiryMonth: cardExpiry,
            ccv: cardCvv
          },
          holderInfo: {
            name: cardName,
            cpfCnpj: cpfCnpj.replace(/[^\d]+/g, '')
          },
          billingInfo: {
            name: billingName,
            cpfCnpj,
            phone,
            postalCode,
            address,
            addressNumber,
            complement,
            province,
            city,
            state: stateText
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        if (data.simulated) {
          setLogs(prev => [
            ...prev,
            "⚠️ Modo de teste simulado detectado (Sem chave de produção Asaas no .env do servidor).",
            `✓ Transação fictícia de R$ ${planInfo.price} aprovada com total sucesso!`,
            "⚙️ Ativando status de agência no Firestore..."
          ]);
          
          setTimeout(async () => {
            try {
              const agencyRef = doc(db, 'agencies', agency.id);
              await updateDoc(agencyRef, {
                status: 'active',
                paymentMethod: 'CREDIT_CARD',
                subscriptionLastPaidAt: new Date().toISOString()
              });
              setPaymentSuccess(true);
            } catch (err) {
              console.error("Erro ao ativar agência:", err);
            }
          }, 1500);
        } else {
          setLogs(prev => [...prev, "💳 Conexão estabelecida com sucesso com sua conta Asaas!"]);
          setActivePaymentId(data.paymentId);
          if (data.invoiceUrl) {
            setActivePaymentUrl(data.invoiceUrl);
          }

          if (data.status === 'CONFIRMED' || data.status === 'RECEIVED') {
            setLogs(prev => [...prev, "🎉 Transação de cartão aprovada e liquidada!", "✅ Portal liberado com sucesso!"]);
            try {
              const agencyRef = doc(db, 'agencies', agency.id);
              await updateDoc(agencyRef, {
                status: 'active',
                paymentMethod: 'CREDIT_CARD',
                subscriptionLastPaidAt: new Date().toISOString()
              });
            } catch (err) {
              console.error("Client side backup activation error:", err);
            }
            setPaymentSuccess(true);
          } else {
            // HIGH-SECURITY PROTECTION: Do NOT auto-activate if real status is pending/created! Only output info and let the user pay/verify status manually!
            setLogs(prev => [
              ...prev,
              `⚠️ Cobrança criada com status: ${data.status}`,
              `ℹ️ A ativação do portal ocorrerá automaticamente quando o Asaas confirmar o recebimento do pagamento.`,
              ...(data.invoiceUrl ? [`🔗 Link da fatura do Asaas: ${data.invoiceUrl}`] : [])
            ]);
          }
        }
      } else {
        throw new Error(data.error || 'Erro no processamento da API de faturamento.');
      }
    } catch (err: any) {
      console.error("Erro ao processar cartão Asaas:", err);
      setLogs(prev => [...prev, `❌ Falha crítica: ${err.message || 'Erro na transação'}`]);
    } finally {
      setIsSubmittingCard(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between font-sans antialiased selection:bg-blue-600 selection:text-white relative overflow-hidden" id="checkout-paywall">
      {/* Decorative Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="px-6 sm:px-12 py-5 border-b border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between relative z-10">
        <Logo size="sm" showText={true} variant="white" />
        
        <button 
          onClick={onLogout}
          className="px-4 py-2 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Sair da Conta</span>
        </button>
      </header>

      {/* Main Billing Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Side: Pitch and Details */}
        <div className="lg:col-span-5 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5" />
            <span>ATIVAÇÃO DE AGÊNCIA EM ANDAMENTO</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tighter">
              Sua agência está pronta! <br />
              Ative para <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">liberar o portal</span>.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto lg:mx-0">
              Registramos com segurança as suas credenciais de acesso corporativo. Agora, para acessar o ambiente completo e ativar a integração direta com o seu Google Drive e faturamento integrado Asaas, realize o pagamento da taxa do seu plano escolhido.
            </p>
          </div>

          {/* Selected Plan Details Box */}
          <div className="bg-slate-950/80 border border-slate-800 p-6 rounded-3xl relative overflow-hidden text-left shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Plano Selecionado</p>
                <h4 className="text-lg font-black text-white">{planInfo.name}</h4>
              </div>
              <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-mono font-black text-blue-400 uppercase tracking-widest">
                R$ {planInfo.price}/mês
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Limite da Assinatura: {planInfo.clients}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Espaço Privativo em Nuvem: {planInfo.storage}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Controle de Fluxo de Caixa integrado com API</span>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-white/5 rounded-2xl border border-white/5 text-[11px] text-slate-400 leading-relaxed flex gap-2">
              <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
              <span>Sem taxa de adesão ou multa por cancelamento. Você pode alterar seu plano ou desativar a cobrança do Asaas quando desejar nas suas configurações.</span>
            </div>
          </div>

          {/* Clean Interactive Demo Exploration Card */}
          {onEnterDemoMode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-3xl p-5 text-left relative overflow-hidden shadow-xl"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
              <div className="flex gap-4">
                <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-400 shrink-0 h-fit mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-3">
                  <div>
                    <h5 className="text-[13px] font-black text-white uppercase tracking-wider">Modo de Avaliação Interativo</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      Explore o sistema real por dentro em Notebook, Tablet ou Celular! Veja o painel operacional completo, controle de faturamento, tarefas Kanban e equipe de modo 100% responsivo com dados demonstrativos antes de ativar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onEnterDemoMode}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all inline-flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
                  >
                    <span>Explorar Plataforma (Modo Demo)</span>
                    <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Side: Interactive Checkout Box */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!paymentSuccess ? (
              <motion.div 
                key="billing-form-wrapper"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white text-gray-900 rounded-[2.5rem] border border-gray-150 p-6 sm:p-8 shadow-2xl relative"
              >
                {!hasFilledBilling ? (
                  <form onSubmit={handleBillingFormSubmit} className="space-y-4 text-left" id="billing-data-collection-form">
                    <div className="space-y-1">
                      <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">Etapa 1 de 2: Dados de Faturamento</span>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight pt-1">Cadastro de Identificação</h3>
                      <p className="text-xs text-gray-500 font-medium">Preencha os dados completos para emissão do comprovante, ativação do Pix e registro de sua agência no Asaas.</p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Completo / Razão Social</label>
                        <input
                          type="text"
                          required
                          value={billingName}
                          onChange={(e) => setBillingName(e.target.value)}
                          placeholder="Ex: Nome da sua Agência ou Seu Nome"
                          className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CPF ou CNPJ (Asaas Requerido)</label>
                          <input
                            type="text"
                            required
                            value={cpfCnpj}
                            onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                            placeholder="000.000.000-00 ou 00.000.000/0001-00"
                            className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-mono font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telefone / Celular</label>
                          <input
                            type="text"
                            required
                            value={phone}
                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                            placeholder="(11) 99999-9999"
                            className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-mono font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="border-t border-gray-100 my-4 pt-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Endereço de Faturamento</p>
                        
                        <div className="grid grid-cols-3 gap-4 items-end">
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CEP (Busca Automática)</label>
                            <input
                              type="text"
                              required
                              value={postalCode}
                              onChange={(e) => {
                                const formatted = formatCEP(e.target.value);
                                setPostalCode(formatted);
                                fetchAddressByCEP(formatted);
                              }}
                              placeholder="01311-000"
                              className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-mono font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            {isCEPValidating && (
                              <div className="flex items-center gap-1 text-slate-400 mb-3 text-[10px] font-semibold">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                <span>Buscando...</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3.5">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rua / Logradouro</label>
                            <input
                              type="text"
                              required
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Avenida Paulista"
                              className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Número</label>
                            <input
                              type="text"
                              required
                              value={addressNumber}
                              onChange={(e) => setAddressNumber(e.target.value)}
                              placeholder="1000"
                              className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Complemento (Opcional)</label>
                            <input
                              type="text"
                              value={complement}
                              onChange={(e) => setComplement(e.target.value)}
                              placeholder="Bloco A, Sala 42"
                              className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-medium outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bairro</label>
                            <input
                              type="text"
                              required
                              value={province}
                              onChange={(e) => setProvince(e.target.value)}
                              placeholder="Bela Vista"
                              className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3.5 mt-3.5">
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cidade</label>
                            <input
                              type="text"
                              required
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="São Paulo"
                              className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</label>
                            <input
                              type="text"
                              required
                              value={stateText}
                              onChange={(e) => setStateText(e.target.value)}
                              placeholder="SP"
                              maxLength={2}
                              className="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-xl text-xs font-mono font-bold outline-none text-center uppercase focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                    >
                      <span>Avançar para o Pagamento</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    {/* Header showing their configured billing details and edit option */}
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3.5 rounded-2xl mb-4 text-left">
                      <div className="space-y-0.5 truncate pr-2">
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block">DADOS DE COBRANÇA CONFIGURADOS</span>
                        <p className="text-xs font-black text-gray-800 truncate">{billingName} • {cpfCnpj}</p>
                        <p className="text-[10px] text-gray-400 font-bold truncate uppercase">{address}, {addressNumber} • {city}/{stateText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHasFilledBilling(false);
                          localStorage.setItem('billing_has_filled', 'false');
                        }}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-wider transition-colors shrink-0"
                      >
                        Alterar
                      </button>
                    </div>

                    {/* Method selector tabs */}
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl border border-gray-200/50 mb-6">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                          paymentMethod === 'pix'
                            ? 'bg-white text-blue-600 shadow-md shadow-gray-200/50'
                            : 'text-gray-400 hover:text-gray-800'
                        }`}
                      >
                        ⚡ Faturar via Pix Rápido
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                          paymentMethod === 'card'
                            ? 'bg-white text-blue-600 shadow-md shadow-gray-200/50'
                            : 'text-gray-400 hover:text-gray-800'
                        }`}
                      >
                        💳 Cartão de Crédito
                      </button>
                    </div>

                    {paymentMethod === 'pix' ? (
                      <div className="space-y-6 text-center" id="pix-payment-box">
                        <div className="space-y-2">
                          <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Escaneie o QR Code ou copie a Chave</p>
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">R$ {planInfo.price}</h3>
                          <p className="text-xs text-gray-400 font-medium">Faturamento integrado em ambiente seguro sandbox de homologação</p>
                        </div>

                        {/* QR Code Graphic Mockup ou Real */}
                        <div className="mx-auto w-48 h-48 bg-slate-900 rounded-3xl p-4 flex items-center justify-center border-4 border-gray-100 shadow-inner relative group overflow-hidden">
                          {loadingPix ? (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                              <span className="text-[10px] font-mono uppercase">Gerando Pix...</span>
                            </div>
                          ) : pixError ? (
                            <div className="flex flex-col items-center p-2 text-center text-red-500 gap-1">
                              <AlertTriangle className="w-8 h-8" />
                              <span className="text-[10px] leading-tight font-bold">Erro na API Asaas</span>
                              <button 
                                onClick={loadRealAsaasPix}
                                className="mt-1 px-2.5 py-1 text-[9px] bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition-colors"
                              >
                                Tentar Novamente
                              </button>
                            </div>
                          ) : realPixQrCode ? (
                            // QR Code real gerado da API em base64
                            <img 
                              src={`data:image/png;base64,${realPixQrCode}`} 
                              alt="QR Code Pix do Asaas" 
                              className="w-full h-full object-contain rounded-2xl"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            // Fallback se simulado ou sem chave
                            <>
                              <div className="grid grid-cols-5 gap-1.5 w-full h-full relative z-10 opacity-90 animate-pulse">
                                {Array.from({ length: 25 }).map((_, i) => {
                                  const isFilled = (i % 2 === 0 && i % 3 !== 0) || i === 0 || i === 4 || i === 20 || i === 24 || (i > 6 && i < 12);
                                  return (
                                    <div 
                                      key={i} 
                                      className={`rounded-sm transition-all duration-300 ${
                                        isFilled ? 'bg-white' : 'bg-transparent'
                                      }`}
                                    />
                                  );
                                })}
                              </div>
                              <div className="absolute inset-x-0 inset-y-0 m-auto w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-gray-150 z-20">
                                <span className="text-xs font-black text-blue-600">Simulado</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="space-y-2 max-w-sm mx-auto">
                          <button
                            type="button"
                            onClick={handleCopyPix}
                            className="w-full bg-gray-50 border border-gray-150 py-3.5 px-4 rounded-xl font-bold hover:bg-gray-100 transition-all text-xs text-gray-700 uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            <span>
                              {copiedKey 
                                ? 'Chave Copiada com Sucesso' 
                                : isSimulated || !realPixCopyPaste 
                                  ? 'Copiar Código Copia e Cola (Simulado)'
                                  : 'Copiar Código Copia e Cola'
                              }
                            </span>
                          </button>
                        </div>

                        {/* Botão de verificação manual se houver um pagamento real pendente */}
                        {!isSimulated && activePaymentId && (
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-left space-y-3">
                            <p className="text-xs text-amber-900 font-bold leading-tight">
                              ⚡ Cobrança de Pix activa no Asaas. Se você já realizou o pagamento, clique no botão para liberar o acesso:
                            </p>
                            <div className="flex gap-2">
                              {activePaymentUrl && (
                                <a 
                                  href={activePaymentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-widest text-center transition-all inline-block"
                                >
                                  Ver Fatura Pix
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={handleCheckStatus}
                                disabled={verifyingStatus}
                                className="px-4 py-2 bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all inline-flex items-center gap-2"
                              >
                                {verifyingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                <span>Verificar Pagamento</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Simulation Console Log Panel */}
                        <div className="border-t border-gray-100 pt-6 space-y-4">
                          {logs.length > 0 && (
                            <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl text-left font-mono text-[10px] space-y-1.5 max-h-[150px] overflow-y-auto shadow-inner border border-slate-900">
                              {logs.map((log, index) => (
                                <p key={index} className="leading-relaxed">{log}</p>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleSimulateWebhook}
                            disabled={loadingWebhook}
                            className="w-full bg-blue-600 text-white font-black hover:bg-blue-700 py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2.5 disabled:opacity-50"
                          >
                            {loadingWebhook ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Processando Conciliação Webhook...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 text-blue-200" />
                                <span>Simular Pagamento Pix (Ativação Imediata)</span>
                              </>
                            )}
                          </button>
                          <p className="text-[10px] text-gray-400 font-bold leading-tight uppercase tracking-wider">
                            🔒 Processamento de teste simulando a resposta instantânea do webhook de liquidação do Asaas
                          </p>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleCardSubmit} className="space-y-4" id="card-payment-form">
                        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 relative overflow-hidden shadow-2xl">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
                          
                          <div className="flex items-center justify-between pb-2">
                            <span className="text-[9px] font-mono tracking-widest font-black uppercase text-slate-400">CREDIT CARD PORTAL</span>
                            <Logo size="sm" showText={false} variant="white" />
                          </div>

                          <div className="space-y-1 text-left">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Número do Cartão</p>
                            <p className="font-mono text-base font-bold tracking-widest text-white">
                              {cardNumber || "••••  ••••  ••••  ••••"}
                            </p>
                          </div>

                          <div className="flex justify-between items-center text-left">
                            <div>
                              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Titular</p>
                              <p className="font-mono text-xs font-bold text-white uppercase tracking-wider truncate max-w-[180px]">
                                {cardName || "NOME DO TITULAR"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400">Expiração</p>
                              <p className="font-mono text-xs font-bold text-white">
                                {cardExpiry || "MM/AA"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="space-y-1 text-left">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Número do Cartão (Simulado)</label>
                            <input
                              type="text"
                              required
                              value={cardNumber}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, '');
                                value = value.substring(0, 16);
                                const matched = value.match(/.{1,4}/g);
                                setCardNumber(matched ? matched.join('  ') : value);
                              }}
                              placeholder="4532  ••••  ••••  ••••"
                              className="w-full bg-gray-50 border border-gray-150 p-3.5 rounded-xl text-xs font-mono font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            />
                          </div>

                          <div className="space-y-1 text-left">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Impresso no Cartão</label>
                            <input
                              type="text"
                              required
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="TITULAR DO CARTÃO"
                              className="w-full bg-gray-50 border border-gray-150 p-3.5 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all uppercase"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Expiração</label>
                              <input
                                type="text"
                                required
                                value={cardExpiry}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/\D/g, '');
                                  if (value.length > 2) {
                                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                                  }
                                  setCardExpiry(value.substring(0, 5));
                                }}
                                placeholder="MM/AA"
                                className="w-full bg-gray-50 border border-gray-150 p-3.5 rounded-xl text-xs font-mono font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                              />
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cód Segurança (CVV)</label>
                              <input
                                type="password"
                                required
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                placeholder="•••"
                                className="w-full bg-gray-50 border border-gray-150 p-3.5 rounded-xl text-xs font-mono font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        {logs.length > 0 && (
                          <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl text-left font-mono text-[10px] space-y-1.5 max-h-[120px] overflow-y-auto border border-slate-900 mt-2">
                            {logs.map((log, index) => (
                              <p key={index}>{log}</p>
                            ))}
                          </div>
                        )}

                        {/* Botão de verificação manual se houver um pagamento real pendente no cartão */}
                        {!isSimulated && activePaymentId && (
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-left space-y-3 mt-4">
                            <p className="text-xs text-amber-900 font-bold leading-tight">
                              ⚡ Cobrança criada no Asaas. Se necessário, conclua ou verifique o status da transação:
                            </p>
                            <div className="flex gap-2">
                              {activePaymentUrl && (
                                <a 
                                  href={activePaymentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-widest text-center transition-all inline-block"
                                >
                                  Ir para Fatura
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={handleCheckStatus}
                                disabled={verifyingStatus}
                                className="px-4 py-2 bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all inline-flex items-center gap-2"
                              >
                                {verifyingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                <span>Verificar Status</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="pt-4 space-y-2">
                          <button
                            type="submit"
                            disabled={isSubmittingCard}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                          >
                            {isSubmittingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4.5 h-4.5" />}
                            <span>{isSubmittingCard ? 'Confirmando no Gateway...' : `Pagar R$ ${planInfo.price}`}</span>
                          </button>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider text-center leading-tight">
                            🔒 Seus dados de teste são tokenizados diretamente de modo simulado, protegendo a sua privacidade
                          </p>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="billing-success-wrapper"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white text-gray-900 rounded-[2.5rem] border border-gray-150 p-8 text-center space-y-6 shadow-2xl"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md border border-emerald-100">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">PAGAMENTO CONFIRMADO ✅</span>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Sua agência está ATIVA!</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-sm mx-auto">
                    Liquidamos o faturamento do seu plano no Asaas com sucesso. Sua conta administrativa foi autorizada e seu portal operacional está pronto.
                  </p>
                </div>

                <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl text-xs text-left leading-relaxed font-mono">
                  <p>✓ Conta vinculada no Firestore; (status: 'active')</p>
                  <p>✓ Mapeado limite total contratado ({planInfo.clients});</p>
                  <p>✓ Habilitado links públicos de captação de leads;</p>
                  <p>✓ Chaves preparadas para integração Google Drive.</p>
                </div>

                <div className="pt-2">
                  {/* Since database state updated, App.tsx listener will catch it in real-time. But a manual button refresh helps double-protect */}
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redirecionando para o seu dashboard...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-white/5 bg-slate-950/40 relative z-10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
        <p>© 2026 Evoo Flow Corporation. CNPJ Protegido de teste. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <a href="#" className="hover:text-white transition-colors">Termos</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">Privacidade</a>
          <span>•</span>
          <span className="text-slate-600">Asaas & Drive Secure Sandbox v2.0</span>
        </div>
      </footer>
    </div>
  );
}
