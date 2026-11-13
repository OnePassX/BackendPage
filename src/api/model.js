import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

// ============ 软件模式 ============
export const getSmodelList = (params) => apiGet('/api/smodel/list', params);
export const addSmodel = (params) => apiPost('/api/smodel/add', params);
export const updateSmodel = (params) => apiPut('/api/smodel/update', params);
export const deleteSmodel = (id) => apiDelete(`/api/smodel/delete/${id}`);
export const updateSmodelStatus = (params) => apiPut('/api/smodel/status', params);

// ============ 软件模式绑定============
export const getSmodelBindList = (params) => apiGet('/api/smodelbind/list', params);
export const addSmodelBind = (params) => apiPost('/api/smodelbind/add', params);
export const updateSmodelBind = (params) => apiPut('/api/smodelbind/update', params);
export const deleteSmodelBind = (id) => apiDelete(`/api/smodelbind/delete/${id}`);

// ============ 硬件模式 ============
export const getHmodelList = (params) => apiGet('/api/hmodel/list', params);
export const addHmodel = (params) => apiPost('/api/hmodel/add', params);
export const updateHmodel = (params) => apiPut('/api/hmodel/update', params);
export const deleteHmodel = (id) => apiDelete(`/api/hmodel/delete/${id}`);
export const updateHmodelStatus = (params) => apiPut('/api/hmodel/status', params);

// ============ 软件模式绑定============
export const getHmodelBindList = (params) => apiGet('/api/hmodelbind/list', params);
export const addHmodelBind = (params) => apiPost('/api/hmodelbind/add', params);
export const updateHmodelBind = (params) => apiPut('/api/hmodelbind/update', params);
export const updateHmodelBindDelay = (params) => apiPut('/api/hmodelbind/delay', params);
export const deleteHmodelBind = (id) => apiDelete(`/api/hmodelbind/delete/${id}`);

// ============ 进程管理 ============
export const getProcessList = (params) => apiGet('/api/process/list', params);
export const addProcess = (params, data) => apiPost('/api/process/add', data, params);
