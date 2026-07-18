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
    <main className="page page--narrow">
      <div className="page-header">
        <h1 className="page-title">Entrar</h1>
        <p className="page-subtitle">Fatura a Dois</p>
      </div>
      <form onSubmit={handleSubmit} className="form">
        <label className="field">
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
        <label className="field">
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
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <a href="/esqueci-senha" className="link">
        Esqueci minha senha
      </a>
    </main>
  );
}
