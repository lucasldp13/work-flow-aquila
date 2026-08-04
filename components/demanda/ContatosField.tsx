"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2 } from "lucide-react";

export interface ContatoFormValue {
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
}

export function ContatosField({ value, onChange }: { value: ContatoFormValue[]; onChange: (v: ContatoFormValue[]) => void }) {
  function updateContato(index: number, field: keyof ContatoFormValue, val: string) {
    const next = value.map((c, i) => (i === index ? { ...c, [field]: val } : c));
    onChange(next);
  }

  function addContato() {
    onChange([...value, { nome: "", cargo: "", email: "", telefone: "" }]);
  }

  function removeContato(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">Contatos do cliente</label>
        <Button type="button" size="sm" variant="outline" onClick={addContato}>
          <Plus className="h-3.5 w-3.5" /> Adicionar contato
        </Button>
      </div>
      {value.length === 0 && <p className="text-xs text-slate-400">Nenhum contato adicionado.</p>}
      <div className="space-y-3">
        {value.map((contato, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input placeholder="Nome" value={contato.nome} onChange={(e) => updateContato(index, "nome", e.target.value)} />
            <Input placeholder="Cargo" value={contato.cargo} onChange={(e) => updateContato(index, "cargo", e.target.value)} />
            <Input placeholder="E-mail" type="email" value={contato.email} onChange={(e) => updateContato(index, "email", e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder="Telefone" value={contato.telefone} onChange={(e) => updateContato(index, "telefone", e.target.value)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeContato(index)} aria-label="Remover contato">
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
