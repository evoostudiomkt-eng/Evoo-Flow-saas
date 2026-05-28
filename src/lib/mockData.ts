import { Client, Task, ContentItem, FinancialRecord, Niche, ServiceTemplate, UserProfile, ActivityLog, Lead, Agency } from '../types';

export const MOCK_AGENCY: Agency = {
  id: 'agency_demo',
  name: 'Evoo Studio Marketing Demo',
  ownerId: 'demo_owner_id',
  planId: 'growth',
  clientLimit: 10,
  storageLimitGb: 50,
  status: 'active',
  createdAt: '2026-01-01T10:00:00.000Z',
  branding: {
    logoUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=120&auto=format&fit=crop&q=60',
    primaryColor: '#2563eb',
    title: 'TRANSFORME SUA PRESENÇA DIGITAL CONOSCO',
    description: 'Gestão de tráfego, design estratégico e copy de alto nível para crescer sua empresa.',
    buttonText: 'Garantir Diagnóstico Gratuito'
  }
};

export const MOCK_NICHES: Niche[] = [
  { id: 'niche_1', name: 'Estética & Saúde Integrada' },
  { id: 'niche_2', name: 'Gastronomia & Restaurantes' },
  { id: 'niche_3', name: 'Mercado Imobiliário' },
  { id: 'niche_4', name: 'Odontologia de Alta Performance' },
];

export const MOCK_SERVICES: ServiceTemplate[] = [
  { 
    id: 'service_1', 
    name: 'Social Media Start', 
    basePrice: 1500, 
    postCount: 8, 
    reelsCount: 2, 
    templateTasks: ['Branding Inicial', 'Configuração de Calendário', 'Posts de Feed'] 
  },
  { 
    id: 'service_2', 
    name: 'Social Media Growth Pro', 
    basePrice: 2900, 
    postCount: 16, 
    reelsCount: 6, 
    templateTasks: ['Planejamento Mensal', 'Análise Competitiva', 'Sessão de Gravação de Reels', 'Feed Design'] 
  },
  { 
    id: 'service_3', 
    name: 'Tráfego Pago Local + Landing Page', 
    basePrice: 2000, 
    postCount: 0, 
    reelsCount: 0, 
    templateTasks: ['Instalação de Pixel/Tag Manager', 'Criação de LP de Alta Conversão', 'Pesquisa de Público Alvo', 'Criação de Anúncios'] 
  }
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'client_1',
    name: 'Dra. Amanda Rezende',
    company: 'Bella Pelle Clínicas',
    email: 'dra.amanda@bellapelle.com.br',
    phone: '(11) 98765-4321',
    status: 'active',
    cnpj: '12.345.678/0001-90',
    address: 'Av. Brigadeiro Luis Antônio, 3450 - Jardins, São Paulo/SP',
    nicheId: 'niche_1',
    serviceId: 'service_2',
    startDate: '2026-01-15',
    logoUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=120&auto=format&fit=crop&q=60',
    onboardingStatus: { step: 4, totalSteps: 5, completed: false },
    createdAt: '2026-01-15T12:00:00.000Z'
  },
  {
    id: 'client_2',
    name: 'Felipe Albuquerque',
    company: 'Burger Lab Co.',
    email: 'financeiro@burgerlab.com',
    phone: '(11) 98123-4567',
    status: 'active',
    cnpj: '98.765.432/0001-21',
    address: 'Rua Augusta, 1022 - Consolando, São Paulo/SP',
    nicheId: 'niche_2',
    serviceId: 'service_1',
    startDate: '2026-02-10',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60',
    onboardingStatus: { step: 5, totalSteps: 5, completed: true },
    createdAt: '2026-02-10T14:30:00.000Z'
  },
  {
    id: 'client_3',
    name: 'Ricardo Mendes',
    company: 'Mendes Private Brokers',
    email: 'contato@mendesbrokers.com.br',
    phone: '(11) 99999-8888',
    status: 'active',
    cnpj: '45.111.222/0001-34',
    address: 'Av. Paulista, 2000 - Bela Vista, São Paulo/SP',
    nicheId: 'niche_3',
    serviceId: 'service_3',
    startDate: '2026-03-01',
    logoUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=120&auto=format&fit=crop&q=60',
    onboardingStatus: { step: 2, totalSteps: 5, completed: false },
    createdAt: '2026-03-01T09:15:00.000Z'
  },
  {
    id: 'client_4',
    name: 'Dra. Vanessa Guedes',
    company: 'Guedes Odontologia Estética',
    email: 'vanessa@guedesodonto.com.br',
    phone: '(21) 97345-1234',
    status: 'paused',
    cnpj: '33.222.111/0001-08',
    address: 'Rua Visconde de Pirajá, 550 - Ipanema, Rio de Janeiro/RJ',
    nicheId: 'niche_4',
    serviceId: 'service_1',
    startDate: '2026-03-12',
    logoUrl: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=120&auto=format&fit=crop&q=60',
    onboardingStatus: { step: 5, totalSteps: 5, completed: true },
    createdAt: '2026-03-12T11:00:00.000Z'
  }
];

