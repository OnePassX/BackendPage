import { useState, useEffect } from "react";
import { type ColumnDef } from "@tanstack/react-table";

import { PencilIcon, Trash2Icon, PlusIcon, CircleDot, Ellipsis, SquareDot,CircleCheck,Building2Icon,ChevronDownIcon } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel,} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,} from "@/components/ui/dialog";
import { DropdownMenu,DropdownMenuContent,DropdownMenuGroup,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import { Item,ItemActions,ItemContent,ItemDescription,ItemGroup,ItemMedia,ItemFooter,ItemTitle,} from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup} from "@/components/ui/select";
import { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogContent,AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,AlertDialogFooter, AlertDialogAction, AlertDialogCancel,AlertDialogMedia} from "@/components/ui/alert-dialog";

import { DeleteDialog } from "@/components/delete-dialog";

import { getSmodelList, addSmodel, updateSmodel, deleteSmodel, updateSmodelStatus,getSmodelBindList, addSmodelBind, deleteSmodelBind, updateSmodelBind,} from "@/api/model";
import { getExhibitTree, getContentList, getControlList } from "@/api/exhibition";
import { getDeviceList, getCodeList} from "@/api/device";

// import SmodelFlow from "@/components/SmodelFlow/SmodelFlow";


interface IconItem {
    id: number;
    url: string;
    svg: string;
}

