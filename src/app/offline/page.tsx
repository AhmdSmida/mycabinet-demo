'use client';

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-8 h-8 text-gray-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Vous êtes hors ligne
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Vérifiez votre connexion internet et réessayez.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-blue-800 text-white text-sm font-medium hover:bg-blue-900 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
