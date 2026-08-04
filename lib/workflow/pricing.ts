// Regra comercial: o valor informado pelo Comercial é sempre o valor
// líquido. O valor bruto (o que efetivamente é cobrado do cliente, para
// que o líquido reste após o markup) é sempre recalculado a partir dele:
//
//   valor_bruto = valor_liquido / (1 - markup / 100)
//
// Ex.: líquido R$ 200.000, markup 45% → 200000 / (1 - 0.45) = R$ 363.636,36

export interface ValorBrutoResult {
  valorBruto: number | null;
  erro: string | null;
}

export function calcularValorBruto(valorLiquido: number | null | undefined, markupPercent: number | null | undefined): ValorBrutoResult {
  if (valorLiquido === null || valorLiquido === undefined || Number.isNaN(valorLiquido)) {
    return { valorBruto: null, erro: null };
  }

  const markup = markupPercent ?? 0;

  if (markup >= 100) {
    return { valorBruto: null, erro: "O markup deve ser menor que 100% para o cálculo do valor bruto ser possível." };
  }

  const valorBruto = valorLiquido / (1 - markup / 100);
  return { valorBruto: Math.round(valorBruto * 100) / 100, erro: null };
}
