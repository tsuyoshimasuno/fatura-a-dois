import { normalizarEstabelecimento } from '../shared/normalizar-estabelecimento';

export type LancamentoExistente = {
  id: number;
  data: string;
  estabelecimento: string;
  cartaoId: number;
  valorCentavos: number;
};

export type LancamentoNovoParaMerge = {
  data: string;
  estabelecimento: string;
  cartaoId: number;
  valorCentavos: number;
  parcelaNumero: number | null;
  parcelaTotal: number | null;
};

type ResultadoMergeDelta = {
  atualizar: { id: number; valorCentavos: number }[];
  inserir: LancamentoNovoParaMerge[];
  remover: number[];
};

function chaveDeMatching(item: {
  data: string;
  estabelecimento: string;
  cartaoId: number;
}): string {
  return `${item.data}|${normalizarEstabelecimento(item.estabelecimento)}|${item.cartaoId}`;
}

function agruparPorChave<T extends { data: string; estabelecimento: string; cartaoId: number }>(
  itens: T[]
): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const chave = chaveDeMatching(item);
    const grupo = grupos.get(chave);
    if (grupo) {
      grupo.push(item);
    } else {
      grupos.set(chave, [item]);
    }
  }
  return grupos;
}

export function calcularMergeDelta(
  existentes: LancamentoExistente[],
  novos: LancamentoNovoParaMerge[]
): ResultadoMergeDelta {
  const gruposExistentes = agruparPorChave(existentes);
  const gruposNovos = agruparPorChave(novos);

  const atualizar: { id: number; valorCentavos: number }[] = [];
  const inserir: LancamentoNovoParaMerge[] = [];
  const remover: number[] = [];

  const todasAsChaves = new Set([...gruposExistentes.keys(), ...gruposNovos.keys()]);

  for (const chave of todasAsChaves) {
    const grupoExistente = gruposExistentes.get(chave) ?? [];
    const grupoNovo = gruposNovos.get(chave) ?? [];
    const tamanhoComum = Math.min(grupoExistente.length, grupoNovo.length);

    for (let i = 0; i < tamanhoComum; i++) {
      const existente = grupoExistente[i];
      const novo = grupoNovo[i];
      if (existente.valorCentavos !== novo.valorCentavos) {
        atualizar.push({ id: existente.id, valorCentavos: novo.valorCentavos });
      }
    }

    for (let i = tamanhoComum; i < grupoNovo.length; i++) {
      inserir.push(grupoNovo[i]);
    }

    for (let i = tamanhoComum; i < grupoExistente.length; i++) {
      remover.push(grupoExistente[i].id);
    }
  }

  return { atualizar, inserir, remover };
}
