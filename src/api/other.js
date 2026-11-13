import { apiUpload } from './apiClient';

export const uploadAvatar = (name, file, extra = {}) => apiUpload('/api/upload/uploadImage', file, { name, ...extra });