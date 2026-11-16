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
import { Separator } from "@/components/ui/separator";
import type { SmodelNodeData } from "./types";

/**
 * 模式节点视图的通用节点。
 *
 * 5 种 kind 共用一个组件，只按 kind 换配色与图标：
 *   mode / pavilion / machine / exhibit —— 树节点卡片
 *   bind —— 绑定卡片（头部 + 类型徽标/对象名 + 命令 + 延时）
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

const BIND_HEADER: Record<"content" | "device" | "hardware", string> = {
    content: "bg-amber-600/85 text-white",
    device: "bg-emerald-600/85 text-white",
    hardware: "bg-indigo-600/85 text-white",
};

function SmodelNode({ data, selected }: NodeProps) {
    const node = data as unknown as SmodelNodeData;

    // ── 绑定节点：卡片 ──
    if (node.kind === "bind" && node.bind) {
        const b = node.bind;

        return (
            <div
                className={[
                    "w-44 rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md",
                    b.code ? "border-border" : "border-destructive/60",
                    node.hidden ? "border-dashed opacity-60" : "",
                    selected ? "ring-4 ring-black/40 dark:ring-white/80" : "",
                ].join(" ")}
            >
                <div className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 ${BIND_HEADER[b.bindKind]}`}>
                    <Boxes className="size-3.5 shrink-0" />
                    <span className="truncate text-xs font-semibold">{node.label}</span>
                    {node.hidden && (
                        <Badge variant="secondary" className="ml-auto h-4 px-1 text-[9px]">隐藏</Badge>
                    )}
                </div>

                <div className="space-y-1 px-3 py-1.5">
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px]">{b.badge}</Badge>
                        <span className="truncate text-[11px] font-medium">{b.bindName || "-"}</span>
                    </div>
                    <div className={`truncate text-[10px]`}>
                        {
                        b.code ? 
                            <>
                                <div className="w-full flex flex-row justify-between items-center">
                                    <span className="text-[13px]">{b.code.name}</span>
                                    <span>延时:<Badge variant="destructive" className="h-4">{b.delay}</Badge>ms</span>
                                </div>
                                <div className="w-full flex flex-row justify-start items-center gap-2 text-muted-foreground">
                                    <span>{b.code.port}</span>
                                    <Separator orientation="vertical"/>
                                    <span>{b.code.format}</span>
                                    <Separator orientation="vertical"/>
                                    <span>{b.code.protocal}</span>
                                </div>
                                <span>CODE: {b.code.code}</span>
                            </> 
                        : 
                            <span className="inline-flex items-center gap-1">
                                <TriangleAlert className="size-3" />未配置命令
                            </span>
                        }
                    </div>
                    
                </div>

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
