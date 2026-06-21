import { roleEmoji, type ProfileRole } from "@/lib/format";

/** Emoji badges for a person's identities (player / dealer / host / admin). */
export function RoleBadges({
  roles,
  className = "",
}: {
  roles: string[];
  className?: string;
}) {
  if (!roles || roles.length === 0) return null;
  return (
    <span className={`inline-flex gap-0.5 ${className}`}>
      {roles.map((r) => (
        <span key={r} title={r} aria-label={r}>
          {roleEmoji[r as ProfileRole] ?? "•"}
        </span>
      ))}
    </span>
  );
}
