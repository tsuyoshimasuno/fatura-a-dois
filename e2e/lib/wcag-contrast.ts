// Contraste WCAG 2.1 (luminância relativa) -- réplica exata da fórmula já
// usada manualmente nos comentários de `app/globals.css` (ex.: "4,79:1 contra
// --surface"), para que os resultados calculados aqui batam com os valores já
// documentados lá. Não é uma aproximação diferente.
//
// Fórmula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
//   L = 0.2126*R + 0.7152*G + 0.0722*B, onde cada canal R/G/B passa antes por
//   uma linearização sRGB (srgbToLinear abaixo).
// Razão de contraste: (L1 + 0.05) / (L2 + 0.05), com L1 sempre a luminância
// mais clara -- ordem dos dois hex de entrada não importa para o resultado.

function srgbToLinear(canal8bit: number): number {
  const c = canal8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

// Aceita `#rgb`, `#rrggbb` e as formas equivalentes sem `#` (getComputedStyle
// no navegador normalmente já retorna `rgb(r, g, b)` para custom properties
// resolvidas, mas os valores documentados em globals.css são hex -- este
// parser cobre ambos os formatos vistos na prática nesta suíte).
function hexToRgb(hex: string): [number, number, number] {
  const normalizado = hex.trim().replace(/^#/, '');

  if (/^[0-9a-fA-F]{3}$/.test(normalizado)) {
    const [r, g, b] = normalizado.split('');
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }

  if (/^[0-9a-fA-F]{6}$/.test(normalizado)) {
    const int = parseInt(normalizado, 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }

  const rgbMatch = hex.trim().match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }

  throw new Error(`Cor não reconhecida (esperado hex #rgb/#rrggbb ou rgb()/rgba()): "${hex}"`);
}

/**
 * Razão de contraste WCAG 2.1 entre duas cores. Aceita hex (`#rrggbb`/`#rgb`)
 * ou `rgb()`/`rgba()`. A ordem dos argumentos não importa -- o resultado é
 * sempre (luminância mais clara + 0.05) / (luminância mais escura + 0.05).
 *
 * Mínimos WCAG AA aplicáveis nesta suíte: 4.5:1 para texto normal,
 * 3:1 para elemento gráfico/borda (ver e2e/contrast/contrast.spec.ts).
 */
export function contrastRatio(cor1: string, cor2: string): number {
  const [r1, g1, b1] = hexToRgb(cor1);
  const [r2, g2, b2] = hexToRgb(cor2);

  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);

  const maisClara = Math.max(l1, l2);
  const maisEscura = Math.min(l1, l2);

  return (maisClara + 0.05) / (maisEscura + 0.05);
}

// Sanity check inline -- roda a cada import deste módulo (custo desprezível,
// só aritmética) para manter a fórmula honesta sem precisar de um test
// runner unitário dedicado no projeto (nenhum está configurado hoje).
// Valores de referência conhecidos:
//   - branco sobre preto (e vice-versa) = 21:1, o contraste máximo possível.
//   - #767676 sobre branco = ~4,54:1, o cinza "no limite" classicamente citado
//     nos exemplos oficiais do WCAG para o mínimo AA de texto (4.5:1).
//
// `throw` em vez de `console.assert` -- achado real do review adversarial:
// `console.assert` no Node não lança nem afeta o exit code, então uma
// fórmula quebrada passaria batido, silenciosa, sem falhar nenhum teste
// (justamente o que este sanity check deveria impedir). Lançar no
// carregamento do módulo quebra QUALQUER spec que o importe, tornando o erro
// impossível de ignorar.
const SANITY_CHECKS: Array<{ fg: string; bg: string; esperado: number }> = [
  { fg: '#ffffff', bg: '#000000', esperado: 21 },
  { fg: '#000000', bg: '#ffffff', esperado: 21 },
  { fg: '#767676', bg: '#ffffff', esperado: 4.54 },
];

for (const { fg, bg, esperado } of SANITY_CHECKS) {
  const obtido = contrastRatio(fg, bg);
  if (Math.abs(obtido - esperado) >= 0.01) {
    throw new Error(
      `wcag-contrast.ts sanity check falhou: contrastRatio(${fg}, ${bg}) = ${obtido.toFixed(4)}, esperado ~${esperado}`,
    );
  }
}
