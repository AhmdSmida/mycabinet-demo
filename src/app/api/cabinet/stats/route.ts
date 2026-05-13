import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('cabinet_id, role').eq('id', user.id).single();
  
  if (profile?.role !== 'cabinet' || !profile?.cabinet_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const cabinetId = profile.cabinet_id;

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
      .select(`*, client:profiles!fiscal_obligations_client_id_fkey(full_name)`)
      .eq('cabinet_id', cabinetId)
      .in('status', ['upcoming', 'overdue'])
      .lte('due_date', new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0])
      .order('due_date', { ascending: true }),
    supabase.from('documents')
      .select(`*, client:profiles!documents_client_id_fkey(full_name)`)
      .eq('cabinet_id', cabinetId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('reminders')
      .select('*', { count: 'exact', head: true })
      // Rough filter for the last 7 days by comparing with sent_at
      .gte('sent_at', new Date(Date.now() - 7 * 86400000).toISOString())
  ]);

  const pending = documents?.filter(d => d.status === 'pending').length || 0;
  const validated = documents?.filter(d => d.status === 'validated').length || 0;
  const total = documents?.length || 0;
  const completionRate = total > 0 ? Math.round((validated / total) * 100) : 0;

  return NextResponse.json({ 
    totalClients: totalClients || 0, 
    pending, 
    validated, 
    completionRate, 
    weeklyReminders: weeklyReminders || 0,
    urgentObligations: urgentObligations || [], 
    recentDocs: recentDocs || [] 
  });
}
