import { apiPost } from './apiClient';

/**
 * 认证端点表。
 *
 * 这里只有登录：后端没有 logout 路由（GET/POST /user/logout 均为 404），
 * 会话由 Django 以 HttpOnly 的 sessionid cookie 维护，登出只能清理前端状态
 * 并依赖 SESSION_EXPIRE_AT_BROWSER_CLOSE / 服务端过期。
 */
export const login = (params) => apiPost('/api/user/login', params);
