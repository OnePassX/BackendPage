import { useCallback, useEffect, useRef, useState } from "react";
import type RFB from "@novnc/novnc";
import type { RFBConstructor } from "@novnc/novnc";

/** 远程画面会话状态 */
export type VncStatus =
    | "idle"
    | "connecting"
    | "connected"
    | "need-password"
    | "disconnected"
    | "error";

/** 握手超时：设备没开 / websockify 没启动时不让用户无限等待 */
const HANDSHAKE_TIMEOUT = 8000;

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

/**
 * noVNC 会话管理。
 *
 * 设计要点：
 * 1. RFB 实例放 ref 而不是 state —— 实例内部持有 canvas / WebSocket，任何 setState 重建都会断线；
 * 2. 每次连接分配递增的 session id，主动断开或切换设备后旧实例的迟到事件一律忽略，
 *    否则 disconnect 事件会把「连接超时」的精确提示覆盖成通用断线提示；
 * 3. 动态 import：noVNC 约 120KB，不打开「远程画面」标签页就不加载。
 */
export function useVncSession({ viewOnly = true }: { viewOnly?: boolean } = {}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rfbRef = useRef<RFB | null>(null);
    const sessionRef = useRef(0);
    const timeoutRef = useRef<number | null>(null);

    const [status, setStatus] = useState<VncStatus>("idle");
    const [error, setError] = useState("");
    const [desktopName, setDesktopName] = useState("");

    const teardown = useCallback(() => {
        sessionRef.current += 1;
        if (timeoutRef.current != null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        const rfb = rfbRef.current;
        rfbRef.current = null;
        if (rfb) {
            try {
                rfb.disconnect();
            } catch {
                // noVNC 内部可能已经断开，忽略
            }
        }
    }, []);

    const disconnect = useCallback(() => {
        teardown();
        setStatus("disconnected");
    }, [teardown]);

    const connect = useCallback(
        async (wsUrl: string, password?: string) => {
            const target = containerRef.current;
            if (!target) {
                setStatus("error");
                setError("画面容器未就绪，请重试");
                return;
            }

            teardown();
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

            rfb.viewOnly = viewOnly;
            rfb.scaleViewport = true;
            rfb.resizeSession = false;
            rfb.background = "#11181C";
            rfb.qualityLevel = 6;
            rfb.compressionLevel = 2;

            const isCurrent = () => sessionRef.current === session && rfbRef.current === rfb;

            rfb.addEventListener("connect", () => {
                if (!isCurrent()) return;
                if (timeoutRef.current != null) {
                    window.clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
                setStatus("connected");
            });

            rfb.addEventListener("desktopname", (event) => {
                if (isCurrent()) setDesktopName(event?.detail?.name ?? "");
            });

            rfb.addEventListener("credentialsrequired", () => {
                if (!isCurrent()) return;
                setStatus("need-password");
                setError("该设备需要 VNC 密码，请联系现场运维确认");
            });

            rfb.addEventListener("securityfailure", (event) => {
                if (!isCurrent()) return;
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
                if (timeoutRef.current != null) {
                    window.clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
                if (event?.detail?.clean) {
                    setStatus("disconnected");
                } else {
                    setStatus("error");
                    setError("连接已断开：请确认设备在线、RealVNC 已启动且 websockify 服务正常");
                }
            });

            rfbRef.current = rfb;
            timeoutRef.current = window.setTimeout(() => {
                if (!isCurrent()) return;
                setStatus("error");
                setError("连接超时：请确认设备已开机、RealVNC 监听 5900 端口，且 websockify 服务已启动");
                teardown();
            }, HANDSHAKE_TIMEOUT);
        },
        [teardown, viewOnly],
    );

    /** 切换「适应窗口 / 1:1」：直接改 RFB 属性，不需要重连 */
    const setScaleViewport = useCallback((enabled: boolean) => {
        if (rfbRef.current) {
            rfbRef.current.scaleViewport = enabled;
        }
    }, []);

    useEffect(
        () => () => {
            teardown();
        },
        [teardown],
    );

    return { containerRef, status, error, desktopName, connect, disconnect, setScaleViewport };
}
