import { memo } from "react";
import { Handle, Position, useConnection, type ConnectionState } from "@xyflow/react";
import { ImageIcon, PencilIcon, Trash2Icon, MoreHorizontalIcon, CodeXml, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFlowActions } from "./flowContext";

const changeIconColor = (val, color='#201f2c', size) => {
    val = val && val.replaceAll(/fill=".*?"/g, `fill="${color || '#FFFFFF'}"`);
    val = val && val.replaceAll(/width=".*?"/g, `width="${size || '100%'}"`);
    val = val && val.replaceAll(/height=".*?"/g, `height="${size || '100%'}"`);
    // val = val && val.replaceAll(/width=".*?"/g, `height="${size || '100%'}"`);
    return val
}

function DeviceNode({ data, selected }) {
    // console.log(data)
    const actions = useFlowActions();

    return (
        <div
            className={`w-44 rounded-lg border bg-card shadow-sm transition-all ${selected
                    ? "border-primary shadow-md ring-1 ring-primary/20"
                    : "border-border hover:shadow-md"
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-lg border-b border-border bg-green-800/80 px-3 py-2 text-white">
                <div className="flex items-center gap-2 min-w-0">
                    {/* <ImageIcon className="size-4 shrink-0" /> */}
                    <div className="size-6 bg-white rounded flex justify-center items-center" dangerouslySetInnerHTML={{ __html: changeIconColor(data.dtype.icon,data.dtype.icon_color,'80%')}}></div>
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
                            编辑设备
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => actions.onDelete(data)}
                        >
                            <Trash2Icon className="mr-2 size-4" />
                            删除设备
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => actions.onDeviceControlEdit(data)}>
                            <CodeXml className="mr-2 size-4" />
                            编辑硬件控制命令
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Body */}
            <div className="px-3 py-2 space-y-1.5">
                {data.other && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2">
                        {data.other}
                    </div>
                )}
                {data.ip && (
                    <div className="flex flex-row justify-between items-center">
                        <span className="text-[11px] text-muted-foreground line-clamp-2 ">设备 IP :</span>
                        <span className="text-[11px] text-muted-foreground line-clamp-2 ">{data.ip}</span>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">设备类型：</span>
                    <Badge
                        variant={"default"}
                        className={`h-5 text-[10px] px-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-white`}
                    >
                        {data.dtype.name}
                    </Badge>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">是否为主内容设备：</span>
                    <Badge
                        variant={data.major === true ? "default" : "secondary"}
                        className={`h-5 text-[10px] px-1.5 ${ data.major === true ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : ''}`}
                    >
                        {data.major === true ? "是" : "否"}
                    </Badge>
                </div>
            </div>

            <Separator />
            <div className="h-4 bg-muted/50"></div>

            {/* Target handle at top */}
            <Handle
                id="device"
                type="target"
                position={Position.Top}
                className="size-3! border-2! border-background! bg-green-500!"
            />
            {/* <ButtonHandle
                id="device_code"
                type="source"
                className="left-2/3! "
                position={Position.Bottom}
                showButton={!connectionInProgress}
                showLabel={true}
                title={'命令'}
            >
                <Button
                    onClick={onClick}
                    size="xs"
                    variant="secondary"
                    className="size-6! rounded-full!"
                >
                    <Plus className="size-3" />
                </Button>
            </ButtonHandle> */}

        </div>
    );
}

export default memo(DeviceNode);