export const MOCK_TEAM: UserProfile[] = [
  {
    uid: 'team_demo_1',
    email: 'leticia.design@evoostudio.com',
    displayName: 'Letícia Fernandes (Design)',
    role: 'member',
    agencyId: 'agency_demo',
    permissions: ['dashboard', 'clients', 'tasks', 'content', 'approval'],
    createdAt: '2026-01-01T10:00:00.000Z'
  },
  {
    uid: 'team_demo_2',
    email: 'rodrigo.copy@evoostudio.com',
    displayName: 'Rodrigo Medeiros (Copywriter)',
    role: 'member',
    agencyId: 'agency_demo',
    permissions: ['dashboard', 'tasks', 'content'],
    createdAt: '2026-01-10T09:00:00.000Z'
  },
  {
    uid: 'team_demo_3',
    email: 'juliana.media@evoostudio.com',
    displayName: 'Juliana Vasconcelos (Gestora Tráfego)',
    role: 'member',
    agencyId: 'agency_demo',
    permissions: ['dashboard', 'clients', 'leads', 'financial'],
    createdAt: '2026-02-01T11:30:00.000Z'
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 'task_demo_1',
    clientId: 'client_1',
    title: 'Planejamento Editorial Dinâmico de Junho',
    description: 'Criar temas de posts abordando Skin Care no frio de SP, criativos para Reels e sugestão de hashtags.',
    status: 'review',
    priority: 'high',
    assigneeId: 'team_demo_1',
    dueDate: '2026-06-03',
    createdAt: '2026-05-18T10:00:00.000Z',
    updatedAt: '2026-05-21T18:30:00.000Z'
  },
  {
    id: 'task_demo_2',
    clientId: 'client_2',
    title: 'Feed Design: Combo Burger Monstro + Batata Rústica',
    description: 'Ajustar as cores quentes (amarelo e vermelho) para incentivar vendas via iFood no cupom de feriado.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'team_demo_1',
    dueDate: '2026-05-25',
    createdAt: '2026-05-19T09:00:00.000Z',
    updatedAt: '2026-05-21T14:20:00.000Z'
  },
  {
    id: 'task_demo_3',
    clientId: 'client_3',
    title: 'Briefing da Landing Page para Captura do Residencial Jardins',
    description: 'Criar cabeçalho imersivo focado em investidores de alto padrão. Usar formulário conectado.',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'team_demo_2',
    dueDate: '2026-05-28',
    createdAt: '2026-05-20T11:00:00.000Z',
    updatedAt: '2026-05-20T11:00:00.000Z'
  },
  {
    id: 'task_demo_4',
    clientId: 'client_1',
    title: 'Redação das Legendas para Semana DermoEstética',
    description: 'Fazer copys persuasivas focadas em preenchimento de ácido hialurônico de forma natural.',
    status: 'done',
    priority: 'medium',
    assigneeId: 'team_demo_2',
    dueDate: '2026-05-20',
    createdAt: '2026-05-16T15:00:00.000Z',
    updatedAt: '2026-05-19T17:10:00.000Z'
  },
  {
    id: 'task_demo_5',
    clientId: 'client_3',
    title: 'Configurar Campanha de Tráfego Imobiliário no Google Search',
    description: 'Filtros avançados de geolocalização e palavras-chave de intenção de compra como "comprar loft moderno jardins".',
    status: 'todo',
    priority: 'high',
    assigneeId: 'team_demo_3',
    dueDate: '2026-05-30',
    createdAt: '2026-05-21T08:00:00.000Z',
    updatedAt: '2026-05-21T08:00:00.000Z'
  }
];

