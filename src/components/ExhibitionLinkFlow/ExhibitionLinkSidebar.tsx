import { useEffect, useState, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Node } from '@xyflow/react';

import { Circle,Trash } from "lucide-react";
import {
    Field, FieldGroup, FieldLabel,
} from "@/components/ui/field";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCodeList } from "@/api/device";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
} from "@/components/ui/input-group"

import { Separator } from "@/components/ui/separator";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"

const ProtocalItems = [
    { label: 'TCP Client', value: '1' }, { label: 'TCP Server', value: '2' },
    { label: 'UDP Client', value: '3' }, { label: 'UDP Server', value: '4' },
    { label: 'HTTP POST', value: '5' }, { label: 'HTTP GET', value: '6' },
    { label: 'WebSocket', value: '7' }, { label: 'Socket IO', value: '8' },
    { label: 'Other', value: '9' },
]

const FormatItems = [
    { label: '字符串', value: '1' }, { label: '16进制', value: '2' }, { label: '网络唤醒', value: '3' }, { label: '远程关机', value: '4' },
];

const ShowItems = [{label:'显示',value:true},{label:'隐藏',value:false}]

// 类型
interface typeItem {
    id: number;
    name: string;
    ip: string|null;
}

type CommandItem = {
    id?: string | number;
    label?: string;
    name: string;
    format?: number;
    protocal?: number;
    ip?: string;
    port?: string | number;
    code?: string;
    delay?: string | number;
};

// 命令
interface CodeItem {
    id: number;
    device: typeItem | null;
    code: string;
    name: string;
    ctype: typeItem;
    cformat: typeItem;
    protocal: typeItem;
    cport: number;
    note: string;
}

type CommandPatch = (id: string | number | undefined, partial: Partial<CommandItem>) => void;
type CommandRemove = (id: string | number | undefined) => void;

interface CodeSidebarProps {
    nodes: Node[];
    setNodes: Dispatch<SetStateAction<Node[]>>;
    defaultIp?: string;
    onAddNode: () => void;
    onDeleteNode: (node: Node | null) => void;
    onSave: () => void;
    saving: boolean;
}

