"use client";

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  pendencias?: string[];
}

export async function apiRequest<T = unknown>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    });

    if (res.status === 401) {
      // Sessão expirada ou inválida: manda de volta para o login em vez de
      // deixar a tela em um estado inconsistente (dados vazios, erro
      // genérico) sem explicar o motivo ao usuário.
      if (typeof window !== "undefined") {
        const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?redirectTo=${redirectTo}`;
      }
      return { ok: false, error: "Sua sessão expirou. Faça login novamente." };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Ocorreu um erro inesperado.", pendencias: data.pendencias };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Falha de conexão com o servidor." };
  }
}
