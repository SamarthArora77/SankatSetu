import path from 'node:path';
import { env } from './env';

// src/ and dist/ both sit directly under the server directory.
export const serverRoot = path.resolve(__dirname, '..', '..');
export const uploadRoot = path.resolve(serverRoot, env.UPLOAD_DIR);
export const publicUploadPrefix = '/uploads/';
