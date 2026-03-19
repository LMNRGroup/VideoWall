import { getAssetUrl } from "../lib/api";

export default function GridPreview({ screens = 0, previews = [], previewSource = null }) {
  const count = Math.max(0, screens);
  const previewCount = previews.length;

  return (
    <div className="text-left">
      <div className="mb-5 w-fit rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-xs font-medium text-[#6e6e73]">
        {count || 0} screens
      </div>
      <div className="flex items-center gap-0 overflow-hidden">
        {Array.from({ length: count || 1 }, (_, index) => (
          <div key={index} className="min-w-0 flex-1">
            <div className="border border-[#101114] bg-[#0f1012] p-[3px] shadow-[0_8px_16px_rgba(0,0,0,0.14)]">
              <div className="relative aspect-video overflow-hidden bg-[#17181c]">
                {previewCount > 0 && previews[index] ? (
                  <img
                    alt={`Screen preview ${index + 1}`}
                    className="h-full w-full object-cover"
                    src={getAssetUrl(previews[index])}
                  />
                ) : previewSource ? (
                  <img
                    alt={`Preview layout ${index + 1}`}
                    className="absolute inset-0 h-full max-w-none object-cover"
                    src={previewSource}
                    style={{
                      width: `${count * 100}%`,
                      transform: `translateX(-${index * (100 / count)}%)`
                    }}
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
