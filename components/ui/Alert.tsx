import { cn } from "@/lib/utils/cn";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type Variant = "info" | "success" | "warning" | "error";

const VARIANT_CLASSES: Record<Variant, string> = {
  info: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  error: "bg-rose-50 text-rose-800 border-rose-200",
};

const ICONS: Record<Variant, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export function Alert({ variant = "info", title, children, className }: { variant?: Variant; title?: string; children?: React.ReactNode; className?: string }) {
  const Icon = ICONS[variant];
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", VARIANT_CLASSES[variant], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}
