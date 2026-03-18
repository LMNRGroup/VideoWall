export default function InvalidModal({ open, message, onCancel, onConfirm }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-[28px] border border-white/10 p-7 shadow-glow">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-wall-muted">Invalid Ratio</p>
        <h3 className="mt-3 text-2xl font-semibold text-wall-text">
          This video does not match standard video wall dimensions.
        </h3>
        <p className="mt-4 text-sm leading-6 text-wall-muted">{message}</p>

        <div className="mt-8 flex gap-3">
          <button
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-wall-text transition hover:bg-white/[0.08]"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-2xl bg-wall-text px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            type="button"
            onClick={onConfirm}
          >
            Auto-Fit
          </button>
        </div>
      </div>
    </div>
  );
}
