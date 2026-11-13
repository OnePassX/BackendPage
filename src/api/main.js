import { apiGet, apiPost,apiPut,apiDelete } from './apiClient';

// ============ 展厅基础信息 ============
export const getEhData = (params) => apiGet('/api/ehdata/index', params);
export const saveEhData = (params) => apiPost('/api/ehdata/index', params);

// ============ 展厅激活信息 ============
export const getEhActive = () => apiGet('/api/ehdata/active');
export const saveEhActive = (params) => apiPost('/api/ehdata/active', params);

// ============ 展厅欢迎词信息 ============
export const getWelcome = () => apiGet('/api/ehdata/weltxt');
export const saveWelcome = (params) => apiPost('/api/ehdata/weltxt', params);

// ============ 获取Dashboard信息 ============
export const getDashboard = () => apiGet(`/api/ehdata/dashboard`);