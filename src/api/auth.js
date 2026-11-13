import { apiGet, apiPost } from './apiClient';

// ============ 认证 ============
export const login = (params) => apiPost('/api/user/login', params);
export const logout = () => apiPost('/api/user/logout');

// ============ 首页管理 ============
export const getDashboard = () => apiGet('/api/main/dashboard');
export const getMainIndex = (eid) => apiGet(`/api/main/index/${eid}`);
export const getEhdata = () => apiGet('/api/main/ehdata/index');
export const saveEhdata = (params) => apiPost('/api/main/ehdata/save', params);
export const getEhactive = () => apiGet('/api/main/ehactive/index');
export const saveEhactive = (params) => apiPost('/api/main/ehactive/save', null, params);
export const getWelcome = () => apiGet('/api/main/welcome/index');
export const saveWelcome = (params) => apiPost('/api/main/welcome/save', null, params);
