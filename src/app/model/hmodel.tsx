import { useState, useEffect } from "react";
import { type ColumnDef } from "@tanstack/react-table";

import { Trash2Icon, PlusIcon, CircleCheck, Ellipsis, PencilIcon, SquareDot, Building2Icon, CircleDot, ChevronDownIcon } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Field, FieldGroup, FieldLabel,} from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemFooter, ItemTitle,} from "@/components/ui/item";
import { InputGroup,InputGroupAddon,InputGroupButton,InputGroupInput,} from "@/components/ui/input-group";
import { Popover,PopoverContent,PopoverTrigger,} from "@/components/ui/popover"

import { DataTable } from "@/components/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { TipButton } from "@/components/tip-button";

import { getHmodelList, addHmodel, updateHmodel, deleteHmodel, updateHmodelStatus, getHmodelBindList,addHmodelBind,updateHmodelBind,deleteHmodelBind } from "@/api/model";
import { getExhibitTree } from "@/api/exhibition";
import { getDeviceList, getCodeList} from "@/api/device";
import { getIconList } from "@/api/icon";

interface IconItem {
    id: number;
    url: string;
    svg: string;
}

interface typeItem {
    id: number;
    name: string;
}

interface typeItem2 {
    id: number;
    name: string;
    ip: string;
}

interface CodeItem {
    id: number;
    name: string;
    ip: string;
    format: string;
    protocal: string;
    port: number;
    code: string;
}

interface Hmodel { 
    id: number; 
    name: string; 
    msg: string; 
    default: number; 
    current: number; 
    status: number; 
    icon: IconItem | null;
    sort: number;
    note: string;
}

interface HmodelBind {
    id: number;
    model: typeItem;
    pavilion: typeItem;
    exhibition: typeItem | null;
    device: typeItem2 ;
    code: CodeItem;
    delay: number;
}

const StatusItems = [
    { value: "1", label: '启用' },
    { value: "2", label: '禁用' },
];



export default function HardwareModelPage() {
    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6 w-full h-full">
            <h1 className="text-xl font-semibold">硬件模式管理</h1>
            <Tabs defaultValue="tableView" className="w-full min-h-0 flex-1 flex flex-col">
                <TabsList>
                    <TabsTrigger value="nodeView">节点视图</TabsTrigger>
                    <TabsTrigger value="tableView">表格视图</TabsTrigger>
                </TabsList>
                <TabsContent value="nodeView"><NodeViewTab /></TabsContent>
                <TabsContent value="tableView"><TableViewTab /></TabsContent>
            </Tabs>
        </div>
    );
}

const changeIconColor = (val, color='#201f2c', size) => {
    val = val && val.replaceAll(/fill=".*?"/g, `fill="${color || '#FFFFFF'}"`);
    val = val && val.replaceAll(/width=".*?"/g, `width="${size || '100%'}"`);
    val = val && val.replaceAll(/width=".*?"/g, `height="${size || '100%'}"`);
    return val
}

const defaultBindForm = {model: null, pavilion: null, exhibition: null, device: null, code: null, delay:0}

