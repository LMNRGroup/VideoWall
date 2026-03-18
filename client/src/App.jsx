import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, LoaderCircle, Sparkles, Wand2 } from "lucide-react";
import GridPreview from "./components/GridPreview";
import InvalidModal from "./components/InvalidModal";
import StatusBadge from "./components/StatusBadge";
import UploadDropzone from "./components/UploadDropzone";
import { getDownloadUrl, processVideo, uploadVideo } from "./lib/api";

const INITIAL_STATE = {
  uploadId: null,
  originalName: "",
  fileName: "",
  metadata: null,
  validation: null,
  job: null
};

function formatDimensions(metadata) {
  if (!metadata) {
    return "Awaiting upload";
  }

  return `${metadata.width}x${metadata.height}`;
}

function formatDetection(validation) {
  if (!validation) {
    return "Upload an MP4 to detect your screen layout.";
  }

  return `Detected: ${validation.screens} Screen Video Wall (${validation.targetWidth}x${validation.targetHeight})`;
}

function getStatusTone(validation) {
  if (!validation) {
    return "ready";
  }

  return validation.status;
}

export default function App() {
  const [appState, setAppState] = useState(INITIAL_STATE);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current);
      }
    };
  }, []);

  async function handleFileSelect(file) {
    if (!file) {
      return;
    }

    setErrorMessage("");
    setIsUploading(true);
    setModalOpen(false);
    setProgress(0);

    try {
      const data = await uploadVideo(file);
      setAppState({
        uploadId: data.uploadId,
        originalName: data.originalName,
        fileName: data.originalName,
        metadata: data.metadata,
        validation: data.validation,
        job: null
      });
    } catch (error) {
      setAppState(INITIAL_STATE);
      setErrorMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  function beginProgress() {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
    }

    setProgress(8);
    progressTimer.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return current;
        }

        return current + Math.max(1, Math.round((92 - current) / 8));
      });
    }, 320);
  }

  function completeProgress() {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }

    setProgress(100);
  }

  async function runProcessing(autoFit = false) {
    if (!appState.uploadId || !appState.validation) {
      return;
    }

    setModalOpen(false);
    setErrorMessage("");
    setIsProcessing(true);
    beginProgress();

    try {
      const data = await processVideo({
        uploadId: appState.uploadId,
        originalName: appState.originalName,
        autoFit
      });

      completeProgress();
      setAppState((current) => ({
        ...current,
        validation: data.validation,
        job: data.job
      }));
    } catch (error) {
      setErrorMessage(error.message);
      setProgress(0);
    } finally {
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      setIsProcessing(false);
    }
  }

  function handleGenerate() {
    if (!appState.validation) {
      return;
    }

    if (appState.validation.needsAutoFit && appState.validation.status === "invalid") {
      setModalOpen(true);
      return;
    }

    runProcessing(false);
  }

  const downloadUrl = getDownloadUrl(appState.job?.downloadUrl);
  const statusTone = getStatusTone(appState.validation);

  return (
    <div className="min-h-screen bg-wall-bg text-wall-text">
      <InvalidModal
        message={appState.validation?.message}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={() => runProcessing(true)}
      />

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-8 flex items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-[0.26em] text-wall-muted">Luminar Apps</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Video Wall Optimizer</h1>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-wall-muted md:flex">
            <Sparkles className="h-4 w-4 text-wall-accent" />
            Premium Processing
          </div>
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_360px]">
          <section className="space-y-6">
            <div className="glass rounded-[32px] border border-white/10 p-5 shadow-glow sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-wall-muted">Step 1</p>
                  <h2 className="mt-2 text-2xl font-semibold">Upload</h2>
                </div>
                {(isUploading || isProcessing) && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-wall-muted">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {isUploading ? "Uploading..." : "Processing..."}
                  </div>
                )}
              </div>

              <UploadDropzone
                disabled={isUploading || isProcessing}
                dragActive={dragActive}
                fileName={appState.fileName}
                onDragStateChange={setDragActive}
                onFileSelect={handleFileSelect}
              />
            </div>

            <div className="glass rounded-[32px] border border-white/10 p-6 shadow-glow">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm uppercase tracking-[0.22em] text-wall-muted">Step 2</p>
                  <h3 className="mt-3 text-lg font-semibold text-wall-text">Detection</h3>
                  <p className="mt-4 text-sm leading-6 text-wall-muted">{formatDetection(appState.validation)}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/40">
                    Source: {formatDimensions(appState.metadata)}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm uppercase tracking-[0.22em] text-wall-muted">Step 3</p>
                  <h3 className="mt-3 text-lg font-semibold text-wall-text">Status</h3>
                  <div className="mt-4">
                    <StatusBadge status={statusTone} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-wall-muted">
                    {appState.validation?.message || "Drop a file to run layout validation and optimization checks."}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm uppercase tracking-[0.22em] text-wall-muted">Step 4</p>
                  <h3 className="mt-3 text-lg font-semibold text-wall-text">Action</h3>
                  <button
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-wall-text px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!appState.validation || isUploading || isProcessing}
                    type="button"
                    onClick={handleGenerate}
                  >
                    <Wand2 className="h-4 w-4" />
                    Generate Video Wall
                  </button>
                  <p className="mt-4 text-sm leading-6 text-wall-muted">
                    Sequential FFmpeg slicing with automatic scaling, optional auto-fit, and ZIP packaging.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="glass rounded-[32px] border border-white/10 p-6 shadow-glow">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-wall-muted">Step 5</p>
                  <h3 className="mt-2 text-xl font-semibold text-wall-text">Processing</h3>
                  <p className="mt-3 text-sm leading-6 text-wall-muted">
                    {isProcessing
                      ? "Processing video..."
                      : appState.job
                        ? "Processing complete."
                        : "Your ZIP export will be generated automatically after slicing."}
                  </p>
                </div>

                {appState.job && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    Ready
                  </div>
                )}
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${isProcessing ? "progress-shimmer" : "bg-white/80"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-wall-muted">Step 6</p>
                  <h3 className="mt-2 text-xl font-semibold text-wall-text">Download</h3>
                  <p className="mt-2 text-sm text-wall-muted">
                    {appState.job?.zipName || "ZIP file name will appear here after processing."}
                  </p>
                </div>

                <a
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                    downloadUrl
                      ? "bg-wall-text text-black hover:opacity-90"
                      : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/40"
                  }`}
                  href={downloadUrl || "#"}
                >
                  <Download className="h-4 w-4" />
                  Download ZIP
                </a>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <GridPreview screens={appState.validation?.screens || 0} />

            <div className="glass rounded-[28px] border border-white/10 p-6 shadow-glow">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-wall-muted">Best Results</p>
              <div className="mt-5 space-y-4 text-sm leading-6 text-wall-muted">
                <p>2 screens {"->"} 3840x1080</p>
                <p>4 screens {"->"} 7680x1080</p>
                <p>8 screens {"->"} 15360x1080</p>
              </div>
            </div>
          </aside>
        </main>

        <footer className="pt-8 text-center text-sm text-wall-muted">© 2026 Luminar Apps</footer>
      </div>
    </div>
  );
}
