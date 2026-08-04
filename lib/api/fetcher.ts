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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Ocorreu um erro inesperado.", pendencias: data.pendencias };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Falha de conexão com o servidor." };
  }
}
