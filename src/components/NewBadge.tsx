import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Label kecil "Baru" untuk model AI yang baru ditambahkan. */
export function NewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary/25 via-primary/10 to-transparent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary ring-1 ring-inset ring-primary/30",
        className,
      )}
    >
      <Sparkles className="size-3" />
      Baru
    </span>
  );
}
