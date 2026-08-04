"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface ConsultorOption {
  id: string;
  nome: string;
  email: string;
  categoria: string | null;
}

interface ConsultorPickerProps {
  nome: string;
  email: string;
  categoria: string | null;
  onChange: (value: { nome: string; email: string; categoria: string | null }) => void;
}

// Autocomplete alimentado pela lista pré-cadastrada de consultores
// (nome, e-mail e categoria). Também permite digitar um consultor que
// ainda não esteja na lista.
export function ConsultorPicker({ nome, email, categoria, onChange }: ConsultorPickerProps) {
  const [query, setQuery] = useState(nome);
  const [results, setResults] = useState<ConsultorOption[]>([]);
  const [open, setOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const selecionado = Boolean(nome && email);

  useEffect(() => {
    if (selecionado || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/consultores?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.consultores ?? []));
    }, 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selecionado]);

  function selecionar(consultor: ConsultorOption) {
    onChange({ nome: consultor.nome, email: consultor.email, categoria: consultor.categoria });
    setQuery(consultor.nome);
    setOpen(false);
  }

  function limpar() {
    onChange({ nome: "", email: "", categoria: null });
    setQuery("");
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-1">
        <label className="text-sm font-medium text-slate-700">Consultor responsável</label>
        <span className="text-rose-500">*</span>
      </div>

      {selecionado ? (
        <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
          <div>
            <p className="font-medium text-slate-900">{nome}</p>
            <p className="text-xs text-slate-500">{email}</p>
          </div>
          <div className="flex items-center gap-2">
            {categoria && <Badge className="border-brand-300 bg-white text-brand-700">{categoria}</Badge>}
            <Button type="button" variant="ghost" size="sm" onClick={limpar}>
              Trocar
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Input
            placeholder="Digite o nome do consultor…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && results.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selecionar(c)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span>
                    <p className="font-medium text-slate-800">{c.nome}</p>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </span>
                  {c.categoria && <span className="shrink-0 text-xs text-slate-400">{c.categoria}</span>}
                </button>
              ))}
            </div>
          )}
          {open && query.trim().length >= 2 && results.length === 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500 shadow-lg">
              Nenhum consultor encontrado na lista. Preencha o e-mail manualmente para usar &quot;{query}&quot;.
              <div className="mt-2 space-y-2">
                <Input placeholder="E-mail do consultor" type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
                <Button
                  type="button"
                  size="sm"
                  disabled={!manualEmail.trim()}
                  onClick={() => {
                    onChange({ nome: query.trim(), email: manualEmail.trim(), categoria: null });
                    setManualEmail("");
                    setOpen(false);
                  }}
                >
                  Usar este consultor
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
