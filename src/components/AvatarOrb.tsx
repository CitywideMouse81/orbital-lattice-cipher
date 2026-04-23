import { cn } from "@/lib/utils";

interface AvatarOrbProps {
  hue: number;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export function AvatarOrb({ hue, name, size = "md", online, className }: AvatarOrbProps) {
  const initials = name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const bg = `linear-gradient(135deg, hsl(${hue} 90% 65%), hsl(${(hue + 40) % 360} 90% 55%))`;
  const ring = `0 0 0 1px hsl(${hue} 60% 50% / 0.25), 0 8px 24px -8px hsl(${hue} 80% 50% / 0.45)`;

  return (
    <div className={cn("relative inline-flex", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-display font-semibold text-white",
          SIZES[size],
        )}
        style={{ background: bg, boxShadow: ring }}
        aria-hidden
      >
        {initials || "?"}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full border-2 border-background",
            size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5",
            online ? "bg-emerald-400" : "bg-muted-foreground/40",
          )}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}
