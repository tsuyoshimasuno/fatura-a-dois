'use client';

import {
  ICONES_CATEGORIA_VALIDOS,
  ICONE_CATEGORIA_COMPONENTE,
  ICONE_CATEGORIA_LABEL,
} from '@/lib/categoria-icones';

// Valor de FormData para "Nenhum" -- string vazia, que `validarIcone`
// (server/categorizacao/gerenciar-categorias.ts) já trata como "nenhum
// ícone escolhido" (mesmo caminho de campo ausente), nunca um erro.
const VALOR_NENHUM = '';

type IconePickerProps = {
  /** `null`/ausente cai em "Nenhum" -- mesmo default do formulário de criar. */
  valorAtual?: string | null;
  disabled?: boolean;
};

// Grade de 8 botões (7 ícones + "Nenhum") reutilizada pelo formulário de
// criar categoria e pelo formulário de editar categoria
// (spec-icone-categoria-escolhido.md) -- ponto único de verdade sobre o
// markup/acessibilidade do seletor, para os dois formularios nunca
// divergirem. `<fieldset>`/`<legend>` + `<input type="radio">` nativos: o
// padrão de radio group mais robusto para leitor de tela, sem precisar
// reimplementar semântica ARIA na mão. Cada opção usa um `<label>` com texto
// visível (não visualmente escondido) ao lado do glifo -- rótulo acessível
// que não depende só de cor/forma, e a seleção atual é indicada tanto
// visualmente (`.icone-picker-option:has(:checked)`, CSS) quanto para
// tecnologia assistiva (estado nativo `checked` do `<input>`).
export function IconePicker({ valorAtual = null, disabled = false }: IconePickerProps) {
  const valorSelecionado = valorAtual ?? VALOR_NENHUM;

  return (
    <fieldset className="icone-picker" disabled={disabled}>
      <legend className="icone-picker-legend">Ícone da categoria (opcional)</legend>
      <div className="icone-picker-grid">
        <label className="icone-picker-option">
          <input
            type="radio"
            name="icone"
            value={VALOR_NENHUM}
            defaultChecked={valorSelecionado === VALOR_NENHUM}
            className="icone-picker-input"
          />
          <span className="icone-picker-visual icone-picker-visual--nenhum" aria-hidden="true" />
          <span className="icone-picker-label">Nenhum</span>
        </label>
        {ICONES_CATEGORIA_VALIDOS.map((chave) => {
          const Icone = ICONE_CATEGORIA_COMPONENTE[chave];
          return (
            <label key={chave} className="icone-picker-option">
              <input
                type="radio"
                name="icone"
                value={chave}
                defaultChecked={valorSelecionado === chave}
                className="icone-picker-input"
              />
              <span className="icone-picker-visual" aria-hidden="true">
                <Icone className="icone-picker-svg" />
              </span>
              <span className="icone-picker-label">{ICONE_CATEGORIA_LABEL[chave]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
