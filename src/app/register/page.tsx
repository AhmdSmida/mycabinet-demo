'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Loader2, Building2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [cabinetName, setCabinetName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      // 1. Create auth user with role metadata
      const { data: authData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'cabinet',
            },
          },
        });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Erreur lors de la création du compte.');

      // 2. Create cabinet record
      const { data: cabinetData, error: cabinetError } = await supabase
        .from('cabinets')
        .insert({ name: cabinetName })
        .select('id')
        .single();

      if (cabinetError) throw cabinetError;

      // 3. Update profile with cabinet_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ cabinet_id: cabinetData.id })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // 4. Redirect to cabinet dashboard
      router.push('/cabinet/dashboard');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue.';
      setError(
        message.includes('already registered')
          ? 'Cette adresse email est déjà utilisée.'
          : message
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">MyCabinet</span>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Créer un compte cabinet</CardTitle>
            <CardDescription>
              Inscrivez votre cabinet comptable sur MyCabinet
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
                <Label htmlFor="cabinetName">Nom du cabinet</Label>
                <Input
                  id="cabinetName"
                  type="text"
                  placeholder="Cabinet Dupont & Associés"
                  value={cabinetName}
                  onChange={(e) => setCabinetName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Votre nom complet</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean@cabinet-dupont.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
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

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours…
                  </>
                ) : (
                  'Créer mon cabinet'
                )}
              </Button>

              <p className="text-sm text-slate-500 text-center">
                Déjà un compte ?{' '}
                <Link
                  href="/login"
                  className="text-blue-700 hover:underline font-medium"
                >
                  Se connecter
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
