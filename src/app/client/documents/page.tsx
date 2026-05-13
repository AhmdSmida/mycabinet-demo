'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, File, Loader2, Trash2, UploadCloud, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { detectCategory } from '@/lib/documents/categorize';
import { toast } from 'sonner';
import { Document } from '@/types/database';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { value: 'facture', label: 'Facture', icon: '🧾' },
  { value: 'kbis', label: 'K-bis', icon: '🏢' },
  { value: 'justificatif', label: 'Justificatif', icon: '📄' },
  { value: 'bilan', label: 'Bilan', icon: '📊' },
  { value: 'tva', label: 'Déclaration TVA', icon: '🔢' },
  { value: 'contrat', label: 'Contrat', icon: '✍️' },
  { value: 'autre', label: 'Autre', icon: '📁' },
];

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  validated: { label: 'Validé', color: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-800 border-red-200' },
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString('fr-FR', { month: 'long' }),
}));

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function ClientDocumentsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('');
  const [periodMonth, setPeriodMonth] = useState<string>('');
  const [periodYear, setPeriodYear] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erreur lors du chargement des documents');
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      const detected = detectCategory(selectedFile.name);
      setCategory(detected);
      
      if (detected === 'facture' || detected === 'tva') {
        setPeriodMonth(String(new Date().getMonth() + 1));
        setPeriodYear(String(new Date().getFullYear()));
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 20 * 1024 * 1024, // 20MB
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!file || !category) return;
    
    setUploading(true);
    setUploadProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (periodMonth) formData.append('period_month', periodMonth);
    if (periodYear) formData.append('period_year', periodYear);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/documents/upload', true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      };
      
      xhr.onload = function() {
        if (xhr.status === 200) {
          toast.success('Document envoyé avec succès');
          setFile(null);
          setCategory('');
          setPeriodMonth('');
          setPeriodYear('');
          fetchDocuments();
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            toast.error(res.error || 'Erreur lors de l\'envoi');
          } catch {
            toast.error('Erreur lors de l\'envoi');
          }
        }
        setUploading(false);
        setUploadProgress(0);
      };
      
      xhr.onerror = function() {
        toast.error('Erreur réseau lors de l\'envoi');
        setUploading(false);
        setUploadProgress(0);
      };
      
      xhr.send(formData);
    } catch (error) {
      toast.error('Une erreur inattendue est survenue');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
    
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur de suppression');
      
      toast.success('Document supprimé');
      setDocuments(docs => docs.filter(d => d.id !== id));
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDownload = async (id: string, filename: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error('Erreur de téléchargement');
      
      const { url } = await res.json();
      
      // Create an invisible link to download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const clearSelection = () => {
    setFile(null);
    setCategory('');
  };

  // Group documents by category
  const groupedDocs = documents.reduce((acc, doc) => {
    const cat = doc.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Mes Documents</h1>
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
        {!file ? (
          <div 
            {...getRootProps()} 
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            )}
          >
            <input {...getInputProps()} />
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">
              Glissez vos fichiers ici ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PDF, JPG, PNG, Excel (Max 20MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button onClick={clearSelection} disabled={uploading} className="p-1 hover:bg-blue-100 rounded text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">Catégorie du document</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    disabled={uploading}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors",
                      category === c.value 
                        ? "bg-blue-800 text-white border-blue-800" 
                        : "bg-white text-slate-700 border-gray-200 hover:border-blue-300"
                    )}
                  >
                    <span>{c.icon}</span>
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {(category === 'facture' || category === 'tva') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Mois</label>
                  <select 
                    className="w-full border-gray-300 rounded-lg text-sm focus:ring-blue-800 focus:border-blue-800"
                    value={periodMonth}
                    onChange={e => setPeriodMonth(e.target.value)}
                    disabled={uploading}
                  >
                    <option value="">Sélectionner</option>
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Année</label>
                  <select 
                    className="w-full border-gray-300 rounded-lg text-sm focus:ring-blue-800 focus:border-blue-800"
                    value={periodYear}
                    onChange={e => setPeriodYear(e.target.value)}
                    disabled={uploading}
                  >
                    <option value="">Sélectionner</option>
                    {YEARS.map(y => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button 
                onClick={handleUpload} 
                disabled={!category || uploading}
                className="w-full bg-blue-800 hover:bg-blue-900"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours ({uploadProgress}%)
                  </>
                ) : (
                  'Envoyer le document'
                )}
              </Button>
              {uploading && (
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
            <p className="text-slate-500 text-sm">Aucun document pour le moment</p>
          </div>
        ) : (
          CATEGORIES.map(cat => {
            const catDocs = groupedDocs[cat.value];
            if (!catDocs?.length) return null;
            
            return (
              <div key={cat.value} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-lg">{cat.icon}</span>
                  <h2 className="font-semibold text-slate-800">{cat.label}</h2>
                  <span className="bg-gray-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {catDocs.length}
                  </span>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                  {catDocs.map(doc => {
                    const status = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG];
                    
                    return (
                      <div key={doc.id} className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <File className="w-5 h-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {doc.original_name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                            <span>{doc.file_size ? formatBytes(doc.file_size) : ''}</span>
                            {doc.period_month && doc.period_year && (
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-slate-600">
                                {String(doc.period_month).padStart(2, '0')}/{doc.period_year}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
                            status.color
                          )}>
                            {status.label}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDownload(doc.id, doc.original_name)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            
                            {doc.status === 'pending' && (
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
