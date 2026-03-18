import { TARGET_RATIO, TARGET_SLICE_HEIGHT, TARGET_SLICE_WIDTH } from "../config/constants.js";

const EPSILON = 0.02;

function round(value) {
  return Math.round(value * 100) / 100;
}

function isClose(a, b) {
  return Math.abs(a - b) <= EPSILON;
}

function getNearestScreens(width, height) {
  const scaledWidth = width * (TARGET_SLICE_HEIGHT / height);
  return Math.max(1, Math.round(scaledWidth / TARGET_SLICE_WIDTH));
}

export function analyzeVideoDimensions(width, height) {
  if (!width || !height) {
    throw new Error("Unable to read video dimensions.");
  }

  const scaleTo1080 = TARGET_SLICE_HEIGHT / height;
  const normalizedWidth = width * scaleTo1080;
  const exactScreens = normalizedWidth / TARGET_SLICE_WIDTH;
  const isProportional = isClose(normalizedWidth % TARGET_SLICE_WIDTH, 0) || isClose(exactScreens, Math.round(exactScreens));
  const screens = isProportional ? Math.max(1, Math.round(exactScreens)) : getNearestScreens(width, height);
  const targetWidth = screens * TARGET_SLICE_WIDTH;
  const targetHeight = TARGET_SLICE_HEIGHT;
  const originalRatio = width / height;
  const targetRatio = screens * TARGET_RATIO;

  if (isProportional && isClose(scaleTo1080, 1)) {
    return {
      caseType: "perfect",
      status: "ready",
      screens,
      needsAutoFit: false,
      message: "Video matches standard video wall dimensions and is ready to generate.",
      targetWidth,
      targetHeight,
      normalizedWidth: round(targetWidth),
      scaleTo1080: round(scaleTo1080)
    };
  }

  if (isProportional && scaleTo1080 < 1) {
    return {
      caseType: "larger",
      status: "ready",
      screens,
      needsAutoFit: false,
      message: "This video will be optimized to fit your screen layout.",
      targetWidth,
      targetHeight,
      normalizedWidth: round(normalizedWidth),
      scaleTo1080: round(scaleTo1080)
    };
  }

  if (isProportional && scaleTo1080 > 1) {
    return {
      caseType: "smaller",
      status: "warning",
      screens,
      needsAutoFit: false,
      message: "Resolution is lower than recommended. Output quality may be reduced.",
      targetWidth,
      targetHeight,
      normalizedWidth: round(normalizedWidth),
      scaleTo1080: round(scaleTo1080)
    };
  }

  return {
    caseType: "invalid",
    status: "invalid",
    screens,
    needsAutoFit: true,
    message: `Source ratio ${round(originalRatio)} does not align with the nearest ${screens}-screen wall ratio ${round(
      targetRatio
    )}. Auto-Fit can scale to 1080p height and center crop to ${targetWidth}x${targetHeight}.`,
    targetWidth,
    targetHeight,
    normalizedWidth: round(normalizedWidth),
    scaleTo1080: round(scaleTo1080)
  };
}