interface typeItem {
    id: number;
    name: string;
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

interface Smodel { 
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

interface SmodelBind {
    id: number;
    model: typeItem;
    pavilion: typeItem;
    exhibition: typeItem | null;
    type: number;
    bind: typeItem;
    code: CodeItem | null;
    delay: number;
}


const StatusItems = [
    { value: "1", label: '启用' },
    { value: "2", label: '禁用' },
];

const TypeItems = [
    { value: "0", label: '请选择绑定' },
    { value: "1", label: '绑定内容控制' },
    { value: "2", label: '绑定设备命令' },
];

// --- 节点视图 ---
function NodeViewTab() {
    return(
        <div className="w-full h-full flex">
            {/* <SmodelFlow controlData={modelData}/> */}
        </div>
    );
}

const changeIconColor = (val, color='#201f2c', size) => {
    val = val && val.replaceAll(/fill=".*?"/g, `fill="${color || '#FFFFFF'}"`);
    val = val && val.replaceAll(/width=".*?"/g, `width="${size || '100%'}"`);
    val = val && val.replaceAll(/width=".*?"/g, `height="${size || '100%'}"`);
    return val
}

const defaultBindForm = {model: null, pavilion: null, exhibition: null, type: 0, bind: null, code: null, delay:0}

// const defaultExSelected = {id:null, label: null, pavilion_id: null, pavilion_name: null}

// --- 表格视图 ---
function TableViewTab() {
    
    const [smodelData, setSmodelData] = useState<Smodel[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Smodel | null>(null);
    const [form, setForm] = useState({ name: "", msg: "", status: 1, icon: null, sort: 0, note: "" });

    const [selected, setSelected] = useState(null); // {type, id, row, parentId}
    const [exSelected,setExSelected] = useState(null);

    const [smodelBindData, setSmodelBindData] = useState<SmodelBind[]>([]);
    const [bindLoading, setBindLoading] = useState(true);
    const [bindDialogOpen, setBindDialogOpen] = useState(false);
    
    const [bindForm,setBindForm] = useState(defaultBindForm);

    const [exhibitTree, setExhibitTree] = useState<any>(null);
    const [treeLoading, setTreeLoading] = useState(true);

    const [contentItems, setContentItems] = useState<any>(null);

    const [editDialogOpen,setEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({id: null, delay: 0});

    const [codeItems, setCodeItems] = useState<any>(null);

    // --- Delete confirmation state ---
	const [deleteConfirm, setDeleteConfirm] = useState<{
		open: boolean;
		title: string;
		message: string;
		onConfirm: () => Promise<void>;
	}>({ open: false, title: "", message: "", onConfirm: async () => { } });

    // --- 获取模式列表数据 ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getSmodelList();
            const raw = res.data;
            // console.log(raw);
            if (Array.isArray(raw)) setSmodelData(raw);
            else if (raw && typeof raw === "object" && "items" in raw) setSmodelData((raw as { items: Smodel[] }).items ?? []);
            else setSmodelData([]);
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "加载失败"); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- 获取模式绑定数据 ---
    const fetchBindData = async (params) => {
        setBindLoading(true);
        try {
            const res = await getSmodelBindList({...params});
            const raw = res.data;
            console.log(res);
            if (Array.isArray(raw)) setSmodelBindData(raw);
            else if (raw && typeof raw === "object" && "items" in raw) setSmodelBindData((raw as { items: SmodelBind[] }).items ?? []);
            else setSmodelBindData([]);
        } catch (e: unknown) { 
            setSmodelBindData([]);
            toast.warning(e instanceof Error ? e.message : "加载失败"); 
        } finally { 
            setBindLoading(false); 
        }
    };

    useEffect(() => { 
        selected && exSelected && fetchBindData({model_id:selected.id,exhibition_id:exSelected.id,pavilion_id:exSelected.pavilion_id}); 
    }, [selected,exSelected]);

    // 获取展项树
    const fetchTree = async () => { 
        setTreeLoading(true);
        try {
            const res = await getExhibitTree();
            console.log(res.data);
            const raw = res.data;
            if (Array.isArray(raw)) setExhibitTree(raw);
            else setExhibitTree([]);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally { 
            setTreeLoading(false); 
        }
    };

    useEffect(() => { fetchTree(); }, []);

    // --- 添加软件模式 ---
    const openAdd = () => { 
        setEditing(null); 
        setForm({ name: "", msg: "", status: 1, icon: null, sort: 0, note: "" }); 
        setDialogOpen(true); 
    };

    // --- 编辑软件模式 ---
    const openEdit = (row: Smodel) => { 
        setEditing(row); 
        setForm({ name: row.name, msg: row.msg, status: row.status, icon: row.icon?.id, sort: row.sort, note: row.note  }); 
        setDialogOpen(true);
    };

    // --- 软件模式选中 --- 
    const onSelect = (sel) => { 
        setSelected(sel); 
    };

    // --- 展项选中 ---
    const onExSelect = (sel) => {
        setExSelected(sel);
    };

    // --- 保存软件模式 ---
    const handleSave = async () => {
        try {
            if (editing) { 
                await updateSmodel({ id: editing.id, ...form });
                toast.success("更新成功"); 
            }else { 
                await addSmodel(form); 
                toast.success("添加成功"); 
            }
            setDialogOpen(false); fetchData();
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
    };

    // --- 删除软件模式 ---
    const handleDelete = async (row: Smodel) => {
        setDeleteConfirm({
			open: true,
			title: "确认删除",
			message: `确认删除${row.id}「${row.name}」？`,
			onConfirm: async () => {
                try { await deleteSmodel(row.id); toast.success("删除成功"); fetchData(); }
                catch (e: unknown) { toast.error(e instanceof Error ? e.message : "删除失败"); }
				fetchData();
			},
		});
        
    };

    // --- 软件模式状态切换 ---
    const handleStatusChange = async (row: Smodel) => {
        try {
            await updateSmodelStatus({id:row.id,status:row.status==1?2:1});
            toast.success("操作成功");
            fetchData();
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "操作失败"); 
        }
    };

    // --- 添加软件模式绑定 ---
    const openBindAdd = () => {
        setContentItems([]);
        setCodeItems([]);
        setBindForm({...defaultBindForm, model:selected.id, exhibition:exSelected.id, pavilion:exSelected.pavilion_id});
        setBindDialogOpen(true);
    };
    
    // --- 绑定类型选择 ---
    const onTypeSelectChange = async (e: string) => {
        if (e === "1") {
            if(bindForm.exhibition !== null){
                try {
                    const res = await getContentList({e_id:bindForm.exhibition});
                    const raw = res.data;
                    // console.log(raw);
                    if (Array.isArray(raw)) {
                        const arr = []
                        raw.map(item => {
                            arr.push({
                                label: item.c_name,
                                value: item.id,
                            })
                        })
                        // console.log(arr)
                        setContentItems(arr)
                    }

                } catch (e: unknown) { 
                    toast.error(e instanceof Error ? e.message : "操作失败"); 
                }
                setBindForm({ ...bindForm, bind: null, type: Number(e), code: null })
            }else{
                setContentItems([{value:0,label:"全局内容绑定"}])

                try {
                    const res = await getControlList({e_id:0});
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
                        // console.log(arr)
                        setCodeItems(arr)
                    } 

                } catch (e: unknown) { 
                    toast.error(e instanceof Error ? e.message : "操作失败"); 
                }
                setBindForm({ ...bindForm, bind: 0, type: Number(e), code: null })
            }
            
        } else if (e === "2") {
            try {
                const res = await getDeviceList({area:bindForm.exhibition === null ? 2 : 1, link:bindForm.exhibition == null ? bindForm.pavilion : bindForm.exhibition});
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
                    // console.log(arr)
                    setContentItems(arr)
                } 

            } catch (e: unknown) { 
                toast.error(e instanceof Error ? e.message : "操作失败"); 
            }
            setCodeItems([])
            setBindForm({ ...bindForm, bind: null, type: Number(e), code:null })
        } else if (e === "0") {
            setCodeItems([])
            setContentItems([])
            setBindForm({ ...bindForm, bind: null, type: Number(e), code:null })
        } 
    };

    // --- 绑定内容或绑定设备选择 ---
    const onBindSelectChange = async (e: string) => { 
        setBindForm({ ...bindForm, bind: Number(e), code:null })
        if(bindForm.type === 1){
            if(bindForm.exhibition !== null){
                try {
                    const res = await getControlList({e_id: bindForm.exhibition});
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
                        // console.log(arr)
                        setCodeItems(arr)
                    } 

                } catch (e: unknown) { 
                    toast.error(e instanceof Error ? e.message : "操作失败"); 
                }
            }else{
                
            }
        }else if(bindForm.type === 2){
            try {
                const res = await getCodeList({device: e});
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
                    // console.log(arr)
                    setCodeItems(arr)
                } 

            } catch (e: unknown) { 
                toast.error(e instanceof Error ? e.message : "操作失败"); 
            }
        }
    };

