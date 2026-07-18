'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

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
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '360px' }}>
      <h1>Redefinir senha</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Nova senha
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Confirmar nova senha
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" style={{ color: 'red' }}>
            {error}
            {sessionExpired && (
              <>
                {' '}
                <a href="/esqueci-senha">Solicitar novo link</a>
              </>
            )}
          </p>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </main>
  );
}
