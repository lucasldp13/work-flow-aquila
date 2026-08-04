"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/api/fetcher";

interface DeleteDemandButtonProps {
  demandId: string;
  demandName: string;
  onDeleted: () => void;
  compact?: boolean;
}

// Exclusão definitiva de uma demanda — visível apenas para Administrador.
// Confirmação em duas etapas (sem depender de window.confirm) para evitar
// exclusões acidentais.
export function DeleteDemandButton({ demandId, demandName, onDeleted, compact = false }: DeleteDemandButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${demandId}`, { method: "DELETE" });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao excluir a demanda.");
      return;
    }
    onDeleted();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {!compact && <span className="text-xs font-medium text-rose-700">Excluir &quot;{demandName}&quot;?</span>}
        <Button variant="danger" size="sm" onClick={handleConfirm} loading={loading}>
          Confirmar exclusão
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={loading} aria-label="Cancelar">
          <X className="h-3.5 w-3.5" />
        </Button>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    );
  }

  return (
    <Button
      variant={compact ? "ghost" : "danger"}
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        setConfirming(true);
      }}
      aria-label="Excluir demanda"
      title="Excluir demanda"
    >
      <Trash2 className={compact ? "h-4 w-4 text-rose-500" : "h-3.5 w-3.5"} />
      {!compact && "Excluir demanda"}
    </Button>
  );
}
