'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FiscalObligation, Profile } from '@/types/database';
import { OBLIGATION_TYPES, getDaysUntilDue, getUrgencyLevel, URGENCY_STYLES } from '@/lib/fiscal/obligations';
import { Loader2, Calendar, CheckCircle2, AlertCircle, Search, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type ClientStats = Profile & {
  nextObligation: FiscalObligation | null;
  overdueCount: number;
  upcomingCount: number;
};

export default function CabinetCalendarPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  
  const [clients, setClients] = useState<Profile[]>([]);
  const [obligations, setObligations] = useState<FiscalObligation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Seed dialog state
  const [isSeedOpen, setIsSeedOpen] = useState(false);
  const [seedClients, setSeedClients] = useState<string[]>([]);
  const [seedTypes, setSeedTypes] = useState<string[]>([]);
  const [seedYear, setSeedYear] = useState<number>(new Date().getFullYear());
  const [seeding, setSeeding] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.cabinet_id) return;
    setLoading(true);

    // Fetch assigned clients
    const { data: assignments } = await supabase
      .from('client_assignments')
      .select('client_id')
      .eq('cabinet_id', profile.cabinet_id);

    const clientIds = (assignments || []).map(a => a.client_id);

    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientIds);
      setClients(clientsData || []);

      const { data: obsData } = await supabase
        .from('fiscal_obligations')
        .select('*')
        .eq('cabinet_id', profile.cabinet_id)
        .in('status', ['upcoming', 'overdue'])
        .order('due_date', { ascending: true });
      
      setObligations((obsData as FiscalObligation[]) || []);
    } else {
      setClients([]);
      setObligations([]);
    }

    setLoading(false);
  }, [profile?.cabinet_id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSeed = async () => {
    if (!seedClients.length || !seedTypes.length || !seedYear) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSeeding(true);
    try {
      const res = await fetch('/api/cabinet/obligations/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: seedClients, types: seedTypes, year: seedYear }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(`${data.count} échéances générées avec succès`);
      setIsSeedOpen(false);
      setSeedClients([]);
      setSeedTypes([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la génération');
    }
    setSeeding(false);
  };

  const toggleSeedClient = (id: string) => {
    setSeedClients(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleSeedType = (type: string) => {
    setSeedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  // Compute stats per client
  const clientStats: ClientStats[] = clients.map(c => {
    const clientObs = obligations.filter(ob => ob.client_id === c.id);
    const overdue = clientObs.filter(ob => getDaysUntilDue(ob.due_date) < 0).length;
    const upcoming = clientObs.length;
    const nextOb = clientObs.length > 0 ? clientObs[0] : null;

    return {
      ...c,
      nextObligation: nextOb,
      overdueCount: overdue,
      upcomingCount: upcoming
    };
  }).sort((a, b) => b.overdueCount - a.overdueCount || (a.nextObligation && b.nextObligation ? new Date(a.nextObligation.due_date).getTime() - new Date(b.nextObligation.due_date).getTime() : 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Échéances Fiscales</h1>
          <p className="text-sm text-slate-500 mt-1">Supervisez les déclarations de tous vos clients</p>
        </div>
        <Button onClick={() => setIsSeedOpen(true)} className="bg-blue-800 hover:bg-blue-900 shrink-0">
          <CalendarPlus className="w-4 h-4 mr-2" />
          Générer les échéances
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">En retard</th>
                <th className="px-6 py-4">Total à venir</th>
                <th className="px-6 py-4">Prochaine échéance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-800 mx-auto" />
                  </td>
                </tr>
              ) : clientStats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Aucun client assigné.
                  </td>
                </tr>
              ) : (
                clientStats.map(stat => (
                  <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{stat.full_name || 'Client inconnu'}</p>
                      <p className="text-xs text-slate-500">{stat.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {stat.overdueCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {stat.overdueCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {stat.upcomingCount}
                    </td>
                    <td className="px-6 py-4">
                      {stat.nextObligation ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{OBLIGATION_TYPES[stat.nextObligation.type as keyof typeof OBLIGATION_TYPES]?.icon}</span>
                            <span className="font-medium text-slate-900">{stat.nextObligation.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Le {new Date(stat.nextObligation.due_date).toLocaleDateString('fr-FR')} 
                            <span className={cn(
                              "ml-2 font-medium",
                              getDaysUntilDue(stat.nextObligation.due_date) < 0 ? "text-red-600" : "text-blue-600"
                            )}>
                              (J-{getDaysUntilDue(stat.nextObligation.due_date)})
                            </span>
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Aucune échéance</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isSeedOpen} onOpenChange={setIsSeedOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Générer les échéances fiscales</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900">1. Sélectionner les clients</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg bg-slate-50">
                {clients.map(c => (
                  <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-800 focus:ring-blue-800"
                      checked={seedClients.includes(c.id)}
                      onChange={() => toggleSeedClient(c.id)}
                    />
                    <span className="text-sm text-slate-700 truncate">{c.full_name || c.email}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSeedClients(clients.map(c => c.id))} className="text-xs h-7">Tous</Button>
                <Button variant="outline" size="sm" onClick={() => setSeedClients([])} className="text-xs h-7">Aucun</Button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900">2. Sélectionner les déclarations</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(OBLIGATION_TYPES).map(([type, info]) => (
                  <label key={type} className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    seedTypes.includes(type) ? "border-blue-800 bg-blue-50" : "border-slate-200 hover:border-blue-300 bg-white"
                  )}>
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded text-blue-800 focus:ring-blue-800"
                      checked={seedTypes.includes(type)}
                      onChange={() => toggleSeedType(type)}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                        <span>{info.icon}</span> {type}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{info.label}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900">3. Année fiscale</label>
              <select 
                className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-800 outline-none"
                value={seedYear}
                onChange={(e) => setSeedYear(Number(e.target.value))}
              >
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSeedOpen(false)}>Annuler</Button>
            <Button onClick={handleSeed} disabled={seeding || !seedClients.length || !seedTypes.length} className="bg-blue-800 hover:bg-blue-900">
              {seeding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Générer {seedTypes.length} types pour {seedClients.length} clients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
