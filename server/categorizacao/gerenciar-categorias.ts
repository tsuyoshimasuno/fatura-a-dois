'use server';

import { and, count, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { categoria, lancamento, regraCategorizacao } from '@/db/schema';
import { ehIconeCategoriaValido } from '@/lib/categoria-icones';

type ResultadoOperacao = { ok: boolean; message?: string };

const NOME_MAX_LENGTH = 60;

// Erro esperado (validação de negócio) lançado dentro de uma transação para
// forçar rollback e ainda assim devolver uma mensagem amigável ao chamador --
// nunca um erro genérico de banco disfarçado de validação.
class CategoriaValidationError extends Error {}

// Violação de unique constraint do Postgres (índice parcial de nome ativo) --
// verificada via código de erro, nunca via checagem prévia separada da
// escrita (mesmo padrão de mapear-cartao.ts: o guard real é o próprio banco).
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

// Invalidação de cache é uma preocupação à parte da escrita em si -- uma
// falha aqui (inclusive fora de um contexto de requisição real, ex. scripts)
// nunca deve ser reportada como falha da mutação que já foi persistida.
function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error(`Falha ao revalidar ${path}:`, error);
  }
}

function validarNome(nome: string): string | null {
  const nomeTratado = nome.trim();

  if (!nomeTratado) {
    return null;
  }

  if (nomeTratado.length > NOME_MAX_LENGTH) {
    return null;
  }

  return nomeTratado;
}

// Ícone é sempre opcional (spec-icone-categoria-escolhido.md, Never: nunca
// obrigatório, nunca badge de pendência) -- ausente/vazio/inválido tratado
// da mesma forma, "nenhum ícone escolhido", nunca um erro. Só uma chave que
// não pertence ao enum fechado (`ICONES_CATEGORIA_VALIDOS`, ex. manipulação
// direta de requisição via DevTools) cai no fallback `null`; nunca persiste
// uma chave arbitrária.
function validarIcone(icone: string | null): string | null {
  if (icone === null) {
    return null;
  }

  const iconeTratado = icone.trim();

  if (!iconeTratado || !ehIconeCategoriaValido(iconeTratado)) {
    return null;
  }

  return iconeTratado;
}

// `db` e uma transação (`tx`) expõem os mesmos métodos de consulta usados
// aqui, mas são tipos nominalmente distintos no drizzle -- este tipo
// estrutural permite a mesma função de checagem em ambos os contextos.
type Executor = Pick<typeof db, 'select'>;

// Duplicidade é comparada sem diferenciar maiúsculas/minúsculas -- "Mercado"
// e "mercado" são a mesma categoria para efeito de unicidade, mesmo que o
// índice de banco (defesa em profundidade contra corrida) só cubra o valor
// exato. `excluirId` permite renomear uma categoria mantendo o próprio nome.
async function existeCategoriaAtivaComNome(
  executor: Executor,
  nome: string,
  excluirId?: number
): Promise<boolean> {
  const condicoes = [isNull(categoria.removidoEm), sql`lower(${categoria.nome}) = lower(${nome})`];

  if (excluirId !== undefined) {
    condicoes.push(sql`${categoria.id} != ${excluirId}`);
  }

  const encontradas = await executor.select().from(categoria).where(and(...condicoes));

  return encontradas.length > 0;
}

export async function listarCategorias() {
  return db
    .select()
    .from(categoria)
    .where(isNull(categoria.removidoEm))
    .orderBy(categoria.nome);
}

export async function contarLancamentosPorCategoria(categoriaId: number): Promise<number> {
  const [linha] = await db
    .select({ total: count() })
    .from(lancamento)
    .where(eq(lancamento.categoriaId, categoriaId));

  return linha?.total ?? 0;
}

// Quantas regras memorizadas (Story 3.3) apontam para esta categoria -- usado
// pela tela de confirmação de remoção para avisar também esse impacto, não só
// o de lançamentos.
export async function contarRegrasPorCategoria(categoriaId: number): Promise<number> {
  const [linha] = await db
    .select({ total: count() })
    .from(regraCategorizacao)
    .where(eq(regraCategorizacao.categoriaId, categoriaId));

  return linha?.total ?? 0;
}

export async function criarCategoria(
  nome: string,
  icone: string | null = null
): Promise<ResultadoOperacao & { categoria?: typeof categoria.$inferSelect }> {
  const nomeTratado = validarNome(nome);

  if (!nomeTratado) {
    return { ok: false, message: `Informe um nome de até ${NOME_MAX_LENGTH} caracteres para a categoria.` };
  }

  const iconeTratado = validarIcone(icone);

  if (await existeCategoriaAtivaComNome(db, nomeTratado)) {
    return { ok: false, message: 'Já existe uma categoria ativa com esse nome.' };
  }

  let nova: typeof categoria.$inferSelect;

  try {
    [nova] = await db.insert(categoria).values({ nome: nomeTratado, icone: iconeTratado }).returning();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: 'Já existe uma categoria ativa com esse nome.' };
    }

    console.error('Falha ao criar categoria:', error);

    return { ok: false, message: 'Falha ao criar categoria.' };
  }

  // Fora do try/catch da escrita -- uma falha ao revalidar o cache é uma
  // preocupação à parte e nunca deve fazer uma criação já persistida ser
  // reportada como falha ao chamador.
  safeRevalidate('/categorias');

  return { ok: true, categoria: nova };
}

