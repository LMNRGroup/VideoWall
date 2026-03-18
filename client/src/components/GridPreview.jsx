export default function GridPreview({ screens = 0 }) {
  const count = Math.max(0, screens);
  const columns = count >= 8 ? 4 : Math.min(count || 1, 4);
  const rows = Math.max(1, Math.ceil(count / columns));

  return (
    <div className="glass rounded-[28px] border border-white/10 p-6 shadow-glow">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-wall-muted">Wall Preview</p>
          <h3 className="mt-2 text-xl font-semibold text-wall-text">Screen Layout</h3>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-wall-muted">
          {count || 0} screens
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          minHeight: `${rows * 82}px`
        }}
      >
        {Array.from({ length: count || 4 }, (_, index) => (
          <div
            key={index}
            className={`flex aspect-video items-center justify-center rounded-2xl border border-white/10 text-sm font-medium transition ${
              index < count
                ? "bg-white/[0.05] text-wall-text"
                : "border-dashed border-white/5 bg-white/[0.02] text-transparent"
            }`}
          >
            {index < count ? `S${index + 1}` : " "}
          </div>
        ))}
      </div>
    </div>
  );
}
