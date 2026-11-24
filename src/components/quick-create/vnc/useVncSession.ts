import { useCallback, useEffect, useRef, useState } from "react";
import type RFB from "@novnc/novnc";
import type { RFBConstructor } from "@novnc/novnc";

/** 远程画面会话状态 */
export type VncStatus =
    | "idle"
    | "connecting"
    | "connected"
    | "need-password"
    | "reconnecting"
    | "disconnected"
    | "error";

/** 握手超时：设备没开 / websockify 没启动时不让用户无限等待 */
const HANDSHAKE_TIMEOUT = 8000;

/** 非主动断开时自动重连：最多 3 次，退避 1s / 2s / 4s */
const MAX_AUTO_RETRY = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

/** 画质固定为均衡档（原「更多 → 画质」菜单已按现场要求移除） */
const QUALITY_LEVEL = 6;
const COMPRESSION_LEVEL = 2;

/**
 * 让 noVNC 优先使用标准 VNC Password 认证。
 *
 * noVNC 1.7 协商安全类型时按服务端返回顺序取第一个它支持的类型。RealVNC 开启
 * VNC Password 认证后会同时广告 RA2ne(6) 与标准 VNC Password(2)，且 6 排在前面；
 * noVNC 选中 6 后需要 RealVNC 账号凭据（用户名），不会自动回退到 2，表现为连接挂起到超时。
 * 本页只提供 VNC 密码，因此把 6 从客户端支持列表排除，让协商落到标准 VNC Password(2)。
 * 若服务器完全不提供类型 2，会得到明确的「不支持的 security types」错误，而不是无声挂起。
 */
function preferVncPasswordAuth(RFBClass: RFBConstructor) {
    const proto = RFBClass.prototype as unknown as {
        _isSupportedSecurityType?: (type: number) => boolean;
        __dshPrefersVncPassword?: boolean;
    };
    const original = proto._isSupportedSecurityType;
    if (typeof original !== "function" || proto.__dshPrefersVncPassword) return;
    proto._isSupportedSecurityType = function (this: unknown, type: number) {
        if (type === 6) return false;
        return original.call(this, type);
    };
    proto.__dshPrefersVncPassword = true;
}

export interface UseVncSessionOptions {
    /** 初始是否只读（默认只读，用户可在工具栏切换） */
    viewOnly?: boolean;
}

/**
 * noVNC 会话管理。
 *
 * 设计要点：
 * 1. RFB 实例放 ref 而不是 state —— 实例内部持有 canvas / WebSocket，任何 setState 重建都会断线；
 * 2. 每次连接分配递增的 session id，主动断开或切换设备后旧实例的迟到事件一律忽略，
 *    否则 disconnect 事件会把「连接超时」的精确提示覆盖成通用断线提示；
 * 3. 动态 import：noVNC 约 120KB，不打开「远程画面」标签页就不加载；
 * 4. 非主动断开（设备重启 / 网络抖动 / websockify 重启）自动重连 3 次，退避 1s/2s/4s；
 *    主动「断开」、切换设备、离开页面都会取消重连。
 */
