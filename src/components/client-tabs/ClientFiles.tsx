import React, { useState } from 'react';
import { Client, UserProfile } from '../../types';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  CheckCircle2,
  ChevronRight,
  MoreVertical,
  Plus,
  Loader2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getCachedToken } from '../../lib/googleDriveAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

interface ClientFilesProps {
  client: Client;
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function ClientFiles({ client, profile, isDemoMode }: ClientFilesProps) {
  const [loading, setLoading] = useState(false);

  const folders = [
    { name: 'Roteiros', icon: FileText, count: 0, color: 'text-blue-500 bg-blue-50' },
    { name: 'Artes', icon: ImageIcon, count: 0, color: 'text-pink-500 bg-pink-50' },
    { name: 'Vídeos', icon: Film, count: 0, color: 'text-purple-500 bg-purple-50' },
    { name: 'Aprovados', icon: CheckCircle2, count: 0, color: 'text-green-500 bg-green-50' },
  ];

  const handleCreateFolder = async () => {
    setLoading(true);
    try {
      const token = getCachedToken();
      const response = await fetch('/api/drive/setup-client-folders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'x-google-token': token } : {})
        },
        body: JSON.stringify({ companyName: client.company }),
      });
      
      const data = await response.json();
      if (data.success && data.driveFolderId) {
        await updateDoc(doc(db, 'clients', client.id), { 
          driveFolderId: data.driveFolderId,
          driveVideoFolderId: data.driveVideoFolderId,
          driveImageFolderId: data.driveImageFolderId
        });
      } else {
        throw new Error(data.error || 'Falha ao criar estrutura de pastas.');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}. Certifique-se de que o Google Drive foi sincronizado nas Configurações.`);
    } finally {
      setLoading(false);
    }
  };

  const driveUrl = client.driveFolderId 
    ? `https://drive.google.com/drive/folders/${client.driveFolderId}`
    : null;

  return (
    <div className="space-y-8" id="client-files-container">
      {!driveUrl ? (
        <div className="flex flex-col md:flex-row items-center justify-between bg-white p-10 rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-sm mb-6 gap-6">
           <div className="flex items-center space-x-6 text-center md:text-left flex-col md:flex-row">
              <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center border border-amber-100/50">
                 <Folder className="w-10 h-10 text-amber-500" />
              </div>
              <div className="space-y-1">
                 <h4 className="font-black text-gray-900 text-2xl tracking-tight">Vincular Google Drive</h4>
                 <p className="text-gray-400 font-medium max-w-md">Para centralizar os ativos da agência, geramos uma estrutura de pastas automática no Drive do cliente.</p>
              </div>
           </div>
           <button 
             onClick={handleCreateFolder}
             disabled={loading}
             className="w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-50"
           >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
              {loading ? 'Sincronizando...' : 'GERAR PASTA AUTOMÁTICA'}
           </button>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-between bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-100 mb-6 gap-6 text-white">
           <div className="flex items-center space-x-5">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                 <Folder className="w-8 h-8 text-white" />
              </div>
              <div>
                 <h4 className="font-black text-xl tracking-tight">Eco-sistema Ativo</h4>
                 <p className="text-blue-100 text-xs font-medium">Pasta ID: {client.driveFolderId.substring(0, 10)}...</p>
              </div>
           </div>
           <a 
             href={driveUrl}
             target="_blank"
             rel="noreferrer"
             className="px-8 py-4 bg-white text-blue-600 rounded-xl font-black text-sm hover:scale-105 transition-transform flex items-center shadow-lg"
           >
              ABRIR NO GOOGLE DRIVE
              <ExternalLink className="w-4 h-4 ml-2" />
           </a>
        </div>
      )}

      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", !driveUrl && "opacity-40 grayscale pointer-events-none")}>
        {folders.map((folder) => (
          <div 
            key={folder.name}
            className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-8">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm", folder.color)}>
                <folder.icon className="w-7 h-7" />
              </div>
              <button className="text-gray-300 group-hover:text-gray-500 p-2">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            <h5 className="font-black text-gray-900 text-lg">{folder.name}</h5>
            <p className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest mt-1">Sincronizado</p>
          </div>
        ))}
      </div>

      <div className={cn("bg-white rounded-[2.5rem] border border-gray-50 shadow-sm p-10", !driveUrl && "opacity-40 grayscale pointer-events-none")} id="recent-files">
        <h3 className="font-black text-gray-900 text-xl font-sans mb-8 flex items-center">
           <Activity className="w-5 h-5 mr-3 text-blue-600" /> Ativos Recentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Roteiro_Lançamento_Outono.docx', folder: 'Roteiros', size: '2.4 MB', date: 'Hoje' },
            { name: 'Arte_Capa_Reels_01.png', folder: 'Artes', size: '4.8 MB', date: 'Ontem' },
            { name: 'Video_Vantagens_Evoo.mp4', folder: 'Vídeos', size: '124 MB', date: '2 dias atrás' },
          ].map(file => (
            <div key={file.name} className="flex items-center justify-between p-5 hover:bg-blue-50/30 border border-transparent hover:border-blue-100 rounded-3xl transition-all group">
              <div className="flex items-center space-x-4">
                 <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-sm font-bold text-gray-900">{file.name}</p>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-tight">
                       {file.folder} • {file.size}
                    </p>
                 </div>
              </div>
              <span className="text-[10px] text-gray-400 font-bold uppercase">{file.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const Activity = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
