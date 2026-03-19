import { Film, UploadCloud } from "lucide-react";

export default function UploadDropzone({
  disabled,
  dragActive,
  fileName,
  isUploading,
  progress,
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
      className={`group relative flex min-h-80 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[32px] border bg-[#fbfbfd] p-10 text-center transition duration-300 ${
        dragActive
          ? "border-[#0a84ff] bg-[#f0f7ff] shadow-[0_25px_60px_rgba(10,132,255,0.12)]"
          : "border-[#d2d2d7] hover:border-[#a1c9f5] hover:bg-white"
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
        onClick={(event) => {
          event.target.value = "";
        }}
        onChange={(event) => {
          onFileSelect(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="absolute inset-0 bg-grid bg-[size:40px_40px] opacity-[0.05]" />
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d6e8fb] to-transparent" />

      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#d6e8fb] bg-white shadow-[0_16px_40px_rgba(10,132,255,0.12)] transition duration-300 group-hover:scale-105">
        <UploadCloud className="h-9 w-9 text-[#0a84ff]" />
      </div>

      <div className="relative z-10 mt-6 space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">Upload your media</h2>
        <p className="mx-auto max-w-md text-sm leading-7 text-[#6e6e73]">
          Drag and drop an `.mp4`, `.png`, `.jpg`, or `.jpeg` file here. Files up to 2GB are supported.
        </p>
      </div>

      <div className="relative z-10 mt-8 flex items-center gap-3 rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-medium text-[#1d1d1f]">
        <Film className="h-4 w-4 text-[#0a84ff]" />
        <span>{fileName || "No file selected yet"}</span>
      </div>

      {isUploading && (
        <div className="relative z-10 mt-8 w-full max-w-md">
          <div className="flex items-center justify-between text-sm font-medium text-[#515154]">
            <span>Uploading media...</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e8e8ed]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #2f8cff 0%, #0a84ff 100%)"
              }}
            />
          </div>
        </div>
      )}
    </label>
  );
}
