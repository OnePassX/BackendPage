import { apiGet, apiPost,apiPut,apiDelete } from './apiClient';

// ============ 菜单管理 ============
export const getMenuList = (params) => apiGet('/api/menu/list', params);
export const getMenuTree = () => apiGet('/api/menu/tree');
export const getMenuSidebar = (params) => apiGet('/api/menu/sidebar',params);
export const getMenuPermission = () => apiGet('/api/menu/permission');
export const getMenuDetail = (id) => apiGet(`/api/menu/edit/${id}`);
export const addMenu = (params) => apiPost('/api/menu/add', params);
export const updateMenu = (params) => apiPut('/api/menu/update', params);
export const deleteMenu = (id) => apiDelete(`/api/menu/delete/${id}`);
