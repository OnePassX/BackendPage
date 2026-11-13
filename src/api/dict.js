import { apiGet, apiPost } from './apiClient';

// ============ 字典类型 ============
export const getDictList = (params) => apiGet('/api/v1/dict/list', params);
export const addDict = (params) => apiPost('/api/v1/dict/add', params);
export const updateDict = (params) => apiPost('/api/v1/dict/update', params);
export const deleteDict = (id) => apiPost(`/api/v1/dict/delete/${id}`);

// ============ 字典数据 ============
export const getDictDataList = (params) => apiGet('/api/v1/dict/data/list', params);
export const addDictData = (params) => apiPost('/api/v1/dict/data/add', params);
export const updateDictData = (params) => apiPost('/api/v1/dict/data/update', params);
export const deleteDictData = (id) => apiPost(`/api/v1/dict/data/delete/${id}`);
