import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Download, LoaderCircle, RotateCcw, Wand2 } from "lucide-react";
import GridPreview from "./components/GridPreview";
import InvalidModal from "./components/InvalidModal";
import UploadDropzone from "./components/UploadDropzone";
import { deleteUpload, getDownloadUrl, getJobStatus, processVideo, uploadVideo } from "./lib/api";

const MAX_BATCH_FILES = 10;

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

async function createMediaPreview(file) {
  if (!file) {
    return { previewUrl: null, revokeUrl: null };
  }

  if (file.type.startsWith("image/")) {
    const objectUrl = URL.createObjectURL(file);
    return {
      previewUrl: objectUrl,
      revokeUrl: objectUrl
    };
  }

  if (file.type === "video/mp4") {
    const tempUrl = URL.createObjectURL(file);

    try {
      const previewUrl = await new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.src = tempUrl;

        const captureFrame = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 480;
          canvas.height = 270;
          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Preview canvas is not available."));
            return;
          }

          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };

        video.addEventListener("loadeddata", () => {
          if (Number.isFinite(video.duration) && video.duration > 1) {
            video.currentTime = Math.min(1, Math.max(0.1, video.duration / 4));
            return;
          }

          captureFrame();
        });

        video.addEventListener("seeked", captureFrame, { once: true });
        video.addEventListener("error", () => reject(new Error("Video preview could not be generated.")), {
          once: true
        });
      });

      return {
        previewUrl,
        revokeUrl: null
      };
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  }

  return { previewUrl: null, revokeUrl: null };
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function App() {
  const [items, setItems] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, setUploadState] = useState({
    currentIndex: 0,
    total: 0,
    fileName: "",
    progress: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingState, setProcessingState] = useState({
    currentIndex: 0,
    total: 0,
    fileName: ""
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [pendingAutoFitItemId, setPendingAutoFitItemId] = useState(null);
  const progressTimer = useRef(null);
  const itemsRef = useRef([]);
  const unmounted = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      unmounted.current = true;

      if (progressTimer.current) {
        window.clearInterval(progressTimer.current);
      }

      for (const item of itemsRef.current) {
        if (item.previewRevokeUrl) {
          URL.revokeObjectURL(item.previewRevokeUrl);
        }
      }
    };
  }, []);

  function clearProgressTimer() {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }

  function beginItemProgress() {
    clearProgressTimer();
    setSimulatedProgress(10);
    progressTimer.current = window.setInterval(() => {
      setSimulatedProgress((current) => {
        if (current >= 94) {
          return current;
        }

        return current + Math.max(1, Math.round((94 - current) / 9));
      });
    }, 280);
  }

  function completeItemProgress() {
    clearProgressTimer();
    setSimulatedProgress(100);
  }

  function updateItem(localId, patch) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              ...patch
            }
          : item
      )
    );
  }

  async function handleFileSelect(selectedFiles) {
    const files = Array.from(selectedFiles || []).filter(Boolean);

    if (!files.length) {
      return;
    }

    if (files.length > MAX_BATCH_FILES) {
      setErrorMessage(`You can upload up to ${MAX_BATCH_FILES} files at a time.`);
      return;
    }

    setErrorMessage("");
    setIsUploading(true);
    setUploadState({
      currentIndex: 0,
      total: files.length,
      fileName: "",
      progress: 0
    });

    const isSingleMode = files.length === 1;
    const nextItems = [];

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const localId = `${Date.now()}-${index}-${file.name}`;
        const previewPromise = isSingleMode
          ? createMediaPreview(file).catch(() => ({
              previewUrl: null,
              revokeUrl: null
            }))
          : Promise.resolve({ previewUrl: null, revokeUrl: null });

        setUploadState({
          currentIndex: index + 1,
          total: files.length,
          fileName: file.name,
          progress: 0
        });

        const data = await uploadVideo(file, (progress) => {
          setUploadState({
            currentIndex: index + 1,
            total: files.length,
            fileName: file.name,
            progress
          });
        });

        const uploadedItem = {
          localId,
          uploadId: data.uploadId,
          originalName: data.originalName,
          fileName: data.originalName,
          mediaKind: data.mediaKind,
          previewUrl: null,
          previewRevokeUrl: null,
          metadata: data.metadata,
          validation: data.validation,
          job: null,
          error: null
        };

        nextItems.push(uploadedItem);

        if (isSingleMode) {
          void previewPromise.then((preview) => {
            if (!preview?.previewUrl || unmounted.current) {
              return;
            }

            setItems((current) =>
              current.map((item) => {
                if (item.localId !== localId) {
                  return item;
                }

                return {
                  ...item,
                  previewUrl: preview.previewUrl,
                  previewRevokeUrl: preview.revokeUrl
                };
              })
            );
          });
        }
      }

      setItems(nextItems);
      setUploadState({
        currentIndex: files.length,
        total: files.length,
        fileName: files[files.length - 1]?.name || "",
        progress: 100
      });
    } catch (error) {
      for (const item of nextItems) {
        if (item.uploadId) {
          await deleteUpload(item.uploadId).catch(() => {});
        }
      }

      setItems([]);
      setErrorMessage(error.message);
      setUploadState({
        currentIndex: 0,
        total: files.length,
        fileName: "",
        progress: 0
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function resetFlow({ removeRemoteUploads = false } = {}) {
    clearProgressTimer();

    const currentItems = [...items];
    setItems([]);
    setDragActive(false);
    setIsUploading(false);
    setIsProcessing(false);
    setUploadState({
      currentIndex: 0,
      total: 0,
      fileName: "",
      progress: 0
    });
    setProcessingState({
      currentIndex: 0,
      total: 0,
      fileName: ""
    });
    setModalOpen(false);
    setPendingAutoFitItemId(null);
    setErrorMessage("");
    setSimulatedProgress(0);

    if (removeRemoteUploads) {
      await Promise.all(
        currentItems.map((item) => {
          if (!item.uploadId || item.job) {
            return Promise.resolve();
          }

          return deleteUpload(item.uploadId).catch(() => {});
        })
      );
    }

    for (const item of currentItems) {
      if (item.previewRevokeUrl) {
        URL.revokeObjectURL(item.previewRevokeUrl);
      }
    }
  }

  async function waitForJob(jobId, onTick) {
    while (!unmounted.current) {
      const data = await getJobStatus(jobId);

      if (data.job.status === "completed") {
        return data;
      }

      if (data.job.status === "failed") {
        throw new Error(data.job.error || "Processing failed.");
      }

      if (typeof onTick === "function") {
        onTick();
      }

      await sleep(900);
    }

    throw new Error("Processing was interrupted.");
  }

  async function runBatchProcessing({ singleAutoFit = false } = {}) {
    if (!items.length) {
      return;
    }

    setErrorMessage("");
    setModalOpen(false);
    setPendingAutoFitItemId(null);
    setIsProcessing(true);

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const autoFit = items.length > 1 ? Boolean(item.validation?.needsAutoFit) : singleAutoFit;

      setProcessingState({
        currentIndex: index + 1,
        total: items.length,
        fileName: item.fileName
      });
      beginItemProgress();

      try {
        const queued = await processVideo({
          uploadId: item.uploadId,
          originalName: item.originalName,
          autoFit
        });

        const result = await waitForJob(queued.job.id, () => {
          setSimulatedProgress((current) => (current < 99 ? current + 2 : current));
        });

        completeItemProgress();
        updateItem(item.localId, {
          validation: result.validation,
          mediaKind: result.mediaKind || item.mediaKind,
          job: result.job,
          error: null
        });
      } catch (error) {
        clearProgressTimer();
        updateItem(item.localId, {
          error: error.message,
          job: null
        });
      }
    }

    clearProgressTimer();
    setSimulatedProgress(100);
    setIsProcessing(false);
  }

  function handleGenerate() {
    if (!items.length) {
      return;
    }

    if (items.length === 1 && items[0].validation?.needsAutoFit && items[0].validation?.status === "invalid") {
      setPendingAutoFitItemId(items[0].localId);
      setModalOpen(true);
      return;
    }

    runBatchProcessing();
  }

  const isBatchMode = items.length > 1;
  const currentItem = items[0] || null;
  const hasUploads = items.length > 0;
  const hasResults = items.some((item) => item.job || item.error);
  const showLanding = !hasUploads && !isUploading && !isProcessing;
  const showReady = hasUploads && !isProcessing && !hasResults;
  const showProcessing = isProcessing;
  const showExport = hasUploads && !isProcessing && hasResults;

  const overallProgress = showProcessing
    ? Math.min(
        100,
        Math.round(
          ((((processingState.currentIndex || 1) - 1) + simulatedProgress / 100) / Math.max(processingState.total || 1, 1)) *
            100
        )
      )
    : 0;

  const completedCount = items.filter((item) => item.job).length;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#3a3a3c]">
      <InvalidModal
        message={currentItem?.validation?.message}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setPendingAutoFitItemId(null);
        }}
        onConfirm={() => {
          if (!pendingAutoFitItemId) {
            return;
          }

          runBatchProcessing({ singleAutoFit: true });
        }}
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
            {(showLanding || isUploading) && (
              <div className="space-y-6">
                <div className="rounded-[40px] border border-[#d2d2d7] bg-white p-8 shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-10">
                  <div className="mx-auto max-w-2xl text-center">
                    <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#3a3a3c] sm:text-5xl">
                      Create a Video Wall.
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#6e6e73]">
                      Upload one file or batch up to 10 videos and images to generate video wall exports.
                    </p>
                  </div>

                  <div className="mx-auto mt-10 max-w-2xl">
                    <UploadDropzone
                      disabled={isUploading}
                      dragActive={dragActive}
                      fileName={
                        isUploading
                          ? `${uploadState.fileName || "Uploading"} (${uploadState.currentIndex}/${uploadState.total})`
                          : ""
                      }
                      isUploading={isUploading}
                      multiple
                      progress={uploadState.progress}
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

            {showReady && !isBatchMode && currentItem && (
              <div className="rounded-[40px] border border-[#d2d2d7] bg-white p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-12">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#6e6e73]">Detected Layout</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#3a3a3c] sm:text-5xl">
                  {formatDetection(currentItem.validation)}
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#515154]">{currentItem.validation?.message}</p>
                <div className="mt-6 text-sm font-medium text-[#6e6e73]">
                  {formatDimensions(currentItem.metadata)}
                  {currentItem.mediaKind ? ` • ${currentItem.mediaKind}` : ""}
                </div>

                <div className="mx-auto mt-10 max-w-2xl rounded-[32px] bg-[#f5f5f7] p-6">
                  <GridPreview previewSource={currentItem.previewUrl} screens={currentItem.validation?.screens || 0} />
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-sm font-semibold text-[#3a3a3c] transition hover:bg-[#f5f5f7]"
                    type="button"
                    onClick={() => resetFlow({ removeRemoteUploads: true })}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(0,113,227,0.25)] transition hover:bg-[#0077ed]"
                    type="button"
                    onClick={handleGenerate}
                  >
                    <Wand2 className="h-4 w-4" />
                    Generate Video Wall
                  </button>
                </div>
              </div>
            )}

            {showReady && isBatchMode && (
              <div className="rounded-[40px] border border-[#d2d2d7] bg-white p-8 shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-12">
                <div className="text-center">
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#6e6e73]">Batch Ready</p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#3a3a3c] sm:text-5xl">
                    {items.length} files ready to generate
                  </h2>
                  <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6e6e73]">
                    Batch mode skips screen previews and processes each file sequentially. Invalid ratios will auto-fit
                    automatically when needed.
                  </p>
                </div>

                <div className="mt-10 overflow-hidden rounded-[28px] border border-[#e2e2e7]">
                  {items.map((item, index) => (
                    <div
                      key={item.localId}
                      className={`flex items-center justify-between gap-4 bg-white px-6 py-4 ${
                        index !== items.length - 1 ? "border-b border-[#ececf1]" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#3a3a3c]">{item.fileName}</p>
                        <p className="mt-1 text-sm text-[#6e6e73]">
                          {item.validation?.screens} screens • {formatDimensions(item.metadata)}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-medium text-[#6e6e73]">
                        Ready
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-sm font-semibold text-[#3a3a3c] transition hover:bg-[#f5f5f7]"
                    type="button"
                    onClick={() => resetFlow({ removeRemoteUploads: true })}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(0,113,227,0.25)] transition hover:bg-[#0077ed]"
                    type="button"
                    onClick={handleGenerate}
                  >
                    <Wand2 className="h-4 w-4" />
                    Generate {items.length} Video Walls
                  </button>
                </div>
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
                  {processingState.fileName
                    ? `Working on ${processingState.fileName} (${processingState.currentIndex} of ${processingState.total}).`
                    : "Preparing your video wall exports."}
                </p>

                <div className="mx-auto mt-10 max-w-2xl">
                  <div className="h-4 overflow-hidden rounded-full bg-[#e8e8ed]">
                    <div
                      className="relative h-full rounded-full transition-all duration-500 after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] after:animate-[shimmer_1.6s_linear_infinite]"
                      style={{
                        width: `${overallProgress}%`,
                        background: "linear-gradient(90deg, #2f8cff 0%, #0a84ff 50%, #4da3ff 100%)"
                      }}
                    />
                  </div>
                  <p className="mt-4 text-sm font-medium text-[#515154]">{overallProgress}% complete</p>
                </div>
              </div>
            )}

            {showExport && !isBatchMode && currentItem && (
              <div className="rounded-[40px] border border-[#d2d2d7] bg-white p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-12">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#6e6e73]">Export Ready</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#3a3a3c] sm:text-5xl">
                  Your video wall is ready
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#515154]">
                  Review the detected layout and export the ZIP package to your computer.
                </p>

                <div className="mx-auto mt-10 max-w-2xl rounded-[32px] bg-[#f5f5f7] p-6">
                  <GridPreview
                    previews={currentItem.job?.previews || []}
                    previewSource={currentItem.previewUrl}
                    screens={currentItem.validation?.screens || 0}
                  />
                </div>

                <div className="mt-8 text-sm font-medium text-[#6e6e73]">{currentItem.job?.zipName}</div>

                {currentItem.error && (
                  <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-[28px] border border-[#f5c2c7] bg-[#fff2f4] p-4 text-left text-sm text-[#b42318]">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{currentItem.error}</span>
                  </div>
                )}

                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  {currentItem.job && (
                    <a
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(0,113,227,0.25)] transition hover:bg-[#0077ed]"
                      href={getDownloadUrl(currentItem.job.downloadUrl)}
                    >
                      <Download className="h-4 w-4" />
                      Export Video Wall
                    </a>
                  )}
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

            {showExport && isBatchMode && (
              <div className="rounded-[40px] border border-[#d2d2d7] bg-white p-8 shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-12">
                <div className="text-center">
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#6e6e73]">Batch Export</p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#3a3a3c] sm:text-5xl">
                    {completedCount} of {items.length} video walls ready
                  </h2>
                  <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6e6e73]">
                    Download each finished ZIP individually. Failed files can be retried in a new batch.
                  </p>
                </div>

                <div className="mt-10 space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.localId}
                      className="flex flex-col gap-4 rounded-[28px] border border-[#e2e2e7] bg-[#fbfbfd] px-6 py-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-base font-semibold text-[#3a3a3c]">{item.fileName}</p>
                        <p className="mt-1 text-sm text-[#6e6e73]">
                          {item.validation?.screens} screens • {formatDimensions(item.metadata)}
                        </p>
                        {item.error && <p className="mt-2 text-sm text-[#b42318]">{item.error}</p>}
                      </div>

                      {item.job ? (
                        <a
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(0,113,227,0.22)] transition hover:bg-[#0077ed]"
                          href={getDownloadUrl(item.job.downloadUrl)}
                        >
                          <Download className="h-4 w-4" />
                          Export {item.fileName}
                        </a>
                      ) : (
                        <span className="rounded-full bg-[#fff2f4] px-4 py-2 text-sm font-medium text-[#b42318]">
                          Failed
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex justify-center">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-sm font-semibold text-[#3a3a3c] transition hover:bg-[#f5f5f7]"
                    type="button"
                    onClick={() => resetFlow()}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Generate Another Batch
                  </button>
                </div>
              </div>
            )}

            {!showLanding && !isUploading && errorMessage && !showProcessing && (
              <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-[28px] border border-[#f5c2c7] bg-[#fff2f4] p-4 text-sm text-[#b42318]">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </section>
        </main>

        <footer className="pt-8 text-center text-[11px] font-medium text-[#86868b]">© 2026 Luminar Apps Puerto Rico</footer>
      </div>
    </div>
  );
}
