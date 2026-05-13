'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InviteClientDialog } from './InviteClientDialog';

interface ClientStats {
  id: string;
  full_name: string | null;
  email: string;
  completeness: number;
  pendingCount: number;
  created_at: string;
}

export function DashboardClientList({ clients }: { clients: ClientStats[] }) {
  const [search, setSearch] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const filteredClients = clients.filter(c => 
    (c.full_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
        <h2 className="font-bold text-slate-900 shrink-0">Liste des clients</h2>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative w-full max-w-xs hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-800 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsInviteOpen(true)} size="sm" className="bg-blue-800 hover:bg-blue-900 shrink-0">
            <UserPlus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Inviter</span>
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-medium border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3 w-48 hidden sm:table-cell">Complétude dossier</th>
              <th className="px-5 py-3 text-center">En attente</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">Aucun client trouvé.</td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{client.full_name || 'Sans nom'}</p>
                    <p className="text-xs text-slate-500">{client.email}</p>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${client.completeness === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                          style={{ width: `${client.completeness}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 w-8">{client.completeness}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {client.pendingCount > 0 ? (
                      <span className="inline-flex items-center justify-center bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {client.pendingCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                      <Link href={`/cabinet/clients/${client.id}`}>
                        Voir <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InviteClientDialog isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
}
