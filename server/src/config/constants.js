import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..", "..");

export const PORT = Number(process.env.PORT || 4000);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 2048);
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const TARGET_SLICE_WIDTH = 1920;
export const TARGET_SLICE_HEIGHT = 1080;
export const TARGET_RATIO = TARGET_SLICE_WIDTH / TARGET_SLICE_HEIGHT;

export const TMP_DIR = path.join(serverRoot, "tmp");
export const UPLOAD_DIR = path.join(TMP_DIR, "uploads");
export const OUTPUT_DIR = path.join(TMP_DIR, "outputs");
export const CLIENT_DIST_DIR = path.resolve(serverRoot, "..", "client", "dist");
