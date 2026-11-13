import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';

// ============ 设备 ============
export const getDeviceList = (params) => apiGet('/api/device/list', params);
export const getDeviceTree = (params) => apiGet('/api/device/tree', params);
export const addDevice = (params) => apiPost('/api/device/add', params);
export const updateDevice = (params) => apiPut('/api/device/update', params);
export const deleteDevice = (id) => apiDelete(`/api/device/delete/${id}`);
export const updateDeviceLink = (params) => apiPut('/api/device/link', params);

// ============ 设备指令码 ============
export const getCodeList = (params) => apiGet('/api/code/list', params);
export const addCode = (params) => apiPost('/api/code/add', params);
export const updateCode = (params) => apiPut('/api/code/update', params);
export const deleteCode = (id) => apiDelete(`/api/code/delete/${id}`);
export const testCode = (params) => apiPost('/api/code/test', null, params);
