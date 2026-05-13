import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('cabinet_id').eq('id', user.id).single();
  if (!profile?.cabinet_id) return NextResponse.json({ error: 'No cabinet assigned' }, { status: 400 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const category = formData.get('category') as string;
  const periodMonth = formData.get('period_month') as string | null;
  const periodYear = formData.get('period_year') as string | null;

  if (!file || !category) return NextResponse.json({ error: 'Missing file or category' }, { status: 400 });

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Auto-detect category from filename if not provided
  const { data: doc, error: dbError } = await supabase.from('documents').insert({
    client_id: user.id,
    cabinet_id: profile.cabinet_id,
    name: file.name.replace(/\.[^.]+$/, ''),
    original_name: file.name,
    file_path: fileName,
    file_size: file.size,
    mime_type: file.type,
    category: category as any,
    status: 'pending',
    period_month: periodMonth ? parseInt(periodMonth) : null,
    period_year: periodYear ? parseInt(periodYear) : null,
  }).select().single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ document: doc });
}
