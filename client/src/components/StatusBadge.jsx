const STYLES = {
  ready: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  invalid: "border-rose-400/20 bg-rose-400/10 text-rose-200"
};

const LABELS = {
  ready: "Ready to Generate",
  warning: "Warning",
  invalid: "Invalid"
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${
        STYLES[status] || STYLES.ready
      }`}
    >
      {status === "ready" ? "OK" : status === "warning" ? "!" : "X"} {LABELS[status]}
    </span>
  );
}
