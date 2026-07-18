// Valida um destino de redirect pós-login vindo de `?next=` (query string,
// portanto controlável por quem monta o link). Só aceita path relativo ao
// próprio site -- rejeita `//host`, `\host` e variações que navegadores
// normalizam para uma URL absoluta (open redirect).
export function isSafeRedirectPath(path: string | null): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
}
