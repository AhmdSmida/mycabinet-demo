import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Mail, CalendarDays, FileText, Bell, ChevronLeft, Calendar as CalendarIcon, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OBLIGATION_TYPES, getDaysUntilDue } from '@/lib/fiscal/obligations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default async function ClientDossierPage(
  props: { params: Promise<{ clientId: string }> }
) {
  const params = await props.params;
  const clientId = params.clientId;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: cabinetProfile } = await supabase.from('profiles').select('cabinet_id, role').eq('id', user.id).single();
  if (cabinetProfile?.role !== 'cabinet' || !cabinetProfile?.cabinet_id) redirect('/login');

  // Verify assignment and fetch client
  const { data: assignment } = await supabase
    .from('client_assignments')
    .select(`
      created_at,
      client:profiles!client_assignments_client_id_fkey(
        id, full_name, email, phone
      )
    `)
    .eq('cabinet_id', cabinetProfile.cabinet_id)
    .eq('client_id', clientId)
    .single();

  if (!assignment) redirect('/cabinet/dashboard');

  const client = assignment.client as any;

  // Fetch all related data
  const [
    { data: documents },
    { data: obligations },
    { data: reminders }
  ] = await Promise.all([
    supabase.from('documents').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('fiscal_obligations').select('*').eq('client_id', clientId).order('due_date', { ascending: true }),
    supabase.from('reminders').select('*').eq('client_id', clientId).order('sent_at', { ascending: false })
  ]);

  const validatedDocs = documents?.filter(d => d.status === 'validated').length || 0;
  const pendingDocs = documents?.filter(d => d.status === 'pending').length || 0;
  const totalDocs = documents?.length || 0;
  const completeness = totalDocs > 0 ? Math.round((validatedDocs / totalDocs) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'validated': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'validated': return 'Validé';
      case 'rejected': return 'Refusé';
      default: return status;
    }
  };

  function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <Link href="/cabinet/dashboard" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-4">
          <ChevronLeft className="w-4 h-4" /> Retour au tableau de bord
        </Link>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 text-xl font-bold">
              {client.full_name?.substring(0, 2).toUpperCase() || 'C'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.full_name || 'Sans nom'}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {client.email}</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Client depuis le {new Date(assignment.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 min-w-[200px]">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-slate-700">Dossier complété</span>
              <span className="font-bold text-slate-900">{completeness}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${completeness === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                style={{ width: `${completeness}%` }} 
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              {pendingDocs} document(s) en attente
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 w-full flex rounded-xl">
          <TabsTrigger value="documents" className="flex-1 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 mr-2" /> Documents ({totalDocs})
          </TabsTrigger>
          <TabsTrigger value="obligations" className="flex-1 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:shadow-sm">
            <CalendarIcon className="w-4 h-4 mr-2" /> Échéances ({obligations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex-1 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 data-[state=active]:shadow-sm">
            <Bell className="w-4 h-4 mr-2" /> Rappels envoyés ({reminders?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Fichier</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Déposé le</th>
                  <th className="px-6 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!documents || documents.length === 0) ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Aucun document</td></tr>
                ) : (
                  documents.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 truncate max-w-xs">{doc.original_name}</p>
                        <p className="text-xs text-slate-500">{doc.file_size ? formatBytes(doc.file_size) : ''}</p>
                      </td>
                      <td className="px-6 py-4 capitalize">
                        {doc.category}
                        {doc.period_month && doc.period_year && (
                          <span className="block text-xs text-slate-500 mt-0.5">
                            {String(doc.period_month).padStart(2, '0')}/{doc.period_year}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getStatusColor(doc.status)}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                        {doc.status === 'rejected' && doc.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1 max-w-[150px] truncate" title={doc.rejection_reason}>{doc.rejection_reason}</p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" asChild>
              <Link href="/cabinet/documents">Gérer les documents</Link>
            </Button>
          </div>
        </TabsContent>

        {/* Obligations Tab */}
        <TabsContent value="obligations" className="mt-6 space-y-4">
          {(!obligations || obligations.length === 0) ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucune échéance fiscale pour ce client.</p>
              <Button asChild className="mt-4 bg-blue-800 hover:bg-blue-900">
                <Link href="/cabinet/calendar">Générer des échéances</Link>
              </Button>
            </div>
          ) : (
            obligations.map(ob => {
              const typeInfo = OBLIGATION_TYPES[ob.type as keyof typeof OBLIGATION_TYPES] || { icon: '📅' };
              const daysUntil = getDaysUntilDue(ob.due_date);
              const isCompleted = ob.status === 'completed';
              
              return (
                <div key={ob.id} className={cn("bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between", isCompleted && "opacity-75 bg-slate-50")}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">
                      {typeInfo.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{ob.label}</h3>
                      <p className="text-sm text-slate-500">Échéance : {new Date(ob.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold border border-green-200">
                        <CheckCircle2 className="w-4 h-4" /> Complété
                      </span>
                    ) : daysUntil < 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold border border-red-200">
                        <AlertTriangle className="w-4 h-4" /> En retard de {Math.abs(daysUntil)} jours
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold border border-orange-200">
                        <Clock className="w-4 h-4" /> Dans {daysUntil} jours
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Message envoyé par l'IA</th>
                  <th className="px-6 py-4">Date d'envoi</th>
                  <th className="px-6 py-4">Lu par le client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!reminders || reminders.length === 0) ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Aucun rappel n'a été envoyé à ce client.</td></tr>
                ) : (
                  reminders.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${r.type === 'missing_doc' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {r.type === 'missing_doc' ? 'Doc. manquant' : 'Échéance'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 whitespace-pre-wrap min-w-[250px]">
                        {r.message}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(r.sent_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        {r.read_at ? (
                          <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                            <CheckCircle2 className="w-4 h-4" /> {new Date(r.read_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Non lu</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
