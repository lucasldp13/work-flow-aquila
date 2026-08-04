import { describe, expect, it } from "vitest";
import { calcularValorBruto } from "@/lib/workflow/pricing";

describe("cálculo do valor bruto a partir do valor líquido e do markup", () => {
  it("aplica a fórmula valor_bruto = valor_liquido / (1 - markup/100)", () => {
    const { valorBruto, erro } = calcularValorBruto(200000, 45);
    expect(erro).toBeNull();
    expect(valorBruto).toBeCloseTo(363636.36, 2);
  });

  it("sem markup, o valor bruto é igual ao valor líquido", () => {
    expect(calcularValorBruto(100000, 0).valorBruto).toBe(100000);
    expect(calcularValorBruto(100000, null).valorBruto).toBe(100000);
  });

  it("retorna null quando o valor líquido ainda não foi informado", () => {
    expect(calcularValorBruto(null, 45).valorBruto).toBeNull();
  });

  it("recusa markup maior ou igual a 100% (divisão por zero ou negativa)", () => {
    const { valorBruto, erro } = calcularValorBruto(200000, 100);
    expect(valorBruto).toBeNull();
    expect(erro).not.toBeNull();

    expect(calcularValorBruto(200000, 120).valorBruto).toBeNull();
  });
});
