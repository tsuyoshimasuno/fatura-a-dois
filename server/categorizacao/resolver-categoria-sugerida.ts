import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { categoria, regraCategorizacao } from '@/db/schema';
import { normalizarEstabelecimento } from '@/server/shared/normalizar-estabelecimento';

// `db` e uma transação (`tx`) expõem os mesmos métodos de consulta usados
// aqui, mas são tipos nominalmente distintos no drizzle -- este tipo
// estrutural permite chamar esta função tanto fora quanto dentro de uma
// transação em andamento (mesmo padrão de `gerenciar-categorias.ts`).
type Executor = Pick<typeof db, 'select'>;

// Limiar de similaridade (`pg_trgm`) acima do qual uma regra memorizada é
// considerada um match para o estabelecimento normalizado de um lançamento.
// Decisão de tuning (não invariante, AD-3) -- ajustável sem mudar a forma da
// consulta abaixo.
const LIMIAR_SIMILARIDADE = 0.3;

// Única função de resolução de categoria sugerida (AD-3) -- nenhum outro
// ponto do código deve decidir isso de forma independente. Recebe o
// executor (db global ou uma transação já aberta) para que a Story 3.3
// possa consultar `regra_categorizacao` dentro da mesma transação de
// `upload.ts` que insere o lançamento -- o call site já passa `tx` desde
// esta story, então a Story 3.3 não precisa alterar `upload.ts` de novo.
//
// Story 3.2: implementou só o fallback -- sempre retornava `null` ("sem
// categoria"), porque a tabela `regra_categorizacao` (regra memorizada
// fuzzy, AD-3) só foi criada na Story 3.3.
//
// Story 3.3 (esta): estende o corpo desta mesma função para normalizar
// `estabelecimento` (via `normalizarEstabelecimento`, AD-9) e consultar
// `regra_categorizacao` (fuzzy match via `similarity()`, prioridade por
// `atualizadoEm` mais recente entre as regras acima do limiar) antes de cair
// no fallback -- sem introduzir uma segunda função paralela.
export async function resolverCategoriaSugerida(
  estabelecimento: string,
  executor: Executor = db
): Promise<number | null> {
  const normalizado = normalizarEstabelecimento(estabelecimento);

  // Join com `categoria` + filtro de ativa: defesa em profundidade contra a
  // regra apontar para uma categoria já removida (soft-delete). Sob operação
  // normal isso nunca deveria acontecer -- `removerCategoria` já redireciona
  // ou apaga toda regra da categoria removida na mesma transação -- mas essa
  // consulta não deve confiar cegamente nesse invariante sendo mantido por
  // todo caminho de escrita futuro.
  const [regra] = await executor
    .select({ categoriaId: regraCategorizacao.categoriaId })
    .from(regraCategorizacao)
    .innerJoin(categoria, eq(regraCategorizacao.categoriaId, categoria.id))
    .where(
      and(
        isNull(categoria.removidoEm),
        sql`similarity(${regraCategorizacao.padraoEstabelecimento}, ${normalizado}) > ${LIMIAR_SIMILARIDADE}`
      )
    )
    .orderBy(sql`${regraCategorizacao.atualizadoEm} DESC`)
    .limit(1);

  if (regra) {
    return regra.categoriaId;
  }

  return null;
}
