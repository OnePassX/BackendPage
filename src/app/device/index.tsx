import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon, Building2Icon, ChevronDownIcon, CircleDot,Code,CircleCheck,CircleX,Circle } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
	AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogContent,
	AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
	AlertDialogFooter, AlertDialogAction, AlertDialogCancel,AlertDialogMedia
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { DataTableTree, type TreeColumn } from "@/components/data-table-tree";
import { getExhibitTree } from "@/api/exhibition";
import { getDeviceList, getDeviceTree, addDevice, updateDevice, deleteDevice, updateDeviceLink, addCode, updateCode, deleteCode, testCode } from "@/api/device";
import { Field, FieldGroup, FieldLabel,FieldDescription } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TipButton } from "@/components/tip-button";

// 设备类型
interface DtypeItem {
	id: number;
	name: string;
	icon: string;
	icon_color: string;
}

// 类型
interface typeItem {
    id: number;
    name: string;
    ip: string|null;
}

// 命令
interface CodeItem {
    id?: number;
    device: typeItem | null;
    code: string;
    name: string;
    ctype: typeItem;
    cformat: typeItem;
    protocal: typeItem;
    cport: number;
    note: string;
}

// 设备
interface DeviceItem {
	id: number;
	num: string;
	name: string;
	dtype: DtypeItem;
	ip: string;
	conpare: string;
	area: number;
	link: number | undefined;
	other: string;
	major: boolean;
    probe_enabled: boolean;
	sort: number;
    create_time: string;
    
}

interface TreeItem {
    parentId: number | null;
    type: 'device' | 'code'
    id: number;
    num: string;
    name: string;
    dtype: DtypeItem;
    ip: string | null;
    conpare:  string;
    area: number;
    link: number | null;
    other: string;
	major: boolean;
	sort: number;
    create_time: string;
    code: string;
    ctype: typeItem;
    cformat: typeItem;
    protocal: typeItem;
    cport: number;
    note: string;
    probe_enabled: boolean;
    status: number;
    is_online: boolean;
    device: typeItem | null;
    children?: TreeItem[];
}


const PropeItems = [
	{label:'不启用',value:"0"},{label:'启用探活',value:"1"}
]

const AreaItems = [
	{label:'无绑定',value:'0'},{label:'展项设备',value:'1'},{label:'展厅设备',value:'2'}
]

const DeviceTypeItems = [
	{label:'继电器',value:'1'},{label:'串口服务器',value:'2'},{label:'电脑主机',value:'3'},
	{label:'一体机',value:'4'},{label:'LED屏幕',value:'5'},{label:'拼接屏幕',value:'6'},
	{label:'投影机',value:'7'},{label:'窗帘控制器',value:'8'},{label:'电动门控制器',value:'9'},
	{label:'照明灯光',value:'10'},{label:'氛围灯光',value:'11'},{label:'PDU',value:'12'},
	{label:'空调设备',value:'13'},{label:'监控设备',value:'14'},{label:'其他',value:'15'},
]

const CodeTypeItems = [
	{label:'设备开机',value:'1'},{label:'设备关机',value:'2'},{label:'电动门开启',value:'3'},
	{label:'电动门关闭',value:'4'},{label:'灯光开启',value:'5'},{label:'灯光关闭',value:'6'},
	{label:'灯光场景',value:'7'},{label:'投影开启',value:'8'},{label:'投影关闭',value:'9'},
	{label:'其他',value:'10'}
]

const CodeFormatItems = [
	{label:'字符串',value:'1'},{label:'16进制',value:'2'},{label:'网络唤醒',value:'3'},{label:'远程关机',value:'4'}
]

const CodeProtocalItems = [
	{label:'TCP Client',value:'1'},{label:'TCP Server',value:'2'},{label:'UDP Client',value:'3'},{label:'UDP Server',value:'4'},
    {label:'HTTP POST',value:'5'},{label:'HTTP GET',value:'6'},{label:'HTTP Server',value:'7'},{label:'IO Server',value:'8'},
    {label:'其他',value:'9'}
]

const defaultForm = { num: "无" , name:"", dtype: 1, ip:"", conpare:"", area:1, link: null, other: "", major: false, probe_enabled: false, sort:0 };

