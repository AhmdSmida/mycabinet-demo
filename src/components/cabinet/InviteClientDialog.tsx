'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, Loader2, Mail } from 'lucide-react';

export function InviteClientDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Veuillez entrer une adresse email valide');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/cabinet/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setInviteLink(data.inviteLink);
      toast.success('Invitation créée avec succès');
    } catch (e: any) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Lien copié dans le presse-papier');
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setEmail('');
          setInviteLink(null);
        }, 500);
      }, 1500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un nouveau client</DialogTitle>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              Saisissez l'adresse email de votre client pour lui générer un lien d'accès à son portail.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Adresse email du client</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="client@entreprise.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={handleInvite} disabled={loading} className="bg-blue-800 hover:bg-blue-900">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Générer le lien
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Mail className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-green-800">Invitation prête !</p>
              <p className="text-xs text-green-600 mt-1">Le lien d'invitation pour {email} a été généré.</p>
            </div>
            
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="bg-slate-50 font-mono text-xs" />
              <Button onClick={copyLink} className="shrink-0 bg-slate-900 hover:bg-slate-800">
                <Copy className="w-4 h-4 mr-2" /> Copier
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
