"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCnpj } from "@/lib/workflow/validations";

export interface ClientOption {
  id: string;
  name: string;
  cnpj: string;
}

interface ClientPickerProps {
  selected: ClientOption | null;
  onSelect: (client: ClientOption | null) => void;
  newClientName: string;
  newClientCnpj: string;
  onNewClientChange: (name: string, cnpj: string) => void;
}

export function ClientPicker({ selected, onSelect, newClientName, newClientCnpj, onNewClientChange }: ClientPickerProps) {
  const [mode, setMode] = useState<"existente" | "novo">("existente");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (mode !== "existente" || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/clients?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.clients ?? []));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, mode]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <label className="font-medium text-slate-700">Cliente</label>
        <span className="text-rose-500">*</span>
        <div className="ml-auto flex gap-1 rounded-lg bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => {
              setMode("existente");
              onNewClientChange("", "");
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${mode === "existente" ? "bg-white shadow-sm" : "text-slate-500"}`}
          >
            Cliente existente
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("novo");
              onSelect(null);
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${mode === "novo" ? "bg-white shadow-sm" : "text-slate-500"}`}
          >
            Novo cliente
          </button>
        </div>
      </div>

      {mode === "existente" ? (
        <div className="relative">
          {selected ? (
            <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">{selected.name}</p>
                <p className="text-xs text-slate-500">{formatCnpj(selected.cnpj)}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
                Trocar
              </Button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Buscar por nome ou CNPJ…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
              />
              {open && results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                  {results.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        onSelect(client);
                        setOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <p className="font-medium text-slate-800">{client.name}</p>
                      <p className="text-xs text-slate-500">{formatCnpj(client.cnpj)}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input placeholder="Razão social" value={newClientName} onChange={(e) => onNewClientChange(e.target.value, newClientCnpj)} />
          <Input
            placeholder="CNPJ"
            value={newClientCnpj}
            onChange={(e) => onNewClientChange(newClientName, formatCnpj(e.target.value))}
          />
        </div>
      )}
    </div>
  );
}
