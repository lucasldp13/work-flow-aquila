import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "../StatusBadge";
import { formatDateTime } from "@/lib/utils/format";
import type { DemandDetailPayload } from "../types";

export function TimelineTab({ data }: { data: DemandDetailPayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-0">
          {data.history.map((item, index) => (
            <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
              {index !== data.history.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" />}
              <span className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand-600 bg-white" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.status_novo} />
                  <span className="text-xs text-slate-400">{formatDateTime(item.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Alterado por <span className="font-medium text-slate-800">{item.author?.name ?? "Sistema"}</span>
                </p>
                {item.justificativa && <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{item.justificativa}</p>}
              </div>
            </li>
          ))}
          {data.history.length === 0 && <p className="text-sm text-slate-400">Nenhum evento registrado ainda.</p>}
        </ol>
      </CardContent>
    </Card>
  );
}
