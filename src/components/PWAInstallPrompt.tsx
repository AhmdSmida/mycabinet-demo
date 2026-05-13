'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-blue-800 text-white rounded-xl p-4 shadow-lg z-50 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight">Installer MyCabinet</p>
          <p className="text-xs text-blue-200 leading-tight mt-0.5">
            Accès rapide depuis votre écran d&apos;accueil
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/20 hover:text-white h-8 w-8 p-0"
          onClick={handleDismiss}
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          className="bg-white text-blue-800 hover:bg-blue-50 h-8 px-3 text-xs font-semibold"
          onClick={handleInstall}
        >
          Installer
        </Button>
      </div>
    </div>
  );
}
