import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Download, LoaderCircle, RotateCcw, Wand2 } from "lucide-react";
import GridPreview from "./components/GridPreview";
import InvalidModal from "./components/InvalidModal";
import UploadDropzone from "./components/UploadDropzone";
import { deleteUpload, getDownloadUrl, processVideo, uploadVideo } from "./lib/api";

const INITIAL_STATE = {
  uploadId: null,
  originalName: "",
  fileName: "",
  mediaKind: null,
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
    return "Upload a video or image to detect your screen layout.";
  }

  return `Detected: ${validation.screens} Screen Video Wall (${validation.targetWidth}x${validation.targetHeight})`;
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
        mediaKind: data.mediaKind,
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

  async function resetFlow({ removeRemoteUpload = false } = {}) {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }

    const uploadId = appState.uploadId;

    setAppState(INITIAL_STATE);
    setDragActive(false);
    setIsUploading(false);
    setIsProcessing(false);
    setModalOpen(false);
    setErrorMessage("");
    setProgress(0);

    if (removeRemoteUpload && uploadId) {
      try {
        await deleteUpload(uploadId);
      } catch (_error) {
        // Ignore cleanup errors during reset.
      }
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
        mediaKind: data.mediaKind || current.mediaKind,
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
  const showLanding = !appState.validation && !isProcessing && !appState.job;
  const showReadyToGenerate = !!appState.validation && !isProcessing && !appState.job;
  const showProcessing = isProcessing;
  const showExport = !!appState.job && !isProcessing;

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
        </header>

        <main className="flex flex-1 items-center justify-center">
          <section className="w-full max-w-5xl space-y-6">
            {(showLanding || showReadyToGenerate) && (
              <div className="glass rounded-[36px] border border-white/10 p-6 shadow-glow sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-wall-muted">Upload Media</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-wall-text">
                      {showReadyToGenerate ? "Ready to generate your video wall" : "Start with one media file"}
                    </h2>
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

                {appState.validation && (
                  <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                    <p className="text-sm uppercase tracking-[0.22em] text-wall-muted">Detected Layout</p>
                    <h3 className="mt-3 text-2xl font-semibold text-wall-text">{formatDetection(appState.validation)}</h3>
                    <p className="mt-3 text-sm leading-6 text-wall-muted">
                      {appState.validation.message}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/40">
                      Source: {formatDimensions(appState.metadata)}
                      {appState.mediaKind ? ` • ${appState.mediaKind}` : ""}
                    </p>

                    <div className="mt-6 flex gap-3">
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-wall-text transition hover:bg-white/[0.08]"
                        type="button"
                        onClick={() => resetFlow({ removeRemoteUpload: true })}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-wall-text px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isUploading || isProcessing}
                        type="button"
                        onClick={handleGenerate}
                      >
                        <Wand2 className="h-4 w-4" />
                        Generate Video Wall
                      </button>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            )}

            {showProcessing && (
              <div className="glass rounded-[36px] border border-white/10 p-8 shadow-glow">
                <p className="text-sm uppercase tracking-[0.24em] text-wall-muted">Generating</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-wall-text">Processing your video wall</h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-wall-muted">
                  Keep this page open while your media is optimized, sliced, and prepared for export.
                </p>

                <div className="mt-8 h-4 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background:
                        "linear-gradient(90deg, rgba(117,88,255,0.95) 0%, rgba(171,92,255,0.95) 50%, rgba(223,111,255,0.95) 100%)"
                    }}
                  />
                </div>

                <p className="mt-4 text-sm text-wall-muted">{progress}% complete</p>
              </div>
            )}

            {showExport && (
              <div className="glass rounded-[36px] border border-white/10 p-8 shadow-glow">
                <p className="text-sm uppercase tracking-[0.24em] text-wall-muted">Export Ready</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-wall-text">Your video wall is ready</h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-wall-muted">
                  Review the detected screen layout and export the ZIP package to your computer.
                </p>

                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                    <p className="text-sm uppercase tracking-[0.22em] text-wall-muted">Screen Preview</p>
                    <h3 className="mt-3 text-2xl font-semibold text-wall-text">
                      {formatDetection(appState.validation)}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-wall-muted">
                      {appState.job.zipName}
                    </p>
                    <div className="mt-6">
                      <GridPreview screens={appState.validation?.screens || 0} />
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                    <p className="text-sm uppercase tracking-[0.22em] text-wall-muted">Export</p>
                    <h3 className="mt-3 text-2xl font-semibold text-wall-text">Download ZIP</h3>
                    <p className="mt-3 text-sm leading-6 text-wall-muted">
                      The package is temporary and will be cleaned up after download or expiry.
                    </p>

                    <div className="mt-6 flex flex-col gap-3">
                      <a
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-wall-text px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                        href={downloadUrl}
                      >
                        <Download className="h-4 w-4" />
                        Export Video Wall
                      </a>

                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-wall-text transition hover:bg-white/[0.08]"
                        type="button"
                        onClick={() => resetFlow()}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Generate Another Video Wall
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(showLanding || showReadyToGenerate) && (
              <div className="glass rounded-[28px] border border-white/10 p-6 shadow-glow">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-wall-muted">Best Results</p>
              <div className="mt-5 space-y-4 text-sm leading-6 text-wall-muted">
                <p>2 screens {"->"} 3840x1080</p>
                <p>4 screens {"->"} 7680x1080</p>
                <p>8 screens {"->"} 15360x1080</p>
              </div>
              </div>
            )}
          </section>
        </main>

        <footer className="pt-8 text-center text-xs text-wall-muted">© 2026 Luminar Apps Puerto Rico</footer>
      </div>
    </div>
  );
}
