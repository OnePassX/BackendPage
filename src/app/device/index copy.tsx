import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon, Building2Icon, ChevronDownIcon, CircleDot } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { getExhibitTree } from "@/api/exhibition";
import { getDeviceList, addDevice, updateDevice, deleteDevice, updateDeviceLink } from "@/api/device";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// 设备类型
interface DtypeItem {
	id: number;
	name: string;
	icon: string;
	icon_color: string;
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
	sort: number;
}

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

const defaultForm = { num: "无" , name:"", dtype: 1, ip:"", conpare:"", area:1, link: null, other: "", major: false, sort:0 };

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
    
    const [data, setData] = useState<DeviceItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<DeviceItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);

    const [selectedIds,setSelectedIds] = useState<Set<number | string>>(new Set());

    const [selected, setSelected] = useState({ area:0, link: null, label:'无绑定设备' }); // {type, id, row, parentId}

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

    const fetchData = async (params) => {
        setLoading(true);
        try {
            const res = await getDeviceList({...params, page:1,limit:1000});
            // console.log(res.data)
            const raw = res.data;
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: DeviceItem[] }).items ?? []);
            } else {
                setData([]);
            }
            if (res.code === -1) {
                toast.error(res.msg);
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message: "加载失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(selected); }, [selected]);

    const openAdd = () => {
        setEditing(null);
        setFormData({...defaultForm, area: selected?.area, link: selected?.link });
        setDialogOpen(true);
    };

    const openEdit = (row: DeviceItem) => {
        setEditing(row);
        setFormData({ num: row.num , name:row.name, dtype: row.dtype.id, ip:row.ip, conpare:row.conpare, area:row.area, link: row.link, other: row.other, major: row.major, sort:row.sort });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editing) {
                await updateDevice({ id: editing.id, ...formData });
                toast.success("更新成功");
            } else {
                await addDevice(formData);
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
            await deleteDevice(id);
            toast.success("删除成功");
            fetchData(selected);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const onSelect = (sel) => { setSelected(sel) };

    const handleBatchDelete = async () => {
        if (!confirm(`确认删除选中的 ${selectedIds.size} 项？`)) return;
        try {
            const ids = Array.from(selectedIds).join(",");
            await deleteDevice(ids);
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

    const columns: ColumnDef<DeviceItem>[] = [
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
        // { accessorKey: "area", header: "所属",
        //     cell: ({ row }) => (
        //         <Badge className={`${row.original.area === 1 ? "bg-green-800 dark:bg-green-500" : ( row.original.area === 2 ? "bg-blue-800 dark:bg-blue-500" : "bg-gray-400 dark:bg-gray-400" )} text-primary-foreground`}>
        //             {
        //                 row.original.area === 1 ? "展项设备" : (row.original.area === 2 ? "展厅设备": "未绑定")
        //             }
        //         </Badge>
        //     ), 
        // },
        // { accessorKey: "link", header: "绑定"},
        { accessorKey: "name", header: "设备名称" },
        { accessorKey: "num", header: "设备编号" },
        { accessorKey: "dtype", header: "设备类型", cell: ({ row }) => (
                <div className="flex flex-row items-center gap-2">
                    <div className="size-6 bg-white rounded flex justify-center items-center" dangerouslySetInnerHTML={{ __html: changeIconColor(row.original.dtype.icon,row.original.dtype.icon_color,'80%')}}></div>
                    <span className="text-xs">{row.original.dtype.name}</span>
                </div>
            ),
        },
        { accessorKey: "ip", header: "IP 地址" },
        { accessorKey: "conpare", header: "设备厂家" },
        // { accessorKey: "other", header: "其他" },
        {
            accessorKey: "major",
            header: "主内容设备",
            cell: ({ row }) => (
                <Badge variant={row.original.major === true ? "default" : "secondary"}>
                    {row.original.major === true ? "是" : "否"}
                </Badge>
            ),
        },
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
                                    selected.area !== 0 && <Button onClick={openAdd}><PlusIcon className="mr-1 size-4" /> 新增设备</Button>
                                }
                            </div>
                        </div>
                        <ScrollArea className="h-[calc(100dvh-240px)] border border-border px-4 py-2 rounded-lg">
                            <DataTable
                                columns={columns}
                                data={data}
                                loading={loading}
                                searchPlaceholder="搜索名称/代码/IP..."
                                pageSize={18}
                                onSelectionChange={handleSelectionChange}
                            />
                        </ScrollArea>
                    </div>
                    
                </div>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑设备" : "新增设备"}</DialogTitle>
                        <DialogDescription>
                            {editing ? "修改设备信息" : "填写新设备的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="name">名称</FieldLabel>
								<Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="设备名称" />
							</Field>
							<div className="grid grid-cols-2 gap-4">
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
							<Field>
								<FieldLabel htmlFor="ip">设备 IP</FieldLabel>
								<Input id="ip" value={formData.ip} onChange={(e) => setFormData({ ...formData, ip: e.target.value })} />
							</Field>
							<Field>
								<FieldLabel htmlFor="conpare">设备厂家</FieldLabel>
								<Input id="conpare" value={formData.conpare} onChange={(e) => setFormData({ ...formData, conpare: e.target.value })} />
							</Field>
							<div className="grid grid-cols-2 gap-4">
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
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                        <Button className="w-20" onClick={()=>handleSave()}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
