import path from "node:path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { MAX_FILE_SIZE_BYTES, UPLOAD_DIR } from "../config/constants.js";

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    callback(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

function fileFilter(_req, file, callback) {
  const isMp4 = file.mimetype === "video/mp4" || file.originalname.toLowerCase().endsWith(".mp4");

  if (!isMp4) {
    callback(new Error("Only .mp4 uploads are supported."));
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
