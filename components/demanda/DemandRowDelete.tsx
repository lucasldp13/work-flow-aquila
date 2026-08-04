"use client";

import { useRouter } from "next/navigation";
import { DeleteDemandButton } from "./DeleteDemandButton";

export function DemandRowDelete({ demandId, demandName }: { demandId: string; demandName: string }) {
  const router = useRouter();
  return <DeleteDemandButton demandId={demandId} demandName={demandName} compact onDeleted={() => router.refresh()} />;
}