    // --- 保存软件绑定模式 ---
    const handleBindSave = async () => {
        console.log(bindForm)
        try {
            const res = await addSmodelBind(bindForm);
            if (res.code === 0) {
                toast.success("操作成功");
            } else {
                toast.error(res.message);
            }
            setBindDialogOpen(false);
            fetchBindData({model_id:selected.id,exhibition_id:exSelected.id,pavilion_id:exSelected.pavilion_id});
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
    }

    // --- 编辑延时 ---
    const openBindEdit = (row: SmodelBind) => { 
        setEditForm({id:row.id,delay:row.delay})
        setEditDialogOpen(true);
    };

    // --- 保存延时 ---
    const handleEditDelay = async () => { 
        try { 
            const res = await updateSmodelBind(editForm);
            if (res.code === 0) {
                toast.success("操作成功");
            } else {
                toast.error(res.message);
            }
            setEditDialogOpen(false);
            fetchBindData({model_id:selected.id,exhibition_id:exSelected.id,pavilion_id:exSelected.pavilion_id});
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
    };

    // --- 删除软件模式绑定 ---
    const handleBindDelete = async (id: number) => { 
        try {
            await deleteSmodelBind(id);
            toast.success("删除成功");
            fetchBindData({model_id:selected.id,exhibition_id:exSelected.id,pavilion_id:exSelected.pavilion_id});
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const columns: ColumnDef<SmodelBind>[] = [
        { accessorKey: "id", header: "ID" },
        {
            accessorKey: "type",
            header: "绑定类型",
            cell: ({ row }) => (
                <Badge variant="secondary" className={
                    row.original.type === 1 
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" 
                        : "bg-stone-50 text-stone-700 dark:bg-stone-950 dark:text-stone-300"}>
                    {row.original.type === 1 ? "绑定内容控制" : "绑定设备命令"}
                </Badge>
            ),
        },
        {
            accessorKey: "bind",
            header: "内容/设备名称",
            cell: ({ row }) => <div className="flex items-center gap-1"><Badge variant="outline">{row.original.bind.id}</Badge><span>{row.original.bind.name}</span></div>,
        },
        {
            accessorKey: "code_ip",
            header: "设备IP",
            cell: ({ row }) => <span>{row.original.code.ip}</span>,
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
            enableResizing: false, //disable resizing for just this column
            size: 300,  
            cell: ({ row }) => <span className="text-wrap">{row.original.code.code}</span>,
        },
        {
            accessorKey: "delay",
            header: "延时",
            cell: ({ row }) => <Button variant="default" size="sm" onClick={()=> openBindEdit(row.original)}>{row.original.delay} 秒后发送</Button>,
        },
        {
            id: "actions", 
            header: "操作",
            cell: ({ row }) => (
                <div className="flex justify-start gap-2">
                    <DeleteDialog view={<Trash2Icon className="size-4 text-destructive" />} label={'删除后不可恢复数据，请谨慎操作。'}  onDelete={()=>handleBindDelete(row.original.id)}/>
                </div>
            ),
        },
    ];

    return (
        <div className="flex flex-col ">
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
                            { smodelData?.length === 0 ? (
                                <p className="px-2 py-6 text-center text-xl text-muted-foreground">暂无模式</p>
                            ) : (
                                <div className="flex flex-col w-full gap-2">
                                    <ItemGroup className="max-w-sm">
                                    { smodelData?.map((row) => (
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
                            <DataTable columns={columns} data={smodelBindData} loading={loading} searchPlaceholder="搜索模式..." pageSize={12}/>
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
                            
                            <Field><FieldLabel>模式图标</FieldLabel><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: Number(e.target.value) })} /></Field>
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
                    <DialogHeader><DialogTitle>新增模式绑定</DialogTitle></DialogHeader>
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
                                    <FieldLabel htmlFor="type">选择类型</FieldLabel>
                                    <Select items={TypeItems} value={String(bindForm.type)} onValueChange={(e) => onTypeSelectChange(e)}>
                                        <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                            {TypeItems.map((item) => (
                                                <SelectItem key={item.value} value={item.value} >
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                
                                <Field>
                                    <FieldLabel htmlFor="bind">选择绑定</FieldLabel>
                                    <Select items={contentItems} value={bindForm.bind} onValueChange={(e) => onBindSelectChange(e)}>
                                        <SelectTrigger id="bind"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                            {contentItems?.map((item) => (
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

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}> 
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>编辑延时</DialogTitle>
                        <DialogDescription>
                            请输入延时执行时间，0秒为不延时执行，可为浮点数，小数点最多两位
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup >
                            <Field className="hidden">
                                <FieldLabel>ID</FieldLabel>
                                <Input id="id" value={editForm.id} />
                            </Field>
                            <Field>
                                <FieldLabel>延时执行</FieldLabel>
                                <Input id="delay" value={editForm.delay}  onChange={(e) => setEditForm({ ...editForm, delay: Number(e.target.value) })} />
                            </Field>
                        </FieldGroup>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
                        <Button onClick={handleEditDelay}>保存</Button>
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
							<AlertDialogAction onClick={async () => {
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



export default function SoftwareModelPage() {
    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6 w-full h-full">
            <h1 className="text-xl font-semibold">内容模式管理</h1>
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
