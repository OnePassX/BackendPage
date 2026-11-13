import { memo, useState } from "react";
import { Handle, Position, NodeResizeControl } from "@xyflow/react";
import { ArrowDownRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText,} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator";
import { Field, FieldGroup, FieldLabel, } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// 内容文件类型
const FormatItems = [
    {label:'字符串',value:'1'},{label:'16进制',value:'2'},
]

const ProtocalItems = [
    {label:'TCP Client',value:'1'},{label:'TCP Server',value:'2'},
    {label:'UDP Client',value:'3'},{label:'UDP Server',value:'4'},
    {label:'HTTP POST',value:'5'},{label:'HTTP GET',value:'6'},
    {label:'WebSocket',value:'7'},{label:'Socket IO',value:'8'},
    {label:'Other',value:'9'},
]

const controlStyle = {
    background: 'transparent',
    border: 'none',
};

function CodeNode({ data }) {
    // console.log(data)

    const [codeForm, setCodeForm] = useState(data);

    return (
        <div className="h-full flex flex-col justify-start items-center text-center rounded-lg border bg-card shadow-sm transition-all border-border hover:shadow-md overflow-hidden">
            {/* Header */}
            <div className="w-full flex items-center justify-between rounded-t-lg border-b border-border bg-gray-500/80 px-3 py-2 text-white">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">点击按钮时 - 执行命令</span>
                </div>
            </div>
            
            {/* Body */}
            <div className="w-full px-3 py-2 space-y-1.5 nodrag overflow-hidden">
                <form className="w-auto">
                    <FieldGroup>
                        <Field orientation="horizontal" className="text-nowrap">
                            <FieldLabel htmlFor="name">解释</FieldLabel>
                            <Input id="name" value={codeForm.label} onChange={(e) => setCodeForm({ ...codeForm, label: e.target.value })} placeholder="设备名称" />
                        </Field>
                        
                        <Field orientation="horizontal" className="text-nowrap w-fit">
                            <FieldLabel htmlFor="format">命令格式</FieldLabel>
                            <Select items={FormatItems} defaultValue="1" value={String(codeForm.format)} onValueChange={(e) => setCodeForm({ ...codeForm, format: Number(e) })}>
                                <SelectTrigger id="format"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                    {FormatItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field orientation="horizontal" className="text-nowrap w-fit">
                            <FieldLabel htmlFor="protocal">通信协议</FieldLabel>
                            <Select items={ProtocalItems} defaultValue="1" value={String(codeForm.protocal)} onValueChange={(e) => setCodeForm({ ...codeForm, protocal: Number(e) })}>
                                <SelectTrigger id="protocal"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                    {ProtocalItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        
                        <Field orientation="horizontal" className="text-nowrap">
                            <FieldLabel htmlFor="ip">IP</FieldLabel>
                            <Input id="ip" value={codeForm.ip} onChange={(e) => setCodeForm({ ...codeForm, ip: e.target.value })} />
                        </Field>
                        <Field orientation="horizontal" className="text-nowrap">
                            <FieldLabel htmlFor="port">端口</FieldLabel>
                            <Input id="port" type="number" value={codeForm.port} onChange={(e) => setCodeForm({ ...codeForm, port: e.target.value  })} />
                        </Field>
                        
                        <Field orientation="horizontal" className="text-nowrap">
                            <FieldLabel htmlFor="code">命令</FieldLabel>
                            <Textarea id="code" value={codeForm.code} placeholder="输入命令" onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })}/>
                        </Field>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Field orientation="horizontal" className="text-nowrap">
                                <FieldLabel htmlFor="delay">延时</FieldLabel>
                                <InputGroup className="overflow-hidden">                                    
                                    <InputGroupInput placeholder="1" id="delay" type="number" value={codeForm.delay} onChange={(e) => setCodeForm({ ...codeForm, delay: Number(e.target.value) })}/>
                                    <InputGroupAddon align="inline-end">
                                    <InputGroupText>秒后执行</InputGroupText>
                                    </InputGroupAddon>
                                </InputGroup>
                            </Field>
                            <Field orientation="horizontal" className="text-nowrap">
                                <FieldLabel htmlFor="sort">排序</FieldLabel>
                                <Input id="sort" type="number" value={codeForm.sort} placeholder="请输入排序" onChange={(e) => setCodeForm({ ...codeForm, sort: Number(e.target.value) })}/>
                            </Field>
                        </div>
                    </FieldGroup>
                </form>
                
            </div>

            <Separator />
            <div className="h-4 bg-muted/50"></div>

            <NodeResizeControl style={controlStyle} minWidth={180} minHeight={90} maxWidth={350} maxHeight={450}>
                <ArrowDownRight className="absolute text-yellow-500 size-6 bg-muted rounded-full" />
            </NodeResizeControl>

            {/* Target handle at top */}

            <Handle
                id="device"
                type="target"
                position={Position.Top}
                className="size-3! border-2! border-background! bg-green-500!"
            />
        </div>
    );
}

export default memo(CodeNode);
