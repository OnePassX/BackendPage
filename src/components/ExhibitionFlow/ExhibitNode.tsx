import { memo } from "react";
import { Handle, Position, useConnection, type ConnectionState } from "@xyflow/react";
import { GalleryThumbnails, PencilIcon, Trash2Icon, MoreHorizontalIcon, FileIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonHandle } from "@/components/xyflow/button-handle";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFlowActions } from "./flowContext";

const onClick = () => {
    window.alert(`Handle button has been clicked!`);
};

const selector = (connection: ConnectionState) => {
    return connection.inProgress;
};


function ExhibitNode({ data, selected }) {
    // console.log(data)
    const actions = useFlowActions();
    const connectionInProgress = useConnection(selector);

    return (
        <div
            className={`w-44 rounded-lg border bg-card shadow-sm transition-all ${selected
                    ? "border-primary shadow-md ring-1 ring-primary/20"
                    : "border-border hover:shadow-md"
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-lg border-b border-border bg-blue-400 px-3 py-2 text-primary-foreground">
                <div className="flex items-center gap-2 min-w-0">
                    <GalleryThumbnails className="size-4 shrink-0" />
                    <span className="text-sm font-medium truncate">{data.label}</span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="nodrag size-6 shrink-0">
                            <MoreHorizontalIcon className="size-3.5" />
                        </Button>
                    } />
                    <DropdownMenuContent align="end" className="min-w-28">
                        <DropdownMenuItem onClick={() => actions.onEdit(data)}>
                            <PencilIcon className="mr-2 size-4" />
                            编辑展项
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => actions.onDelete(data)}
                        >
                            <Trash2Icon className="mr-2 size-4" />
                            删除展项
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem onClick={() => actions.onSelectExhibit(data)}>
                            <FileIcon className="mr-2 size-4" />
                            编辑内容
                        </DropdownMenuItem> */}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Body */}
            <div className="px-3 py-2 space-y-1.5">
                {data.summary && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2 flex flex-row justify-between"> 
                        <span>ID : {data.id}</span>
                        <span>{data.summary}</span>
                    </div>
                )}
                {data.e_ip && (
                    <div className="flex flex-row justify-between items-center">
                        <span className="text-[11px] text-muted-foreground line-clamp-2 ">展项 IP :</span>
                        <span className="text-[11px] text-muted-foreground line-clamp-2 ">{data.e_ip}</span>
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
            <div className="h-4 bg-muted/50"></div>
            {/* Target handle at top */}
            <Handle
                id="exhibit"
                type="target"
                position={Position.Top}
                className="size-3! border-2! border-background! bg-blue-500!"
            />
            <ButtonHandle
                id="exhibit_manage"
                type="source"
                className="left-1/3! bg-yellow-500!"
                position={Position.Bottom}
                showButton={!connectionInProgress}
                showLabel={true}
                title={'内容'}
            >
                <Button
                    onClick={onClick}
                    size="xs"
                    variant="secondary"
                    className="size-6! rounded-full!"
                >
                    <Plus className="size-3" />
                </Button>
            </ButtonHandle>

            <ButtonHandle
                id="exhibit_device"
                type="source"
                className="left-2/3! bg-green-500!"
                position={Position.Bottom}
                showButton={!connectionInProgress}
                showLabel={true}
                title={'设备'}
            >
                <Button
                    onClick={()=>actions.onAddChild(data,'device')}
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

export default memo(ExhibitNode);
