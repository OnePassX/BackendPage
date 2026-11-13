import { memo, useEffect, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface dataItem { 
    label?: string, 
    sort?:number, 
    show?:boolean 
}

function CodeNode({ data, selected }: { data: dataItem; selected?: boolean }) {

    const [codeForm, setCodeForm] = useState<dataItem>(data);
    // 外部数据（侧边栏编辑、节点数据变化）变化时同步到节点内表单
    useEffect(() => {
        // console.log("data", data);  
        setCodeForm(data);
    }, [data]);

    return (
        <div className={`w-50 h-full rounded-lg border bg-card shadow-sm transition-all border-border hover:shadow-md ${selected
                    ? "shadow-md ring-3 ring-yellow-500"
                    : "border-border hover:shadow-md"
                }`}>
            {/* Header */}
            <div className="w-full flex items-center justify-between rounded-t-lg border-b border-border bg-blue-500 px-3 py-2 text-white">
                <div className="flex items-center gap-2 min-w-0">
                    {/* <ImageIcon className="size-4 shrink-0" /> */}
                    <span className="text-sm font-medium truncate">前端显示按钮</span>
                </div>
            </div>

            {/* Body */}
            <div className="w-full px-3 py-2 space-y-1.5 nodrag text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">按钮名称:</span>
                    <span className="text-base">{codeForm.label}</span>
                </div>
                    
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">按钮排序：</span>
                    <span>{codeForm.sort}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">显示状态：</span>
                    <Badge
                        variant={codeForm.show === true ? "default" : "secondary"}
                        className={`h-5 text-sm px-1.5 ${ codeForm.show === true ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : ''}`}
                    >
                        {codeForm.show === true ? "显示" : "隐藏"}
                    </Badge>
                </div>

            </div>
            <Separator />
            <div className="h-4 bg-muted/50 rounded-lg"></div>

            {/* Target handle at top */}
            <Handle
                type="target"
                position={Position.Top}
                className="size-3! border-2! border-background! bg-green-500!"
            />

            <Handle
                id="children"
                type="source"
                position={Position.Bottom}
                className="size-3! border-2! border-background! bg-green-500!"
            />
        </div>
    );
}

export default memo(CodeNode);
