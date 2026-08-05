import { describe, expect, it } from "vitest";
import { canEditDemandAtStatus, canManageTeam, canViewDocument, canViewPayments } from "@/lib/workflow/permissions";

describe("permissões por perfil e etapa", () => {
  it("cada setor só edita a demanda quando é o dono da etapa atual", () => {
    expect(canEditDemandAtStatus("comercial", "em_analise_comercial")).toBe(true);
    expect(canEditDemandAtStatus("juridico", "em_analise_comercial")).toBe(false);
    expect(canEditDemandAtStatus("juridico", "em_validacao_juridica")).toBe(true);
    expect(canEditDemandAtStatus("projetos", "em_validacao_juridica")).toBe(false);
  });

  it("admin sempre pode editar, independentemente da etapa", () => {
    expect(canEditDemandAtStatus("admin", "em_analise_comercial")).toBe(true);
    expect(canEditDemandAtStatus("admin", "em_processamento_financeiro")).toBe(true);
  });

  it("Projetos só monta equipe quando a demanda está em 'equipe_em_montagem'", () => {
    expect(canManageTeam("projetos", "equipe_em_montagem")).toBe(true);
    expect(canManageTeam("projetos", "contrato_assinado")).toBe(false);
    expect(canManageTeam("comercial", "equipe_em_montagem")).toBe(false);
  });

  it("apenas Financeiro e Admin visualizam pagamentos (dados financeiros confidenciais)", () => {
    expect(canViewPayments("financeiro")).toBe(true);
    expect(canViewPayments("admin")).toBe(true);
    expect(canViewPayments("comercial")).toBe(false);
    expect(canViewPayments("projetos")).toBe(false);
    expect(canViewPayments("juridico")).toBe(false);
  });

  it("comprovantes de pagamento só são visíveis a Financeiro e Admin", () => {
    expect(canViewDocument("financeiro", "comprovante")).toBe(true);
    expect(canViewDocument("comercial", "comprovante")).toBe(false);
    expect(canViewDocument("juridico", "comprovante")).toBe(false);
  });

  it("a minuta contratual é exclusiva do Jurídico e do Admin — Comercial não vê a elaboração da minuta", () => {
    expect(canViewDocument("juridico", "minuta")).toBe(true);
    expect(canViewDocument("admin", "minuta")).toBe(true);
    expect(canViewDocument("comercial", "minuta")).toBe(false);
    expect(canViewDocument("projetos", "minuta")).toBe(false);
    expect(canViewDocument("financeiro", "minuta")).toBe(false);
  });

  it("o contrato assinado é visível a Jurídico, Projetos e Admin, mas não ao Comercial/Financeiro", () => {
    expect(canViewDocument("juridico", "contrato_assinado")).toBe(true);
    expect(canViewDocument("projetos", "contrato_assinado")).toBe(true);
    expect(canViewDocument("admin", "contrato_assinado")).toBe(true);
    expect(canViewDocument("comercial", "contrato_assinado")).toBe(false);
    expect(canViewDocument("financeiro", "contrato_assinado")).toBe(false);
  });
});
