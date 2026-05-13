'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { Document } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Props {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onValidate: (id: string) => void;
  onReject: (id: string) => void;
}

export function DocumentPreviewModal({ document, isOpen, onClose, onValidate, onReject }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!document || !isOpen) {
      setSignedUrl(null);
      return;
    }

    const fetchUrl = async () => {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_path, 3600);
        
      if (!error && data) setSignedUrl(data.signedUrl);
      setLoading(false);
    };

    fetchUrl();
  }, [document, isOpen, supabase]);

  if (!document) return null;

  const isPdf = document.mime_type === 'application/pdf' || document.original_name.endsWith('.pdf');
  const isImage = document.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(document.original_name);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="truncate text-lg">{document.original_name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 relative bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center mt-2">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
              <p className="text-sm text-slate-500">Chargement de l'aperçu...</p>
            </div>
          ) : !signedUrl ? (
            <p className="text-slate-500 text-sm">Impossible de charger le document</p>
          ) : isPdf ? (
            <iframe src={signedUrl} className="w-full h-full border-0" />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signedUrl} className="max-w-full max-h-full object-contain" alt={document.original_name} />
          ) : (
            <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-slate-200 max-w-sm">
              <p className="text-slate-600 mb-4 text-sm">Aperçu non disponible pour ce type de fichier (ex: Excel).</p>
              <Button asChild className="w-full bg-blue-800 hover:bg-blue-900 text-white">
                <a href={signedUrl} target="_blank" rel="noopener noreferrer">Télécharger le fichier</a>
              </Button>
            </div>
          )}
        </div>

        {document.status === 'pending' && (
          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => onReject(document.id)}>Refuser</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => onValidate(document.id)}>Valider</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