export function useVncSession({ viewOnly: initialViewOnly = true }: UseVncSessionOptions = {}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rfbRef = useRef<RFB | null>(null);
    const sessionRef = useRef(0);
    const timeoutRef = useRef<number | null>(null);
    const retryTimerRef = useRef<number | null>(null);
    const retryAttemptRef = useRef(0);
    const manualRef = useRef(false);
    /** 认证类致命错误：不自动重连（避免把 RealVNC 的失败次数刷到黑名单） */
    const fatalRef = useRef(false);
    const connectArgsRef = useRef<{ wsUrl: string; password?: string } | null>(null);
    const viewOnlyRef = useRef(initialViewOnly);
    const openRef = useRef<((wsUrl: string, password?: string) => Promise<void>) | null>(null);

    const [status, setStatus] = useState<VncStatus>("idle");
    const [error, setError] = useState("");
    const [desktopName, setDesktopName] = useState("");
    const [viewOnly, setViewOnlyState] = useState(initialViewOnly);

    const clearHandshakeTimer = useCallback(() => {
        if (timeoutRef.current != null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const clearRetryTimer = useCallback(() => {
        if (retryTimerRef.current != null) {
            window.clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, []);

    const teardown = useCallback(() => {
        sessionRef.current += 1;
        clearHandshakeTimer();
        const rfb = rfbRef.current;
        rfbRef.current = null;
        if (rfb) {
            try {
                rfb.disconnect();
            } catch {
                // noVNC 内部可能已经断开，忽略
            }
        }
    }, [clearHandshakeTimer]);

    const connect = useCallback(
        async (wsUrl: string, password?: string) => {
            manualRef.current = false;
            fatalRef.current = false;
            retryAttemptRef.current = 0;
            clearRetryTimer();
            connectArgsRef.current = { wsUrl, password };
            await openRef.current?.(wsUrl, password);
        },
        [clearRetryTimer],
    );

    const open = useCallback(
        async (wsUrl: string, password?: string) => {
            const target = containerRef.current;
            if (!target) {
                setStatus("error");
                setError("画面容器未就绪，请重试");
                return;
            }

            teardown();
            fatalRef.current = false;
            const session = sessionRef.current;
            setError("");
            setDesktopName("");
            setStatus("connecting");

            let RFBClass: RFBConstructor;
            try {
                const module = await import("@novnc/novnc");
                RFBClass = module.default;
            } catch {
                if (sessionRef.current !== session) return;
                setStatus("error");
                setError("noVNC 资源加载失败，请刷新页面后重试");
                return;
            }
            if (sessionRef.current !== session) return;

            preferVncPasswordAuth(RFBClass);

            let rfb: RFB;
            try {
                rfb = new RFBClass(target, wsUrl, {
                    shared: true,
                    ...(password != null ? { credentials: { password } } : {}),
                });
            } catch {
                if (sessionRef.current === session) {
                    setStatus("error");
                    setError("无法创建 VNC 连接");
                }
                return;
            }

            rfb.viewOnly = viewOnlyRef.current;
            rfb.scaleViewport = true;
            rfb.resizeSession = false;
            rfb.background = "#11181C";
            rfb.qualityLevel = QUALITY_LEVEL;
            rfb.compressionLevel = COMPRESSION_LEVEL;

            const isCurrent = () => sessionRef.current === session && rfbRef.current === rfb;

            rfb.addEventListener("connect", () => {
                if (!isCurrent()) return;
                clearHandshakeTimer();
                retryAttemptRef.current = 0;
                setStatus("connected");
                setError("");
            });

            rfb.addEventListener("desktopname", (event) => {
                if (isCurrent()) setDesktopName(event?.detail?.name ?? "");
            });

            rfb.addEventListener("credentialsrequired", () => {
                if (!isCurrent()) return;
                fatalRef.current = true;
                clearHandshakeTimer();
                setStatus("need-password");
                setError("该设备需要 VNC 密码，请联系现场运维确认");
            });

            rfb.addEventListener("securityfailure", (event) => {
                if (!isCurrent()) return;
                fatalRef.current = true;
                clearHandshakeTimer();
                const detail = event?.detail ?? {};
                setStatus("error");
                setError(
                    `安全验证失败${detail.status != null ? `（${detail.status}）` : ""}${
                        detail.reason ? `：${detail.reason}` : ""
                    }`,
                );
            });

            rfb.addEventListener("disconnect", (event) => {
                if (!isCurrent()) return;
                rfbRef.current = null;
                clearHandshakeTimer();

                if (event?.detail?.clean || manualRef.current) {
                    retryAttemptRef.current = 0;
                    setStatus("disconnected");
                    return;
                }

                // 认证/密码类错误重试也不会成功，且 RealVNC 连续失败会封 IP，直接保留错误提示
                if (fatalRef.current) {
                    fatalRef.current = false;
                    setStatus("error");
                    return;
                }

                const attempt = retryAttemptRef.current + 1;
                if (attempt > MAX_AUTO_RETRY) {
                    retryAttemptRef.current = 0;
                    setStatus("error");
                    setError(
                        `连接已断开，自动重连 ${MAX_AUTO_RETRY} 次仍失败：请确认设备在线、RealVNC 已启动且 websockify 服务正常`,
                    );
                    return;
                }

                retryAttemptRef.current = attempt;
                const delay = RETRY_DELAYS[attempt - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
                setStatus("reconnecting");
                setError(`连接已断开，${Math.round(delay / 1000)}s 后自动重连（${attempt}/${MAX_AUTO_RETRY}）`);

                clearRetryTimer();
                retryTimerRef.current = window.setTimeout(() => {
                    retryTimerRef.current = null;
                    if (manualRef.current) return;
                    const args = connectArgsRef.current;
                    if (args) void openRef.current?.(args.wsUrl, args.password);
                }, delay);
            });

            rfbRef.current = rfb;
            timeoutRef.current = window.setTimeout(() => {
                if (!isCurrent()) return;
                setStatus("error");
                setError("连接超时：请确认设备已开机、RealVNC 监听 5900 端口，且 websockify 服务已启动");
                teardown();
            }, HANDSHAKE_TIMEOUT);
        },
        [clearHandshakeTimer, clearRetryTimer, teardown],
    );

    // 供自动重连的定时器回调使用（open 需要引用自身重连）
    openRef.current = open;

    /** 主动断开：取消自动重连并释放连接 */
    const disconnect = useCallback(() => {
        manualRef.current = true;
        retryAttemptRef.current = 0;
        clearRetryTimer();
        teardown();
        setStatus("disconnected");
    }, [clearRetryTimer, teardown]);

    /** 切换「适应窗口 / 1:1」：直接改 RFB 属性，不需要重连 */
    const setScaleViewport = useCallback((enabled: boolean) => {
        if (rfbRef.current) {
            rfbRef.current.scaleViewport = enabled;
        }
    }, []);

    /** 切换只读 / 可操作：可操作后 noVNC 会接管鼠标键盘 */
    const setViewOnly = useCallback((enabled: boolean) => {
        viewOnlyRef.current = enabled;
        setViewOnlyState(enabled);
        if (rfbRef.current) {
            rfbRef.current.viewOnly = enabled;
        }
    }, []);

    useEffect(
        () => () => {
            manualRef.current = true;
            clearRetryTimer();
            teardown();
        },
        [clearRetryTimer, teardown],
    );

    return {
        containerRef,
        status,
        error,
        desktopName,
        viewOnly,
        connect,
        disconnect,
        setScaleViewport,
        setViewOnly,
    };
}
