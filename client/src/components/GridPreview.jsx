import { getAssetUrl } from "../lib/api";

export default function GridPreview({ screens = 0, previews = [] }) {
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
          <div key={index} className="mx-auto w-full max-w-[82px]">
            <div className="rounded-[18px] bg-[#0f1012] p-[5px] shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
              <div className="aspect-[9/16] overflow-hidden rounded-[14px] bg-[#18191d]">
                {previews[index] ? (
                  <img
                    alt={`Screen preview ${index + 1}`}
                    className="h-full w-full object-cover"
                    src={getAssetUrl(previews[index])}
                  />
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(180deg,#2f3137_0%,#17181c_100%)]" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
