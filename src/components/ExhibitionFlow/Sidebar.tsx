import { useCallback, type DragEvent } from "react";
import { Building2Icon, Columns2, GalleryThumbnails, MonitorIcon, PanelLeftIcon } from "lucide-react";
import type { FlowNodeData } from "./types";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

const ITEMS = [
    {
        kind: "pavilion" as const,
        label: "添加展厅",
        icon: Building2Icon,
        desc: "展馆",
        color: "text-primary",
        bg: "bg-primary/10 hover:bg-primary/15",
    },
    {
        kind: "machine" as const,
        label: "添加展区",
        icon: Columns2,
        desc: "不绑定展厅，创建后出现在「未连接展区」，拖到展厅即可关联",
        color: "text-blue-600",
        bg: "bg-blue-500/10 hover:bg-blue-500/15",
    },
    {
        kind: "exhibit" as const,
        label: "添加展项",
        icon: GalleryThumbnails,
        desc: "不绑定展区，创建后出现在「未连接展项」，拖到展区即可关联",
        color: "text-emerald-600",
        bg: "bg-emerald-500/10 hover:bg-emerald-500/15",
    },
];

// DataTransfer key carrying a dragged unlinked item (JSON { kind, id }).
export const UNLINKED_DRAG_KEY = "application/reactflow-unlinked";

const UNLINKED_GROUPS = [
    { key: "machines", title: "未连接展区", icon: Columns2 },
    { key: "exhibits", title: "未连接展项", icon: GalleryThumbnails },
    { key: "devices", title: "未连接设备", icon: MonitorIcon },
] as const;

interface SidebarProps {
    onAdd: (kind: "pavilion" | "machine" | "exhibit") => void;
    unlinked: {
        machines: FlowNodeData[];
        exhibits: FlowNodeData[];
        devices: FlowNodeData[];
    };
    open: boolean;
}

export function Sidebar({ onAdd, unlinked, open }: SidebarProps) {

    const onDragStart = useCallback(
        (event: DragEvent, kind: string) => {
            event.dataTransfer.setData("application/reactflow", kind);
            event.dataTransfer.effectAllowed = "move";
        },
        [],
    );

    const onDragStartUnlinked = useCallback(
        (event: DragEvent, kind: FlowNodeData["kind"], id: number) => {
            event.dataTransfer.setData(UNLINKED_DRAG_KEY, JSON.stringify({ kind, id }));
            event.dataTransfer.effectAllowed = "move";
        },
        [],
    );

    return (
        <div className={`flex flex-col gap-2 p-2 border-r border-border bg-muted/10 shrink-0 w-48 ${ open ? ' block': ' hidden'} `}>
            <div className="mt-auto pt-2 flex flex-col items-center">
                <span>节点管理</span>
            </div>

            <Separator orientation="horizontal"/>

            {ITEMS.map((item) => (
                <div
                    key={item.kind}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.kind)}
                    onClick={() => onAdd(item.kind)}
                    className={`flex flex-col items-center gap-1 rounded-lg p-2 cursor-grab active:cursor-grabbing transition-colors ${item.bg}`}
                    title={item.desc}
                >
                    <div className={`flex items-center justify-center size-8 rounded-full ${item.bg}`}>
                        <item.icon className={`size-4 ${item.color}`} />
                    </div>
                    <span className="text-[9px] text-muted-foreground leading-tight text-center">
                        {item.label}
                    </span>
                </div>
            ))}
            
            <Separator orientation="horizontal"/>

            <div className="flex-1 min-h-0 pt-2 flex flex-col gap-2 overflow-y-auto">
                <span className="text-sm text-muted-foreground text-center">未连接节点</span>
                {UNLINKED_GROUPS.map((group) => {
                    const items = unlinked[group.key];
                    if (items.length === 0) return null;
                    return (
                        <div key={group.key} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 px-1 text-sm text-muted-foreground">
                                <group.icon className="size-3" />
                                <span>{group.title}</span>
                                <span className="ml-auto rounded bg-muted px-1">{items.length}</span>
                            </div>
                            {items.map((node) => (
                                <button
                                    key={node.id}
                                    type="button"
                                    draggable
                                    onDragStart={(e) => onDragStartUnlinked(e, node.kind, node.id)}
                                    className="truncate rounded px-1.5 py-1 text-left text-[10px] text-foreground/80 hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
                                    title={node.label}
                                >
                                    {node.label}
                                </button>
                            ))}
                        </div>
                    );
                })}
            </div>

            <Separator orientation="horizontal"/>

            <div className="mt-auto border-border pt-2">
                <div className="flex flex-col items-center gap-0.5 text-sm text-muted-foreground text-center leading-tight">
                    <span>可将节点拖拽到</span>
                    <span>画布添加</span>
                </div>
            </div>
        </div>
        
    );
}
