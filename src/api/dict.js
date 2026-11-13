import { apiDelete, apiGet, apiPost } from './apiClient';

// 后端字典分两个挂载点：/dict/*（字典类型）与 /dictdata/*（字典项）。
// 注意：类型与字典项的更新后端都用 POST，删除用 DELETE。

// ============ 字典类型 ============
export const getDictList = (params) => apiGet('/api/dict/list', params);
export const addDict = (params) => apiPost('/api/dict/add', params);
export const updateDict = (params) => apiPost('/api/dict/update', params);
export const deleteDict = (id) => apiDelete(`/api/dict/delete/${id}`);

// ============ 字典数据 ============
export const getDictDataList = (params) => apiGet('/api/dictdata/list', params);
export const addDictData = (params) => apiPost('/api/dictdata/add', params);
export const updateDictData = (params) => apiPost('/api/dictdata/update', params);
export const deleteDictData = (id) => apiDelete(`/api/dictdata/delete/${id}`);
