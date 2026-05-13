import Link from 'next/link';
import { Building2, User } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-800 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-800/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MyCabinet</h1>
          <p className="text-sm text-slate-500 mt-2">Sélectionnez votre espace pour tester l'interface</p>
        </div>

        <div className="space-y-4">
          <Link 
            href="/client/dashboard"
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-800 hover:bg-blue-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-800 group-hover:bg-blue-800 group-hover:text-white transition-colors shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Espace Client</p>
              <p className="text-xs text-slate-500 mt-0.5">Interface mobile-first avec navigation en bas</p>
            </div>
          </Link>

          <Link 
            href="/cabinet/dashboard"
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-800 hover:bg-blue-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-800 group-hover:bg-blue-800 group-hover:text-white transition-colors shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Espace Cabinet</p>
              <p className="text-xs text-slate-500 mt-0.5">Interface bureau avec menu latéral</p>
            </div>
          </Link>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-8">MyCabinet Prototype</p>
    </div>
  );
}
