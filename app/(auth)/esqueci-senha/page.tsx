'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

function EsqueciSenhaForm() {
  const searchParams = useSearchParams();
  const showExpiredWarning = searchParams.get('error') === 'link_invalido';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/redefinir-senha`,
      });
      // Nunca revela se o e-mail tem conta ou não -- mesma mensagem de
      // sucesso é mostrada independentemente de erro ou sucesso; o log é só
      // para diagnóstico (ex: rate limit, SMTP fora do ar), não para a UI.
      if (error) console.error('Falha ao solicitar redefinição de senha:', error);
    } catch (error) {
      console.error('Falha ao solicitar redefinição de senha:', error);
    }

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="page page--narrow">
        <Card>
          <CardHeader>
            <CardTitle>Esqueci minha senha</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="hint">Se esse e-mail tiver uma conta, um link de redefinição foi enviado.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <Card>
        <CardHeader>
          <CardTitle>Esqueci minha senha</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showExpiredWarning && (
            <Alert variant="destructive">
              <AlertDescription>
                O link anterior expirou ou é inválido — solicite um novo abaixo.
              </AlertDescription>
            </Alert>
          )}
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function EsqueciSenhaPage() {
  return (
    <Suspense fallback={null}>
      <EsqueciSenhaForm />
    </Suspense>
  );
}