const uid = () => `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const CommandItemForm = ({item,patch,onRemove,}: {item: CommandItem;patch: CommandPatch;onRemove: CommandRemove;}) => (
    <form className="w-full flex flex-row justify-between items-start gap-2 border bg-muted rounded-xl p-3 shadow-sm">
        <FieldGroup className="flex-1 min-w-0">
            <Field orientation="horizontal" className="text-nowrap">
                <FieldLabel>解释</FieldLabel>
                <Input value={item.label ?? ''} onChange={(e) => patch(item.id, { label: e.target.value })} placeholder="解释" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
                <Field orientation="horizontal" className="text-nowrap w-fit">
                    <FieldLabel htmlFor="format">命令格式</FieldLabel>
                    <Select items={FormatItems} value={String(item.format ?? 1)} onValueChange={(e) => patch(item.id, { format: Number(e) })} disabled>
                        <SelectTrigger id="format"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {FormatItems.map((it) => (
                                    <SelectItem key={it.value} value={it.value}>
                                        {it.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>

                <Field orientation="horizontal" className="text-nowrap w-fit">
                    <FieldLabel htmlFor="protocal">通信协议</FieldLabel>
                    <Select items={ProtocalItems} value={String(item.protocal ?? 1)} onValueChange={(e) => patch(item.id, { protocal: Number(e) })} disabled>
                        <SelectTrigger id="protocal"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {ProtocalItems.map((it) => (
                                    <SelectItem key={it.value} value={it.value}>
                                        {it.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field orientation="horizontal" className="text-nowrap">
                    <FieldLabel htmlFor="ip">IP</FieldLabel>
                    <Input id="ip" value={item.ip ?? ''} onChange={(e) => patch(item.id, { ip: e.target.value })} disabled/>
                </Field>
                <Field orientation="horizontal" className="text-nowrap">
                    <FieldLabel htmlFor="port">端口</FieldLabel>
                    <Input id="port" type="number" value={item.port ?? ''} onChange={(e) => patch(item.id, { port: e.target.value })} disabled/>
                </Field>
            </div>

            <Field orientation="horizontal" className="text-nowrap">
                <FieldLabel htmlFor="code">命令</FieldLabel>
                <Textarea id="code" value={item.code ?? ''} placeholder="输入命令" onChange={(e) => patch(item.id, { code: e.target.value })} disabled/>
            </Field>

            
            <Field orientation="horizontal" className="text-nowrap">
                <FieldLabel htmlFor="delay">延时</FieldLabel>
                <InputGroup className="overflow-hidden">
                    <InputGroupInput placeholder="1" id="delay" type="number" value={item.delay ?? 1} onChange={(e) => patch(item.id, { delay: e.target.value })} />
                    <InputGroupAddon align="inline-end">
                        <InputGroupText>秒后执行</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </Field>
                
            
        </FieldGroup>

        <Button
            type="button"
            variant="outline"
            size="default"
            className="shrink-0 text-destructive hover:text-destructive"
            onClick={() => onRemove(item.id)}
        >
            删除
        </Button>
    </form>
);

const CodeSidebar = ({ nodes, setNodes, defaultIp = '', onAddNode, onDeleteNode, onSave, saving }: CodeSidebarProps) => {

    const [selectedNodeForm, setSelectedNodeForm] = useState<Node | null>(null);
    const [dataLabel, setDataLabel] = useState<string | null>(null);
    const [dataShow, setDataShow] = useState<boolean>(true);
    const [dataSort, setDataSort] = useState<number>(0);
    const [deviceCodeForm, setDeviceCodeForm] = useState<CommandItem[]>([]);
    const lastSelectedId = useRef<string | null>(null);

    const [popoverOpen, setPopoverOpen] = useState(false);

    const [codeList,setCodeList] = useState<CodeItem[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        try {
            const res = await getCodeList({ page: 1, limit: 1000 });
            const raw = res.data;
            if (Array.isArray(raw)) {
                setCodeList(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setCodeList((raw as { items: CodeItem[] }).items ?? []);
            } else {
                setCodeList([]);
            }
        } catch (e: unknown) {
            setCodeList([]);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // 补全命令条目缺失字段，保证表单控件有稳定取值
    const normalizeCommand = (raw: CommandItem | undefined): CommandItem => ({
        id: raw?.id ?? uid(),
        label: raw?.label ?? '指令解释？',
        name: raw?.name ?? '',
        format: raw?.format ?? 1,
        protocal: raw?.protocal ?? 4,
        ip: raw?.ip ?? defaultIp,
        port: raw?.port ?? '5566',
        code: raw?.code ?? '',
        delay: raw?.delay ?? 0,
    });

    // 选中节点变化时，同步表单（仅在新选中节点时重新载入，避免回写造成循环）
    useEffect(() => {
        const a = nodes?.find((item) => item.selected === true);
        if (a == null || a.id === 'start') {
            setSelectedNodeForm(null);
            setDataLabel(null);
            setDeviceCodeForm([]);
            setPopoverOpen(false);
            lastSelectedId.current = null;
            return;
        }
        setSelectedNodeForm(a);
        if (lastSelectedId.current !== a.id) {
            lastSelectedId.current = a.id;
            // console.log(a.data)
            setDataLabel(typeof a.data?.label === 'string' ? a.data.label : '');
            setDataShow(typeof a.data?.show === 'boolean' ? a.data.show : true);
            setDataSort(typeof a.data?.sort === 'number' ? a.data.sort : 0);
            const deviceCodes = a.data?.device_code;
            setDeviceCodeForm(
                (Array.isArray(deviceCodes) ? deviceCodes : []).map(normalizeCommand),
            );
        }
    }, [nodes, defaultIp])

    // 表单变化回写选中节点数据
    useEffect(() => {
        if (dataLabel == null) return;
        setNodes((nds) =>
            nds?.map((node) => {
                if (node.selected === true) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            label: dataLabel,
                            show: dataShow,
                            sort: dataSort,
                            device_code: deviceCodeForm,
                        },
                    };
                }
                return node;
            }),
        );
    }, [ dataLabel, dataShow, dataSort, deviceCodeForm, setNodes])

    // 硬件命令：编辑 / 新增 / 删除
    const patchDevice: CommandPatch = (id, partial) => {
        setDeviceCodeForm((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...partial } : item)),
        );
    };

    const addDeviceCode = (item:CodeItem) => {
        // console.log(item)
        const newItem = {
            id: item.id,
            name: item.name,
            format: item.cformat.id,
            protocal: item.protocal.id,
            ip: item.device?.ip ?? '',
            port: item.cport ?? '',
            code: item.code ?? '',
        }
        setPopoverOpen(false)
        setDeviceCodeForm((prev) => [...prev, { ...normalizeCommand(newItem), sort: prev.length }]);
    };

    useEffect(()=>{
        scrollRef.current && scrollRef.current?.scrollTo({
            top:scrollRef.current.scrollHeight,
            behavior: 'smooth',
        })
    },[scrollRef?.current?.scrollHeight])

    const removeDeviceCode: CommandRemove = (id) => {
        setDeviceCodeForm((prev) => prev.filter((item) => item.id !== id));
    };

    return (
        <div className='flex flex-col gap-2 p-2 bg-muted/10 w-110 border-l'>
            {/* 节点操作 */}
            <div className='w-full px-3 py-2 flex flex-col gap-2'>
                <div className='text-muted-foreground'>节点操作</div>
                <div className='w-full grid grid-cols-2 gap-2'>
                    <Button
                        type="button"
                        variant="default"
                        size="default"
                        className="h-10"
                        onClick={onAddNode}
                        >
                            <Circle />
                            添加节点
                    </Button>
                    {selectedNodeForm !== null && (
                        <Button
                                type="button"
                                variant="destructive"
                                size="default"
                                className="h-10"
                                onClick={() => onDeleteNode(selectedNodeForm)}
                            >
                            <Trash />
                            删除节点
                        </Button>
                    )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                    未选中节点时，按钮添加到顶层
                </div>
            </div>

            <Separator />

            {/* 编辑节点 */}
            {selectedNodeForm !== null ? (
                <div className="w-full min-h-0 flex-1 px-3 py-2 flex flex-col justify-start gap-2 overflow-hidden">
                    <div className='text-muted-foreground'>编辑节点</div>
                    <form className="w-full h-auto">
                        <FieldGroup className='gap-2!'>
                            <Field orientation="horizontal" className="text-nowrap nodrag">
                                <FieldLabel>按钮名称</FieldLabel>
                                <Input value={dataLabel ?? ''} placeholder="设备名称" onChange={(e) => setDataLabel(e.target.value)} />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
								<Field orientation="horizontal" className="text-nowrap w-fit">
									<FieldLabel htmlFor="show">显示状态</FieldLabel>
									<Select  items={ShowItems} defaultValue={dataShow} value={dataShow} onValueChange={(e) => setDataShow(e)}>
										<SelectTrigger id="show"><SelectValue /></SelectTrigger>
										<SelectContent >
											<SelectGroup>
											{ShowItems.map((item,index) => (
												<SelectItem key={index} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field orientation="horizontal" className="text-nowrap ">
									<FieldLabel htmlFor="sort">排序</FieldLabel>
									<Input id="sort" type="number" value={dataSort} placeholder="请输入排序" onChange={(e) => setDataSort(Number(e.target.value))}/>
								</Field>
							</div>
                        </FieldGroup>
                    </form>
                    <Tabs defaultValue="content_code" className="w-full min-h-0 flex-1 flex flex-col">
                        <TabsList className="shrink-0">
                            <TabsTrigger value="device_code">硬件控制命令</TabsTrigger>
                        </TabsList>
                        <TabsContent ref={scrollRef} value="device_code" className="min-h-0 flex-1 overflow-y-auto ">
                            <div className="w-full h-full flex flex-col justify-start items-center gap-2">
                                {deviceCodeForm?.map((item, index) => (
                                    <CommandItemForm
                                        key={item.id ?? index}
                                        item={item}
                                        patch={patchDevice}
                                        onRemove={removeDeviceCode}
                                    />
                                ))}
                                
                                <Popover open={popoverOpen}>
                                    <PopoverTrigger render={
                                        <Button type="button" variant="outline" size="default" className="w-full h-10 " onClick={()=>setPopoverOpen(true)}>+ 添加命令</Button>
                                        }>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-100 h-152" side="left" align="end">
                                        <PopoverHeader>
                                        <PopoverTitle className='flex items-center justify-between'>
                                            <span>命令选择</span>
                                            <Button type="button" variant="destructive" size="sm" onClick={()=>setPopoverOpen(false)}>取消</Button>
                                        </PopoverTitle>
                                        <PopoverDescription>请从以下列表中选择一项进行插入</PopoverDescription>
                                        </PopoverHeader>
                                        <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4 flex flex-col justify-start items-center gap-2">
                                            {codeList?.map((item, index) => (
                                                <div key={item.id ?? index} onClick={()=>addDeviceCode(item)} className='w-full flex flex-col border border-border rounded-md p-2 hover:bg-muted-foreground/40 '>
                                                    <span>{item.name}</span>
                                                    <div className='w-full flex flex-row justify-start items-center gap-2 text-muted-foreground'>
                                                        <span>{item.device?.ip ?? '无绑定IP'}</span>
                                                        <Separator orientation="vertical"/>
                                                        <span>{item.cport}</span>
                                                        <Separator orientation="vertical"/>
                                                        <span>{FormatItems.filter(x=>x.value==String(item.cformat.id))[0]?.label}</span>
                                                        <Separator orientation="vertical"/>
                                                        <span>{ProtocalItems.filter(x=>x.value==String(item.protocal.id))[0]?.label}</span>
                                                    </div>
                                                    <span>{item.code}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className=''>
                                            
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            ) : (
                <div className="w-full min-h-0 flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
                    点击画布中的按钮节点进行编辑
                </div>
            )}

            {/* 底部操作 */}
            <div className="mt-auto w-full flex flex-col gap-2 px-3 py-2 border-t">
                <Button type="button" size="default" className="w-full" onClick={onSave} disabled={saving}>
                    {saving ? '保存中…' : '保存控制流程'}
                </Button>
            </div>
        </div>
    )
}

export default CodeSidebar
