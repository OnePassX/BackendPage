import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    MdDesktopWindows,
    MdFullscreen,
    MdFullscreenExit,
    MdKeyboard,
    MdLock,
} from "react-icons/md";
import { get_Global_Device } from "@/api/quick.js";
import { useVncSession, type VncStatus } from "./useVncSession";

/** 支持远程画面的设备类型：3=电脑主机、4=一体机（与设备探活可启用类型一致） */
const VNC_DEVICE_TYPES = [3, 4];

/**
 * 第一版 VNC 密码固定（现场统一为 12345678，RealVNC 侧同一密码）。
 * 后续改由后端接口下发时，只需把这里换成接口返回值，见 docs/design/quick-create-vnc.md §6.3。
 * 注意：密码原样传递，不能 trim。
 */
const VNC_PASSWORD = import.meta.env.VITE_VNC_PASSWORD ?? "12345678";

/**
 * RealVNC 的 RFB 端口，现场统一 5900。
 * token 采用「目标地址」形式（见 websockify 插件 docs/deploy/websockify/vnc_target_plugin.py），
 * 因此端口必须和 websockify 插件允许的端口一致。
 */
const VNC_PORT = Number(import.meta.env.VITE_VNC_PORT ?? 5900);

/**
 * WebSocket 基地址。
 * 默认走页面同源：dev 由 Vite `/websockify` 代理转发到控制服务器，生产由 nginx 反代转发；
 * 如需直连 websockify（例如临时联调），可用 VITE_VNC_WS_BASE=ws://192.168.4.43:6080 覆盖。
 */
