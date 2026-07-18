'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSafeRedirectPath } from '@/lib/supabase/safe-redirect';

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
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '360px' }}>
      <h1>Entrar</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          E-mail
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Senha
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" style={{ color: 'red' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p>
        <a href="/esqueci-senha">Esqueci minha senha</a>
      </p>
    </main>
  );
}