// --- 表格视图 ---
function TableViewTab() {

    // 模式数据部分
    const [data, setData] = useState<Hmodel[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Hmodel | null>(null);
    const [form, setForm] = useState({ name: "", msg: "", status: 1, icon: null, sort: 0, note: "" });

    // 模式选择
    const [selected, setSelected] = useState(null); // {type, id, row, parentId}
    // 展项选择
    const [exSelected,setExSelected] = useState(null);
    
    // 展项列表
    const [exhibitTree, setExhibitTree] = useState<any>(null);
    // 展项列表加载
    const [treeLoading, setTreeLoading] = useState(true);

    // 模式绑定部分
    const [bindEditing, setBindEditing] = useState<HmodelBind | null>(null);
    const [bindData, setBindData] = useState<HmodelBind[]>([]);
    const [bindLoading, setBindLoading] = useState(true);
    const [bindDialogOpen, setBindDialogOpen] = useState(false);
    const [bindForm,setBindForm] = useState(defaultBindForm);
    const [deviceItems, setDeviceItems] = useState<any>(null);
    const [codeItems, setCodeItems] = useState<any>(null);

    // 模式图标列表
    const [iconList, setIconList] = useState<any[]>([]);
    // 选中的图标
    const [selectedIcon, setSelectedIcon] = useState<any>(null);

    // --- 获取模式列表数据 ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getHmodelList();
            const raw = res.data;
            console.log(raw);
            if (Array.isArray(raw)) setData(raw);
            else if (raw && typeof raw === "object" && "items" in raw) setData((raw as { items: Hmodel[] }).items ?? []);
            else setData([]);
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "加载失败"); }
        finally { setLoading(false); }
    };

    // --- 获取展项树数据 ---
    const fetchTree = async () => { 
        setTreeLoading(true);
        try {
            const res = await getExhibitTree();
            // console.log(res.data);
            const raw = res.data;
            if (Array.isArray(raw)) setExhibitTree(raw);
            else setExhibitTree([]);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally { 
            setTreeLoading(false); 
        }
    };

    // --- 获取模式绑定数据 ---
    const fetchBindData = async (params) => {
        setBindLoading(true);
        try {
            const res = await getHmodelBindList({...params});
            const raw = res.data;
            // console.log(res);
            if (Array.isArray(raw)) setBindData(raw);
            else if (raw && typeof raw === "object" && "items" in raw) setBindData((raw as { items: HmodelBind[] }).items ?? []);
            else setBindData([]);
        } catch (e: unknown) { 
            setBindData([]);
            toast.warning(e instanceof Error ? e.message : "加载失败"); 
        } finally { 
            setBindLoading(false); 
        }
    };

    // --- 获取设备数据 --- 
    const fetchDeviceData = async (params) => { 
        try {
            const res = await getDeviceList({...params});
            const raw = res.data;
            // console.log(raw);
            if (Array.isArray(raw)) {
                const arr = []
                raw.map(item => {
                    arr.push({
                        label: item.name,
                        value: item.id,
                    })
                })
                setDeviceItems(arr)
            }

        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "操作失败"); 
        }
    };

    // --- 获取命令数据 ---
    const fetchCodeData = async (params) => { 
        try {
            const res = await getCodeList({...params});
            const raw = res.data;
            if (Array.isArray(raw)) {
                const arr = []
                raw.map(item => {
                    arr.push({
                        label: item.name,
                        value: item.id,
                    })
                })
                setCodeItems(arr)
            }

        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "操作失败"); 
        }
    };

    // --- 获取模式图标列表
    const fetchIcons = async () => {
        setLoading(true);
        try {
            const res = await getIconList({ page: 1, limit: 1000 });
            console.log(res)
            setIconList(res.data || []);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载图标失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchIcons(); }, []);

    useEffect(() => { fetchData(); }, []);

    useEffect(() => { fetchTree(); }, []);

    useEffect(() => { 
        selected && exSelected && fetchBindData({model_id:selected.id,exhibition_id:exSelected.id,pavilion_id:exSelected.pavilion_id}); 
    }, [selected,exSelected]);

    // --- 添加模式 ---
    const openAdd = () => { 
        setEditing(null); 
        setForm({ name: "", msg: "", status: 1, icon: null, sort: 0, note: "" }); 
        setDialogOpen(true); 
    };

    // --- 编辑模式 ---
    const openEdit = (row: Hmodel) => { 
        setEditing(row); 
        setForm({ name: row.name, msg: row.msg, status: row.status, icon: row.icon?.id, sort: row.sort, note: row.note  }); 
        setDialogOpen(true);
    };

    // --- 保存模式 ---
    const handleSave = async () => {
        try { 
            if (editing) { 
                await updateHmodel({ id: editing.id, ...form }); 
                toast.success("更新成功"); 
            } else { 
               await addHmodel(form); 
                toast.success("添加成功");
            }
            setDialogOpen(false); 
            fetchData(); 
        }
        catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
    };

    // --- 硬件模式状态切换 ---
    const handleStatusChange = async (row: Hmodel) => {
        try {
            await updateHmodelStatus({id:row.id,status:row.status==1?2:1});
            toast.success("操作成功");
            fetchData();
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "操作失败"); 
        }
    };

    // --- 硬件模式删除 --- 
    const handleDelete = async (row: Hmodel) => {
        try { await deleteHmodel(row.id); toast.success("删除成功"); fetchData(); }
        catch (e: unknown) { toast.error(e instanceof Error ? e.message : "删除失败"); }
    };

    // --- 模式选中 --- 
    const onSelect = (sel) => { setSelected(sel); };

    // --- 展项选中 ---
    const onExSelect = (sel) => { setExSelected(sel) };

    // --- 添加模式绑定 ---
    const openBindAdd = () => {
        fetchDeviceData({area:exSelected.id === null ? 2 : 1, link:exSelected.id == null ? exSelected.pavilion_id : exSelected.id})
        setBindEditing(null);
        setBindForm({...defaultBindForm, model:selected.id, exhibition:exSelected.id, pavilion:exSelected.pavilion_id});
        setBindDialogOpen(true);
    };

    // --- 编辑模式绑定 ---
    const openBindEdit = (row: HmodelBind) => {
        setBindEditing(row);
        fetchDeviceData({ area: row.exhibition === null ? 2 : 1, link: row.exhibition == null ? row.pavilion.id : row.exhibition.id })
        fetchCodeData({ device: row.device.id })
        setBindForm({ model: row.model.id, pavilion: row.pavilion.id, exhibition: row.exhibition?.id || null, device: row.device.id, code: row.code.id, delay: row.delay  });
        setBindDialogOpen(true);
    }
    
    // --- 选择事件 ---
    const onDeviceSelectChange = async (value: string) => { 
        fetchCodeData({device: value})
        setBindForm({ ...bindForm, device:Number(value), code: bindForm.device == value ? bindForm.code : null })
    };

    // --- 保存模式绑定 ---
    const handleBindSave = async () => { 
        try {
            if (bindEditing) {
                await updateHmodelBind({ id: bindEditing.id, ...bindForm });
                toast.success("更新成功");
            } else {
                await addHmodelBind(bindForm);
                toast.success("添加成功");
            }
            setBindDialogOpen(false);
            fetchBindData({model_id:selected.id,exhibition_id:exSelected.id,pavilion_id:exSelected.pavilion_id});
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    // --- 删除模式绑定 ---
    const handleBindDelete = async (id: number) => { 
        try {
            await deleteHmodelBind(id);
            toast.success("删除成功");
            fetchBindData({model_id:selected.id,exhibition_id:exSelected.id,pavilion_id:exSelected.pavilion_id});
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const columns: ColumnDef<HmodelBind>[] = [
        { 
            accessorKey: "id", 
            header: "ID" 
        },
        { 
            accessorKey: "name", 
            header: "设备名称",
            cell: ({ row }) => <div className="flex items-center gap-1"><Badge variant="outline">{row.original.device.id}</Badge><span>{row.original.device.name}</span></div>,
        },
        { 
            accessorKey: "ip", 
            header: "设备IP",
            cell: ({ row }) => <span>{row.original.device.ip || '-'}</span>,
        },
        {
            accessorKey: "code",
            header: "命令名称",
            cell: ({ row }) => <div className="flex items-center gap-1"><Badge variant="outline">{row.original.code.id}</Badge><span>{row.original.code.name}</span></div>,
        },
        {
            accessorKey: "code_port",
            header: "端口",
            cell: ({ row }) => <span>{row.original.code.port}</span>,
        },
        {
            accessorKey: "code_format",
            header: "格式",
            cell: ({ row }) => <span>{row.original.code.format}</span>,
        },
        {
            accessorKey: "code_protocal",
            header: "协议",
            cell: ({ row }) => <span>{row.original.code.protocal}</span>,
        },
        {
            accessorKey: "code_code",
            header: "命令原文",
            enableResizing: false,
            size: 300,  
            cell: ({ row }) => <span className="text-wrap">{row.original.code.code}</span>,
        },
        { 
            accessorKey: "delay", 
            header: "延时",
            cell: ({ row }) => <Badge variant="default">{row.original.delay} 秒后发送</Badge>, 
        },
        {
            id: "actions", header: "操作",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <TipButton view={<PencilIcon className="size-4" />} label="命令编辑" onClick={() => openBindEdit(row.original)} />
                    <DeleteDialog view={<Trash2Icon className="size-4 text-destructive" />} label={'删除后不可恢复数据，请谨慎操作。'}  onDelete={()=>handleBindDelete(row.original.id)}/>
                </div>
            ),
        },
    ];

    return (
        <div className="flex flex-col">
            <div className="flex gap-4 h-full flex-wrap md:flex-nowrap">
                <div className="w-70 shrink-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-md font-medium text-muted-foreground">展项列表</span>
                        <span className="h-7"></span>
                    </div>
                    <ScrollArea className="h-[calc(100dvh-240px)] border border-border px-4 py-2 rounded-lg">
                        <div className="w-full shrink-0">
                            { treeLoading ? (
                                <div className="flex flex-col justify-start gap-2">
                                    <p className="px-2 py-6 text-center text-xl text-muted-foreground">请选择模式</p>
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-8 w-40" />
                                    <Skeleton className="h-8 w-50" />
                                </div>
                            ) : exhibitTree.length === 0 ? (
                                <p className="px-2 py-6 text-center text-xl text-muted-foreground">暂无展馆</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    { exhibitTree.map((p) => (
                                        <div key={p.id} className="border border-border p-2 rounded-lg">
                                            <div className='flex flex-row justify-between items-center gap-2 select-none'>
                                                <div className='flex flex-row justify-start items-center gap-2 select-none'>
                                                    <Building2Icon className="size-4 shrink-0" />
                                                    <span className="text-base">{p.name}</span>
                                                </div>
                                                <Button title="展厅设备" variant={exSelected?.id == null && exSelected?.pavilion_id == p.id  ? "default":"secondary"} onClick={() => onExSelect({ id: null, label:p.name, pavilion_id: p.id,  pavilion_name: p.name })}>
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
                                                                variant={exSelected?.id == e.id ? "default":"secondary"} 
                                                                className={`w-full pl-12 mt-2 flex flex-row justify-start items-center gap-4 `}
                                                                onClick={() => onExSelect({ id: e.id, label:e.name, pavilion_id: p.id,  pavilion_name: p.name })}
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
                <div className="w-60 shrink-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className=" text-md font-medium text-muted-foreground text-nowrap truncate">模式列表</span> 
                        <Button size="sm" onClick={openAdd}><PlusIcon className="mr-1 size-4" /> 新增模式</Button>
                    </div>
                    <ScrollArea className="h-[calc(100dvh-240px)] border border-border px-4 py-4 rounded-lg">
                        <div className="w-full shrink-0">
                            { data?.length === 0 ? (
                                <p className="px-2 py-6 text-center text-xl text-muted-foreground">暂无模式</p>
                            ) : (
                                <div className="flex flex-col w-full gap-2">
                                    <ItemGroup className="max-w-sm">
                                    { data?.map((row) => (
                                        <Item key={row.id} variant="outline" className={selected?.id == row.id ? "bg-secondary-foreground text-secondary":"bg-secondary text-secondary-foreground"}  onClick={() => onSelect({ id: row.id, label:row.name })}>
                                            <ItemMedia variant="image">
                                                <div className="w-10 h-10 flex-none">
                                                {
                                                    row.icon !== null ?
                                                    <div className={`w-full h-full p-2 rounded-lg bg-white dark:bg-secondary-foreground/60`} dangerouslySetInnerHTML={{ __html: changeIconColor(row.icon?.svg,'#0000ac','100%')}}></div>
                                                    :
                                                    <div className="w-full h-full p-2 rounded-lg flex items-center justify-center bg-white dark:bg-secondary-foreground/60 text-black text-xl">{row.name[0]}</div>
                                                }
                                                </div>
                                            </ItemMedia>
                                            <ItemContent className="gap-1">
                                                <ItemTitle className="flex items-center ">
                                                    <span className="text-base ">{row.name}</span>
                                                    
                                                </ItemTitle>
                                                <ItemDescription>{row.msg}</ItemDescription>
                                            </ItemContent>
                                            <ItemActions>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" className="rounded-full" />}>
                                                        <Ellipsis className="size-4 text-black" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuGroup>
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => openEdit(row)}>
                                                            <PencilIcon className="size-4" />
                                                            编辑模式
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(row)}>
                                                            <SquareDot className="size-4" />
                                                            状态切换
                                                        </DropdownMenuItem>
                                                        </DropdownMenuGroup>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuGroup>
                                                            <DropdownMenuItem onClick={() => handleDelete(row)}>
                                                                <Trash2Icon className="size-4 text-destructive" />
                                                                删除模式
                                                            </DropdownMenuItem>
                                                        </DropdownMenuGroup>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </ItemActions>
                                            <ItemFooter >
                                                <Badge className={ `${row.status === 1? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300": "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                                                    <span className="line-clamp-2 text-xs ">{row.status === 1 ? "模式启用" : "禁用中"}</span>
                                                </Badge>
                                                { row.current === 1 ? <Badge variant="secondary" ><CircleCheck className="text-green-500 size-4" /> 当前模式</Badge> : "" }
                                            </ItemFooter>
                                        </Item>
                                        // <ItemSeparator />
                                    ))}
                                    </ItemGroup>
                                </div>
                            )}
                        </div> 
                    </ScrollArea>
                </div>
                { selected && exSelected ? (
                    <div className="flex-1 flex flex-col gap-2">
                        
                        <div className="flex justify-between items-center">
                            <span className="text-md font-medium">
                                <span>{selected?.label}</span>
                                <span className="text-muted-foreground px-2"> {`>`} </span>
                                <span>{exSelected?.label}</span>
                                <span className="text-muted-foreground px-2"> {`>`} </span>
                                <span>模式控制列表</span> 
                            </span>
                            <Button size="sm" onClick={openBindAdd}><PlusIcon className="mr-1 size-4" /> 新增绑定</Button>
                        </div>
                        <ScrollArea className="h-[calc(100dvh-240px)] border border-border px-4 py-4 rounded-lg">
                            <DataTable columns={columns} data={bindData} loading={bindLoading} searchPlaceholder="搜索模式..." pageSize={12}/>
                        </ScrollArea>
                        
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center h-64 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
                    请从左侧选择一个模式和一个展项
                    </div>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-120">
                    <DialogHeader><DialogTitle>{editing ? "编辑内容模式" : "新增内容模式"}</DialogTitle></DialogHeader>
                    <form className="w-full">
                        <FieldGroup >
                            <Field><FieldLabel>模式名称</FieldLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                            <Field><FieldLabel>模式信息</FieldLabel><Input value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} /></Field>
                            
                            <Field>
                                <FieldLabel>模式图标</FieldLabel>
                                <InputGroup>
                                    <InputGroupInput value={form.icon} onChange={(e) => setForm({ ...form, icon: Number(e.target.value) })} />
                                    <Popover>
                                        <PopoverTrigger nativeButton={false} render={
                                            <InputGroupAddon align="inline-end">
                                                <InputGroupButton variant="default" >
                                                    选择图标
                                                </InputGroupButton>
                                            </InputGroupAddon>
                                            }>
                                        </PopoverTrigger>
                                    <PopoverContent align="start" className="grid grid-cols-10 gap-1 w-120">
                                        {
                                            iconList.length > 0 && iconList.map((item, index) => (
                                                <div className={`w-auto h-auto flex-none border rounded-md p-1 ${ selectedIcon == item.id ? 'bg-secondary-foreground' : 'bg-white' }`} key={index} onClick={() => {setSelectedIcon(item.id);setForm({...form, icon:item.id})}}>
                                                    {
                                                        item.svgname !== '' ?
                                                        <div className={`w-full h-full p-2 rounded-lg bg-secondary dark:bg-secondary-foreground/60`} dangerouslySetInnerHTML={{ __html: changeIconColor(item.svgname,'#0000ac','100%')}}></div>
                                                        :
                                                        <div className="w-full h-full p-2 rounded-lg flex items-center justify-center bg-secondary dark:bg-secondary-foreground/60 text-black text-xl"><img src={item.address} /></div>
                                                    }
                                                </div>
                                                )
                                            )
                                        }
                                    </PopoverContent>
                                    </Popover>
                                </InputGroup>
                            </Field>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Field><FieldLabel>模式排序</FieldLabel><Input value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} /></Field>
                                <Field>
                                    <FieldLabel htmlFor="c_iframe_show">模式状态</FieldLabel>
                                    <Select items={StatusItems} defaultValue="1" value={String(form.status)} onValueChange={(e) => setForm({ ...form, status: Number(e) })}>
                                        <SelectTrigger id="c_iframe_show"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                            {StatusItems.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                            <Field><FieldLabel>描述</FieldLabel><Textarea className="max-h-20" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
                        </FieldGroup>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                        <Button onClick={handleSave}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader><DialogTitle>{ bindEditing ? "编辑模式绑定" : "新增模式绑定"}</DialogTitle></DialogHeader>
                    <form className="w-full">
                        <FieldGroup >
                            <div className="grid grid-cols-2 gap-4">
                                <Field >
                                    <FieldLabel>模式ID</FieldLabel>
                                    <Input id="model" value={bindForm.model} disabled={true} />
                                </Field>
                                <Field>
                                    <FieldLabel>模式名称</FieldLabel>
                                    <Input value={selected?.label} disabled={true} />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="pavilion">展厅ID</FieldLabel>
                                    <Input id="pavilion" value={bindForm.pavilion} disabled={true} />
                                </Field>
                                <Field>
                                    <FieldLabel>展厅名称</FieldLabel>
                                    <Input value={exSelected?.pavilion_name} disabled={true} />
                                </Field>
                            </div>

                            <div className={`grid grid-cols-2 gap-4  ${bindForm.exhibition === null ? 'hidden' : ''}`}>
                                <Field>
                                    <FieldLabel htmlFor="exhibition">展项ID</FieldLabel>
                                    <Input id="exhibition" value={bindForm.exhibition || ''} disabled={true} />
                                </Field>
                                <Field>
                                    <FieldLabel>展项名称</FieldLabel>
                                    <Input value={exSelected?.label} disabled={true} />
                                </Field>
                            </div>
                            
                            <Field>
                                <FieldLabel htmlFor="bind">选择设备</FieldLabel>
                                <Select items={deviceItems} value={bindForm.device} onValueChange={(e) => onDeviceSelectChange(e)}>
                                    <SelectTrigger id="bind"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                        {deviceItems?.map((item) => (
                                            <SelectItem key={item.value} value={item.value} >
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field>
                                <FieldLabel>绑定命令</FieldLabel>
                                <Select items={codeItems} value={bindForm.code} onValueChange={(e) => setBindForm({ ...bindForm, code: Number(e) })}>
                                    <SelectTrigger id="code"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                        {codeItems?.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field>
                                <FieldLabel>延时执行</FieldLabel>
                                <Input id="delay" value={bindForm.delay}  onChange={(e) => setBindForm({ ...bindForm, delay: Number(e.target.value) })} />
                            </Field>

                        </FieldGroup>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBindDialogOpen(false)}>取消</Button>
                        <Button onClick={handleBindSave}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

// --- 节点视图 ---
function NodeViewTab() {

    const [modelData, setModelData] = useState([]);
    const [loading, setLoading] = useState(true);

    return(
        <div className="w-full h-full flex">
            {/* <SmodelFlow controlData={modelData}/> */}
        </div>
    );
}