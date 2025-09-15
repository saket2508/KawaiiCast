import multer from 'multer';
import { fileUploadConfig } from '@config/webTorrent';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: fileUploadConfig.limits,
  fileFilter: fileUploadConfig.fileFilter as any,
});

