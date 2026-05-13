'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Document } from '@/types/database';
import { Loader2, Search, Filter, File, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DocumentPreviewModal } from '@/components/cabinet/DocumentPreviewModal';
import { RejectDocumentDialog } from '@/components/cabinet/RejectDocumentDialog';

// Extend the document type with the client relation
type DocumentWithClient = Document & {
  client: { full_name: string | null; email: string } | null;
};

const CATEGORIES = [
  { value: 'all', label: 'Toutes les catégories' },
  { value: 'facture', label: 'Facture' },
  { value: 'kbis', label: 'K-bis' },
  { value: 'justificatif', label: 'Justificatif' },
  { value: 'bilan', label: 'Bilan' },
  { value: 'tva', label: 'Déclaration TVA' },
  { value: 'contrat', label: 'Contrat' },
  { value: 'autre', label: 'Autre' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'validated', label: 'Validé' },
  { value: 'rejected', label: 'Refusé' },
];

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  validated: { label: 'Validé', color: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-800 border-red-200' },
};

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function CabinetDocumentsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  
  const [documents, setDocuments] = useState<DocumentWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterClient, setFilterClient] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<DocumentWithClient | null>(null);
  const [rejectDoc, setRejectDoc] = useState<DocumentWithClient | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!profile?.cabinet_id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      // Note: Assumes standard Supabase foreign key naming. If relation fails, adjust to client:profiles(full_name, email)
      .select('*, client:profiles!documents_client_id_fkey(full_name, email)')
      .eq('cabinet_id', profile.cabinet_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erreur lors du chargement des documents');
    } else {
      setDocuments((data as any) || []);
    }
    setLoading(false);
  }, [profile?.cabinet_id, supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAction = async (id: string, action: 'validate' | 'reject', reason?: string) => {
    try {
      const res = await fetch(`/api/cabinet/documents/${id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      
      if (!res.ok) throw new Error('Action failed');
      
      toast.success(action === 'validate' ? 'Document validé' : 'Document refusé');
      
      // Update local state instead of full refetch for better UX
      setDocuments(docs => docs.map(doc => {
        if (doc.id === id) {
          return {
            ...doc,
            status: action === 'validate' ? 'validated' : 'rejected',
            rejection_reason: action === 'reject' ? reason! : null,
            validated_at: action === 'validate' ? new Date().toISOString() : null,
          };
        }
        return doc;
      }));
      
      // Close modals
      if (previewDoc?.id === id) setPreviewDoc(null);
      if (rejectDoc?.id === id) setRejectDoc(null);

    } catch (error) {
      toast.error('Erreur lors de la validation');
    }
  };

  // Filtered documents
  const filteredDocs = documents.filter(doc => {
    const matchClient = !filterClient || 
      doc.client?.full_name?.toLowerCase().includes(filterClient.toLowerCase()) || 
      doc.client?.email?.toLowerCase().includes(filterClient.toLowerCase());
    const matchCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchStatus = filterStatus === 'all' || doc.status === filterStatus;
    
    return matchClient && matchCategory && matchStatus;
  });

  // Stats
  const totalDocs = documents.length;
  const pendingDocs = documents.filter(d => d.status === 'pending').length;
  const validatedDocs = documents.filter(d => d.status === 'validated').length;
  const rejectedDocs = documents.filter(d => d.status === 'rejected').length;
  const validatedPercent = totalDocs > 0 ? Math.round((validatedDocs / totalDocs) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Validation des documents</h1>
        <p className="text-sm text-slate-500 mt-1">Gérez et vérifiez les documents transmis par vos clients.</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <File className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total documents</p>
            <p className="text-2xl font-bold text-slate-900">{totalDocs}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">En attente</p>
            <p className="text-2xl font-bold text-slate-900">{pendingDocs}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Taux de validation</p>
            <p className="text-2xl font-bold text-slate-900">{validatedPercent}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Refusés</p>
            <p className="text-2xl font-bold text-slate-900">{rejectedDocs}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher un client..." 
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-800 focus:border-transparent outline-none"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none focus:ring-2 focus:ring-blue-800 outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <select 
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-800 outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Fichier</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Déposé le</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-800 mx-auto" />
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Aucun document trouvé.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const status = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG];
                  
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{doc.client?.full_name || 'Client inconnu'}</p>
                        <p className="text-xs text-slate-500">{doc.client?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <File className="w-4 h-4 text-slate-400" />
                          <div className="max-w-[200px]">
                            <p className="font-medium text-slate-900 truncate" title={doc.original_name}>
                              {doc.original_name}
                            </p>
                            <p className="text-xs text-slate-500">{doc.file_size ? formatBytes(doc.file_size) : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize">
                        {doc.category}
                        {doc.period_month && doc.period_year && (
                          <span className="block text-xs text-slate-500 mt-0.5">
                            {String(doc.period_month).padStart(2, '0')}/{doc.period_year}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border whitespace-nowrap",
                          status.color
                        )}>
                          {status.label}
                        </span>
                        {doc.status === 'rejected' && doc.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1 max-w-[150px] truncate" title={doc.rejection_reason}>
                            {doc.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8"
                            onClick={() => setPreviewDoc(doc)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Voir
                          </Button>
                          
                          {doc.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setRejectDoc(doc)}
                              >
                                Refuser
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-8 bg-green-600 hover:bg-green-700 text-white border-none"
                                onClick={() => handleAction(doc.id, 'validate')}
                              >
                                Valider
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DocumentPreviewModal 
        document={previewDoc} 
        isOpen={!!previewDoc} 
        onClose={() => setPreviewDoc(null)}
        onValidate={(id) => handleAction(id, 'validate')}
        onReject={(id) => {
          setPreviewDoc(null);
          setRejectDoc(previewDoc);
        }}
      />

      <RejectDocumentDialog
        isOpen={!!rejectDoc}
        documentName={rejectDoc?.original_name || ''}
        onClose={() => setRejectDoc(null)}
        onConfirm={(reason) => rejectDoc && handleAction(rejectDoc.id, 'reject', reason)}
      />
    </div>
  );
}
