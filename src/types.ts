export type UserRole = 'admin' | 'member' | 'client';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  clientId?: string;
  agencyId: string; // ID da agência a qual o usuário pertence
  permissions?: string[];
  ownerName?: string;
  ownerCpfCnpj?: string;
  phone?: string;
  createdAt: string;
}

export type PlanTier = 'start' | 'growth' | 'pro' | 'custom' | 'test';

export interface Agency {
  id: string;
  name: string;
  ownerId: string;
  planId: PlanTier;
  clientLimit: number;
  storageLimitGb: number;
  status: 'active' | 'suspended' | 'past_due' | 'canceled' | 'pending_payment';
  googleDriveConnected?: boolean;
  googleDriveConfig?: {
    clientId?: string;
    clientSecret?: string;
    folderId?: string;
    accessToken?: string;
    email?: string;
  };
  asaasConnected?: boolean;
  asaasConfig?: {
    apiKey?: string;
    environment?: 'sandbox' | 'production';
    walletId?: string;
  };
  subscriptionSuspendedAt?: string;
  subscriptionLastPaidAt?: string;
  paymentMethod?: 'PIX' | 'CREDIT_CARD';
  backupStatus?: 'none' | 'pending' | 'backed_up' | 'deleted_permanently';
  createdAt: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    fontFamily?: string;
    title?: string;
    description?: string;
    buttonText?: string;
  };
}

export interface ServiceTemplate {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  postCount: number;
  reelsCount: number;
  templateTasks: string[];
}

export interface Niche {
  id: string;
  name: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: 'active' | 'paused' | 'cancelled';
  cnpj?: string;
  cpfCnpj?: string;
  cep?: string;
  logradouro?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address?: string;
  nicheId?: string;
  serviceId?: string;
  startDate?: string;
  driveFolderId?: string;
  driveVideoFolderId?: string;
  driveImageFolderId?: string;
  logoUrl?: string;
  portalEmail?: string;
  portalPassword?: string;
  portalPrimaryColor?: string;
  portalAccentColor?: string;
  portalPermissions?: string[];
  logoScale?: number;
  logoPositionX?: number;
  logoPositionY?: number;
  onboardingStatus?: {
    step: number;
    totalSteps: number;
    completed: boolean;
  };
  createdAt: string;
}

export interface LoginInfo {
  id: string;
  platform: string;
  username: string;
  password?: string;
}

export interface Contract {
  id: string;
  fileUrl: string;
  signedAt: string;
  status: string;
}

export interface Task {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;
  isPaused?: boolean;
  clientNotes?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentHistory {
  status: string;
  note?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ContentMedia {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

export interface ContentItem {
  id: string;
  clientId: string;
  title: string;
  type: 'post' | 'reels' | 'story' | 'video' | 'carrossel';
  platform: string;
  script?: string;
  caption?: string;
  hashtags?: string;
  publishDate: string;
  status: 'script' | 'production' | 'approval' | 'revision' | 'approved' | 'scheduled' | 'published';
  mediaUrl?: string;
  mediaItems?: ContentMedia[];
  feedback?: string;
  history?: ContentHistory[];
  briefing?: string;
  cta?: string;
  internalNotes?: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  checklist?: { text: string; completed: boolean }[];
  comments?: { id: string; author: string; role: string; text: string; timestamp: string; version?: string }[];
  currentVersion?: number;
  versions?: { version: number; mediaUrl?: string; mediaItems?: ContentMedia[]; script?: string; caption?: string; date: string; updatedBy: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialRecord {
  id: string;
  clientId: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  description: string;
  conditions?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  source: string;
  status: 'new' | 'contacted' | 'proposal' | 'won' | 'lost';
  notes: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityId?: string;
  entityType?: string;
  clientId?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'lead' | 'task' | 'content' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}
