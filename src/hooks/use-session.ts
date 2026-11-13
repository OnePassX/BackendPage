import { useEffect, useState } from 'react';
import { getSession, subscribeSession, type SessionUser } from '@/api/session';

/** 订阅当前会话；会话变化（登录/登出/过期）时组件自动重渲染 */
export function useSession(): SessionUser | null {
    const [user, setUser] = useState<SessionUser | null>(() => getSession());

    useEffect(() => subscribeSession(() => setUser(getSession())), []);

    return user;
}
