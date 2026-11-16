import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
    Boxes,
    Building2,
    CircleSlash2,
    Columns2,
    GalleryThumbnails,
    TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SmodelNodeData } from "./types";

/**
 * 模式节点视图的通用节点。
 *
 * 5 种 kind 共用一个组件：
 *   mode / pavilion / machine / exhibit —— 卡片式（头部 + 内容）
 *   bind —— 紧凑胶囊式，横向平铺时不会太高：
 *            软件模式 2 行（类型+对象 / 命令）
 *            硬件模式 1 行（类型+设备+命令）
 */

const KIND_STYLE: Record<
    "mode" | "pavilion" | "machine" | "exhibit",
    { header: string; icon: typeof Building2; width: string }
> = {
    mode: { header: "bg-slate-800 text-white", icon: Boxes, width: "w-44" },
    pavilion: { header: "bg-blue-800/85 text-white", icon: Building2, width: "w-44" },
    machine: { header: "bg-blue-500/85 text-white", icon: Columns2, width: "w-40" },
    exhibit: { header: "bg-teal-600/85 text-white", icon: GalleryThumbnails, width: "w-44" },
};

const BIND_STYLE: Record<"content" | "device" | "hardware", string> = {
    content: "border-amber-500/60 bg-amber-50 dark:bg-amber-950/40",
    device: "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40",
    hardware: "border-indigo-500/60 bg-indigo-50 dark:bg-indigo-950/40",
};

const BIND_BADGE: Record<"content" | "device" | "hardware", string> = {
    content: "bg-amber-600 text-white",
    device: "bg-emerald-600 text-white",
    hardware: "bg-indigo-600 text-white",
};

function SmodelNode({ data, selected }: NodeProps) {
    const node = data as unknown as SmodelNodeData;

    // ── 绑定节点：紧凑胶囊，软件 2 行 / 硬件 1 行 ──
    if (node.kind === "bind" && node.bind) {
        const b = node.bind;
        const oneLine = b.bindKind === "hardware";
        const command = b.code
            ? `${b.code.name}${b.code.protocal ? ` · ${b.code.protocal}` : ""}${b.code.port != null ? `/${b.code.port}` : ""}`
            : "未配置命令";

        return (
            <div
                title={`${b.bindName || "-"}${command ? ` · ${command}` : ""}${b.delay > 0 ? ` · 延时 +${b.delay}ms` : ""}`}
                className={[
                    "w-52 rounded-md border px-2 py-1 shadow-sm transition-shadow hover:shadow-md",
                    BIND_STYLE[b.bindKind],
                    b.code ? "" : "border-destructive/60 border-dashed",
                    selected ? "ring-4 ring-black/40 dark:ring-white/80" : "",
                ].join(" ")}
            >
                <div className="flex items-center gap-1">
                    <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold ${BIND_BADGE[b.bindKind]}`}>
                        {b.badge}
                    </span>
                    <span className="truncate text-[11px] font-medium">{b.bindName || "-"}</span>
                    {oneLine && (
                        <span className="ml-1 truncate text-[10px] text-muted-foreground">{command}</span>
                    )}
                    {b.delay > 0 && (
                        <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">+{b.delay}ms</span>
                    )}
                </div>

                {!oneLine && (
                    <div className={`truncate text-[10px] ${b.code ? "text-muted-foreground" : "text-destructive"}`}>
                        {b.code ? command : <span className="inline-flex items-center gap-1"><TriangleAlert className="size-3" />{command}</span>}
                    </div>
                )}

                <Handle type="target" position={Position.Top} className="size-2.5! border-2! border-background! bg-muted-foreground!" />
                <Handle type="source" position={Position.Bottom} className="size-2.5! border-2! border-background! bg-muted-foreground!" />
            </div>
        );
    }

    // ── 树节点：卡片 ──
    const kind = (node.kind === "bind" ? "exhibit" : node.kind) as keyof typeof KIND_STYLE;
    const style = KIND_STYLE[kind] ?? KIND_STYLE.exhibit;
    const Icon = style.icon;
    const dimmed = node.unbound;

    return (
        <div
            className={[
                style.width,
                "rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md",
                node.missingCode ? "border-destructive/60" : "border-border",
                dimmed || node.hidden ? "border-dashed opacity-60" : "",
                selected ? "ring-4 ring-black/40 dark:ring-white/80" : "",
            ].join(" ")}
        >
            <div className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 ${style.header}`}>
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate text-xs font-semibold">{node.label}</span>
                {node.kind === "mode" ? (
                    <Badge variant="secondary" className="ml-auto h-4 px-1 text-[9px]">模式</Badge>
                ) : node.hidden ? (
                    <Badge variant="secondary" className="ml-auto h-4 px-1 text-[9px]">隐藏</Badge>
                ) : null}
            </div>

            <div className="space-y-1 px-3 py-1.5">
                {node.sub && (
                    <div className="truncate text-[10px] text-muted-foreground">{node.sub}</div>
                )}

                {node.kind === "exhibit" && (
                    <div className="flex items-center gap-1">
                        {node.unbound ? (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <CircleSlash2 className="size-3" /> 该模式未绑定
                            </span>
                        ) : (
                            <span className="text-[10px] text-muted-foreground">{node.sub}</span>
                        )}
                    </div>
                )}
            </div>

            <Handle type="target" position={Position.Top} className="size-2.5! border-2! border-background! bg-muted-foreground!" />
            <Handle type="source" position={Position.Bottom} className="size-2.5! border-2! border-background! bg-muted-foreground!" />
        </div>
    );
}

export default memo(SmodelNode);
