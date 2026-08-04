"use client";

import { useMemo } from "react";
import { calcularValorBruto } from "@/lib/workflow/pricing";
import { formatCurrency } from "@/lib/utils/format";
import { Alert } from "@/components/ui/Alert";

// Mostra, em tempo real, o valor bruto calculado a partir do valor líquido
// e do markup digitados: valor_bruto = valor_liquido / (1 - markup/100).
// O mesmo cálculo é refeito (e persistido) no backend ao salvar.
export function ValorBrutoPreview({ valor, markup }: { valor: string; markup: string }) {
  const { valorBruto, erro } = useMemo(() => {
    const valorNum = valor.trim() === "" ? null : Number(valor);
    const markupNum = markup.trim() === "" ? null : Number(markup);
    return calcularValorBruto(valorNum, markupNum);
  }, [valor, markup]);

  if (erro) {
    return <Alert variant="warning">{erro}</Alert>;
  }

  if (valorBruto === null) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
      <span className="text-sm font-medium text-brand-900">Valor bruto (com markup)</span>
      <span className="text-lg font-semibold text-brand-800">{formatCurrency(valorBruto)}</span>
    </div>
  );
}
