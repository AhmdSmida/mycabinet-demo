import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('cabinet_id, role').eq('id', user.id).single();
  
  if (profile?.role !== 'cabinet' || !profile?.cabinet_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  // Generate unique token
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { error } = await supabase.from('invitations').insert({
    email,
    cabinet_id: profile.cabinet_id,
    invited_by: user.id,
    token,
    expires_at: expiresAt,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // In a real app, you would send an email here using Resend/SendGrid
  
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const inviteLink = `${origin}/invite/${token}`;

  return NextResponse.json({ success: true, inviteLink });
}
