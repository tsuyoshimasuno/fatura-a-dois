import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { isSafeRedirectPath } from './safe-redirect';

const PUBLIC_PATHS = ['/login'];

// Rotas de sistema com auth própria (ex: CRON_SECRET), nunca sessão de
// usuário -- allowlist exata, não prefixo, para não isentar por engano uma
// futura rota sob /api/cron/ que não implemente sua própria checagem.
const SYSTEM_PATHS = ['/api/cron/backup'];

// Copia os cookies da response atual (com sessão já atualizada) para a
// response de redirect, evitando perder o refresh de sessão feito acima.
function redirectWithCookies(url: URL, response: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

// Refresh de sessão do Supabase Auth e enforcement de AD-6: qualquer rota de
// dado fora da allowlist pública exige sessão válida, verificada aqui antes
// de qualquer route handler. Rotas de sistema (ex: cron) com auth própria
// ficam isentas.
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, '') || '/';

  // Checado antes de tocar o Supabase Auth: a rota de cron não deve pagar a
  // latência nem depender da disponibilidade do Auth para responder.
  if (SYSTEM_PATHS.includes(pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  let user = null;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch (error) {
    // Falha transitória (rede, env misconfigurada, Auth fora do ar):
    // fail-closed, trata como não-autenticado em vez de derrubar a rota com
    // 500 -- mas loga para não confundir uma indisponibilidade com um
    // logout real na hora de investigar.
    console.error('Falha ao verificar sessão no middleware:', error);
    user = null;
  }

  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return redirectWithCookies(url, response);
  }

  if (user && pathname === '/login') {
    const next = request.nextUrl.searchParams.get('next');
    const url = request.nextUrl.clone();
    url.pathname = isSafeRedirectPath(next) ? next : '/';
    url.search = '';
    return redirectWithCookies(url, response);
  }

  return response;
}
