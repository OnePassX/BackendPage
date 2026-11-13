import { memo } from "react";
import { Handle, Position, useConnection, type ConnectionState } from "@xyflow/react";
import { Columns2, MoreHorizontalIcon, PlusIcon, PencilIcon, Trash2Icon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ButtonHandle } from "@/components/xyflow/button-handle";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuGroup
} from "@/components/ui/dropdown-menu";

import { useFlowActions } from "./flowContext";

const selector = (connection: ConnectionState) => {
    return connection.inProgress;
};

function MachineNode({ data, selected }) {
    const actions = useFlowActions();
    const connectionInProgress = useConnection(selector);

    return (
        <div className={`w-44 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow ${ selected ? "ring-4 ring-black/40 dark:ring-white/80" : ""}`}>
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-lg border-b border-border bg-blue-600/80 px-3 py-2 text-white">
                <div className="flex items-center gap-2 min-w-0">
                    <Columns2 className="size-4 shrink-0 " />
                    <span className="text-sm font-medium truncate">{data.label}</span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="nodrag size-6 shrink-0">
                            <MoreHorizontalIcon className="size-3.5" />
                        </Button>
                    } />
                    <DropdownMenuContent align="end" className="min-w-28">
                        <DropdownMenuGroup>
                            {/* <DropdownMenuItem onClick={() => actions.onAddChild(data)}>
                                <PlusIcon className="mr-2 size-4" />
                                添加展项
                            </DropdownMenuItem> */}
                            <DropdownMenuItem onClick={() => actions.onEdit(data)}>
                                <PencilIcon className="mr-2 size-4" />
                                编辑展区
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => actions.onDelete(data)}
                            >
                                <Trash2Icon className="mr-2 size-4" />
                                删除展区
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Body */}
            <div className="px-3 py-2 space-y-1.5">
                {data.summary && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2">
                        {data.summary}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">状态</span>
                    <Badge
                        variant={data.show === 1 ? "default" : "secondary"}
                        className="h-5 text-[10px] px-1.5"
                    >
                        {data.show === 1 ? "显示" : "隐藏"}
                    </Badge>
                </div>
            </div>
            <Separator />
            <div className="h-4 bg-muted/50 rounded-b-lg"></div>
            {/* Handles */}
            <Handle
                id="machine"
                type="target"
                position={Position.Top}
                className="size-3! border-2! border-background! bg-blue-500!"
            />
            {/* <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!size-3 !border-2 !border-background !bg-primary"
                /> */}
            <ButtonHandle
                id="machine_exhibit"
                type="source"
                className=" bg-blue-500!"
                position={Position.Bottom}
                showButton={!connectionInProgress}
                showLabel={true}
                title={'展项'}
            >
                <Button
                    onClick={() => actions.onAddChild(data,'exhibit')}
                    size="xs"
                    variant="secondary"
                    className="size-6! rounded-full!"
                >
                    <Plus className="size-3" />
                </Button>
            </ButtonHandle>
        </div>
    );
}

export default memo(MachineNode);