export const MOCK_CONTENTS: ContentItem[] = [
  {
    id: 'content_demo_1',
    clientId: 'client_1',
    title: 'Dicas de Skincare Climatizado no Frio',
    type: 'post',
    platform: 'Instagram',
    script: 'Cena 1: Tom frio de inverno, fumaça subindo da caneca.\nCena 2: Close na pele radiante higienizada com loção.\nCena 3: Textura em creme para hidratar.',
    caption: 'Com a chegada do clima frio de inverno, sua pele tende a ficar mais seca e sensível. A hidratação no momento correto é sua maior aliada! Cuide-se. ❄️💉',
    hashtags: '#skincare #dermatologia #esteticaporamor #autoestima',
    publishDate: '2026-06-05',
    status: 'approval',
    mediaUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=200&auto=format&fit=crop&q=60',
    createdAt: '2026-05-19T12:00:00.000Z',
    updatedAt: '2026-05-21T18:00:00.000Z'
  },
  {
    id: 'content_demo_2',
    clientId: 'client_2',
    title: 'Reels: Bastidores do Hambúrguer Perfeito',
    type: 'reels',
    platform: 'Instagram',
    script: 'Efeitos sonoros rápidos: o fogo subindo, o bacon estalando, a maionese artesanal caindo.',
    caption: 'Apenas passei para registrar o nascimento do nosso maior hambúrguer do cardápio. Você consegue sentir o cheiro daí? 🥓🍔',
    hashtags: '#artesanalburger #baconcrocante #ifoodgourmet #hamburgueria',
    publishDate: '2026-06-03',
    status: 'approval',
    mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=60',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-05-21T11:00:00.000Z'
  },
  {
    id: 'content_demo_3',
    clientId: 'client_3',
    title: 'Carrossel: Como Investir no Jardins com Segurança',
    type: 'post',
    platform: 'Instagram',
    script: 'Slide 1: Capa (Índices imobiliários em alta)\nSlide 2: Rentabilidade por m²\nSlide 3: Preservação histórica da região',
    caption: 'Investir na região mais sofisticada de São Paulo é sinônimo de segurança e liquidez. Criamos este carrossel comparativo mostrando números e índices. Salve para ler depois!',
    hashtags: '#jardinssp #imovelaltopadrao #privatebroker #investimento',
    publishDate: '2026-05-28',
    status: 'production',
    mediaUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=200&auto=format&fit=crop&q=60',
    createdAt: '2026-05-18T09:00:00.000Z',
    updatedAt: '2026-05-21T10:00:00.000Z'
  },
  {
    id: 'content_demo_4',
    clientId: 'client_1',
    title: 'Reels: O segredo da Lipo Sem Cortes',
    type: 'reels',
    platform: 'Instagram',
    script: 'Uso de transição criativa do antes e depois com animação rápida de ultrassom focado.',
    caption: 'Muitas pessoas nos perguntam sobre procedimentos modernos não invasivos. Hoje mostramos como age a tecnologia de quebra de gordura localizada! Assista até o final.',
    hashtags: '#criolipolise #liposemcortes #esteticacorporal',
    publishDate: '2026-05-26',
    status: 'approved',
    mediaUrl: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=200&auto=format&fit=crop&q=60',
    createdAt: '2026-05-15T14:00:00.000Z',
    updatedAt: '2026-05-21T09:00:00.000Z'
  }
];

