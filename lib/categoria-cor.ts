// Deriva uma cor determinística para o círculo de categoria a partir do nome
// completo da categoria (texto livre do casal, sem enum fixo) -- mesmo nome
// sempre mapeia para o mesmo índice de paleta, em toda a tela (spec-snowui-
// lancamentos-highlight-e-icone-categoria.md). Nunca escolhe hex por
// categoria "a olho": o hash decide o índice, os hexes ficam só nos tokens
// `--category-color-1..N` de `app/globals.css`. Puro e nunca lança, mesmo
// para nome vazio -- mesma convenção de `lib/pessoa.ts` (`primeiroNome`).

// Precisa bater com o número de pares `--category-color-N` definidos em
// `app/globals.css` (:root e o bloco `@media (prefers-color-scheme: dark)`).
const PALETA_TAMANHO = 6;

// Hash simples (djb2-like) sobre a string inteira, não só a inicial -- dois
// nomes com a mesma primeira letra ("Mercado" e "Moradia") precisam poder
// cair em cores diferentes. `| 0` mantém o acumulador em inteiro de 32 bits
// (evita overflow para float e mantém o resultado determinístico entre
// execuções/plataformas).
export function indiceCorCategoria(nome: string): number {
  let hash = 0;
  for (let i = 0; i < nome.length; i += 1) {
    hash = (hash * 31 + nome.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % PALETA_TAMANHO;
}

// Nome da classe CSS (`.category-icon--cor-1` .. `.category-icon--cor-6`,
// ver `app/globals.css`) a aplicar junto de `.category-icon` para um nome de
// categoria normal. Para o estado neutro (categoria removida ou ausente),
// os chamadores usam `.category-icon--neutral` diretamente, sem passar por
// aqui -- ver `lancamento-item.tsx`.
export function classeCorCategoria(nome: string): string {
  return `category-icon--cor-${indiceCorCategoria(nome) + 1}`;
}
