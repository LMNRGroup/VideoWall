import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Download, LoaderCircle, RotateCcw, Wand2 } from "lucide-react";
import GridPreview from "./components/GridPreview";
import InvalidModal from "./components/InvalidModal";
import UploadDropzone from "./components/UploadDropzone";
import { deleteUpload, getDownloadUrl, getJobStatus, processVideo, uploadVideo } from "./lib/api";

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
    return "";
  }

  return `${validation.screens} screen layout detected`;
}

export default function App() {
  const [appState, setAppState] = useState(INITIAL_STATE);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);
  const pollingTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current);
      }
      if (pollingTimer.current) {
        window.clearTimeout(pollingTimer.current);
      }
    };
  }, []);

  async function handleFileSelect(file) {
    if (!file) {
      return;
    }

    setErrorMessage("");
    setIsUploading(true);
    setUploadProgress(0);
    setModalOpen(false);
    setProgress(0);

    try {
      const data = await uploadVideo(file, setUploadProgress);
      setUploadProgress(100);
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
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }

  async function resetFlow({ removeRemoteUpload = false } = {}) {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    if (pollingTimer.current) {
      window.clearTimeout(pollingTimer.current);
      pollingTimer.current = null;
    }

    const uploadId = appState.uploadId;

    setAppState(INITIAL_STATE);
    setDragActive(false);
    setIsUploading(false);
    setUploadProgress(0);
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

    setProgress(9);
    progressTimer.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 97) {
          return current;
        }

        return current + Math.max(1, Math.round((97 - current) / 10));
      });
    }, 280);
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
      setAppState((current) => ({
        ...current,
        validation: data.validation,
        mediaKind: data.mediaKind || current.mediaKind,
        job: data.job
      }));
      pollJob(data.job.id);
    } catch (error) {
      setErrorMessage(error.message);
      setProgress(0);
      setIsProcessing(false);
    }
  }

  async function pollJob(jobId) {
    try {
      const data = await getJobStatus(jobId);

      if (data.job.status === "completed") {
        if (pollingTimer.current) {
          window.clearTimeout(pollingTimer.current);
          pollingTimer.current = null;
        }
        completeProgress();
        setIsProcessing(false);
        setAppState((current) => ({
          ...current,
          validation: data.validation,
          mediaKind: data.mediaKind || current.mediaKind,
          job: data.job
        }));
        return;
      }

      if (data.job.status === "failed") {
        if (pollingTimer.current) {
          window.clearTimeout(pollingTimer.current);
          pollingTimer.current = null;
        }
        if (progressTimer.current) {
          window.clearInterval(progressTimer.current);
          progressTimer.current = null;
        }
        setProgress(0);
        setErrorMessage(data.job.error || "Processing failed.");
        setIsProcessing(false);
        setAppState((current) => ({
          ...current,
          job: null
        }));
        return;
      }

      pollingTimer.current = window.setTimeout(() => {
        setProgress((current) => (current < 99 ? current + 1 : current));
        pollJob(jobId);
      }, 1500);
    } catch (error) {
      if (pollingTimer.current) {
        window.clearTimeout(pollingTimer.current);
        pollingTimer.current = null;
      }
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      setProgress(0);
      setErrorMessage(error.message || "Processing status could not be checked.");
      setIsProcessing(false);
      setAppState((current) => ({
        ...current,
        job: null
      }));
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
  const showDetected = !!appState.validation && !isProcessing && !appState.job;
  const showProcessing = isProcessing;
  const showExport = !!appState.job && !isProcessing;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#3a3a3c]">
      <InvalidModal
        message={appState.validation?.message}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={() => runProcessing(true)}
      />

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex justify-center py-5">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.42em] text-[#8e8e93]">Luminar Apps</p>
            <h1 className="mt-4 bg-[linear-gradient(180deg,#70c1ff_0%,#0a84ff_48%,#005fcc_100%)] bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
              LumosDS
            </h1>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center">
          <section className="w-full max-w-4xl">
            {showLanding && (
              <div className="space-y-6">
                <div className="rounded-[40px] border border-[#d2d2d7] bg-white p-8 shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-10">
                  <div className="mx-auto max-w-2xl text-center">
                    <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#3a3a3c] sm:text-5xl">
                      Create a Video Wall.
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#6e6e73]">
                      Upload one video or image and the system will detect the wall layout, slice every screen, and
                      prepare a ZIP export.
                    </p>
                  </div>

                  <div className="mx-auto mt-10 max-w-2xl">
                    <UploadDropzone
                      disabled={isUploading}
                      dragActive={dragActive}
                      fileName={appState.fileName}
                      isUploading={isUploading}
                      progress={uploadProgress}
                      onDragStateChange={setDragActive}
                      onFileSelect={handleFileSelect}
                    />
                  </div>

                  {errorMessage && (
                    <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-[28px] border border-[#f5c2c7] bg-[#fff2f4] p-4 text-sm text-[#b42318]">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-[32px] border border-[#d2d2d7] bg-white px-8 py-7 text-center shadow-[0_18px_48px_rgba(0,0,0,0.06)]">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#6e6e73]">Best Results</p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-[#6e6e73]">
                    <span className="rounded-full bg-[#f5f5f7] px-4 py-2">2 screens {"->"} 3840x1080</span>
                    <span className="rounded-full bg-[#f5f5f7] px-4 py-2">4 screens {"->"} 7680x1080</span>
                    <span className="rounded-full bg-[#f5f5f7] px-4 py-2">8 screens {"->"} 15360x1080</span>
                  </div>
                </div>
              </div>
            )}

            {showDetected && (
              <div className="rounded-[40px] border border-[#d2d2d7] bg-white p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-12">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#6e6e73]">Detected Layout</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#3a3a3c] sm:text-5xl">
                  {formatDetection(appState.validation)}
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#515154]">
                  {appState.validation?.message}
                </p>
                <div className="mt-6 text-sm font-medium text-[#6e6e73]">
                  {formatDimensions(appState.metadata)}
                  {appState.mediaKind ? ` • ${appState.mediaKind}` : ""}
                </div>

                <div className="mx-auto mt-10 max-w-2xl rounded-[32px] bg-[#f5f5f7] p-6">
                  <GridPreview screens={appState.validation?.screens || 0} />
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-sm font-semibold text-[#3a3a3c] transition hover:bg-[#f5f5f7]"
                    type="button"
                    onClick={() => resetFlow({ removeRemoteUpload: true })}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(0,113,227,0.25)] transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:bg-[#7ab8f5]"
                    disabled={isProcessing}
                    type="button"
                    onClick={handleGenerate}
                  >
                    <Wand2 className="h-4 w-4" />
                    Generate Video Wall
                  </button>
                </div>

                {errorMessage && (
                  <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-[28px] border border-[#f5c2c7] bg-[#fff2f4] p-4 text-left text-sm text-[#b42318]">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            )}

            {showProcessing && (
              <div className="rounded-[40px] border border-[#d2d2d7] bg-white p-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f3ff] text-[#0071e3]">
                  <LoaderCircle className="h-8 w-8 animate-spin" />
                </div>
                <p className="mt-6 text-sm font-medium uppercase tracking-[0.28em] text-[#6e6e73]">Generating</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#3a3a3c] sm:text-5xl">
                  Processing your media
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#515154]">
                  Your wall is being prepared now. Keep this page open while the slices and ZIP export are generated.
                </p>

                <div className="mx-auto mt-10 max-w-2xl">
                  <div className="h-4 overflow-hidden rounded-full bg-[#e8e8ed]">
                    <div
                      className="relative h-full rounded-full transition-all duration-500 after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] after:animate-[shimmer_1.6s_linear_infinite]"
                      style={{
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #2f8cff 0%, #0a84ff 50%, #4da3ff 100%)"
                      }}
                    />
                  </div>
                  <p className="mt-4 text-sm font-medium text-[#515154]">{progress}% complete</p>
                </div>

                {errorMessage && (
                  <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-[28px] border border-[#f5c2c7] bg-[#fff2f4] p-4 text-left text-sm text-[#b42318]">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            )}

            {showExport && (
              <div className="rounded-[40px] border border-[#d2d2d7] bg-white p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-12">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#6e6e73]">Export Ready</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#3a3a3c] sm:text-5xl">
                  Your video wall is ready
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#515154]">
                  Review the detected layout and export the ZIP package to your computer.
                </p>

                <div className="mx-auto mt-10 max-w-2xl rounded-[32px] bg-[#f5f5f7] p-6">
                  <GridPreview previews={appState.job?.previews || []} screens={appState.validation?.screens || 0} />
                </div>

                <div className="mt-8 text-sm font-medium text-[#6e6e73]">{appState.job?.zipName}</div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <a
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(0,113,227,0.25)] transition hover:bg-[#0077ed]"
                    href={downloadUrl}
                  >
                    <Download className="h-4 w-4" />
                    Export Video Wall
                  </a>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-sm font-semibold text-[#3a3a3c] transition hover:bg-[#f5f5f7]"
                    type="button"
                    onClick={() => resetFlow()}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Generate Another
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>

        <footer className="pt-8 text-center text-[11px] font-medium text-[#86868b]">© 2026 Luminar Apps Puerto Rico</footer>
      </div>
    </div>
  );
}
