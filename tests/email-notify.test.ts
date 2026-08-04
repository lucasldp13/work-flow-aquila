import { describe, expect, it, vi, beforeEach } from "vitest";

// Duplo de teste do cliente Supabase (service role). Simula apenas as
// tabelas/consultas que lib/email/notify.ts realmente usa, mantendo os
// dados em memória para cada teste.
function createFakeSupabase() {
  const emailNotifications = new Map<string, Record<string, unknown>>();
  const appSettings = new Map<string, Record<string, unknown>>();
  const notifications: Record<string, unknown>[] = [];

  function makeEmailNotificationsBuilder() {
    let mode: "select" | "upsert" | "update" = "select";
    const filters: Record<string, unknown> = {};
    let payload: Record<string, unknown> = {};

    const builder = {
      select: () => builder,
      eq: (key: string, value: unknown) => {
        filters[key] = value;
        return builder;
      },
      upsert: (values: Record<string, unknown>) => {
        mode = "upsert";
        payload = values;
        return builder;
      },
      update: (values: Record<string, unknown>) => {
        mode = "update";
        payload = values;
        return builder;
      },
      maybeSingle: async () => {
        const key = `${filters.demand_id}:${filters.action_key}`;
        const row = emailNotifications.get(key);
        return { data: row ?? null, error: null };
      },
      single: async () => {
        if (mode === "upsert") {
          const key = `${payload.demand_id}:${payload.action_key}`;
          const existing = emailNotifications.get(key);
          const id = (existing?.id as string) ?? `email-${emailNotifications.size + 1}`;
          emailNotifications.set(key, { ...existing, ...payload, id });
          return { data: { id }, error: null };
        }
        return { data: null, error: null };
      },
      then: (resolve: (v: unknown) => void) => {
        if (mode === "update") {
          for (const [key, row] of emailNotifications) {
            if (row.id === filters.id) {
              emailNotifications.set(key, { ...row, ...payload });
            }
          }
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return builder;
  }

  function makeAppSettingsBuilder() {
    const filters: Record<string, unknown> = {};
    const builder = {
      select: () => builder,
      eq: (key: string, value: unknown) => {
        filters[key] = value;
        return builder;
      },
      maybeSingle: async () => ({ data: appSettings.get(filters.chave as string) ?? null, error: null }),
    };
    return builder;
  }

  function makeNotificationsBuilder() {
    return {
      insert: async (values: Record<string, unknown>) => {
        notifications.push(values);
        return { data: null, error: null };
      },
    };
  }

  return {
    from(table: string) {
      if (table === "email_notifications") return makeEmailNotificationsBuilder();
      if (table === "app_settings") return makeAppSettingsBuilder();
      if (table === "notifications") return makeNotificationsBuilder();
      throw new Error(`Tabela não simulada no teste: ${table}`);
    },
    _seedAppSettings(chave: string, valor: unknown) {
      appSettings.set(chave, { valor });
    },
    _emailNotifications: emailNotifications,
    _notifications: notifications,
  };
}

const sendMailMock = vi.fn();
const fakeSupabase = createFakeSupabase();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => fakeSupabase,
}));
vi.mock("@/lib/email/transport", () => ({
  getEmailTransport: () => ({ sendMail: sendMailMock }),
  getEmailFrom: () => "Workflow Aquila <nao-responda@aquila.com.br>",
}));

const { notifyJuridico, notifyMinutaConfirmacaoInterna, MAX_EMAIL_ATTEMPTS } = await import("@/lib/email/notify");

