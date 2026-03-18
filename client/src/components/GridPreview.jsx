export default function GridPreview({ screens = 0 }) {
  const count = Math.max(0, screens);
  const columns = Math.max(1, Math.min(count || 1, 8));

  return (
    <div>
      <div className="mb-4 rounded-full border border-white/10 px-3 py-1 text-xs text-wall-muted w-fit">
        {count || 0} screens
      </div>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          minHeight: "62px"
        }}
      >
        {Array.from({ length: count || 1 }, (_, index) => (
          <div
            key={index}
            className={`flex aspect-video items-center justify-center rounded-2xl border border-white/10 text-sm font-medium transition ${
              "bg-white/[0.05] text-wall-text"
            }`}
          >
            {`S${index + 1}`}
          </div>
        ))}
      </div>
    </div>
  );
}
