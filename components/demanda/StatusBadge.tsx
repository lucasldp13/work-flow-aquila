import { Badge } from "@/components/ui/Badge";
import { STATUS_LABELS, statusBadgeColor } from "@/lib/workflow/statuses";
import type { DemandStatus } from "@/types/database";

export function StatusBadge({ status }: { status: DemandStatus }) {
  return <Badge className={statusBadgeColor(status)}>{STATUS_LABELS[status]}</Badge>;
}
