import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { cartao, categoria, lancamento } from '@/db/schema';
import { listarContasCasal } from '@/server/ingestao/mapear-cartao';

export type MotivoPendencia = 'titular_pendente' | 'sem_categoria' | 'categoria_removida';

export type CategoriaResumo = {
  categoriaId: number;
  nome: string;
  totalCentavos: number;
};

export type PessoaResumo = {
  usuarioId: string;
  email: string;
  totalCentavos: number;
  categorias: CategoriaResumo[];
};

export type ItemPendente = {
  id: number;
  data: string;
  estabelecimento: string;
  valorCentavos: number;
  motivo: MotivoPendencia;
};

export type ResumoGastos = {
  pessoas: PessoaResumo[];
  pendentes: {
    totalCentavos: number;
    itens: ItemPendente[];
  };
};

// Agrega os lançamentos de uma competência por pessoa e categoria (Story
// 4.1). Um lançamento só entra no total/detalhamento de uma pessoa quando
// AMBOS são conhecidos e ativos: `cartao.usuarioId` mapeado para uma das duas
// contas do casal (`listarContasCasal()`) e `categoriaId` apontando para uma
// categoria com `removidoEm` nulo. Qualquer lançamento que falhe uma dessas
// condições vai inteiro para "pendente de revisão" -- nunca fica ausente da
// tela nem é contado parcialmente em algum total de pessoa.
//
// Exceção: lançamentos de um cartão marcado `terceiro` (Story 2.3, "Não é do
// casal") são excluídos inteiramente -- nem pessoa, nem pendente. O casal já
// resolveu explicitamente que esse dinheiro não é deles; entradas antigas
// desse cartão (inseridas antes da rejeição, já que `rejeitarCartaoTerceiro`
// só bloqueia uploads futuros) não devem virar um item de "pendente de
// revisão" que ninguém nunca vai poder resolver nesta tela.
//
// As duas contas do casal são sempre incluídas em `pessoas` (mesmo com total
// zerado) porque a lista de pessoas parte de `listarContasCasal()`, não dos
// lançamentos encontrados. Se `listarContasCasal()` falhar (degradação
// graciosa já tratada lá, retornando `[]`), nenhum titular pode ser
// confirmado: `pessoas` fica vazio e todo lançamento (exceto os de cartão
// terceiro) cai em "pendente de revisão" com motivo `titular_pendente`.
export async function obterResumoGastos(ano: number, mes: number): Promise<ResumoGastos> {
  const [linhas, contas] = await Promise.all([
    db
      .select({
        id: lancamento.id,
        data: lancamento.data,
        estabelecimento: lancamento.estabelecimento,
        valorCentavos: lancamento.valorCentavos,
        categoriaId: lancamento.categoriaId,
        categoriaNome: categoria.nome,
        categoriaRemovidoEm: categoria.removidoEm,
        cartaoUsuarioId: cartao.usuarioId,
        cartaoTerceiro: cartao.terceiro,
      })
      .from(lancamento)
      .leftJoin(cartao, eq(lancamento.cartaoId, cartao.id))
      .leftJoin(categoria, eq(lancamento.categoriaId, categoria.id))
      .where(and(eq(lancamento.competenciaAno, ano), eq(lancamento.competenciaMes, mes))),
    listarContasCasal(),
  ]);

  const contaPorId = new Map(contas.map((conta) => [conta.id, conta]));

  const totalPorPessoa = new Map<string, number>();
  const categoriasPorPessoa = new Map<string, Map<number, CategoriaResumo>>();
  for (const conta of contas) {
    totalPorPessoa.set(conta.id, 0);
    categoriasPorPessoa.set(conta.id, new Map());
  }

  const itensPendentes: ItemPendente[] = [];
  let totalPendentes = 0;

  for (const linha of linhas) {
    // Cartão já resolvido como "não é do casal" -- essa ambiguidade não é
    // mais uma pendência acionável nesta tela, é dinheiro de terceiro.
    if (linha.cartaoTerceiro) continue;

    const usuarioId = linha.cartaoUsuarioId;
    const titularConfirmado = usuarioId !== null && contaPorId.has(usuarioId);
    const categoriaRemovida = linha.categoriaNome !== null && linha.categoriaRemovidoEm !== null;
    // Categoria referenciada mas sem linha correspondente (`categoriaId` não
    // nulo, `categoriaNome` nulo) não deveria acontecer sob operação normal
    // (categoria só some via soft-delete, que preserva a linha) -- tratado
    // como "sem categoria" por defesa em profundidade, nunca com `nome: null`
    // vazando pro total de uma pessoa.
    const categoriaOrfa = linha.categoriaId !== null && linha.categoriaNome === null;

    let motivo: MotivoPendencia | null = null;
    if (!titularConfirmado) {
      motivo = 'titular_pendente';
    } else if (linha.categoriaId === null || categoriaOrfa) {
      motivo = 'sem_categoria';
    } else if (categoriaRemovida) {
      motivo = 'categoria_removida';
    }

    if (motivo) {
      totalPendentes += linha.valorCentavos;
      itensPendentes.push({
        id: linha.id,
        data: linha.data,
        estabelecimento: linha.estabelecimento,
        valorCentavos: linha.valorCentavos,
        motivo,
      });
      continue;
    }

    // A partir daqui: titular confirmado, `categoriaId` não nulo e categoria ativa.
    const idPessoa = usuarioId as string;
    const categoriaId = linha.categoriaId as number;
    const categoriaNome = linha.categoriaNome as string;

    totalPorPessoa.set(idPessoa, (totalPorPessoa.get(idPessoa) ?? 0) + linha.valorCentavos);

    const categoriasDaPessoa = categoriasPorPessoa.get(idPessoa)!;
    const categoriaExistente = categoriasDaPessoa.get(categoriaId);
    if (categoriaExistente) {
      categoriaExistente.totalCentavos += linha.valorCentavos;
    } else {
      categoriasDaPessoa.set(categoriaId, {
        categoriaId,
        nome: categoriaNome,
        totalCentavos: linha.valorCentavos,
      });
    }
  }

  const pessoas: PessoaResumo[] = contas.map((conta) => ({
    usuarioId: conta.id,
    email: conta.email,
    totalCentavos: totalPorPessoa.get(conta.id) ?? 0,
    categorias: Array.from(categoriasPorPessoa.get(conta.id)?.values() ?? []).sort(
      (a, b) => b.totalCentavos - a.totalCentavos
    ),
  }));

  return {
    pessoas,
    pendentes: { totalCentavos: totalPendentes, itens: itensPendentes },
  };
}
