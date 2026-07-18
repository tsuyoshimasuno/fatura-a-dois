import { db } from '@/db';

// `db` e uma transação (`tx`) expõem os mesmos métodos de consulta usados
// aqui, mas são tipos nominalmente distintos no drizzle -- este tipo
// estrutural permite chamar esta função tanto fora quanto dentro de uma
// transação em andamento (mesmo padrão de `gerenciar-categorias.ts`).
type Executor = Pick<typeof db, 'select'>;

// Única função de resolução de categoria sugerida (AD-3) -- nenhum outro
// ponto do código deve decidir isso de forma independente. Recebe o
// executor (db global ou uma transação já aberta) para que a Story 3.3
// possa consultar `regra_categorizacao` dentro da mesma transação de
// `upload.ts` que insere o lançamento -- o call site já passa `tx` desde
// esta story, então a Story 3.3 não precisa alterar `upload.ts` de novo.
//
// Story 3.2 (esta): implementa só o fallback -- sempre retorna `null` ("sem
// categoria"), porque a tabela `regra_categorizacao` (regra memorizada
// fuzzy, AD-3) só é criada na Story 3.3.
//
// Story 3.3 (futura): estende o corpo desta mesma função para normalizar
// `estabelecimento` (via `normalizarEstabelecimento`, AD-9) e consultar
// `regra_categorizacao` (fuzzy match, prioridade por recência) antes de
// cair neste fallback -- sem introduzir uma segunda função paralela.
export async function resolverCategoriaSugerida(
  estabelecimento: string,
  executor: Executor = db
): Promise<number | null> {
  // Parâmetros ainda não usados nesta story (ver comentário acima) --
  // referenciados aqui só para deixar a assinatura já em vigor sem
  // acionar `no-unused-vars`; a Story 3.3 passa a usar os dois de fato.
  void estabelecimento;
  void executor;

  return null;
}
