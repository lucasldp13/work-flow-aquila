import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, STATUS_OWNER, isTransitionAllowed } from "@/lib/workflow/statuses";
import type { DemandStatus } from "@/types/database";

const ALL_STATUSES = Object.keys(STATUS_OWNER) as DemandStatus[];

describe("máquina de estados do workflow", () => {
  it("nunca permite pular etapas: recebida_comercial não pode ir direto para etapas jurídicas ou posteriores", () => {
    expect(isTransitionAllowed("recebida_comercial", "em_validacao_juridica")).toBe(false);
    expect(isTransitionAllowed("recebida_comercial", "minuta_enviada")).toBe(false);
    expect(isTransitionAllowed("recebida_comercial", "concluida")).toBe(false);
  });

  it("não permite pular a etapa de assinatura para ir direto a Projetos", () => {
    expect(isTransitionAllowed("minuta_enviada", "equipe_em_montagem")).toBe(false);
    expect(isTransitionAllowed("minuta_em_elaboracao", "contrato_assinado")).toBe(false);
  });

  it("não permite pular a montagem de equipe para ir direto ao Financeiro", () => {
    expect(isTransitionAllowed("contrato_assinado", "em_processamento_financeiro")).toBe(false);
  });

  it("permite o caminho feliz completo, etapa a etapa", () => {
    const caminhoFeliz: DemandStatus[] = [
      "recebida_comercial",
      "em_analise_comercial",
      "encaminhada_juridico",
      "em_validacao_juridica",
      "minuta_em_elaboracao",
      "minuta_enviada",
      "aguardando_assinaturas",
      "contrato_assinado",
      "equipe_em_montagem",
      "equipe_definida",
      "em_processamento_financeiro",
      "concluida",
    ];

    for (let i = 0; i < caminhoFeliz.length - 1; i++) {
      expect(isTransitionAllowed(caminhoFeliz[i], caminhoFeliz[i + 1])).toBe(true);
    }
  });

  it("permite a devolução do Jurídico ao Comercial e o reenvio", () => {
    expect(isTransitionAllowed("em_validacao_juridica", "devolvida_comercial")).toBe(true);
    expect(isTransitionAllowed("devolvida_comercial", "em_analise_comercial")).toBe(true);
  });

  it("'concluida' é um estado terminal, sem transições de saída", () => {
    expect(ALLOWED_TRANSITIONS.concluida).toHaveLength(0);
  });

  it("toda transição de destino é um status válido conhecido", () => {
    for (const origem of ALL_STATUSES) {
      for (const destino of ALLOWED_TRANSITIONS[origem]) {
        expect(ALL_STATUSES).toContain(destino);
      }
    }
  });
});
