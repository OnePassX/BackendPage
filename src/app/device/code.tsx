import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { getCodeList, addCode, updateCode, deleteCode, getDeviceList } from "@/api/device";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const defaultForm = { device: null, code:'', name: "", ctype: 1, cformat: 1, protocal: 4, cport: 9, note:'' };


export default function DevicePage() {

    // --- 设备列表 ---
    const [tree, setTree] = useState<any>(null);
    const [treeLoading, setTreeLoading] = useState(true);

    const [data, setData] = useState<CodeItem[]>([]);

    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<CodeItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);

    const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

    const [selected, setSelected] = useState({ device: 0, label:'无绑定设备' }); // {type, id, row, parentId}

    const fetchData = async (params) => {
        setLoading(true);
        try {
            const res = await getCodeList({ ...params, page: 1, limit: 1000 });
            const raw = res.data;
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: CodeItem[] }).items ?? []);
            } else {
                setData([]);
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setLoading(false);
        }
    };

    const fetchTree = async () => { 
        setTreeLoading(true);
        try {
            const res = await getDeviceList({ page: 1, limit: 1000 });
            setTree(res.data || []);
            setSelected({ device: 0, label:'无绑定设备' });
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setTreeLoading(false);
        }
    };

    useEffect(() => { fetchTree(); }, []);

    useEffect(() => { fetchData(selected); }, [selected]);

    const openAdd = () => {
        setEditing(null);
        setFormData({...defaultForm, device: selected?.device });
        setDialogOpen(true);
    };

    const openEdit = (row: CodeItem) => {
        setEditing(row);
        setFormData({ device: row.device?.id, code: row.code, name: row.name, ctype: row.ctype.id,cformat: row.cformat.id, protocal: row.protocal.id, cport: row.cport, note:row.note  });
        setDialogOpen(true);
    };

    const onSelect = (sel) => { setSelected(sel) };

    const handleSave = async () => {
        try {
            if (editing) {
                await updateCode({ id: editing.id, ...formData });
                toast.success("更新成功");
            } else {
                await addCode(formData);
                toast.success("添加成功");
            }
            setDialogOpen(false);
            fetchData(selected);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("确认删除？")) return;
        try {
            await deleteCode(id);
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
            await deleteCode(ids);
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

    const columns: ColumnDef<CodeItem>[] = [
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
        { accessorKey: "id", header: "ID" },
        // { accessorKey: "device", header: "所属设备",cell: ({ row }) => (row.original.device?.name),},
        { accessorKey: "ip", header: "设备IP",cell: ({ row }) => (row.original.device?.ip),},
        { accessorKey: "name", header: "命令名称" },
        { accessorKey: "code", header: "命令原文" },
        { accessorKey: "cport", header: "端口号" },
        { accessorKey: "ctype", header: "类型",cell: ({ row }) => (row.original.ctype?.name),},
        { accessorKey: "cformat", header: "格式",cell: ({ row }) => (row.original.cformat?.name),},
        { accessorKey: "protocal", header: "控制协议",cell: ({ row }) => (row.original.protocal?.name),},
        { accessorKey: "create_time", header: "创建时间" },
        {
            id: "actions",
            header: "操作",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)} title="编辑">
                        <PencilIcon className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)} title="删除">
                        <Trash2Icon className="size-4 text-destructive" />
                    </Button>
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
                            ) : tree?.length === 0 ? (
                                <p className="px-2 py-6 text-center text-xl text-muted-foreground">暂无展馆</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <Button 
                                        variant={selected?.device == 0 ? "default":"secondary"} 
                                        onClick={() => onSelect({ device: 0, label:'无绑定命令' })}
                                        >
                                        <span className="truncate">无绑定命令</span>
                                    </Button>
                                    { tree?.map((d) => (
                                        
                                        <Button
                                            key={d.id}
                                            variant={selected?.device == d.id ? "default":"secondary"} 
                                            onClick={() => onSelect({ device: d.id, label:d.name })}
                                            >
                                            <span className="text-sm opacity-70">--</span>
                                            <span className="truncate">{d.name}</span>
                                            <span className="text-sm opacity-70">--</span>
                                        </Button>
                                    
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
                                {
                                    selected.device !== 0 &&<Button onClick={openAdd}><PlusIcon className="mr-1 size-4" /> 新增命令</Button>
                                }
                                
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
                                <FieldLabel htmlFor="name">命令名称</FieldLabel>
                                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入命令名称" />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="device">设备ID</FieldLabel>
                                    <Input id="device" value={formData.device ?? undefined} onChange={(e) => setFormData({ ...formData, device:Number(e.target.value) })} placeholder="设备ID" disabled={selected.device!==0?true:false}/>
                                </Field>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="ctype">类型</FieldLabel>
                                    <Select items={CodeTypeItems} defaultValue="1" value={String(formData.ctype)} onValueChange={(e) => setFormData({ ...formData, ctype: Number(e) })}>
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
                                    <Select items={CodeFormatItems} defaultValue="1" value={String(formData.cformat)} onValueChange={(e) => setFormData({ ...formData, cformat: Number(e) })}>
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
                                <Field>
                                    <FieldLabel htmlFor="cport">端口</FieldLabel>
                                    <Input id="cport" value={formData.cport} onChange={(e) => setFormData({ ...formData, cport:Number(e.target.value) })} placeholder="端口号" />
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
        </div>
    );
}
