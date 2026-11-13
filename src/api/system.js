import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

// ============ 用户管理 ============
export const getUserList = (params) => apiGet('/api/user/list', params);
export const addUser = (params) => apiPost('/api/user/add', params);
export const updateUser = (params) => apiPut('/api/user/update', params);
export const deleteUser = (id) => apiDelete(`/api/user/delete/${id}`);
export const updateUserStatus = (id, status) => apiPut('/api/user/status', { id, status });
export const resetUserPwd = (id, password) => apiPut('/api/user/resetPwd', { id, password });

// ============ 角色管理 ============
export const getRoleList = (params) => apiGet('/api/role/list', params);
export const addRole = (params) => apiPost('/api/role/add', params);
export const updateRole = (params) => apiPut('/api/role/update', params);
export const deleteRole = (id) => apiDelete(`/api/role/delete/${id}`);
export const updateRoleStatus = (id, status) => apiPut('/api/role/status', { id, status });
export const getRoleMenus = (role_id) => apiGet(`/api/rolemenu/index/${role_id}`);
export const saveRoleMenus = (role_id, menu_id) => apiPost('/api/rolemenu/save', { role_id, menu_id });
