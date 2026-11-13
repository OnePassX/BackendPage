import axios from 'axios';
import { toast } from "sonner"

export const TOKEN_KEY = 'access_token';
export const BACKEND_BASE = 'http://192.168.4.43:8004';

const apiClient = axios.create({
    // baseURL: BACKEND_BASE,
    timeout: 15000,
    withCredentials: true, // 同源不需要，跨域必须开，带上cookie
});

apiClient.interceptors.request.use((config) => {
    // const token = localStorage.getItem(TOKEN_KEY);
    // if (token) config.headers.token = `${token}`;
    // return config;
    const csrftoken = getCookie('csrftoken')
    if (csrftoken) {
        config.headers['X-CSRFToken'] = csrftoken
    }
    return config
});

apiClient.interceptors.response.use(
    (response) => {
        const body = response.data;
        // Unified backend envelope: {code, data, msg}
        if (body && typeof body === 'object' && 'code' in body) {
            if (body.code === 0) return body;
            const err = new Error(body.msg || '请求失败');
            err.code = body.code;
            err.payload = body;
            throw err;
        }
        return body;
    },
    (error) => {
        const status = error.response?.status;
        const detail = error.response?.data?.detail;
        // console.log(status, detail)
        if (status === 403) {
            // toast.warning('账户无权限访问此功能！');
            const err = new Error('账户无权限访问此功能！');
            throw err;
        }

        if (status === -1 || detail === 'Not authenticated' || detail === 'Token无效或已过期') {
            localStorage.removeItem(TOKEN_KEY);
            if (!location.hash.includes('/server/login')) {
                toast.warning('登录已过期，请重新登录');
                location.hash = '#/server/login';
            }
            const err = new Error(detail || error.message || '网络错误');
            err.status = status;
            throw err;
        }
        
    }
);

export default apiClient;

/** GET with query params, returns unwrapped {code,data,msg} */
export const apiGet = (url, params) => apiClient.get(url, { params });
/** POST with JSON body and/or query params */
export const apiPost = (url, data, params) => apiClient.post(url, data ?? undefined, { params });
/** POST multipart form (file upload). extra fields appended as form fields. */

export const apiPut = (url, data, params) => apiClient.put(url, data ?? undefined, { params });

export const apiDelete = (url, data, params) => apiClient.delete(url, data ?? undefined, { params });

export const apiUpload = (url, file, fields = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(fields).forEach(([k, v]) => v !== undefined && v !== null && fd.append(k, v));
    return apiClient.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const apiUploadContent = ({url, file, signal, onUploadProgress}) => {
    // console.log('apiUploadContent',url, file, signal, onUploadProgress)
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(url, fd, { signal:signal, onUploadProgress: onUploadProgress } );
};

/** Full media URL for backend-hosted files */
export const mediaUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    return `${BACKEND_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};


export const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
