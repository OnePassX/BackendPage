import { toast } from 'sonner';
import { setAuthFailureHandler } from './apiClient';
import { login } from './auth';

/**
 * 会话 module —— 「当前是谁、会话是否还有效」的唯一拥有者。
 *
 * 后端是 Django SessionAuthentication：
 *   - 会话凭据为 HttpOnly 的 sessionid cookie，前端拿不到、也不保存；
 *   - 登录接口返回的 `token` 是 CSRF token，不是认证凭据，不要当凭据存；
 *   - 未登录/过期时后端返回 403 + {"code":-1,"msg":"未登录或登录已过期"}。
 *
 * 因此这里只缓存「用户信息」这一份展示用状态，会话是否有效由服务端裁决：
 * 任何请求被判为会话失效时，transport 会回调本 module 清空并跳转登录。
 * 缓存放在 localStorage，保证刷新与新标签页不闪回登录页；真正失效时
 * 第一次请求就会触发登出（一次多余的 403，可接受）。
 */

export interface SessionUser {
    id: number;
    username: string;
    /** 真实姓名（后端 re_name），可能为空 */
    displayName: string;
    avatar: string;
    roleId: number | null;
    roleName: string;
}

const STORAGE_KEY = 'backend_session';
const LOGIN_HASH = '#/server/login';

function readStored(): SessionUser | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as SessionUser;
        return typeof parsed?.id === 'number' ? parsed : null;
    } catch {
        return null;
    }
}

let current: SessionUser | null = readStored();
const listeners = new Set<() => void>();

function commit(user: SessionUser | null): void {
    current = user;
    try {
        if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // 隐私模式下 localStorage 可能不可写：内存态仍然生效
    }
    listeners.forEach((listener) => listener());
}

/** 当前登录用户；未登录为 null */
export function getSession(): SessionUser | null {
    return current;
}

/** 是否已登录（仅代表前端有缓存，不代表服务端会话仍有效） */
export function isSignedIn(): boolean {
    return current !== null;
}

/** 订阅会话变化；返回取消订阅函数 */
export function subscribeSession(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function goToLogin(): void {
    if (!window.location.hash.includes('/server/login')) {
        window.location.hash = LOGIN_HASH;
    }
}

/**
 * 登录。成功后写入会话缓存；失败时抛出 ApiError（业务错误 kind === 'business'）。
 * 注意：登录接口豁免 CSRF，且不依赖任何已有 token。
 */
export async function signIn(username: string, password: string): Promise<SessionUser> {
    const res = await login({ username, password });
    const data = res?.data ?? {};
    const role = data.role ?? {};

    const user: SessionUser = {
        id: Number(data.id ?? 0),
        username: String(data.username ?? username),
        displayName: String(data.re_name ?? ''),
        avatar: String(data.avatar ?? ''),
        roleId: role.id ?? null,
        roleName: String(role.name ?? ''),
    };
    commit(user);
    return user;
}

/**
 * 登出。
 * 后端没有 logout 路由（/user/logout 为 404），因此这里只能清理前端状态；
 * 服务端 session 会随浏览器关闭（SESSION_EXPIRE_AT_BROWSER_CLOSE=True）或过期而失效。
 */
export function signOut(options: { redirect?: boolean } = {}): void {
    commit(null);
    if (options.redirect !== false) goToLogin();
}

/** 会话失效：清空缓存 + 提示 + 跳转登录 */
function handleAuthFailure(): void {
    const hadSession = current !== null;
    commit(null);
    if (!hadSession) return;
    toast.warning('登录已过期，请重新登录');
    goToLogin();
}

setAuthFailureHandler(handleAuthFailure);
