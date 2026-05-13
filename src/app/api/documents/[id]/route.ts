import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify ownership and status
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('client_id', user.id)
    .single();

  if (fetchError || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.status !== 'pending') return NextResponse.json({ error: 'Cannot delete processed document' }, { status: 400 });

  // Delete from storage
  const { error: storageError } = await supabase.storage.from('documents').remove([doc.file_path]);
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

  // Delete from DB
  const { error: dbError } = await supabase.from('documents').delete().eq('id', id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify ownership or cabinet access
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  if (doc.client_id !== user.id) {
    // Check if user is the cabinet owner for this client
    const { data: profile } = await supabase.from('profiles').select('cabinet_id, role').eq('id', user.id).single();
    if (profile?.role !== 'cabinet' || profile?.cabinet_id !== doc.cabinet_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Create signed URL (valid for 1 hour)
  const { data: signedUrl, error: storageError } = await supabase
    .storage
    .from('documents')
    .createSignedUrl(doc.file_path, 3600);

  if (storageError || !signedUrl) return NextResponse.json({ error: storageError?.message || 'Failed to generate URL' }, { status: 500 });

  return NextResponse.json({ url: signedUrl.signedUrl });
}
