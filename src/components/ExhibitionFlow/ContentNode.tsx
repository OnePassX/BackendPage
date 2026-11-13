import { memo } from "react";
import { Handle, Position, useConnection, type ConnectionState } from "@xyflow/react";
import { ImageIcon, PencilIcon, Trash2Icon, MoreHorizontalIcon, Code, Plus } from "lucide-react";
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
import { IconList } from "@/assets/index";

const bgColor = {
    1: "bg-linear-120 from-80% from-yellow-500/80 to-100% to-red-500/80",
    2: "bg-linear-120 from-80% from-yellow-500/80 to-100% to-green-500/80",
    3: "bg-linear-120 from-80% from-yellow-500/80 to-100% to-cyan-500/60",
    4: "bg-linear-120 from-80% from-yellow-500/80 to-100% to-orange-500/80",
    5: "bg-linear-120 from-80% from-yellow-500/80 to-100% to-amber-900/60",
    6: "bg-linear-120 from-80% from-yellow-500/80 to-100% to-purple-500/80",
}

function ContentNode({ data, selected }) {
    // console.log(data)
    const actions = useFlowActions();

    // const connectionInProgress = useConnection(selector);

    return (
        <div className={`w-44 rounded-lg border bg-card shadow-sm transition-all ${selected ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:shadow-md"}`}>
            {/* Header */}
            <div className={`flex items-center justify-between rounded-t-lg border-b border-border px-3 py-2 bg-amber text-white ${bgColor[data.c_file_type.id]}`}>
                <div className="flex items-center gap-2 min-w-0">
                    {/* <ImageIcon className="size-4 shrink-0" /> */}
                    <div className="w-6 shrink-0 bg-white p-1 rounded">
                        <img src={IconList[data.c_file_type.id]} alt="contentIcon" className="object-cover" />
                    </div>
                    {/* <div className="size-6 bg-white rounded flex justify-center items-center" dangerouslySetInnerHTML={{ __html: changeIconColor(data.dtype.icon,data.dtype.icon_color,'80%')}}></div> */}
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
                            编辑内容
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => actions.onDelete(data)}
                        >
                            <Trash2Icon className="mr-2 size-4" />
                            删除内容
                        </DropdownMenuItem>
                        {
                            data.c_file_type.id == 1 &&
                            <DropdownMenuItem onClick={() => actions.onContentControlEdit(data)}>
                                <Code className="mr-2 size-4" />
                                编辑软件控制命令
                            </DropdownMenuItem>
                        }
                        
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Body */}
            <div className="px-3 py-2 space-y-1.5">
                {data.note && (
                    <div className="text-[11px] text-accent-foreground line-clamp-2">
                        {data.note}
                    </div>
                )}
                <Separator />
                {/* <span className="text-[11px] text-muted-foreground">内容状态:</span> */}
                <div className="grid grid-cols-2 gap-1">
                    <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{data.c_file_status.name}</Badge>
                    <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{data.c_file_type.name}</Badge>
                    {
                        data.c_default === 1 && <Badge variant="secondary" className={`h-5 text-[10px] px-1.5 bg-yellow-700 text-white`}>默认程序</Badge>
                    }
                    {
                        data.c_startup === 1 && <Badge variant="secondary" className={`h-5 text-[10px] px-1.5 bg-yellow-700 text-white`}>开机启动</Badge>
                    }
                    <Badge
                        variant="secondary"
                        className={`h-5 text-[10px] px-1.5 text-white ${data.c_status === 1 ? "bg-gray-600" : (data.c_status === 2 ? "bg-yellow-700" :  (data.c_status === 3 ? "bg-green-700" : "bg-red-700"))}`}
                    >
                        {data.c_status === 1 ? "未下发" : (data.c_status === 2 ? "下发中" : (data.c_status === 3 ? "下发完成" : "下发失败"))}
                    </Badge>
                </div>
            </div>

            <Separator />
            <div className="h-4 bg-muted/50"></div>

            {/* Target handle at top */}
            <Handle
                id="content"
                type="target"
                position={Position.Top}
                className="size-3! border-2! border-background! bg-green-500!"
            />
        </div>
    );
}

export default memo(ContentNode);
