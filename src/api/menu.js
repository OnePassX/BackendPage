import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

// ============ 菜单管理 ============
// 后端路由：/menu/sidebar（按角色取侧栏）、/menu/tree（全量树）、/menu/list、add、update、delete
export const getMenuTree = () => apiGet('/api/menu/tree');
export const getMenuSidebar = (params) => apiGet('/api/menu/sidebar', params);
export const addMenu = (params) => apiPost('/api/menu/add', params);
export const updateMenu = (params) => apiPut('/api/menu/update', params);
export const deleteMenu = (id) => apiDelete(`/api/menu/delete/${id}`);
