import { memo, useState } from "react";
import { Handle, Position, useConnection, type ConnectionState } from "@xyflow/react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonHandle } from "@/components/xyflow/button-handle";
import { Separator } from "@/components/ui/separator";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

const onClick = () => {
    window.alert(`Handle button has been clicked!`);
};

const selector = (connection: ConnectionState) => {
    return connection.inProgress;
};

function CodeNode({ data }) {
    // console.log(data)
    const connectionInProgress = useConnection(selector);

    const [codeForm, setCodeForm] = useState(data);

    return (
        <div className="h-full rounded-lg border bg-card shadow-sm transition-all border-border hover:shadow-md">
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
                            <FieldLabel htmlFor="name">按钮名称</FieldLabel>
                            <Input id="name" value={codeForm.label} onChange={(e) => setCodeForm({ ...codeForm, label: e.target.value })} placeholder="设备名称" />
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

            <ButtonHandle
                id="children"
                type="source"
                className="left-1/4! "
                position={Position.Bottom}
                showButton={!connectionInProgress}
                showLabel={true}
                title={'子集'}
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
                id="content_code"
                type="source"
                className="left-2/4! "
                position={Position.Bottom}
                showButton={!connectionInProgress}
                showLabel={true}
                title={'软件命令'}
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
                id="device_code"
                type="source"
                className="left-3/4! "
                position={Position.Bottom}
                showButton={!connectionInProgress}
                showLabel={true}
                title={'硬件命令'}
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
            
        </div>
    );
}

export default memo(CodeNode);
