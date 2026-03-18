import path from "node:path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { MAX_FILE_SIZE_BYTES, UPLOAD_DIR } from "../config/constants.js";

const ALLOWED_EXTENSIONS = new Set([".mp4", ".png", ".jpg", ".jpeg"]);
const ALLOWED_MIME_TYPES = new Set(["video/mp4", "image/png", "image/jpeg"]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    callback(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

function fileFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const isAllowed = ALLOWED_MIME_TYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(extension);

  if (!isAllowed) {
    callback(new Error("Only .mp4, .png, .jpg, and .jpeg uploads are supported."));
    return;
  }

  callback(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  }
});
