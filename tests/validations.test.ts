import { describe, expect, it } from "vitest";
import { calcularPrazoLimite, checkMinutaEnvio, isValidCnpj, isValidEmail, isPrazoVencido } from "@/lib/workflow/validations";

describe("trava obrigatória do envio da minuta", () => {
  it("bloqueia quando nada foi preenchido", () => {
    const result = checkMinutaEnvio({ minutaAnexada: false, signatarioEmail: "", confirmarEmail: "" });
    expect(result.liberado).toBe(false);
    expect(result.pendencias).toHaveLength(3);
  });

  it("bloqueia quando a minuta não está anexada, mesmo com e-mails corretos", () => {
    const result = checkMinutaEnvio({ minutaAnexada: false, signatarioEmail: "cliente@empresa.com", confirmarEmail: "cliente@empresa.com" });
    expect(result.liberado).toBe(false);
    expect(result.pendencias).toContain("Anexe o documento da minuta antes de registrar o envio.");
  });

  it("bloqueia e-mail com formato inválido", () => {
    const result = checkMinutaEnvio({ minutaAnexada: true, signatarioEmail: "nao-e-um-email", confirmarEmail: "nao-e-um-email" });
    expect(result.liberado).toBe(false);
    expect(result.pendencias.some((p) => p.includes("válido"))).toBe(true);
  });

  it("bloqueia quando a confirmação de e-mail diverge do primeiro campo", () => {
    const result = checkMinutaEnvio({ minutaAnexada: true, signatarioEmail: "cliente@empresa.com", confirmarEmail: "outro@empresa.com" });
    expect(result.liberado).toBe(false);
    expect(result.pendencias.some((p) => p.includes("idêntico"))).toBe(true);
  });

  it("libera somente quando todas as quatro condições são satisfeitas", () => {
    const result = checkMinutaEnvio({ minutaAnexada: true, signatarioEmail: "cliente@empresa.com", confirmarEmail: "cliente@empresa.com" });
    expect(result.liberado).toBe(true);
    expect(result.pendencias).toHaveLength(0);
  });
});

describe("validação de e-mail e CNPJ", () => {
  it("valida formatos de e-mail comuns", () => {
    expect(isValidEmail("fulano@empresa.com.br")).toBe(true);
    expect(isValidEmail("fulano@empresa")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });

  it("valida CNPJ pelo número de dígitos", () => {
    expect(isValidCnpj("12.345.678/0001-90")).toBe(true);
    expect(isValidCnpj("123")).toBe(false);
    expect(isValidCnpj(undefined)).toBe(false);
  });
});

describe("cálculo do prazo jurídico", () => {
  it("soma dias corridos incluindo fins de semana", () => {
    const inicio = new Date("2026-01-02T12:00:00"); // sexta-feira
    const limite = calcularPrazoLimite(inicio, 4, "corridos");
    expect(limite.toISOString().slice(0, 10)).toBe("2026-01-06");
  });

  it("soma apenas dias úteis, pulando sábado e domingo", () => {
    const inicio = new Date("2026-01-02T12:00:00"); // sexta-feira, 02/01/2026
    const limite = calcularPrazoLimite(inicio, 4, "uteis");
    // seg(05) ter(06) qua(07) qui(08) => 4 dias úteis a partir de sexta
    expect(limite.toISOString().slice(0, 10)).toBe("2026-01-08");
  });

  it("identifica prazo vencido corretamente", () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    expect(isPrazoVencido(ontem)).toBe(true);

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(isPrazoVencido(amanha)).toBe(false);
  });
});