export async function editarCategoria(
  categoriaId: number,
  nome: string,
  icone: string | null = null
): Promise<ResultadoOperacao> {
  const nomeTratado = validarNome(nome);

  if (!nomeTratado) {
    return { ok: false, message: `Informe um nome de até ${NOME_MAX_LENGTH} caracteres para a categoria.` };
  }

  const iconeTratado = validarIcone(icone);

  if (await existeCategoriaAtivaComNome(db, nomeTratado, categoriaId)) {
    return { ok: false, message: 'Já existe uma categoria ativa com esse nome.' };
  }

  let atualizados: (typeof categoria.$inferSelect)[];

  try {
    // Guard de estado no próprio WHERE do UPDATE -- editar uma categoria já
    // removida nunca reativa a linha silenciosamente.
    atualizados = await db
      .update(categoria)
      .set({ nome: nomeTratado, icone: iconeTratado })
      .where(and(eq(categoria.id, categoriaId), isNull(categoria.removidoEm)))
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: 'Já existe uma categoria ativa com esse nome.' };
    }

    console.error('Falha ao editar categoria:', error);

    return { ok: false, message: 'Falha ao editar categoria.' };
  }

  if (atualizados.length === 0) {
    return { ok: false, message: 'Categoria não existe ou foi removida.' };
  }

  // Fora do try/catch da escrita -- mesma razão de `criarCategoria`.
  safeRevalidate('/categorias');

  return { ok: true };
}

// `substitutaId` (categoria existente) e `novaCategoriaNome` (criar uma nova)
// são mutuamente exclusivos -- o input de nova categoria tem prioridade se
// ambos vierem preenchidos (refletido no rótulo da UI). Tudo -- validação da
// substituta, criação da nova categoria quando pedida, migração dos
// lançamentos e a marcação de removida -- acontece numa única transação: se
// qualquer passo falhar, nada é commitado (nem a categoria nova, nem a
// migração), nunca deixando um estado parcial visível.
export async function removerCategoria(
  categoriaId: number,
  substitutaId: number | null,
  novaCategoriaNome: string | null = null
): Promise<ResultadoOperacao> {
  if (substitutaId !== null && substitutaId === categoriaId) {
    return { ok: false, message: 'A categoria substituta não pode ser a própria categoria.' };
  }

  const nomeTratado = novaCategoriaNome ? validarNome(novaCategoriaNome) : null;

  if (novaCategoriaNome && !nomeTratado) {
    return { ok: false, message: `Informe um nome de até ${NOME_MAX_LENGTH} caracteres para a nova categoria.` };
  }

  try {
    await db.transaction(async (tx) => {
      let substitutaFinalId = substitutaId;

      if (nomeTratado) {
        if (await existeCategoriaAtivaComNome(tx, nomeTratado)) {
          throw new CategoriaValidationError('Já existe uma categoria ativa com esse nome.');
        }

        const [nova] = await tx.insert(categoria).values({ nome: nomeTratado }).returning();
        substitutaFinalId = nova.id;
      } else if (substitutaFinalId !== null) {
        // Re-checado dentro da própria transação (não só antes de abri-la)
        // -- fecha a janela em que a substituta poderia ter sido removida
        // por uma chamada concorrente entre a validação e a escrita.
        const [substituta] = await tx
          .select()
          .from(categoria)
          .where(and(eq(categoria.id, substitutaFinalId), isNull(categoria.removidoEm)));

        if (!substituta) {
          throw new CategoriaValidationError('Categoria substituta não existe ou foi removida.');
        }
      }

      if (substitutaFinalId !== null) {
        await tx
          .update(lancamento)
          .set({ categoriaId: substitutaFinalId })
          .where(eq(lancamento.categoriaId, categoriaId));

        // Regra memorizada que apontava para a categoria removida é
        // redirecionada para a substituta -- nunca fica sugerindo uma
        // categoria inexistente (acoplamento Story 3.1 / Story 3.3).
        await tx
          .update(regraCategorizacao)
          .set({ categoriaId: substitutaFinalId, atualizadoEm: new Date() })
          .where(eq(regraCategorizacao.categoriaId, categoriaId));
      } else {
        // Sem substituta: a regra não tem para onde apontar, então é
        // apagada junto -- nunca fica órfã apontando para uma categoria
        // removida.
        await tx.delete(regraCategorizacao).where(eq(regraCategorizacao.categoriaId, categoriaId));
      }

      // Guard de estado no próprio WHERE: remover uma categoria já removida
      // nunca reafirma a exclusão silenciosamente. 0 linhas aqui lança e
      // desfaz qualquer migração/criação já feita acima nesta transação --
      // nunca migra lançamentos para uma remoção que não se efetivou.
      const removidas = await tx
        .update(categoria)
        .set({ removidoEm: new Date() })
        .where(and(eq(categoria.id, categoriaId), isNull(categoria.removidoEm)))
        .returning();

      if (removidas.length === 0) {
        throw new CategoriaValidationError('Categoria não existe ou já foi removida.');
      }
    });
  } catch (error) {
    if (error instanceof CategoriaValidationError) {
      return { ok: false, message: error.message };
    }

    if (isUniqueViolation(error)) {
      return { ok: false, message: 'Já existe uma categoria ativa com esse nome.' };
    }

    console.error('Falha ao remover categoria:', error);

    return { ok: false, message: 'Falha ao remover categoria.' };
  }

  safeRevalidate('/categorias');

  return { ok: true };
}