describe("notificação automática ao Jurídico", () => {
  beforeEach(() => {
    sendMailMock.mockReset();
    fakeSupabase._emailNotifications.clear();
    fakeSupabase._notifications.length = 0;
    fakeSupabase._seedAppSettings("juridico_destinatarios", { emails: ["juridico@aquila.com.br"] });
  });

  const baseParams = {
    demandId: "demand-1",
    actionKey: "cadastro:demand-1",
    cliente: "Cliente Teste",
    demanda: "Demanda Teste",
    usuarioComercial: "Carla Comercial",
    tipoAtualizacao: "Nova demanda cadastrada",
    link: "https://app.exemplo.com/demandas/demand-1",
    createdBy: "user-1",
  };

  it("envia o e-mail e registra o log como 'enviado'", async () => {
    sendMailMock.mockResolvedValueOnce({});
    const result = await notifyJuridico(baseParams);

    expect(result).toEqual({ skipped: false, enviado: true });
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const row = fakeSupabase._emailNotifications.get("demand-1:cadastro:demand-1");
    expect(row?.status).toBe("enviado");
  });

  it("não envia duas vezes para a mesma ação (deduplicação por demand_id + action_key)", async () => {
    sendMailMock.mockResolvedValue({});

    await notifyJuridico(baseParams);
    const result = await notifyJuridico(baseParams);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ skipped: true, reason: "ja_enviado" });
  });

  it("permite notificações distintas para ações diferentes da mesma demanda", async () => {
    sendMailMock.mockResolvedValue({});

    await notifyJuridico(baseParams);
    await notifyJuridico({ ...baseParams, actionKey: "encaminhar:demand-1:2026-01-01T10:00" });

    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it("tenta reenviar após falha e registra o erro, até o limite de tentativas", async () => {
    sendMailMock.mockRejectedValue(new Error("Falha simulada de SMTP"));

    const result = await notifyJuridico(baseParams);

    expect(sendMailMock).toHaveBeenCalledTimes(MAX_EMAIL_ATTEMPTS);
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.enviado).toBe(false);
    }

    const row = fakeSupabase._emailNotifications.get("demand-1:cadastro:demand-1");
    expect(row?.status).toBe("falhou");
    expect(row?.tentativas).toBe(MAX_EMAIL_ATTEMPTS);

    // Informa o Comercial responsável sobre a falha no envio.
    expect(fakeSupabase._notifications).toHaveLength(1);
  }, 15000);

  it("registra falha explicativa quando não há destinatários configurados, sem tentar enviar", async () => {
    fakeSupabase._seedAppSettings("juridico_destinatarios", { emails: [] });

    const result = await notifyJuridico(baseParams);

    expect(result).toEqual({ skipped: true, reason: "sem_destinatarios" });
    expect(sendMailMock).not.toHaveBeenCalled();

    const row = fakeSupabase._emailNotifications.get("demand-1:cadastro:demand-1");
    expect(row?.status).toBe("falhou");
  });
});

describe("confirmação interna de envio da minuta", () => {
  beforeEach(() => {
    sendMailMock.mockReset();
    fakeSupabase._emailNotifications.clear();
    fakeSupabase._notifications.length = 0;
    fakeSupabase._seedAppSettings("minuta_confirmacao_interna", {
      emails: ["supervisao@aquila.com.br"],
      texto: "A minuta foi registrada como enviada ao cliente.",
    });
  });

  const baseParams = {
    demandId: "demand-2",
    actionKey: "minuta-confirmacao-interna:demand-2",
    cliente: "Cliente Teste",
    demanda: "Demanda Teste",
    destinatarioCliente: "responsavel@clienteteste.com.br",
    usuarioJuridico: "João Jurídico",
    link: "https://app.exemplo.com/demandas/demand-2",
    createdBy: "juridico-1",
  };

  it("envia o e-mail interno com o texto configurado e registra como 'enviado'", async () => {
    sendMailMock.mockResolvedValueOnce({});
    const result = await notifyMinutaConfirmacaoInterna(baseParams);

    expect(result).toEqual({ skipped: false, enviado: true });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][0].to).toEqual(["supervisao@aquila.com.br"]);
    expect(sendMailMock.mock.calls[0][0].html).toContain("A minuta foi registrada como enviada ao cliente.");

    const row = fakeSupabase._emailNotifications.get("demand-2:minuta-confirmacao-interna:demand-2");
    expect(row?.status).toBe("enviado");
  });

  it("não envia duas vezes para a mesma demanda (deduplicação)", async () => {
    sendMailMock.mockResolvedValue({});

    await notifyMinutaConfirmacaoInterna(baseParams);
    const result = await notifyMinutaConfirmacaoInterna(baseParams);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ skipped: true, reason: "ja_enviado" });
  });

  it("tenta reenviar após falha e registra internamente o erro", async () => {
    sendMailMock.mockRejectedValue(new Error("Falha simulada de SMTP"));

    const result = await notifyMinutaConfirmacaoInterna(baseParams);

    expect(sendMailMock).toHaveBeenCalledTimes(MAX_EMAIL_ATTEMPTS);
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.enviado).toBe(false);
    }

    const row = fakeSupabase._emailNotifications.get("demand-2:minuta-confirmacao-interna:demand-2");
    expect(row?.status).toBe("falhou");
    expect(fakeSupabase._notifications).toHaveLength(1);
  }, 15000);

  it("registra falha explicativa quando não há destinatários configurados", async () => {
    fakeSupabase._seedAppSettings("minuta_confirmacao_interna", { emails: [], texto: "" });

    const result = await notifyMinutaConfirmacaoInterna(baseParams);

    expect(result).toEqual({ skipped: true, reason: "sem_destinatarios" });
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
