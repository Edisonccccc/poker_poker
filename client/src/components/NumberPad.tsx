/** Big numeric keypad for one-handed money/count entry. Edits a digit string. */
export function NumberPad({
  value,
  onChange,
  maxLen = 7,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLen?: number;
}) {
  function press(d: string) {
    if (value.length >= maxLen) return;
    // avoid leading zeros
    onChange(value === "" ? (d === "0" ? "" : d) : value + d);
  }
  function backspace() {
    onChange(value.slice(0, -1));
  }

  const Key = ({ d }: { d: string }) => (
    <button
      onClick={() => press(d)}
      className="min-h-tap rounded-xl bg-white/10 py-4 text-2xl font-semibold active:bg-white/20"
    >
      {d}
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <Key key={d} d={d} />
      ))}
      <div />
      <Key d="0" />
      <button
        onClick={backspace}
        className="min-h-tap rounded-xl bg-white/10 py-4 text-xl font-semibold active:bg-white/20"
        aria-label="Backspace"
      >
        ⌫
      </button>
    </div>
  );
}
