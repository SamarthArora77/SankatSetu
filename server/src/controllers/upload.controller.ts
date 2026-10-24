import { storageService } from '../services/storage.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('A file is required in the "file" field.', 'FILE_REQUIRED');
  }

  const url = storageService.toPublicUrl(req.file.filename);

  sendSuccess(
    res,
    'File uploaded successfully.',
    {
      url,
      mimetype: req.file.mimetype,
      size: req.file.size,
      kind: storageService.isImage(req.file.mimetype) ? 'IMAGE' : 'AUDIO',
    },
    201,
  );
});
