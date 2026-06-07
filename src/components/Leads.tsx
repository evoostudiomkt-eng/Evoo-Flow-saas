import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { Lead, UserProfile } from "../types";
import { MOCK_LEADS } from "../lib/mockData";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { notifyAdmins } from "../lib/notifications";
import {
  TrendingUp,
  Mail,
  Building2,
  Plus,
  MoreHorizontal,
  ChevronRight,
  Filter,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  ExternalLink,
  Share2,
  Copy,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

const STAGES = [
  {
    id: "new",
    label: "Prospecção",
    color: "bg-blue-600",
    light: "bg-blue-50",
    text: "text-blue-700",
  },
  {
    id: "contacted",
    label: "Qualificação",
    color: "bg-amber-500",
    light: "bg-amber-50",
    text: "text-amber-700",
  },
  {
    id: "proposal",
    label: "Proposta",
    color: "bg-purple-600",
    light: "bg-purple-50",
    text: "text-purple-700",
  },
  {
    id: "won",
    label: "Ganho",
    color: "bg-green-600",
    light: "bg-green-50",
    text: "text-green-700",
  },
  {
    id: "lost",
    label: "Perdido",
    color: "bg-red-600",
    light: "bg-red-50",
    text: "text-red-700",
  },
] as const;

interface LeadsProps {
  profile: UserProfile;
  isDemoMode?: boolean;
}

export default function Leads({ profile, isDemoMode }: LeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    company: "",
    source: "LinkBio",
  });
  const [copied, setCopied] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const handleDeleteLead = async (id: string) => {
    if (isDemoMode) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setLeadToDelete(null);
      return;
    }

    try {
      await deleteDoc(doc(db, "leads", id));
      setLeadToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "leads");
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}?form=leads&agency=${profile.agencyId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (isDemoMode) {
      setLeads(MOCK_LEADS);
      return () => {};
    }

    if (!profile?.agencyId) return;

    const q = query(
      collection(db, "leads"),
      where("agencyId", "==", profile.agencyId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lead));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "leads");
      },
    );
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode) {
      const added: Lead = {
        id: `lead_demo_${Date.now()}`,
        ...newLead,
        status: "new",
        notes: "",
        createdAt: new Date().toISOString(),
      };
      setLeads((prev) => [...prev, added]);
      setIsAdding(false);
      setNewLead({ name: "", email: "", company: "", source: "LinkBio" });
      return;
    }

    const docRef = await addDoc(collection(db, "leads"), {
      ...newLead,
      agencyId: profile.agencyId,
      status: "new",
      notes: "",
      createdAt: new Date().toISOString(),
    });

    await notifyAdmins(
      "Novo Lead Cadastrado",
      `${newLead.name} (${newLead.company}) entrou no pipeline via ${newLead.source}.`,
      "lead",
      "leads",
    );

    setIsAdding(false);
    setNewLead({ name: "", email: "", company: "", source: "LinkBio" });
  };

  const updateStage = async (id: string, stage: Lead["status"]) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;

    if (isDemoMode) {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: stage } : l)),
      );
      return;
    }

    await updateDoc(doc(db, "leads", id), { status: stage });

    const stageLabel = STAGES.find((s) => s.id === stage)?.label;
    await notifyAdmins(
      "Lead Movido",
      `${lead.name} foi movido para ${stageLabel}.`,
      "lead",
      "leads",
    );
  };

  return (
    <div className="space-y-8" id="leads-pipeline">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">
            Pipeline de Vendas
          </h2>
          <p className="text-gray-500 mt-1">
            Transforme oportunidades em resultados reais.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={copyPublicLink}
            className={cn(
              "flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-100/20",
              copied
                ? "bg-green-600 text-white shadow-green-100"
                : "bg-white text-gray-700 border border-gray-100 hover:border-blue-200",
            )}
          >
            {copied ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
            <span>{copied ? "Link Copiado!" : "Link Público"}</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Lead</span>
          </button>
        </div>
      </header>

      <div
        className="flex gap-6 overflow-x-auto pb-10 h-[calc(100vh-14rem)] custom-scrollbar"
        id="leads-grid-container"
      >
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.id);
          return (
            <div
              key={stage.id}
              className="min-w-[320px] w-80 flex flex-col space-y-5"
              id={`stage-${stage.id}`}
            >
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center space-x-2">
                  <div
                    className={cn("w-2 h-2 rounded-full", stage.color)}
                  ></div>
                  <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.2em]">
                    {stage.label}
                  </span>
                </div>
                <span className="bg-gray-100/80 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {stageLeads.length}
                </span>
              </div>

              <div className="flex-1 space-y-4 bg-gray-50/50 p-3 rounded-[2rem] border border-gray-100 overflow-y-auto custom-scrollbar">
                {stageLeads.map((lead) => (
                  <motion.div
                    layoutId={lead.id}
                    key={lead.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col space-y-4 hover:shadow-xl hover:border-blue-200 transition-all group relative"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                          <UserProfileInitials name={lead.name} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {lead.name}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                            {lead.source}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeadToDelete(lead);
                        }}
                        className="p-1 px-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
                        title="Excluir Lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-[11px] text-gray-600 font-bold bg-gray-50/50 p-2 rounded-lg truncate">
                        <Briefcase className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        {lead.company}
                      </div>
                      <div className="flex items-center text-[10px] text-gray-400 px-2 truncate">
                        <Mail className="w-3.5 h-3.5 mr-2" />
                        {lead.email}
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-1 pt-2">
                      {STAGES.filter((s) => s.id !== lead.status)
                        .slice(0, 3)
                        .map((next) => (
                          <button
                            key={next.id}
                            onClick={() => updateStage(lead.id, next.id as any)}
                            className={cn(
                              "px-2 py-1.5 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-gray-200",
                              next.text,
                              next.light,
                            )}
                            title={`Mover para ${next.label}`}
                          >
                            {next.label}
                          </button>
                        ))}
                    </div>
                  </motion.div>
                ))}

                {stageLeads.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-300 opacity-50">
                    <TrendingUp className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-center">
                      Vazio
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-8 font-sans">
                Cadastrar Lead
              </h3>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700 ml-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newLead.name}
                    onChange={(e) =>
                      setNewLead({ ...newLead, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700 ml-1">
                    Instituição
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newLead.company}
                    onChange={(e) =>
                      setNewLead({ ...newLead, company: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700 ml-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newLead.email}
                    onChange={(e) =>
                      setNewLead({ ...newLead, email: e.target.value })
                    }
                  />
                </div>
                <div className="flex space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {leadToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[80] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden text-center border border-gray-100"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                <Trash2 className="w-8 h-8 animate-pulse" />
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-2 font-sans tracking-tight">
                Confirmar Exclusão
              </h3>
              <p className="text-sm font-medium text-gray-500 leading-relaxed mb-8">
                Tem certeza que deseja excluir o lead{" "}
                <strong className="text-gray-800 font-extrabold">
                  {leadToDelete.name}
                </strong>{" "}
                ({leadToDelete.company})? Esta ação não poderá ser desfeita.
              </p>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setLeadToDelete(null)}
                  className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLead(leadToDelete.id)}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-100 hover:bg-red-700 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const UserProfileInitials = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return (
    <span className="text-[11px] font-bold text-blue-600">{initials}</span>
  );
};
