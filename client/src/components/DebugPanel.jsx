import { ChevronDown, ChevronUp, X } from "lucide-react";

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export default function DebugPanel({ entries, expandedIds, onClose, onToggle }) {
  if (!entries.length) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-full max-w-md space-y-3">
      {entries.map((entry) => {
        const expanded = expandedIds.includes(entry.id);

        return (
          <div
            key={entry.id}
            className="overflow-hidden rounded-[22px] border border-[#e6b9be] bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#f3d7da] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#b42318]">{entry.title}</p>
                <p className="mt-1 text-xs text-[#8a8a90]">{formatTime(entry.timestamp)}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1 rounded-full bg-[#fff2f4] px-3 py-1 text-xs font-medium text-[#b42318] transition hover:bg-[#fde7ea]"
                  type="button"
                  onClick={() => onToggle(entry.id)}
                >
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                  {expanded ? "Collapse" : "Expand"}
                </button>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8a8a90] transition hover:bg-[#f5f5f7] hover:text-[#3a3a3c]"
                  type="button"
                  onClick={() => onClose(entry.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-4 py-3">
              <p className="text-sm leading-6 text-[#515154]">{entry.message}</p>

              {expanded && (
                <div className="mt-3 rounded-[16px] bg-[#f5f5f7] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8a90]">Details</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#515154]">
                    {entry.details}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
