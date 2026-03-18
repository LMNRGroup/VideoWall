import { Film, UploadCloud } from "lucide-react";

export default function UploadDropzone({
  disabled,
  dragActive,
  fileName,
  onDragStateChange,
  onFileSelect
}) {
  function handleDrop(event) {
    event.preventDefault();
    onDragStateChange(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }

  return (
    <label
      className={`group relative flex min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center transition duration-300 ${
        dragActive ? "border-white/30 bg-white/[0.06]" : "hover:border-white/20 hover:bg-white/[0.04]"
      } ${disabled ? "pointer-events-none opacity-70" : ""}`}
      onDragEnter={() => onDragStateChange(true)}
      onDragOver={(event) => {
        event.preventDefault();
        onDragStateChange(true);
      }}
      onDragLeave={() => onDragStateChange(false)}
      onDrop={handleDrop}
    >
      <input
        accept=".mp4,.png,.jpg,.jpeg,video/mp4,image/png,image/jpeg"
        className="hidden"
        disabled={disabled}
        type="file"
        onChange={(event) => onFileSelect(event.target.files?.[0])}
      />

      <div className="absolute inset-0 bg-grid bg-[size:42px_42px] opacity-25" />
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-glow transition duration-300 group-hover:scale-105">
        <UploadCloud className="h-8 w-8 text-wall-accent" />
      </div>

      <div className="relative z-10 mt-6 space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-wall-text">Upload your media</h2>
        <p className="mx-auto max-w-md text-sm leading-6 text-wall-muted">
          Drag and drop an `.mp4`, `.png`, `.jpg`, or `.jpeg` file here. Files up to 2GB are supported.
        </p>
      </div>

      <div className="relative z-10 mt-8 flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-wall-text">
        <Film className="h-4 w-4 text-wall-accent" />
        <span>{fileName || "No file selected yet"}</span>
      </div>
    </label>
  );
}