const VNC_WS_BASE =
    (import.meta.env.VITE_VNC_WS_BASE as string | undefined) ??
    `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

interface VncDevice {
    id: number;
    name: string;
    ip: string;
    typeName: string;
    /** undefined = 接口未返回在线状态（整馆设备接口没有该字段） */
    online?: boolean;
}

interface VncPanelProps {
    /** 当前展项的设备列表（/main/api/getDevice 返回的 data） */
    devices: any[];
    exhibitName?: string;
}

const STATUS_META: Record<VncStatus, { label: string; className: string }> = {
    idle: { label: "未连接", className: "bg-gray-500/15 text-gray-500" },
    connecting: { label: "连接中", className: "bg-blue-500/15 text-blue-600" },
    connected: { label: "已连接", className: "bg-emerald-500/15 text-emerald-600" },
    "need-password": { label: "需要密码", className: "bg-amber-500/15 text-amber-600" },
    reconnecting: { label: "重连中", className: "bg-amber-500/15 text-amber-600" },
    disconnected: { label: "未连接", className: "bg-gray-500/15 text-gray-500" },
    error: { label: "连接失败", className: "bg-red-500/15 text-red-500" },
};

/** 把两种接口返回的设备行归一化成远程画面需要的字段，不支持的设备返回 null */
function toVncDevice(device: any): VncDevice | null {
    const id = Number(device?.id ?? 0);
    const typeId = Number(device?.deviceTypeId ?? 0);
    const ip: string = device?.deviceIp ?? "";
    if (!id || !VNC_DEVICE_TYPES.includes(typeId) || !ip) return null;
    const onlineRaw = device?.isOnline;
    return {
        id,
        name: device?.deviceName ?? `设备 ${id}`,
        ip,
        typeName: device?.deviceType ?? (typeId === 3 ? "电脑主机" : "一体机"),
        online: onlineRaw == null ? undefined : Number(onlineRaw) === 1 || onlineRaw === true,
    };
}

export function VncPanel({ devices, exhibitName }: VncPanelProps) {
    const [globalDevices, setGlobalDevices] = useState<any[]>([]);
    const [loadingGlobal, setLoadingGlobal] = useState(false);

    // 整馆设备（area=2）：只在打开本标签页时拉一次；接口会混入 id=0 的总控合成项，统一过滤掉
    useEffect(() => {
        let cancelled = false;
        setLoadingGlobal(true);
        get_Global_Device()
            .then((res: any) => {
                if (cancelled) return;
                setGlobalDevices(res?.data?.code === 200 ? res.data.data ?? [] : []);
            })
            .catch(() => {
                if (!cancelled) setGlobalDevices([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingGlobal(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const exhibitDevices = useMemo(
        () => (devices ?? []).map(toVncDevice).filter((d): d is VncDevice => d != null),
        [devices],
    );
    const globalVncDevices = useMemo(() => {
        const occupied = new Set(exhibitDevices.map((d) => d.id));
        return (globalDevices ?? [])
            .map(toVncDevice)
            .filter((d): d is VncDevice => d != null && !occupied.has(d.id));
    }, [globalDevices, exhibitDevices]);
    const allDevices = useMemo(
        () => [...exhibitDevices, ...globalVncDevices],
        [exhibitDevices, globalVncDevices],
    );

    const [selectedId, setSelectedId] = useState<number | null>(null);
    useEffect(() => {
        setSelectedId((prev) => {
            if (prev != null && allDevices.some((d) => d.id === prev)) return prev;
            return allDevices[0]?.id ?? null;
        });
    }, [allDevices]);

    const {
        containerRef,
        status,
        error,
        desktopName,
        viewOnly,
        connect,
        disconnect,
        setScaleViewport,
        setViewOnly,
    } = useVncSession();

    const [scaleViewport, setScaleViewportState] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);
    const panelRef = useRef<HTMLDivElement | null>(null);

    const selectedDevice = allDevices.find((d) => d.id === selectedId) ?? null;
    const connected = status === "connected";
    const busy = status === "connecting";
    const reconnecting = status === "reconnecting";

    useEffect(() => {
        const onFullscreenChange = () => setFullscreen(document.fullscreenElement === panelRef.current);
        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    const handleSelect = (device: VncDevice) => {
        if (device.id === selectedId) return;
        if (connected || busy || reconnecting) disconnect();
        setSelectedId(device.id);
    };

    const handleConnect = () => {
        if (!selectedDevice) return;
        // token 直接使用设备 IP + VNC 端口：websockify 侧用 IpPortTokenPlugin 解析，
        // 不再依赖 vnc_tokens.cfg 映射文件（见 docs/design/quick-create-vnc.md §7.1）。
        const target = `${selectedDevice.ip}:${VNC_PORT}`;
        const wsUrl = `${VNC_WS_BASE.replace(/\/$/, "")}/websockify?token=${encodeURIComponent(target)}`;
        void connect(wsUrl, VNC_PASSWORD);
    };

    const handleToggleScale = () => {
        const next = !scaleViewport;
        setScaleViewportState(next);
        setScaleViewport(next);
    };

    const handleToggleFullscreen = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen?.();
        } else {
            void panelRef.current?.requestFullscreen?.();
        }
    };

    const handleToggleViewOnly = () => {
        setViewOnly(!viewOnly);
    };

    return (
        <div
            ref={panelRef}
            className="bg-secondary shadow-md rounded-lg w-full h-full flex flex-row overflow-hidden"
        >
            {/* 设备列表 */}
            <div className="w-64 shrink-0 h-full flex flex-col border-r border-[#888888]/20">
                <div className="h-14 shrink-0 flex items-center gap-2 px-3">
                    <div className="bg-current/20 p-2 rounded-lg">
                        <MdDesktopWindows size={20} />
                    </div>
                    <span className="text-sm text-secondary-foreground">远程设备</span>
                    <span className="ml-auto text-xs text-muted-foreground">{allDevices.length}</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 scrollbar-line scroll-smooth">
                    <DeviceGroup
                        title={exhibitName ? `当前展项 · ${exhibitName}` : "当前展项"}
                        devices={exhibitDevices}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        empty="当前展项没有支持远程画面的设备"
                    />
                    <DeviceGroup
                        title="整馆设备"
                        devices={globalVncDevices}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        empty={loadingGlobal ? "正在加载…" : "没有支持远程画面的设备"}
                    />
                </div>
                <div className="shrink-0 border-t border-[#888888]/20 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                    仅电脑主机 / 一体机 · 默认只读，可切换操作
                </div>
            </div>

            {/* 画面区 */}
            <div className="relative flex-1 min-w-0 h-full flex flex-col">
                <div className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-[#888888]/20 overflow-hidden">
                    {selectedDevice ? (
                        <>
                            <span className="truncate text-sm text-secondary-foreground">
                                {selectedDevice.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">{selectedDevice.ip}</span>
                            <span
                                className={cn(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[11px]",
                                    STATUS_META[status].className,
                                )}
                            >
                                {STATUS_META[status].label}
                            </span>
                            {desktopName && (
                                <span className="truncate text-xs text-muted-foreground">{desktopName}</span>
                            )}
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground">未选择设备</span>
                    )}
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!selectedDevice || busy}
                            onClick={connected || reconnecting ? disconnect : handleConnect}
                        >
                            {connected ? "断开" : reconnecting ? "停止重连" : "连接"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={!connected}
                            title={viewOnly ? "当前只读，点击接管鼠标键盘" : "当前可操作，点击切回只读"}
                            onClick={handleToggleViewOnly}
                        >
                            {viewOnly ? <MdLock size={15} /> : <MdKeyboard size={15} />}
                            {viewOnly ? "只读" : "可操作"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!connected}
                            title={scaleViewport ? "切换为 1:1 原始大小" : "切换为适应窗口"}
                            onClick={handleToggleScale}
                        >
                            {scaleViewport ? "1:1" : "适应窗口"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            title={fullscreen ? "退出全屏" : "全屏"}
                            onClick={handleToggleFullscreen}
                        >
                            {fullscreen ? <MdFullscreenExit size={18} /> : <MdFullscreen size={18} />}
                        </Button>
                    </div>
                </div>

                <div className="relative flex-1 min-h-0 bg-[#11181C] overflow-hidden">
                    {/* noVNC 会把 canvas 挂到该容器里；容器必须始终存在，断开时只盖遮罩不清空 */}
                    <div ref={containerRef} className="absolute inset-0" />
                    {!connected && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                            <MdDesktopWindows size={44} className="text-white/30" />
                            <div className="text-sm text-white/80">
                                {busy
                                    ? "正在连接远程设备…"
                                    : reconnecting
                                      ? "连接已断开，正在自动重连…"
                                      : selectedDevice
                                        ? `${selectedDevice.name}（${selectedDevice.ip}）`
                                        : "请选择左侧设备"}
                            </div>
                            {error && <div className="max-w-md text-xs text-red-400">{error}</div>}
                            {!busy && !reconnecting && selectedDevice && (
                                <Button size="sm" variant="secondary" onClick={handleConnect}>
                                    {status === "error" || status === "disconnected" ? "重新连接" : "连接画面"}
                                </Button>
                            )}
                        </div>
                    )}
                    {connected && viewOnly && (
                        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white/80">
                            只读模式 · 点击工具栏「只读」接管鼠标键盘
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DeviceGroup({
    title,
    devices,
    selectedId,
    onSelect,
    empty,
}: {
    title: string;
    devices: VncDevice[];
    selectedId: number | null;
    onSelect: (device: VncDevice) => void;
    empty: string;
}) {
    return (
        <div className="mb-2">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{title}</div>
            {devices.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground/70">{empty}</div>
            ) : (
                devices.map((device) => (
                    <button
                        key={device.id}
                        type="button"
                        onClick={() => onSelect(device)}
                        className={cn(
                            "mb-1 flex w-full flex-col gap-0.5 rounded-lg border border-[#888888]/20 px-2 py-2 text-left text-sm transition-colors",
                            selectedId === device.id ? "bg-current" : "bg-secondary",
                        )}
                    >
                        <span className="flex w-full items-center gap-2">
                            <span
                                className={cn(
                                    "size-1.5 shrink-0 rounded-full",
                                    device.online === false
                                        ? "bg-red-500"
                                        : device.online === true
                                          ? "bg-emerald-500"
                                          : "bg-gray-400",
                                )}
                            />
                            <span className={`truncate text-secondary-foreground`}>{device.name}</span>
                        </span>
                        <span className="truncate pl-3.5 text-xs text-muted-foreground">
                            {device.typeName} · {device.ip}
                        </span>
                    </button>
                ))
            )}
        </div>
    );
}
