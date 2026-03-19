export default function GridPreview({ screens = 0 }) {
  const count = Math.max(0, screens);
  const columns = Math.max(1, Math.min(count || 1, 8));

  return (
    <div className="text-left">
      <div className="mb-5 w-fit rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-xs font-medium text-[#6e6e73]">
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
            className="flex aspect-video items-center justify-center rounded-[20px] border border-[#c7dcf6] bg-white text-sm font-semibold text-[#0a84ff] shadow-[0_10px_24px_rgba(10,132,255,0.08)]"
          >
            {`S${index + 1}`}
          </div>
        ))}
      </div>
    </div>
  );
}