export const MOCK_LEADS: Lead[] = [
  {
    id: 'lead_demo_1',
    name: 'Letícia Vasconcelos de Oliveira',
    company: 'Cardio Vida Especialistas',
    email: 'dra.leticia@cardiovida.com.br',
    source: 'Formulário Externo',
    status: 'new',
    notes: 'Procura assessoria completa para captação de consultas médicas particulares via Instagram e tráfego pago geolocalizado.',
    createdAt: '2026-05-21T21:10:00.000Z'
  },
  {
    id: 'lead_demo_2',
    name: 'Carlos Frederico',
    company: 'Freddo Pasta Tradizionale',
    email: 'carlos@freddopasta.com.br',
    source: 'Formulário Externo',
    status: 'contacted',
    notes: 'Contato via WhatsApp realizado. Agendado bate papo rápido de diagnóstico para terça-feira às 15h.',
    createdAt: '2026-05-20T11:45:00.000Z'
  },
  {
    id: 'lead_demo_3',
    name: 'Guanabara Empreendimentos',
    company: 'Residencial Altos do Ipiranga',
    email: 'vendas@guanabaraincorporadora.com',
    source: 'Indicação',
    status: 'proposal',
    notes: 'Enviada proposta para Criação de LP + Facebook Ads Local: Investimento mensal de R$ 3.500 no plano da agência.',
    createdAt: '2026-05-18T16:20:00.000Z'
  },
  {
    id: 'lead_demo_4',
    name: 'Marcos Silva',
    company: 'Dentistas Associados Paulista',
    email: 'marcos@paulistadentistas.com.br',
    source: 'Google Ads',
    status: 'won',
    notes: 'Contrato Assinado de Tráfego Pago + Landing Page. Primeira mensalidade compensada. Aguardando Onboarding.',
    createdAt: '2026-05-15T09:00:00.000Z'
  },
  {
    id: 'lead_demo_5',
    name: 'Patrícia Sales Designer',
    company: 'Sales Arquitetura Luxo',
    email: 'patricia@salesarq.design',
    source: 'Instagram Direct',
    status: 'lost',
    notes: 'A cliente decidiu postergar a contratação para o segundo semestre de 2026 por motivos de investimento em viagens.',
    createdAt: '2026-05-12T13:00:00.000Z'
  }
];

export const MOCK_FINANCIALS: FinancialRecord[] = [
  {
    id: 'fin_demo_1',
    clientId: 'client_1',
    amount: 2900.00,
    dueDate: '2026-06-10',
    status: 'pending',
    description: 'Social Media Growth Pro - Mensalidade Junho/2026',
    createdAt: '2026-05-21T09:00:00.000Z'
  },
  {
    id: 'fin_demo_2',
    clientId: 'client_2',
    amount: 1500.00,
    dueDate: '2026-06-05',
    status: 'pending',
    description: 'Social Media Start - Mensalidade Junho/2026',
    createdAt: '2026-05-21T09:00:00.000Z'
  },
  {
    id: 'fin_demo_3',
    clientId: 'client_3',
    amount: 2000.00,
    dueDate: '2026-05-15',
    status: 'paid',
    description: 'Landing Page de Alta Conversão + Configuração de Google Ads',
    createdAt: '2026-05-01T09:00:00.000Z'
  },
  {
    id: 'fin_demo_4',
    clientId: 'client_4',
    amount: 1500.00,
    dueDate: '2026-05-05',
    status: 'overdue',
    description: 'Social Media Start - Mensalidade Maio/2026',
    createdAt: '2026-05-01T09:00:00.000Z'
  }
];

export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log_demo_1',
    userId: 'team_demo_1',
    userName: 'Letícia Fernandes (Design)',
    action: 'criou e anexou conteúdo para Aprovação no post "Dicas de Skincare Climatizado no Frio"',
    clientId: 'client_1',
    createdAt: '2026-05-21T21:40:00.000Z'
  },
  {
    id: 'log_demo_2',
    userId: 'team_demo_2',
    userName: 'Rodrigo Medeiros (Copywriter)',
    action: 'escreveu legenda descritiva persuasiva para "Bastidores do Hambúrguer Perfeito"',
    clientId: 'client_2',
    createdAt: '2026-05-21T18:15:00.000Z'
  },
  {
    id: 'log_demo_3',
    userId: 'team_demo_3',
    userName: 'Juliana Vasconcelos (Gestora Tráfego)',
    action: 'converteu Lead comercial "Marcos Silva" para cliente ganho no funil (Dentistas Associados)',
    createdAt: '2026-05-15T09:30:00.000Z'
  },
  {
    id: 'log_demo_4',
    userId: 'system',
    userName: 'Sistema Externo',
    action: 'recebeu um novo lead via formulário público: Letícia Vasconcelos',
    createdAt: '2026-05-21T21:10:00.000Z'
  },
  {
    id: 'log_demo_5',
    userId: 'demo_owner_id',
    userName: 'Você (Super Admin)',
    action: 'ativou o Modo Cliente Demonstrativo para validação em tempo real',
    createdAt: '2026-05-21T23:00:00.000Z'
  }
];

export const getMockStats = () => {
  return {
    pendingApprovals: 2,
    newLeads: 2,
    urgentTasks: 3,
    activeProjects: 3,
    lateTasks: 1,
    activeClients: 3,
    monthlyRevenue: 6400
  };
};
