import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, cabinet_id')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'cabinet') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { action, reason } = await request.json(); // action: 'validate' | 'reject'
  const { id } = await params;

  const update = action === 'validate'
    ? { status: 'validated', validated_by: user.id, validated_at: new Date().toISOString() }
    : { status: 'rejected', rejection_reason: reason };

  const { error } = await supabase
    .from('documents')
    .update(update)
    .eq('id', id)
    .eq('cabinet_id', profile.cabinet_id!);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ success: true });
}
