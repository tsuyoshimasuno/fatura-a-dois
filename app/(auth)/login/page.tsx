'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSafeRedirectPath } from '@/lib/supabase/safe-redirect';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('E-mail ou senha inválidos.');
        setLoading(false);
        return;
      }
    } catch {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get('next');
    window.location.href = isSafeRedirectPath(next) ? next : '/';
  }

  return (
    <main className="page page--narrow">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1>Entrar</h1>
          </CardTitle>
          <CardDescription>Fatura a Dois</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <a href="/esqueci-senha" className="link">
            Esqueci minha senha
          </a>
        </CardFooter>
      </Card>
    </main>
  );
}
