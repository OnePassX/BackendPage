import { memo, useEffect, useState } from "react";
import { Handle, Position } from "@xyflow/react";

import { Input } from "@/components/ui/input";

import { Separator } from "@/components/ui/separator";
import {
    Field, FieldGroup, FieldLabel,
} from "@/components/ui/field";


function ModelNode({ data, selected }: { data: { label?: string }; selected?: boolean }) {


    const [codeForm, setCodeForm] = useState<{ label?: string }>(data);
    // 外部数据（侧边栏编辑、节点数据变化）变化时同步到节点内表单
    useEffect(() => {
        setCodeForm(data);
    }, [data]);

    return (
        <div className={`h-full rounded-lg border bg-card shadow-sm transition-all border-border hover:shadow-md ${selected
                    ? "border-primary shadow-md ring-1 ring-primary/20"
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
            <div className="w-full px-3 py-2 space-y-1.5 nodrag ">
                <form className="min-w-40">
                    <FieldGroup>
                        <Field orientation="horizontal" className="text-nowrap nodrag">
                            <FieldLabel>按钮名称</FieldLabel>
                            <Input id="name" value={codeForm.label} onChange={(e) => setCodeForm({ ...codeForm, label: e.target.value })} placeholder="设备名称" disabled/>
                        </Field>
                    </FieldGroup>
                </form>
            </div>
            <Separator />
            <div className="h-4 bg-muted/50"></div>

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

export default memo(ModelNode);
