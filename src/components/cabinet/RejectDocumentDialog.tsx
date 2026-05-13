'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  documentName: string;
}

const COMMON_REASONS = [
  'Document illisible',
  'Mauvaise période',
  'Document incomplet',
  'Mauvais document'
];

export function RejectDocumentDialog({ isOpen, onClose, onConfirm, documentName }: Props) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Refuser le document</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-slate-500">
            Veuillez indiquer le motif du refus pour <span className="font-medium text-slate-900">{documentName}</span>. 
            Ce motif sera visible par le client.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Motif du refus <span className="text-red-500">*</span></label>
            <textarea
              className="w-full min-h-[100px] p-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent border-slate-200"
              placeholder="Ex: La signature est manquante à la page 2..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Motifs fréquents</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-full transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            Confirmer le refus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
