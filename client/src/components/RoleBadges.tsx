import { roleMeta, type ProfileRole } from "@/lib/format";

/**
 * Identity badges. `variant="initial"` renders compact color-coded letter chips
 * (P/D/H/A) for tight spots; `variant="label"` renders full pill labels.
 */
export function RoleBadges({
  roles,
  variant = "initial",
  className = "",
}: {
  roles: string[];
  variant?: "initial" | "label";
  className?: string;
}) {
  const valid = (roles ?? []).filter((r): r is ProfileRole => r in roleMeta);
  if (valid.length === 0) return null;

  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {valid.map((r) => {
        const m = roleMeta[r];
        return variant === "label" ? (
          <span
            key={r}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}
          >
            {m.label}
          </span>
        ) : (
          <span
            key={r}
            title={m.label}
            className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ring-1 ring-white/70 ${m.cls}`}
          >
            {m.initial}
          </span>
        );
      })}
    </span>
  );
}
