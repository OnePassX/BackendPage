import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon, Building2Icon, ChevronDownIcon, CircleDot } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { getExhibitTree, getControlList, addControl, updateControl, deleteControl, sendControl, batchAddControl } from "@/api/exhibition";
import { Field, FieldGroup, FieldLabel,FieldError } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger, PopoverTitle } from "@/components/ui/popover";
import { DeleteDialog } from "@/components/delete-dialog";

// 类型
interface typeItem {
    id: number;
    name: string;
    ip: string|null;
}

// 命令
interface ContentCodeItem {
    id?: number;
    e_id: number | null;
    name: string;
    cformat: typeItem;
    protocal: typeItem;
    ip: string;
    port: number;
    code: string;
    note: string;
    sort: number;
}

const CodeFormatItems = [
	{label:'字符串',value:'1'},{label:'16进制',value:'2'}
]

const CodeProtocalItems = [
	{label:'TCP Client',value:'1'},{label:'TCP Server',value:'2'},{label:'UDP Client',value:'3'},{label:'UDP Server',value:'4'},
    {label:'HTTP POST',value:'5'},{label:'HTTP GET',value:'6'},{label:'HTTP Server',value:'7'},{label:'IO Server',value:'8'},
    {label:'其他',value:'9'}
]

const defaultForm = { e_id: null, name: '', cformat: 1, protocal: 4, ip:'', code:'', port: 10023, note:'', sort: 0 };


