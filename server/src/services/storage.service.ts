import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { publicUploadPrefix, uploadRoot } from '../config/paths';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp3', '.m4a', '.ogg', '.wav', '.webm']);
const MIME_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'audio/mpeg': ['.mp3'],
  'audio/mp4': ['.m4a'],
  'audio/x-m4a': ['.m4a'],
  'audio/ogg': ['.ogg'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/webm': ['.webm'],
};

class LocalStorageService {
  readonly root = uploadRoot;

  constructor() {
    fs.mkdirSync(this.root, { recursive: true });
  }

  readonly multerStorage = multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdirSync(this.root, { recursive: true });
      callback(null, this.root);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
    },
  });

  isAllowedUpload(mimeType: string, originalName: string): boolean {
    const extension = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) return false;
    const allowedForMime = MIME_EXTENSIONS[mimeType];
    return Boolean(allowedForMime?.includes(extension));
  }

  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  toPublicUrl(filename: string): string {
    return `${publicUploadPrefix}${filename}`;
  }

  resolvePublicUrl(url: string): string | null {
    if (!url.startsWith(publicUploadPrefix)) return null;
    const filename = path.basename(url);
    const resolved = path.resolve(this.root, filename);
    if (!resolved.startsWith(path.resolve(this.root) + path.sep)) return null;
    return fs.existsSync(resolved) ? resolved : null;
  }

  deleteByPublicUrl(url: string): void {
    const resolved = this.resolvePublicUrl(url);
    if (!resolved) return;
    try {
      fs.unlinkSync(resolved);
    } catch (error) {
      console.warn('[storage] Could not remove upload:', error instanceof Error ? error.message : error);
    }
  }
}

export const storageService = new LocalStorageService();
