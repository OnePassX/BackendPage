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
 * 软件模式节点视图的通用节点。
 *
 * 5 种 kind 共用一个组件，只按 kind 换配色与图标，避免为每种节点写一份重复的 JSX：
 *   mode / pavilion / machine / exhibit / bind
 */

const KIND_STYLE: Record<
    SmodelNodeData["kind"],
    { header: string; icon: typeof Building2; width: string }
> = {
    mode: { header: "bg-slate-800 text-white", icon: Boxes, width: "w-44" },
    pavilion: { header: "bg-blue-800/85 text-white", icon: Building2, width: "w-44" },
    machine: { header: "bg-blue-500/85 text-white", icon: Columns2, width: "w-40" },
    exhibit: { header: "bg-teal-600/85 text-white", icon: GalleryThumbnails, width: "w-44" },
    bind: { header: "bg-amber-600/85 text-white", icon: Boxes, width: "w-52" },
};

function SmodelNode({ data, selected }: NodeProps) {
    const node = data as unknown as SmodelNodeData;
    const style = KIND_STYLE[node.kind] ?? KIND_STYLE.bind;
    const Icon = style.icon;

    // 绑定节点按类型换色：内容=琥珀，设备=绿色
    const bindHeader =
        node.kind === "bind"
            ? node.bind?.type === 2
                ? "bg-emerald-600/85 text-white"
                : "bg-amber-600/85 text-white"
            : style.header;

    const dimmed = node.unbound;
    const danger = node.missingCode;

    return (
        <div
            className={[
                style.width,
                "rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md",
                danger ? "border-destructive/60" : "border-border",
                dimmed ? "border-dashed opacity-60" : "",
                selected ? "ring-4 ring-black/40 dark:ring-white/80" : "",
            ].join(" ")}
        >
            <div className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 ${bindHeader}`}>
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate text-xs font-semibold">{node.label}</span>
                {node.kind === "mode" && (
                    <Badge variant="secondary" className="ml-auto h-4 px-1 text-[9px]">模式</Badge>
                )}
            </div>

            <div className="space-y-1 px-3 py-1.5">
                {node.sub && (
                    <div className="truncate text-[10px] text-muted-foreground">{node.sub}</div>
                )}

                {node.kind === "bind" && node.bind && (
                    <>
                        <div className="flex items-center gap-1">
                            <Badge
                                variant="outline"
                                className="h-4 px-1 text-[9px]"
                            >
                                {node.bind.type === 2 ? "设备" : "内容"}
                            </Badge>
                            <span className="truncate text-[11px]">{node.bind.bind?.name || "-"}</span>
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                            {node.bind.code
                                ? `${node.bind.code.name} · ${node.bind.code.protocal}/${node.bind.code.port}`
                                : "未配置命令"}
                        </div>
                        {node.bind.delay > 0 && (
                            <div className="text-[10px] text-muted-foreground">延时 +{node.bind.delay}ms</div>
                        )}
                    </>
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

                {danger && (
                    <div className="flex items-center gap-1 text-[10px] text-destructive">
                        <TriangleAlert className="size-3" /> 未配置命令
                    </div>
                )}
            </div>

            <Handle
                type="target"
                position={Position.Left}
                className="size-2.5! border-2! border-background! bg-muted-foreground!"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="size-2.5! border-2! border-background! bg-muted-foreground!"
            />
        </div>
    );
}

export default memo(SmodelNode);
