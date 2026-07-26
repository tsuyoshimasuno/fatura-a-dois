'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const trimmedPassword = password.trim();
    setSessionExpired(false);

    if (trimmedPassword.length === 0) {
      setError('A senha não pode ficar em branco.');
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await createClient().auth.updateUser({
        password: trimmedPassword,
      });

      if (updateError) {
        console.error('Falha ao atualizar senha:', updateError);
        setError('Não foi possível definir a nova senha. O link pode ter expirado.');
        setSessionExpired(true);
        setLoading(false);
        return;
      }
    } catch (submitError) {
      console.error('Falha ao atualizar senha:', submitError);
      setError('Não foi possível definir a nova senha. O link pode ter expirado.');
      setSessionExpired(true);
      setLoading(false);
      return;
    }

    window.location.href = '/';
  }

  return (
    <main className="page page--narrow">
      <Card>
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {sessionExpired && (
                    <>
                      {' '}
                      <a href="/esqueci-senha" className="link">
                        Solicitar novo link
                      </a>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
