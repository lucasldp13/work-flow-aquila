"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { SOLUCOES_DISPONIVEIS } from "@/lib/workflow/solucoes";
import { X } from "lucide-react";

interface SolucaoPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
}

// Seletor com busca das soluções pré-cadastradas da Aquila. Uma demanda
// pode combinar mais de uma solução — cada uma escolhida vira um chip
// removível.
export function SolucaoPicker({ value, onChange }: SolucaoPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const opcoes = useMemo(() => {
    const disponiveis = SOLUCOES_DISPONIVEIS.filter((s) => !value.includes(s));
    if (!query.trim()) return disponiveis.slice(0, 30);
    const termo = query.trim().toLowerCase();
    return disponiveis.filter((s) => s.toLowerCase().includes(termo)).slice(0, 30);
  }, [query, value]);

  function adicionar(solucao: string) {
    onChange([...value, solucao]);
    setQuery("");
  }

  function remover(solucao: string) {
    onChange(value.filter((s) => s !== solucao));
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Solução</label>

      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((s) => (
            <Badge key={s} className="gap-1.5 border-brand-200 bg-brand-50 text-brand-800">
              {s}
              <button type="button" onClick={() => remover(s)} aria-label={`Remover ${s}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar solução…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {open && opcoes.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {opcoes.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => adicionar(s)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">Pode selecionar mais de uma solução.</p>
    </div>
  );
}
