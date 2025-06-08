import multer from "multer";
import { fileUploadConfig } from "../config/webTorrent.js";

// Configure multer for file uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: fileUploadConfig.limits,
  fileFilter: fileUploadConfig.fileFilter,
});
