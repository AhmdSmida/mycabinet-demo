import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, cabinet_id').eq('id', user.id).single();
  if (profile?.role !== 'cabinet' || !profile?.cabinet_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { clientIds, types, year } = await request.json() as { clientIds: string[], types: string[], year: number };
  
  if (!clientIds?.length || !types?.length || !year) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const obligationsToInsert = [];

  for (const clientId of clientIds) {
    for (const type of types) {
      if (type === 'TVA') {
        // TVA monthly: due 15th of following month
        for (let month = 1; month <= 12; month++) {
          const dueYear = month === 12 ? year + 1 : year;
          const dueMonth = month === 12 ? 1 : month + 1;
          const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-15`;
          obligationsToInsert.push({
            client_id: clientId,
            cabinet_id: profile.cabinet_id,
            type: 'TVA',
            label: `Déclaration TVA - ${String(month).padStart(2, '0')}/${year}`,
            due_date: dueDate,
            status: 'upcoming',
            required_docs: ['facture', 'tva']
          });
        }
      } else if (type === 'IS') {
        // IS: due 25th of 3rd month after fiscal year end (Assuming Dec 31 FYE -> March 25th)
        obligationsToInsert.push({
          client_id: clientId,
          cabinet_id: profile.cabinet_id,
          type: 'IS',
          label: `Solde IS ${year}`,
          due_date: `${year + 1}-03-25`,
          status: 'upcoming',
          required_docs: ['bilan']
        });
      } else if (type === 'CFE') {
        // CFE: due Dec 15th
        obligationsToInsert.push({
          client_id: clientId,
          cabinet_id: profile.cabinet_id,
          type: 'CFE',
          label: `Solde CFE ${year}`,
          due_date: `${year}-12-15`,
          status: 'upcoming',
          required_docs: ['justificatif']
        });
      } else if (type === 'DSN') {
        // DSN: 15th of each month
        for (let month = 1; month <= 12; month++) {
          const dueYear = month === 12 ? year + 1 : year;
          const dueMonth = month === 12 ? 1 : month + 1;
          const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-15`;
          obligationsToInsert.push({
            client_id: clientId,
            cabinet_id: profile.cabinet_id,
            type: 'DSN',
            label: `DSN - ${String(month).padStart(2, '0')}/${year}`,
            due_date: dueDate,
            status: 'upcoming',
            required_docs: ['justificatif']
          });
        }
      } else if (type === 'BIC' || type === 'BNC') {
        // BIC/BNC: due May 3rd
        obligationsToInsert.push({
          client_id: clientId,
          cabinet_id: profile.cabinet_id,
          type: type as any,
          label: `Liasse Fiscale ${type} ${year}`,
          due_date: `${year + 1}-05-03`,
          status: 'upcoming',
          required_docs: type === 'BNC' ? ['bilan', 'justificatif'] : ['bilan']
        });
      } else if (type === 'CVAE') {
        obligationsToInsert.push({
          client_id: clientId,
          cabinet_id: profile.cabinet_id,
          type: 'CVAE',
          label: `Solde CVAE ${year}`,
          due_date: `${year + 1}-05-03`,
          status: 'upcoming',
          required_docs: ['bilan']
        });
      }
    }
  }

  const { error } = await supabase.from('fiscal_obligations').insert(obligationsToInsert as any);
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ success: true, count: obligationsToInsert.length });
}
