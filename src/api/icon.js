import { apiGet, apiPost, apiUpload } from './apiClient';

// ============ 图标管理 ============
export const getIconList = (params) => apiGet('/api/icon/list', params);
export const addIcon = (name, file, extra = {}) => apiUpload('/api/icon/add', file, { name, ...extra });
export const deleteIcon = (id) => apiPost(`/api/icon/delete/${id}`);
