export function PlaceholderPage({
  title,
  milestone,
}: {
  title: string;
  milestone: string;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="rounded-2xl bg-white/5 p-5 text-sm text-white/60">
        Coming in {milestone}. See{" "}
        <span className="font-mono text-white/70">docs/05-build-plan.md</span>.
      </div>
    </div>
  );
}
