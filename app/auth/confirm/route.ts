import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSafeRedirectPath } from '@/lib/supabase/safe-redirect';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') ?? '/redefinir-senha';

  if (!code) {
    return NextResponse.redirect(new URL('/esqueci-senha?error=link_invalido', request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/esqueci-senha?error=link_invalido', request.url));
  }

  const destination = isSafeRedirectPath(next) ? next : '/redefinir-senha';
  return NextResponse.redirect(new URL(destination, request.url));
}
