'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  cabinet_id: string;
  expires_at: string;
  accepted_at: string | null;
  cabinets?: { name: string };
}

type PageState = 'loading' | 'valid' | 'invalid' | 'success';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const supabase = createClient();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [invalidReason, setInvalidReason] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load and validate invitation on mount
  useEffect(() => {
    const loadInvitation = async () => {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*, cabinets(name)')
        .eq('token', token)
        .single();

      if (fetchError || !data) {
        setInvalidReason("Ce lien d'invitation est invalide ou introuvable.");
        setPageState('invalid');
        return;
      }

      if (data.accepted_at) {
        setInvalidReason("Cette invitation a déjà été acceptée.");
        setPageState('invalid');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setInvalidReason("Ce lien d'invitation a expiré.");
        setPageState('invalid');
        return;
      }

      setInvitation(data as Invitation);
      setPageState('valid');
    };

    loadInvitation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!invitation) return;

    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } =
        await supabase.auth.signUp({
          email: invitation.email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'client',
            },
          },
        });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Erreur lors de la création du compte.');

      // 2. Update profile with cabinet_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ cabinet_id: invitation.cabinet_id })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // 3. Insert client assignment
      const { error: assignError } = await supabase
        .from('client_assignments')
        .insert({
          client_id: authData.user.id,
          cabinet_id: invitation.cabinet_id,
        });

      if (assignError) throw assignError;

      // 4. Mark invitation as accepted
      const { error: inviteError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (inviteError) throw inviteError;

      // 5. Redirect to client dashboard
      setPageState('success');
      setTimeout(() => router.push('/client/dashboard'), 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue.';
      setError(
        message.includes('already registered')
          ? 'Cette adresse email est déjà associée à un compte. Connectez-vous.'
          : message
      );
      setLoading(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // ── Invalid invitation ─────────────────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md shadow-sm text-center">
          <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Invitation invalide
              </h2>
              <p className="text-sm text-slate-500">{invalidReason}</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Aller à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md shadow-sm text-center">
          <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Compte créé avec succès
              </h2>
              <p className="text-sm text-slate-500">
                Redirection vers votre espace…
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Valid invitation — show form ───────────────────────────────────────────
  const cabinetName =
    (invitation?.cabinets as { name: string } | undefined)?.name ?? 'votre cabinet';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">MyCabinet</span>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Accepter l&apos;invitation</CardTitle>
            <CardDescription>
              Vous avez été invité(e) à rejoindre{' '}
              <span className="font-medium text-slate-700">{cabinetName}</span>.
              Créez votre compte pour accéder à votre espace client.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email ?? ''}
                  disabled
                  className="bg-slate-50 text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Votre nom complet</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Marie Martin"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours…
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
