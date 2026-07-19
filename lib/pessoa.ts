// Deriva um "primeiro nome" de exibição a partir do e-mail de uma conta --
// helper único usado pelo badge de titular do lançamento, título do resumo
// por pessoa e opções do filtro de pessoa (spec: não duplicar a lógica em 3
// lugares diferentes). Precisa ser puro e nunca lançar, mesmo com e-mail
// malformado, porque alimenta 3 superfícies de UI e um erro aqui não pode
// derrubar a tela inteira.
export function primeiroNome(email: string): string {
  const arroba = email.indexOf('@');
  if (arroba === -1) return email;

  const localPart = email.slice(0, arroba);
  const ponto = localPart.indexOf('.');
  const nome = ponto === -1 ? localPart : localPart.slice(0, ponto);

  // Local-part vazio ou começando com '.' (ex: '.foo@bar.com') não tem nada
  // sensato para capitalizar -- cai no e-mail inteiro em vez de exibir um
  // badge vazio.
  if (nome.length === 0) return email;

  return nome.charAt(0).toUpperCase() + nome.slice(1);
}
