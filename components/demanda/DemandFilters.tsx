"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";
import { STATUS_LABELS } from "@/lib/workflow/statuses";
import { Search } from "lucide-react";

export function DemandFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          updateParam("q", q);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar por demanda ou consultor…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <Select className="sm:w-64" defaultValue={searchParams.get("status") ?? ""} onChange={(e) => updateParam("status", e.target.value)}>
        <option value="">Todos os status</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );
}