export default function ContentCodePage() {

    // --- 设备列表 ---
    const [tree, setTree] = useState<any>(null);
    const [treeLoading, setTreeLoading] = useState(true);

    const [data, setData] = useState<ContentCodeItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [batchDialogOpen, setBatchDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ContentCodeItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);
    const [batchFormData, setBatchFormData] = useState({table_text:'',e_id :null })

    const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

    const [selected, setSelected] = useState({ e_id: 0, ip: '',label:'无绑定设备' }); // {type, id, row, parentId}

    const fetchTree = async () => { 
        setTreeLoading(true);
        try {
            const res = await getExhibitTree();
            setTree(res.data || []);
            setSelected({ e_id: 0, ip:'', label:'无绑定命令' });
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setTreeLoading(false);
        }
    };

    const fetchData = async (params) => {
        setLoading(true);
        try {
            const res = await getControlList({ ...params, page: 1, limit: 1000 });
            const raw = res.data;
            // console.log(raw)
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: ContentCodeItem[] }).items ?? []);
            } else {
                setData([]);
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => { fetchTree(); }, []);

    useEffect(() => { fetchData(selected); }, [selected]);

    const openAdd = () => {
        setEditing(null);
        setFormData({...defaultForm, e_id: selected.e_id == 0 ? null : selected.e_id, ip: selected.ip });
        setDialogOpen(true);
    };

    const openBatchAdd = () => {
        setBatchFormData({table_text:'', e_id: selected.e_id == 0 ? null : selected.e_id })
        setBatchDialogOpen(true);
    }

    const openEdit = (row: ContentCodeItem) => {
        setEditing(row);
        setFormData({ e_id: row.e_id, name: row.name, cformat: row.cformat.id, protocal: row.protocal.id, ip:row.ip, port: row.port, code: row.code, note:row.note,sort:row.sort  });
        setDialogOpen(true);
    };

    const onSelect = (sel) => { setSelected(sel) };

    const handleSave = async () => {
        try {
            if (editing) {
                await updateControl({ id: editing.id, ...formData });
                toast.success("更新成功");
            } else {
                await addControl(formData);
                toast.success("添加成功");
            }
            setDialogOpen(false);
            fetchData(selected);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    const handleBatchSave = async () => {
        try {
            await batchAddControl(batchFormData);
            toast.success("添加成功");
            setBatchDialogOpen(false);
            fetchData(selected);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("确认删除？")) return;
        try {
            await deleteControl(id);
            toast.success("删除成功");
            fetchData(selected);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const handleBatchDelete = async () => {
        if (!confirm(`确认删除选中的 ${selectedIds.size} 项？`)) return;
        try {
            const ids = Array.from(selectedIds).join(",");
            await deleteControl(ids);
            toast.success(`已删除 ${selectedIds.size} 项`);
            setSelectedIds(new Set());
            fetchData(selected);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const handleSelectionChange = useCallback((selected: Set<number | string>) => {
        // console.log(selected)
        setSelectedIds(selected);
    }, []);

    const columns: ColumnDef<ContentCodeItem>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                        aria-label="全选"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(v) => row.toggleSelected(!!v)}
                        aria-label="选择"
                    />
                </div>
            ),
            size: 40,
            enableHiding: false,
            enableSorting: false,
            enableColumnFilter: false,
        },
        { 
            accessorKey: "id", 
            header: "ID" 
        },
        // { accessorKey: "device", header: "所属设备",cell: ({ row }) => (row.original.device?.name),},
        { 
            accessorKey: "ip", 
            header: "IP",
        },
        { 
            accessorKey: "name", 
            header: "命令名称",
            
            cell:({ row }) => (
				<div className="overflow-hidden truncate">
					{row.original.name || '-'}
				</div>
			),
            enableSorting: false,
			enableColumnFilter: false, 
        },
        { 
            accessorKey: "code", 
            header: "命令原文",
            maxSize: 100,
            cell:({ row }) => (
				<div className="max-w-80 overflow-hidden">
                    <Popover >
                        <PopoverTrigger render={<Button variant="ghost" className="hover:underline underline-offset-1 px-0">{row.original.code || '-'}</Button>}>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="flex flex-col gap-0.5 w-auto" >
                            <PopoverTitle>复制命令</PopoverTitle>
                            <span className="text-wrap">{row.original.code || '-'}</span>
                        </PopoverContent>
                    </Popover>
				</div>
			),
            enableSorting: false,
			enableColumnFilter: false, 
        },
        { 
            accessorKey: "port", 
            header: "端口号",
        },
        { 
            accessorKey: "cformat", 
            header: "格式",
            cell: ({ row }) => (row.original.cformat?.name),
        },
        { 
            accessorKey: "protocal", 
            header: "控制协议",
            cell: ({ row }) => (row.original.protocal?.name),
        },
        { 
            accessorKey: "create_time", 
            header: "创建时间" 
        },
        {
            id: "actions",
            header: "操作",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)} title="编辑">
                        <PencilIcon className="size-4" />
                    </Button>
                    {/* <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)} title="删除">
                        <Trash2Icon className="size-4 text-destructive" />
                    </Button> */}
                    <DeleteDialog view={<Trash2Icon className="size-4 text-destructive" />} label={'确认删除此命令，删除后可去操作日志中恢复操作'}  onDelete={()=>handleDelete(row.original.id)}/> 
                </div>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">命令列表</h1>
            </div>
            <div className="flex gap-4 h-full">
                <div className="w-70 shrink-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">结构导航</span>
                    </div>
                    <ScrollArea className="h-[calc(100lvh-200px)] border border-border px-4 py-2 rounded-lg">
                        <div className="w-full shrink-0">
                            { treeLoading ? (
                                <div className="flex flex-col justify-start">
                                    <Skeleton className="h-4 w-50" />  
                                </div>
                            ) : tree.length === 0 ? (
                                <p className="px-2 py-6 text-center text-xl text-muted-foreground">暂无命令</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="border border-border p-2 rounded-lg">
                                        <Button title="全局命令" className="w-full" variant={selected?.e_id == 0 ? "default":"secondary"} onClick={() => onSelect({ e_id: 0, ip:'0.0.0.0', label: '全局命令' })}>
                                            全局命令
                                        </Button>
                                    </div>
                                    { tree.map((p) => (
                                        <div key={p.id} className="border border-border p-2 rounded-lg">
                                            <div className='flex flex-row justify-start items-center gap-2 select-none'>
                                                <Building2Icon className="size-4 shrink-0" />
                                                <span className="text-base">{p.name}</span>
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
                                                                variant={selected?.e_id == e.id ? "default":"secondary"} 
                                                                className={`w-full pl-12 mt-2 flex flex-row justify-start items-center gap-4 `}
                                                                onClick={() => onSelect({ e_id: e.id, ip:e.ip, label:e.name })}
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
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <span className="text-sm font-medium">
                       <span className="text-muted-foreground">设备命令管理</span> 
                    </span>
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-sm font-medium">
                                <span className="text-muted-foreground">展厅/展项 — </span>{selected?.label}
                            </span>
                            <div className="flex items-center gap-2">
                                {selectedIds.size > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="default"
                                        onClick={() => handleBatchDelete()}
                                    >
                                        批量删除 ({selectedIds.size})
                                    </Button>
                                )}
                                <Button onClick={openBatchAdd}><PlusIcon className="mr-1 size-4" /> 批量新增</Button>
                                <Button onClick={openAdd}><PlusIcon className="mr-1 size-4" /> 新增命令</Button>
                            </div>
                        </div>
                        <ScrollArea className="h-[calc(100dvh-240px)] border border-border px-4 py-2 rounded-lg">
                            <DataTable
                                columns={columns}
                                data={data}
                                loading={loading}
                                searchPlaceholder="搜索名称/代码/IP..."
                                pageSize={15}
                                onSelectionChange={handleSelectionChange}
                            />
                        </ScrollArea>
                    </div>
                </div>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑命令" : "新增命令"}</DialogTitle>
                        <DialogDescription>
                            {editing ? "修改命令信息" : "填写新命令的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="name" aria-required>命令名称</FieldLabel>
                                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入命令名称" required/>
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="device">展项ID</FieldLabel>
                                    <Input id="device" value={formData.e_id} onChange={(e) => setFormData({ ...formData, e_id:Number(e.target.value)??null })} placeholder="展项ID" disabled/>
                                </Field>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                 <Field>
                                    <FieldLabel htmlFor="cformat">格式</FieldLabel>
                                    <Select items={CodeFormatItems} defaultValue="1" value={String(formData.cformat)} onValueChange={(e) => setFormData({ ...formData, cformat: Number(e) })} >
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
                                <Field>
                                    <FieldLabel htmlFor="protocal">通信协议</FieldLabel>
                                    <Select items={CodeProtocalItems} defaultValue="1" value={String(formData.protocal)} onValueChange={(e) => setFormData({ ...formData, protocal: Number(e) })}>
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
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="ip">IP</FieldLabel>
                                    <Input id="ip" value={formData.ip} onChange={(e) => setFormData({ ...formData, ip:e.target.value })} placeholder="设备IP" />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="port">端口</FieldLabel>
                                    <Input id="port" value={formData.port} onChange={(e) => setFormData({ ...formData, port:Number(e.target.value) })} placeholder="端口号" />
                                </Field>
                            </div>
                            <Field>
                                <FieldLabel htmlFor="code">控制命令</FieldLabel>
                                <Textarea id="code" value={formData.code} placeholder="请输入控制命令，可为字符串也可以为16进制" onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="note">设备备注</FieldLabel>
                                <Textarea id="note" value={formData.note} placeholder="可选输入，备注" onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
                            </Field>
                        </FieldGroup>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                        <Button onClick={handleSave}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>批量添加命令</DialogTitle>
                        <DialogDescription>
                            {"填写新命令的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="table_text">请把数据复制到下方输入框内</FieldLabel>
                                <Textarea className="max-h-80 h-40" id="table_text" value={batchFormData.table_text} placeholder="格式：name ip port format protocal code" onChange={(e) => setBatchFormData({ ...batchFormData, table_text: e.target.value })} />
                            </Field>
                        </FieldGroup>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>取消</Button>
                        <Button onClick={handleBatchSave}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