const defaultCodeForm = { device: null, code: "", name: "", ctype: 10, cformat: 2, protocal: 4, cport: 5566, note: '' }

const changeIconColor = (val, color='#201f2c', size) => {
    val = val && val.replaceAll(/fill=".*?"/g, `fill="${color || '#FFFFFF'}"`);
    val = val && val.replaceAll(/width=".*?"/g, `width="${size || '100%'}"`);
    val = val && val.replaceAll(/height=".*?"/g, `height="${size || '100%'}"`);
    // val = val && val.replaceAll(/width=".*?"/g, `height="${size || '100%'}"`);
    return val
}

export default function DevicePage() {

    // --- 展厅 > 展区 > 展项树 ---
    const [tree, setTree] = useState<any>(null);
    const [treeLoading, setTreeLoading] = useState(true);
    
    const [data, setData] = useState<TreeItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogDeviceOpen, setDialogDeviceOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);

    const [dialogCodeOpen, setDialogCodeOpen] = useState(false)
    const [editingCode, setEditingCode] = useState<CodeItem | null>(null);
    const [codeFormData, setCodeFormData] = useState(defaultCodeForm);

    const [selected, setSelected] = useState({ area:0, link: null, label:'无绑定设备' }); // {type, id, row, parentId}

    // --- Delete confirmation state ---
	const [deleteConfirm, setDeleteConfirm] = useState<{
		open: boolean;
		title: string;
		message: string;
		onConfirm: () => Promise<void>;
	}>({ open: false, title: "", message: "", onConfirm: async () => { } });

    // 获取展项树
    const fetchTree = async () => { 
        setTreeLoading(true);
        try {
            const res = await getExhibitTree();
            // console.log(res.data);
            setTree(res.data || []);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setTreeLoading(false);
        }
    };

    useEffect(() => { fetchTree(); }, []);
    
    // 根据展项ID获取展项设备数据
    const fetchData = async (params) => {
        setLoading(true);
        try {
            const res = await getDeviceTree({ ...params });
            // console.log(res.data)
            const raw = res.data;
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: TreeItem[] }).items ?? []);
            } else {
                setData([]);
            }
            if (res.code === -1) {
                toast.error(res.msg);
                setData([]);
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message: "加载失败");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchData(selected); 
    }, [selected]);

    // 设备添加
    const openDeviceAdd = () => {
        setEditingDevice(null);
        setFormData({...defaultForm, area: selected?.area, link: selected?.link });
        setDialogDeviceOpen(true);
    };
    
    // 设备编辑
    const openDeviceEdit = (row: DeviceItem) => {
        setEditingDevice(row);
        setFormData({ num: row.num , name:row.name, dtype: row.dtype.id, ip:row.ip, conpare:row.conpare, area:row.area, link: row.link, other: row.other, major: row.major, probe_enabled: row.probe_enabled, sort:row.sort });
        setDialogDeviceOpen(true);
    };

    // 设备新增/编辑保存
    const handleDeviceSave = async () => {
        try {
            if (editingDevice) {
                await updateDevice({ id: editingDevice.id, ...formData });
                toast.success("更新成功");
            } else {
                await addDevice(formData);
                toast.success("添加成功");
            }
            setDialogDeviceOpen(false);
            fetchData(selected);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    // 设备删除
    const handleDeviceDelete = async (id: number) => {
        if (!confirm("确认删除？")) return;
        try {
            await deleteDevice(id);
            toast.success("删除成功");
            fetchData(selected);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const onSelect = (sel) => { setSelected(sel) };

    // ── search filter for DataTableTree ──
    const searchFilter = (item: DeviceItem, search: string): boolean => {
        const q = search.toLowerCase();
        if (item.name.toLowerCase().includes(q) || item.ip.toLowerCase().includes(q)) return true;
        return false;
    };

    // 命令添加
    const openCodeAdd = (device: typeItem) => {
        setEditingCode(null);
        setCodeFormData({...defaultCodeForm, device: {"id": device.id,"name": device.name,"ip": device.ip} });
        setDialogCodeOpen(true);
    };

    // 命令编辑
    const openCodeEdit = (row: CodeItem) => {
        setEditingCode(row);
        setCodeFormData({ device: row.device, code: row.code, name: row.name, ctype: row.ctype.id, cformat: row.cformat.id, protocal: row.protocal.id, cport: row.cport, note: row.note });
        setDialogCodeOpen(true);
    };

    // 命令新增/编辑保存
    const handleCodeSave = async () => {
        try {
            if (editingCode) {
                await updateCode({ id: editingCode.id, ...codeFormData, device: codeFormData.device.id });
                toast.success("更新成功");
            } else {
                await addCode({...codeFormData, device: codeFormData.device.id});
                toast.success("添加成功");
            }
            setDialogCodeOpen(false);
            fetchData(selected);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    // 设备/命令删除
    const handleDelete = async (row: TreeItem) => {
        console.log(row)
        setDeleteConfirm({
			open: true,
			title: "确认删除",
			message: `确认删除${row.type=="device"?'设备':'命令'}「 ${row.name} 」？`,
			onConfirm: async () => {
                if(row.type === "device"){
                    await deleteDevice(row.id);
                }else if(row.type === "code"){
                    await deleteCode(row.id);
                }
				toast.success("已删除");
				fetchData(selected);
			},
		});
    };


    const columns: TreeColumn<TreeItem>[] = [
        { 
            id: "name", 
            label: "设备名称 -> 命令名称",
            className: "w-auto pl-4",
            cell: (row, depth) => (
                <span className={depth > 0 ? "text-sm" : "font-medium"}>{row.name}</span>
            ), 
        },
        { 
            id: "id", 
            label: "ID",
            className: "w-20",
            cell: (row) => <span className="text-xs text-muted-foreground">{row.id}</span>,
        },
        { 
            id: "ip", 
            label: "IP 地址 ",
            className: "w-auto",
            cell: (row) => (
                row.type == "device" ?
                <span className="text-xs">{row.ip}</span>
                :
                <span className="text-xs text-muted-foreground">{"端口："+row.cport}</span>
            ) 
        },
        { 
            id: "num", 
            label: "设备编号",
            className: "max-w-50 w-auto ",
            cell: (row) => (
                row.type == "device" ?
                <span className="text-xs ">{row.num || "-"}</span>
                :
                <span className="text-xs text-muted-foreground text-wrap">{"命令："+row.code}</span>
            )
        },
        {   
            id: "dtype", 
            label: "类型",
            className: "w-auto",
            cell: (row) => (
                row.type == "device" ?
                <div className="flex flex-row items-center gap-2">
                    <div className="size-6 bg-white rounded flex justify-center items-center" dangerouslySetInnerHTML={{ __html: changeIconColor(row.dtype.icon,row.dtype.icon_color,'80%')}}></div>
                    <span className="text-xs">{row.dtype.name}</span>
                </div>
                :
                <div className="flex flex-row items-center gap-2">
                    <span className="text-xs text-muted-foreground">{row.ctype.name}</span>
                </div>
            ),
        },
        {
            id: "conpare", 
            label: "设备厂家",
            className: "w-auto",
            cell: (row) => (
                row.type === 'device' ? 
                <span className="text-xs">{row.conpare}</span>
                :
                <span className="text-xs text-muted-foreground">{row.cformat.name}</span>
            ) 
        },
        {
            id: "major",
            label: "内容设备",
            className: "w-auto",
            cell: (row) => (
                row.type == "device" ?
                <Badge variant="secondary" className={
                        row.major === true
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-stone-50 text-stone-700 dark:bg-stone-950 dark:text-stone-300"
                    }>
                    {row.major === true ? "是" : "否"}
                </Badge>
                :
                <span className="text-xs text-muted-foreground">{row.protocal.name}</span>
            ),
        },
        {
            id: "probe_enabled",
            label: "设备探活",
            className: "w-auto",
            cell: (row) => (
                row.type == "device" ?
                <Badge className={
                        row.probe_enabled === true
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-stone-50 text-stone-700 dark:bg-stone-950 dark:text-stone-300"
                    }>
                    {row.probe_enabled === true ? "是" : "否"}
                </Badge>
                :
                <></>
            ),
        },
        {
            id: "status",
            label: "设备状态",
            className: "w-auto",
            cell: (row) => (
                row.type == "device" ?
                <Badge className={
                        row.status === 1 && row.is_online == true
                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : (row.probe_enabled == true ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-stone-50 text-stone-700 dark:bg-stone-950 dark:text-stone-300")
                        }>
                    {row.status === 1 && row.is_online == true ? <CircleCheck data-icon="inline-start" /> : (row.probe_enabled == true ? <CircleX data-icon="inline-start" /> : <Circle data-icon="inline-start" />)}
                    {row.status === 1 && row.is_online == true ? "设备在线" : (row.probe_enabled == true ? "设备离线" : "无状态")}
                </Badge>
                :
                <></>
            ),
        },
        { 
            id: "create_time", 
            label: "创建时间",
            className: "w-auto",
            cell: (row) => <span className="text-xs text-muted-foreground">{ row.create_time }</span>,  
        },
        {
            id: "actions",
            label: "操作",
            className: "w-auto",
            cell: (row) => (
                row.type == 'device' ?
                <div className="flex items-center gap-1">
                    <TipButton view={<PlusIcon className="size-4" />} label="添加子命令" onClick={() => openCodeAdd({"id":row.id,"name":row.name,'ip':row.ip})} />
                    <TipButton view={<PencilIcon className="size-4" />} label="编辑设备" onClick={() => openDeviceEdit(row)} />
                    <TipButton view={<Trash2Icon className="size-4 text-destructive" />} label="删除设备" onClick={() => handleDelete(row)} />
                </div>
                :
                <div className="flex items-center gap-1">
                    <TipButton view={<Code className="size-4" />} label="命令测试" onClick={() => console.log(row.id)} />
                    <TipButton view={<PencilIcon className="size-4" />} label="命令编辑" onClick={() => openCodeEdit(row)} />
                    <TipButton view={<Trash2Icon className="size-4 text-destructive" />} label="命令删除" onClick={() => handleDelete(row)} />
                </div>
            ),
        },
    ];


    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6 h-full">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">设备管理</h1>
            </div>

            <div className="flex gap-4 h-full">
                <div className="w-70 shrink-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">结构导航</span>
                    </div>
                    <ScrollArea className="h-[calc(100dvh-200px)] border border-border px-4 py-2 rounded-lg">
                        <div className="w-full shrink-0">
                            { treeLoading ? (
                                <div className="flex flex-col justify-start">
                                    <Skeleton className="h-4 w-50" />  
                                </div>
                            ) : tree.length === 0 ? (
                                <p className="px-2 py-6 text-center text-xl text-muted-foreground">暂无展馆</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="border border-border p-2 rounded-lg">
                                        <Button title="无绑定设备" className="w-full" variant={selected?.area == 0 ? "default":"secondary"} onClick={() => onSelect({ area: 0, link: null, label: '无绑定设备' })}>
                                            无绑定设备
                                        </Button>
                                    </div>
                                    { tree.map((p) => (
                                        <div key={p.id} className="border border-border p-2 rounded-lg">
                                            <div className='flex flex-row justify-between items-center gap-2 select-none'>
                                                <div className='flex flex-row justify-start items-center gap-2 select-none'>
                                                    <Building2Icon className="size-4 shrink-0" />
                                                    <span className="text-base">{p.name}</span>
                                                </div>
                                                <Button title="展厅设备" variant={selected?.link == p.id ? "default":"secondary"} onClick={() => onSelect({ area: 2, link: p.id, label: p.name })}>
                                                    <CircleDot className="size-4 shrink-0" />
                                                </Button>
                                            </div>
                                            { p.children.map((m) => (
                                                <div key={m.id}>
                                                    <div className='pl-8 mt-2 w-full flex flex-row justify-between items-center text-primary text-sm select-none'>
                                                       {m.name}
                                                       <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground/60 " />
                                                    </div>
                                                    { m.children.map((e) => (
                                                        <div key={e.id}>
                                                            <Button 
                                                                variant={selected?.link == e.id ? "default":"secondary"} 
                                                                className={`w-full pl-12 mt-2 flex flex-row justify-start items-center gap-4 `}
                                                                onClick={() => onSelect({ area: 1, link: e.id, label:e.name })}
                                                                >
                                                                <span>{e.id}</span>
                                                                <span className="text-sm opacity-70">--</span>
                                                                <span className="truncate">{e.name}</span>
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div> 
                    </ScrollArea>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2 h-full">
                    <span className="text-sm font-medium">
                       <span className="text-muted-foreground">展项设备管理</span> 
                    </span>
                    
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-sm font-medium">
                                <span className="text-muted-foreground">展厅/展项 — </span>{selected?.label}
                            </span>
                            <div className="flex gap-2">
                                {
                                    selected.area !== 0 && <Button onClick={openDeviceAdd}><PlusIcon className="mr-1 size-4" /> 新增设备</Button>
                                }
                            </div>
                        </div>
                        <ScrollArea className="h-[calc(100dvh-240px)] border border-border px-4 py-2 rounded-lg">
                            {/* <DataTable
                                columns={columns}
                                data={data}
                                loading={loading}
                                searchPlaceholder="搜索名称/代码/IP..."
                                pageSize={18}
                                onSelectionChange={handleSelectionChange}
                            /> */}
                            <DataTableTree
                                columns={columns}
                                data={data}
                                loading={loading}
                                expanded={true}
                                searchPlaceholder="搜索菜单名称/路由..."
                                searchFilter={searchFilter}
                                getRowClassName={(item, depth) => (depth > 0 ? "bg-muted/20" : "")}
                            />
                        </ScrollArea>
                    </div>
                    
                </div>
            </div>
            
            <Dialog open={dialogDeviceOpen} onOpenChange={setDialogDeviceOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>{editingDevice ? "编辑设备" : "新增设备"}</DialogTitle>
                        <DialogDescription>
                            {editingDevice ? "修改设备信息" : "填写新设备的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
						<FieldGroup>
                            <div className="grid grid-cols-2 gap-4 max-[500px]:grid-cols-1">
                                <Field>
                                    <FieldLabel htmlFor="name">名称</FieldLabel>
                                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="设备名称" />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="ip">设备 IP</FieldLabel>
                                    <Input id="ip" value={formData.ip} onChange={(e) => setFormData({ ...formData, ip: e.target.value })} placeholder="设备IP地址" />
                                </Field>
                            </div>
							<div className="grid grid-cols-2 gap-4 max-[500px]:grid-cols-1">
								<Field>
									<FieldLabel htmlFor="num">编号</FieldLabel>
									<Input id="num" value={formData.num} onChange={(e) => setFormData({ ...formData, num: e.target.value })} placeholder="设备编号" />
								</Field>
								<Field>
									<FieldLabel htmlFor="dtype">类型</FieldLabel>
									<Select items={DeviceTypeItems} defaultValue="1" value={String(formData.dtype)} onValueChange={(e) => setFormData({ ...formData, dtype: Number(e) })}>
										<SelectTrigger id="dtype"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{DeviceTypeItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</div>
							<div className="grid grid-cols-2 gap-4 max-[500px]:grid-cols-1">
                                <Field>
                                    <FieldLabel htmlFor="conpare">设备厂家</FieldLabel>
                                    <Input id="conpare" value={formData.conpare} onChange={(e) => setFormData({ ...formData, conpare: e.target.value })} placeholder="请输入设备厂家，可为空" />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="probe_enabled">设备探活<span className="text-destructive/50 text-xs">*使用服务器30s一次设备活性探测</span></FieldLabel>
                                    <Select items={PropeItems} defaultValue="0" value={formData.probe_enabled?"1":"0"} onValueChange={(e) => setFormData({ ...formData, probe_enabled: e=="1"?true:false })} disabled={[3,4].indexOf(formData.dtype)!==-1?false:true}>
										<SelectTrigger id="probe_enabled"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{PropeItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
                                    
                                </Field>
                            </div>
							<div className="grid grid-cols-2 gap-4 max-[500px]:grid-cols-1">
								<Field>
									<FieldLabel htmlFor="area">所属位置</FieldLabel>
									<Select items={AreaItems} defaultValue="1" value={String(formData.area)} onValueChange={(e) => setFormData({ ...formData, area: Number(e) })}>
										<SelectTrigger id="area"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{AreaItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="link">绑定 ID</FieldLabel>
									<Input id="link" type="number" value={formData.link} onChange={(e) => setFormData({ ...formData, link: Number(e.target.value) })}/>
								</Field>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="major">是否为主内容设备</FieldLabel>
									<Input id="major" type="text" value={formData.major?'是':'否'} onChange={(e) => setFormData({ ...formData, major: e.target.value=='是'? true : false })} disabled/>
								</Field>
								<Field>
									<FieldLabel htmlFor="sort">排序</FieldLabel>
									<Input id="sort" type="number" value={formData.sort} placeholder="请输入排序" onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })}/>
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="other">设备备注</FieldLabel>
								<Textarea id="other" value={formData.other} placeholder="可选输入，设备备注" onChange={(e) => setFormData({ ...formData, other: e.target.value })}/>
							</Field>
						</FieldGroup>
					</form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogDeviceOpen(false)}>取消</Button>
                        <Button className="w-20" onClick={() => handleDeviceSave()}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogCodeOpen} onOpenChange={setDialogCodeOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>{editingCode ? "编辑命令" : "新增命令"}</DialogTitle>
                        <DialogDescription>
                            {editingCode ? "修改命令信息" : "填写新命令的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="name">命令名称</FieldLabel>
                                <Input id="name" value={codeFormData.name} onChange={(e) => setCodeFormData({ ...codeFormData, name: e.target.value })} placeholder="请输入命令名称" />
                            </Field>
                            <div className="grid grid-cols-3 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="device">设备ID</FieldLabel>
                                    <Input id="deviceId" value={codeFormData.device?.id ?? undefined} placeholder="设备ID" disabled/>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="device">设备名称</FieldLabel>
                                    <Input id="deviceName" value={codeFormData.device?.name ?? undefined} placeholder="设备Name" disabled/>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="device">设备IP</FieldLabel>
                                    <Input id="deviceIp" value={codeFormData.device?.ip ?? undefined} placeholder="设备IP" disabled/>
                                </Field>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="ctype">类型</FieldLabel>
                                    <Select items={CodeTypeItems} defaultValue="1" value={String(codeFormData.ctype)} onValueChange={(e) => setCodeFormData({ ...codeFormData, ctype: Number(e) })}>
                                        <SelectTrigger id="ctype"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {CodeTypeItems.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="cformat">格式</FieldLabel>
                                    <Select items={CodeFormatItems} defaultValue="1" value={String(codeFormData.cformat)} onValueChange={(e) => setCodeFormData({ ...codeFormData, cformat: Number(e) })}>
                                        <SelectTrigger id="cformat"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {CodeFormatItems.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="protocal">通信协议</FieldLabel>
                                    <Select items={CodeProtocalItems} defaultValue="1" value={String(codeFormData.protocal)} onValueChange={(e) => setCodeFormData({ ...codeFormData, protocal: Number(e) })}>
                                        <SelectTrigger id="protocal"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {CodeProtocalItems.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="cport">端口</FieldLabel>
                                    <Input id="cport" value={codeFormData.cport} onChange={(e) => setCodeFormData({ ...codeFormData, cport:Number(e.target.value) })} placeholder="端口号" />
                                </Field>
                            </div>
                            <Field>
                                <FieldLabel htmlFor="code">控制命令</FieldLabel>
                                <Textarea id="code" value={codeFormData.code} placeholder="请输入控制命令，可为字符串也可以为16进制" onChange={(e) => setCodeFormData({ ...codeFormData, code: e.target.value })} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="note">设备备注</FieldLabel>
                                <Textarea id="note" value={codeFormData.note} placeholder="可选输入，备注" onChange={(e) => setCodeFormData({ ...codeFormData, note: e.target.value })} />
                            </Field>
                        </FieldGroup>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogCodeOpen(false)}>取消</Button>
                        <Button onClick={handleCodeSave}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- 确认删除 Dialog --- */}
			<AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}>
				<AlertDialogPortal>
					<AlertDialogOverlay />
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
                            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                                <Trash2Icon />
                            </AlertDialogMedia>
							<AlertDialogTitle>{deleteConfirm.title}</AlertDialogTitle>
							<AlertDialogDescription>{deleteConfirm.message}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>取消</AlertDialogCancel>
							<AlertDialogAction variant="destructive" onClick={async () => {
								try {
									await deleteConfirm.onConfirm();
								} finally {
									setDeleteConfirm((prev) => ({ ...prev, open: false }));
								}
							}}>确认</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogPortal>
			</AlertDialog>
        </div>
    );
}
