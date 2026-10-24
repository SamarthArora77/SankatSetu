import multer from 'multer';
import { env } from '../config/env';
import { storageService } from '../services/storage.service';
import { ApiError } from '../utils/ApiError';

const uploader = multer({
  storage: storageService.multerStorage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!storageService.isAllowedUpload(file.mimetype, file.originalname)) {
      callback(
        ApiError.badRequest(
          'Unsupported file type. Allowed images: JPG, PNG, WEBP. Allowed audio: MP3, M4A, OGG, WAV, WEBM.',
          'INVALID_FILE_TYPE',
        ),
      );
      return;
    }
    callback(null, true);
  },
});

export const uploadSingleFile = uploader.single('file');
