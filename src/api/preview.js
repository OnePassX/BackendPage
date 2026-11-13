import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

// ============ 预览 ============
export const getPreviewList = (params) => apiGet('/api/preview/list', params);
export const addPreview = (params) => apiPost('/api/preview/add', params);
export const updatePreview = (params) => apiPut('/api/preview/update', params);
export const deletePreview = (id) => apiDelete(`/api/preview/delete/${id}`);

// ============ 预览点位 ============
export const getPointList = (params) => apiGet('/api/previewpoint/list', params);
export const addPoint = (params) => apiPost('/api/previewpoint/add', params);
export const deletePoint = (id) => apiDelete(`/api/previewpoint/delete/${id}`);
