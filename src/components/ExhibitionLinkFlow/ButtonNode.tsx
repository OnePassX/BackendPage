import { memo, useEffect, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface dataItem { 
    label?: string, 
    sort?:number, 
    show?:boolean,
    device_code?:any[]
}

const ProtocalItems = [
    { label: 'TCP Client', value: '1' }, { label: 'TCP Server', value: '2' },
    { label: 'UDP Client', value: '3' }, { label: 'UDP Server', value: '4' },
    { label: 'HTTP POST', value: '5' }, { label: 'HTTP GET', value: '6' },
    { label: 'WebSocket', value: '7' }, { label: 'Socket IO', value: '8' },
    { label: 'Other', value: '9' },
]

function CodeNode({ data, selected }: { data: dataItem; selected?: boolean }) {

    const [codeForm, setCodeForm] = useState<dataItem>(data);
    // 外部数据（侧边栏编辑、节点数据变化）变化时同步到节点内表单
    useEffect(() => {
        // console.log("data", data);  
        setCodeForm(data);
    }, [data]);

    return (
        <div className={`w-100 h-full rounded-lg border bg-card shadow-sm transition-all border-border hover:shadow-md ${selected
                    ? "shadow-md ring-3 ring-yellow-500"
                    : "border-border hover:shadow-md"
                }`}>
            {/* Header */}
            <div className="w-full flex items-center justify-between rounded-t-lg border-b border-border bg-black/80 px-3 py-2 text-white">
                <div className="relative w-full flex justify-center items-center gap-2 min-w-0">
                    {/* <ImageIcon className="size-4 shrink-0" /> */}
                    <span className="absolute text-sm font-medium truncate left-0 text-muted-foreground">前端显示按钮</span>
                    <span className="text-xl">{codeForm.label}</span>
                </div>
            </div>

            {/* Body */}
            <div className="w-full px-3 py-2 space-y-1.5 nodrag text-sm flex flex-col">
                <div className="flex flex-col items-center justify-center">
                    
                    
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-start">
                        <span className="text-sm text-muted-foreground">排序：</span>
                        <span>{codeForm.sort}</span>
                    </div>
                    <div className="flex items-center justify-end">
                        <span className="text-sm text-muted-foreground">显示状态：</span>
                        <Badge
                            variant={codeForm.show === true ? "default" : "secondary"}
                            className={`h-5 text-sm px-1.5 ${ codeForm.show === true ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : ''}`}
                        >
                            {codeForm.show === true ? "显示" : "隐藏"}
                        </Badge>
                    </div>
                </div>
                <div className="w-full flex flex-col justify-start items-start text-nowrap truncate text-sm gap-2">
                    {
                        data.device_code.length > 0 && data.device_code.map((item, index) => (
                            <div key={index} className="w-full flex flex-col justify-start items-start gap-2">
                                <Separator orientation="horizontal"/>
                                <span>执行命令：{item.name} <span className="text-muted-foreground text-xs">命令 {item.delay} 秒后执行</span></span>
                                <span>{item.label}</span>
                                <div className="w-full flex flex-row justify-start items-center gap-2 text-muted-foreground">
                                    <span>IP: {item.ip}</span>
                                    <Separator orientation="vertical"/>
                                    <span>Port: {item.port}</span>
                                    <Separator orientation="vertical"/>
                                    <span>{item.format==1?'字符串':'16进制'}</span>
                                    <Separator orientation="vertical"/>
                                    <span>{ProtocalItems.filter(x=>x.value==String(item.protocal))[0]?.label}</span>
                                </div>
                                <span>CODE: {item.code}</span>
                            </div>
                        ))
                    }
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
           
        </div>
    );
}

export default memo(CodeNode);
