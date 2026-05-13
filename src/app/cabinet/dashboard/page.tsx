import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Users, Clock, CheckCircle, Bell, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { AgentCard } from '@/components/cabinet/AgentCard';
import { DashboardClientList } from '@/components/cabinet/DashboardClientList';

export const dynamic = 'force-dynamic';

export default function CabinetDashboardPage() async {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('cabinet_id, role').eq('id', user.id).single();
  if (profile?.role !== 'cabinet' || !profile?.cabinet_id) redirect('/login');
  
  const cabinetId = profile.cabinet_id;

  // 1. Fetch Cabinet Name
  const { data: cabinet } = await supabase.from('cabinets').select('name').eq('id', cabinetId).single();

  // 2. Fetch Dashboard Stats
  const [
    { count: totalClients },
    { data: documents },
    { data: urgentObligations },
    { data: recentDocs },
    { count: weeklyReminders }
  ] = await Promise.all([
    supabase.from('client_assignments').select('*', { count: 'exact', head: true }).eq('cabinet_id', cabinetId),
    supabase.from('documents').select('status').eq('cabinet_id', cabinetId),
    supabase.from('fiscal_obligations')
      .select(`*, client:profiles!fiscal_obligations_client_id_fkey(id, full_name)`)
      .eq('cabinet_id', cabinetId)
      .in('status', ['upcoming', 'overdue'])
      .lte('due_date', new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0])
      .order('due_date', { ascending: true }),
    supabase.from('documents')
      .select(`*, client:profiles!documents_client_id_fkey(id, full_name)`)
      .eq('cabinet_id', cabinetId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('reminders')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', new Date(Date.now() - 7 * 86400000).toISOString())
  ]);

  const pending = documents?.filter(d => d.status === 'pending').length || 0;
  const validated = documents?.filter(d => d.status === 'validated').length || 0;
  const total = documents?.length || 0;
  const completionRate = total > 0 ? Math.round((validated / total) * 100) : 0;

  // 3. Fetch Client List for Table
  const { data: clientsData } = await supabase
    .from('client_assignments')
    .select(`
      client:profiles!client_assignments_client_id_fkey(
        id, full_name, email, created_at
      )
    `)
    .eq('cabinet_id', cabinetId);
    
  // Pre-calculate completeness for each client
  const clientsWithCompleteness = (clientsData || []).map((assignment: any) => {
    const clientDocs = documents?.filter(d => d.client_id === assignment.client.id) || [];
    const clientPending = clientDocs.filter(d => d.status === 'pending').length;
    const clientValidated = clientDocs.filter(d => d.status === 'validated').length;
    const clientTotal = clientPending + clientValidated;
    const clientCompleteness = clientTotal > 0 ? Math.round((clientValidated / clientTotal) * 100) : 0;

    return {
      id: assignment.client.id,
      full_name: assignment.client.full_name,
      email: assignment.client.email,
      completeness: clientCompleteness,
      pendingCount: clientPending,
      created_at: assignment.client.created_at,
    };
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bonjour, {cabinet?.name || 'Cabinet'}</h1>
          <p className="text-sm text-slate-500 mt-1">Voici la situation de vos dossiers clients aujourd'hui.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Clients</p>
            <p className="text-2xl font-bold text-slate-900">{totalClients || 0}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Docs en attente</p>
            <p className="text-2xl font-bold text-slate-900">{pending}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Taux de complétude</p>
            <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Relances (7j)</p>
            <p className="text-2xl font-bold text-slate-900">{weeklyReminders || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Urgent Deadlines */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Échéances urgentes (prochains 10 jours)
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {urgentObligations && urgentObligations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {urgentObligations.map(ob => {
                  const daysUntil = Math.ceil((new Date(ob.due_date).getTime() - Date.now()) / 86400000);
                  const isCritical = daysUntil <= 5;
                  
                  return (
                    <Link href={`/cabinet/clients/${ob.client_id}`} key={ob.id} className="block p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{ob.client?.full_name}</p>
                          <p className="text-sm text-slate-500">{ob.type} — {ob.label}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isCritical ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-orange-100 text-orange-800 border border-orange-200'}`}>
                            {daysUntil < 0 ? 'En retard' : `Dans ${daysUntil} jours`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Aucune échéance urgente pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* Agent Card */}
        <div className="lg:col-span-1">
          <AgentCard />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Client List */}
        <div className="lg:col-span-2">
          <DashboardClientList clients={clientsWithCompleteness} />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Activité récente</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {recentDocs && recentDocs.length > 0 ? (
              <div className="space-y-1">
                {recentDocs.map(doc => (
                  <Link href={`/cabinet/clients/${doc.client_id}`} key={doc.id} className="block p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <p className="text-sm">
                      <span className="font-medium text-slate-900">{doc.client?.full_name}</span> a 
                      {doc.status === 'pending' ? ' déposé un document' : doc.status === 'validated' ? ' un document validé' : ' un document refusé'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{doc.original_name}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Aucune activité récente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
