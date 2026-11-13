import { apiDelete, apiGet, apiPost, apiPut, apiUploadContent } from './apiClient';

// ============ 展馆 ============
export const getPavilionList = (params) => apiGet('/api/pavilion/list', params);
export const addPavilion = (params) => apiPost('/api/pavilion/add', params);
export const updatePavilion = (params) => apiPut('/api/pavilion/update', params);
export const deletePavilion = (id) => apiDelete(`/api/pavilion/delete/${id}`);

// ============ 展区 ============
export const getMachineList = (params) => apiGet('/api/machine/list', params);
export const addMachine = (params) => apiPost('/api/machine/add', params);
export const updateMachine = (params) => apiPut('/api/machine/update', params);
export const deleteMachine = (id) => apiDelete(`/api/machine/delete/${id}`);
export const updateMachineLink = (params) => apiPut('/api/machine/link', params);

// ============ 展项 ============
export const getExhibitTree = (params) => apiGet(`/api/exhibition/tree`, params);
export const getExhibitList = (params) => apiGet('/api/exhibition/list', params);
export const addExhibit = (params) => apiPost('/api/exhibition/add', params);
export const updateExhibit = (params) => apiPut('/api/exhibition/update', params);
export const deleteExhibit = (id) => apiDelete(`/api/exhibition/delete/${id}`);
export const updateExhibitLink = (params) => apiPut('/api/exhibition/link', params);
export const updateExhibitControl = (params) => apiPut('/api/exhibition/control', params);

// ============ 内容(文件) ============
export const getContentList = (params) => apiGet('/api/content/list', params);
export const addContent = (params) => apiPost('/api/content/add', params);
export const updateContent = (params) => apiPut('/api/content/update', params);
export const deleteContent = (id) => apiDelete(`/api/content/delete/${id}`);
export const updateContentControl = (params) => apiPut('/api/content/editJson', params);
export const updateContentDefault = (params) => apiPut('/api/content/default', params);
export const updateContentStartup = (params) => apiPut('/api/content/startup', params);
export const updateContentDownload = (params) => apiPut('/api/content/download', params);

export const uploadContentFile = (params) => apiUploadContent(params);

// ============ 控制指令 ============
export const getControlTree = (params) => apiGet('/api/control/tree', params);
export const getControlList = (params) => apiGet('/api/control/list', params);
export const addControl = (params) => apiPost('/api/control/add', params);
export const batchAddControl = (params) => apiPost(`/api/control/adds`, params);
export const updateControl = (params) => apiPut('/api/control/update', params);
export const deleteControl = (id) => apiDelete(`/api/control/delete/${id}`);
