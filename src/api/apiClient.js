import axios from 'axios';

/**
 * 统一的后端访问 module。
 *
 * 认证模型（与后端 serverControl 对齐，勿再引入 token 概念）：
 *   - 会话凭据是 HttpOnly 的 `sessionid` cookie，JS 不可见、也不该可见；
 *   - 后端用 `request.session['user_id']` 判定登录（不是 django.contrib.auth.login），
 *     因此 `request.user` 始终是匿名，DRF 的 SessionAuthentication 不会触发 CSRF 校验；
 *     这里仍然按可读的 `csrftoken` cookie 发送 X-CSRFToken，成本为零，
 *     一旦后端改为标准登录 + CSRF 强制，前端无需再改；
 *   - 未登录 / 会话过期：后端返回 403 + {"code":-1,"msg":"未登录或登录已过期"}，
 *     而不是 401，因此判断会话失效必须同时看状态码与后端 msg。
 *
 * 本 module 的职责：地址与凭据注入、`{code,data,msg}` 信封拆解、
 * 失败归一为 ApiError（含 kind），并在会话失效时通知 session module。
 * 它不认识任何业务字段。
 */

/** 后端主机（仅用于拼接 media 等绝对地址；接口本身走同源 /api 代理） */
const BACKEND_BASE = 'http://192.168.4.43:8004';

/** 视为「会话已失效」的后端消息特征 */
const SESSION_EXPIRED_HINTS = ['未登录', '登录已过期', 'CSRF'];

/**
 * 统一的失败类型。`kind` 是调用方唯一需要判断的东西：
 *   auth      会话失效（已触发登出跳转）
 *   forbidden 已登录但无权限
 *   business  后端返回 code !== 0
 *   http      其他非 2xx
 *   network   断网 / 超时
 */
export class ApiError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'ApiError';
        this.kind = options.kind ?? 'http';
        this.status = options.status;
        this.code = options.code;
        this.payload = options.payload;
    }
}

/** 会话失效回调：由 session module 注册，避免 transport 反向依赖它 */
let onAuthFailure = null;
export function setAuthFailureHandler(handler) {
    onAuthFailure = handler;
}

/** 读取可读 cookie（CSRF 用） */
export const getCookie = (name) => {
    const raw = document.cookie;
    if (!raw) return null;
    for (const part of raw.split(';')) {
        const cookie = part.trim();
        if (cookie.startsWith(`${name}=`)) {
            return decodeURIComponent(cookie.slice(name.length + 1));
        }
    }
    return null;
};

const apiClient = axios.create({
    timeout: 15000,
    // 同源走 Vite 代理时无实际作用，但保留以便直连后端时仍能带上会话 cookie
    withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
    const csrftoken = getCookie('csrftoken');
    if (csrftoken) {
        config.headers['X-CSRFToken'] = csrftoken;
    }
    return config;
});

/** 从后端错误体里取出可读消息（后端统一封装为 {code,msg,data}） */
function readBackendMessage(payload) {
    if (payload && typeof payload === 'object' && typeof payload.msg === 'string' && payload.msg) {
        return payload.msg;
    }
    return undefined;
}

function isSessionExpired(status, backendMsg) {
    if (status === 401) return true;
    if (status !== 403 || !backendMsg) return false;
    return SESSION_EXPIRED_HINTS.some((hint) => backendMsg.includes(hint));
}

apiClient.interceptors.response.use(
    (response) => {
        const body = response.data;
        // 后端统一信封：{code, data, msg}；code === 0 表示成功
        if (body && typeof body === 'object' && 'code' in body) {
            if (body.code === 0) return body;
            throw new ApiError(body.msg || '请求失败', {
                kind: 'business',
                code: body.code,
                payload: body,
            });
        }
        return body;
    },
    (error) => {
        // 主动取消（上传取消、切换展项）保留原始错误，调用方靠 name === 'CanceledError' 判断
        if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
            return Promise.reject(error);
        }

        const status = error?.response?.status;
        const payload = error?.response?.data;
        const backendMsg = readBackendMessage(payload);

        if (!status) {
            const message = error?.code === 'ECONNABORTED'
                ? '请求超时，请稍后重试'
                : '网络错误，请检查后端服务';
            return Promise.reject(new ApiError(message, { kind: 'network' }));
        }

        if (isSessionExpired(status, backendMsg)) {
            if (onAuthFailure) onAuthFailure();
            return Promise.reject(new ApiError(backendMsg || '登录已过期，请重新登录', {
                kind: 'auth',
                status,
                payload,
            }));
        }

        if (status === 403) {
            return Promise.reject(new ApiError(backendMsg || '无权限访问该功能', {
                kind: 'forbidden',
                status,
                payload,
            }));
        }

        return Promise.reject(new ApiError(backendMsg || `请求失败（HTTP ${status}）`, {
            kind: 'http',
            status,
            payload,
        }));
    },
);

export default apiClient;

/** GET with query params, returns unwrapped {code,data,msg} */
export const apiGet = (url, params) => apiClient.get(url, { params });

/** POST with JSON body and/or query params */
export const apiPost = (url, data, params) => apiClient.post(url, data ?? undefined, { params });

/** PUT with JSON body and/or query params */
export const apiPut = (url, data, params) => apiClient.put(url, data ?? undefined, { params });

/** DELETE：axios 的 body 必须放在 config.data 里 */
export const apiDelete = (url, data, params) => apiClient.delete(url, { data, params });

/** multipart 上传；fields 作为额外表单字段 */
export const apiUpload = (url, file, fields = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(fields).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v);
    });
    return apiClient.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

/** 带进度与取消的 multipart 上传 */
export const apiUploadContent = ({ url, file, signal, onUploadProgress }) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(url, fd, { signal, onUploadProgress });
};

/** 后端托管文件的完整地址（相对路径补主机） */
export const mediaUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    return `${BACKEND_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};
