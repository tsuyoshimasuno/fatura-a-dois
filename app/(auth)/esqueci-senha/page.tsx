'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
        <div className="page-header">
          <h1 className="page-title">Esqueci minha senha</h1>
        </div>
        <p className="hint">Se esse e-mail tiver uma conta, um link de redefinição foi enviado.</p>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <div className="page-header">
        <h1 className="page-title">Esqueci minha senha</h1>
      </div>
      {showExpiredWarning && (
        <p role="alert" className="alert-error">
          O link anterior expirou ou é inválido — solicite um novo abaixo.
        </p>
      )}
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
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar link de redefinição'}
        </button>
      </form>
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
