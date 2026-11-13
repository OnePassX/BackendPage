import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon, SendIcon,ChevronDownIcon,Building2Icon,ChevronRightIcon,Code } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel,} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress"
import CodeFlow from "@/components/ContentControlFlow/ContentControlFlow";
import {
    Switch 
} from "@/components/ui/switch";
import {
	Drawer, DrawerPortal, DrawerOverlay,
	DrawerHeader, DrawerTitle, DrawerDescription,
	DrawerFooter, DrawerClose, DrawerContent,
} from "@/components/ui/drawer";
import {
    Dialog, DialogContent, DialogHeader, 
    DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, 
    SelectTrigger, SelectValue, SelectGroup
} from "@/components/ui/select";
import { 
    DataTable,DragHandle 
} from "@/components/data-table";
import {
    getExhibitTree, getContentList, addContent, 
    updateContent, deleteContent,updateContentDefault,
    updateContentStartup,updateContentControl,uploadContentFile,updateContentDownload
} from "@/api/exhibition";
import { 
    ScrollArea 
} from "@/components/ui/scroll-area";
import { 
    Separator 
} from "@/components/ui/separator";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { DeleteDialog } from "@/components/delete-dialog";

interface EItem {
	id: number;
	name: string;
}

// 内容文件状态
interface FileStatusItem {
	id: number;
	name: string;
}
// 内容文件类型
interface FileTypeItem {
	id: number;
	name: string;
}

// 内容
interface ContentItem {
	id: number;
	e_id: EItem | null; // 展项id
	c_name: string;
	c_file_status: FileStatusItem;
	c_file_type: FileTypeItem;
	c_file_name: string;
	c_file_addr: string;
	c_open: string;
	c_status: number;
	c_default: number;
	c_startup: number;
	c_control: string;
	c_iframe: string;
	c_iframe_show: number;
	c_link: string;
	note: string;
	sort: number;
}

const defaultForm = {  
    e_id: null,
    c_name: '',
    c_file_status: 1,
    c_file_type: 1,
    c_file_name: '',
    c_file_addr: '',
    c_open: '',
    c_status: 1,
    c_default: 2,
    c_startup: 2,
    c_control: '',
    c_iframe: '',
    c_iframe_show: 2,
    c_link: '',
    note: '',
    sort: 1 
};

const FileStatusItems = [
    { value: "1", label: '中控服务器存储' },
    { value: "2", label: '展项客户端存储' },
    { value: "3", label: '其他' },
];

const FileTypeItems = [
    { value: "1", label: '程序文件' },
    { value: "2", label: '视频文件' },
    { value: "3", label: '图片文件' },
    { value: "4", label: '文档文件' },
    { value: "5", label: '网页地址' },
    { value: "6", label: '其他文件' },
];

const DownloadStatusItems = [
    { value: "1", label: '未下发' },
    { value: "2", label: '下载中' },
    { value: "3", label: '下发完成' },
    { value: "4", label: '下发失败' },
];

const StatusItems = [
    { value: "1", label: '是' },
    { value: "2", label: '否' },
];

export default function ContentPage() {
    // -- 
    const [tree, setTree] = useState<any>(null);
    const [treeLoading, setTreeLoading] = useState(true);

    const [data, setData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ContentItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);

    const [selected, setSelected] = useState(null); // {type, id, row, parentId}

    const [contentControlDrawerOpen, setContentControlDrawerOpen] = useState(false);

    const [selectedContent, setSelectedContent] = useState(null);

    const [progress, setProgress] = useState(0);
    // --- 上传状态 ---
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadAbortController, setUploadAbortController] = useState<AbortController|null>(null);

    const fetchData = async (id:number) => {
        setLoading(true);
        try {
            const res = await getContentList({e_id:id});
            const raw = res.data;
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: ContentItem[] }).items ?? []);
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
            const res = await getExhibitTree();
            // console.log(res.data);
            setTree(res.data || []);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setTreeLoading(false);
        }
    };

    useEffect(() => { 
        selected && fetchData(selected?.row.id)
    }, [selected]);

    useEffect(() => { fetchTree(); }, []);

    const openAdd = () => {
        setEditing(null);
        setFormData(defaultForm);
        setDialogOpen(true);
    };

    const openEdit = (row: ContentItem) => {
        console.log(row);
        setEditing(row);
        setFormData({ 
            e_id: row.e_id,
            c_name: row.c_name,
            c_file_status: row.c_file_status.id,
            c_file_type: row.c_file_type.id,
            c_file_name: row.c_file_name,
            c_file_addr: row.c_file_addr,
            c_open: row.c_open,
            c_status: row.c_status,
            c_default: row.c_default,
            c_startup: row.c_startup,
            c_control: row.c_control,
            c_iframe: row.c_iframe,
            c_iframe_show: row.c_iframe_show,
            c_link: row.c_link,
            note: row.note,
            sort: row.sort
        });
        setDialogOpen(true);
    };

    // ========== 文件选择变更 ==========
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        console.log("选中的file", file, file instanceof File); // 这里必须是true
        if (!file) return;
    
        // 如果有正在进行的上传，先取消
        if (uploadAbortController) {
            uploadAbortController.abort();
        }
        // 创建新控制器
        const controller = new AbortController();
        setUploadAbortController(controller);
        setSelectedFile(file);
    
        try {
            // 选择文件后直接上传
            await doUploadFile(file, controller.signal);
        } catch {
            // 上传失败，清空已选文件UI，用户可以重选
            setSelectedFile(null);
            setProgress(0);
        }
    };

    // ========== 执行上传文件，上传成功回填文件名、地址 ==========
    const doUploadFile = async (file: File, abortSignal?: AbortSignal)=>{

        setIsUploading(true);
        setProgress(0);
        try {
            const res = await uploadContentFile({
                url: '/api/upload/uploadContent',
                file,
                signal: abortSignal,
                onUploadProgress: (e) => {
                    if (!e.total) return;
                    const percent = Math.round((e.loaded / e.total) * 100);
                    setProgress(percent);
                }
            });

            if (res.code === 0) { 
                console.log(res)
                setFormData(prev => ({
                    ...prev,
                    c_file_name: res.name || file.name,
                    c_file_addr: res.url || ''
                }));
                toast.success(res.msg);
            }else{
                toast.error(res.msg);
            }

        } catch (e: unknown) {
            // 如果是手动abort，不抛错误提示
            if ((e as Error)?.name !== 'AbortError') {
                toast.error(e instanceof Error ? e.message : "上传失败，请重新选择文件");
            }
            throw e;
        } finally {
            setIsUploading(false);
        }
    }

    const handleClearFile = () => {
        // 重置表单数据
        setFormData(prev=>({...prev, c_file_name:'',c_file_addr:''}));
        setSelectedFile(null);
        setProgress(0);
        // 清空文件输入框
        if(fileInputRef.current){
            fileInputRef.current.value = "";
        }
    }

    const handleSave = async () => {
        console.log(formData)
        try {
            if ( editing ) {
                await updateContent({ id: editing.id, ...formData });
                toast.success("更新成功");
            } else {
                await addContent({...formData, e_id:selected?.id});
                toast.success("添加成功");
            }
            setDialogOpen(false);
            fetchData(selected?.row.id);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteContent(id);
            toast.success("删除成功");
            fetchData(selected?.row.id);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const onSelect = (sel) => { setSelected(sel) };

    const handleSend = async (id: number) => {
        try {
            await updateContentDownload({ id });
            toast.success("指令已发送");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "发送失败");
        }
    };

    const handleReorder = useCallback((reordered: ContentItem[]) => {
		setData(reordered);
		console.log(reordered);
		toast.success("排序已更新");
	}, []);

    // --- 内容控制 开启状态改变 ---
    const handleContentDefaultChange = async (id: number, value: number) => { 
        try {
            await updateContentDefault({ id: id, default: value });
            toast.success("更新成功");
            fetchData(selected?.row.id);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    // --- 内容控制 开机启动状态改变 ---
    const handleContentStartupChange = async (id: number, value: number) => { 
        try {
            await updateContentStartup({ id: id, startup: value });
            toast.success("更新成功");
            fetchData(selected?.row.id);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    // --- 内容控制 编辑 ---
	const handleContentControlEdit = (row: ContentItem) => {
		console.log(row)
		setSelectedContent({...row, ip: selected?.row.e_ip});
		setContentControlDrawerOpen(true);
	};

    // --- 内容控制 drawer 状态改变 ---
	const handleContentControlDrawerOpenChange = useCallback((open: boolean) => {
		if (!open) {
			setContentControlDrawerOpen(false);
			setSelectedContent(null);
			fetchTree();
		}
	}, []);

    useEffect(()=>{
        if(!dialogOpen){
            // 弹窗关闭，取消正在上传
            if(uploadAbortController){
                uploadAbortController.abort();
            }
            setProgress(0);
            setIsUploading(false);
            setSelectedFile(null);
            setUploadAbortController(null);
        }
    },[dialogOpen])


    const columns: ColumnDef<ContentItem>[] = [
        {
			id: "drag",
			header: () => null,
			cell: ({ row }) => <DragHandle id={row.id} />,
			size: 40,
			enableSorting: false,
			enableColumnFilter: false,
			enableHiding: false,
		},
        { accessorKey: "id", header: "ID"},
        { accessorKey: "c_name", header: "内容名称",enableSorting: false, enableColumnFilter: false, },
        { 
            accessorKey: "c_file_status", 
            header: "存储位置", 
            cell: ({ row }) => {
                if (row.original.c_file_status.id == 1) { 
                    return <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {row.original.c_file_status.name}
                    </Badge>
                }else if (row.original.c_file_status.id == 2) { 
                    return <Badge className="bg-black/80 text-white/80 dark:bg-white/80 dark:text-black/80">
                        {row.original.c_file_status.name}
                    </Badge>
                }else if (row.original.c_file_status.id == 3) { 
                    return <Badge className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                        {row.original.c_file_status.name}
                    </Badge>
                }
                
            }, 
            enableSorting: false,
			enableColumnFilter: false,
        },
        { 
            accessorKey: "c_file_type", 
            header: "文件类型", 
            cell: ({ row }) => {
                if (row.original.c_file_type.id == 1) { 
                    return <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" variant="outline">
                        {row.original.c_file_type.name}
                    </Badge>
                }else if (row.original.c_file_type.id == 2) { 
                    return <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" variant="outline">
                        {row.original.c_file_type.name}
                    </Badge>
                }else if (row.original.c_file_type.id == 3) { 
                    return <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" variant="outline">
                        {row.original.c_file_type.name}
                    </Badge>
                }else if (row.original.c_file_type.id == 4) { 
                    return <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300" variant="outline">
                        {row.original.c_file_type.name}
                    </Badge>
                }else if (row.original.c_file_type.id == 5) { 
                    return <Badge className="bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300" variant="outline">
                        {row.original.c_file_type.name}
                    </Badge>
                }else if (row.original.c_file_type.id == 6) { 
                    return <Badge variant="outline">
                        {row.original.c_file_type.name}
                    </Badge>
                }
            }, 
        },
        { 
            accessorKey: "c_file_addr", 
            header: "文件信息" ,
            enableResizing: true,
            enableSorting: false, 
            cell: ({ row }) => (
                <Popover >
                    <PopoverTrigger render={<Button variant="link" size="sm">@地址</Button>}>
                    </PopoverTrigger>
                    <PopoverContent side="inline-end" align="center" className="flex flex-col gap-0.5 w-auto">
                        <div className="font-semibold">文件名：</div>
                        <div className="text-wrap">{row.original.c_file_name}</div>
                        <div className="font-semibold">文件地址：</div>
                        <div className="text-wrap">{row.original.c_file_addr}</div>
                    </PopoverContent>
                </Popover>
            ), 
        },
        { 
            accessorKey: "c_open", 
            header: "程序名",
            size: 40, 
            enableSorting: false,
			enableColumnFilter: false, 
            cell: ({row}) => {return <span>{row.original.c_open || row.original.c_file_name}</span>},
        },
        {
            accessorKey: "c_status",
            header: "下发状态",
            cell: ({ row }) => {
                if (row.original.c_status == 1) { 
                    return <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">未下发</Badge>
                }else if (row.original.c_status == 2) { 
                    return <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">下载中</Badge>
                }else if (row.original.c_status == 3) { 
                    return <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">完成</Badge>
                }else if (row.original.c_status == 4) { 
                    return <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">失败</Badge>
                }
            },
            
        },
        {
            accessorKey: "c_default",
            header: "当前状态",
            cell: ({ row }) => (
                <Switch size="sm" checked={ row.original.c_default === 1 ? true : false } onCheckedChange={(checked) => handleContentDefaultChange(row.original.id, checked?1:2)}/>
            )
        },
        {
            accessorKey: "c_startup",
            header: "开机启动",
            cell: ({ row }) => (
                <Switch size="sm" checked={ row.original.c_startup === 1 ? true : false } onCheckedChange={(checked) => handleContentStartupChange(row.original.id, checked?1:2)}/>
            ),
        },
        {
            accessorKey: "c_control",
            header: "控制JSON",
            cell: ({ row }) => (
                <Button variant="outline" size="sm" onClick={() => handleContentControlEdit(row.original)} title="编辑JSON">JSON</Button>
            ),
            enableSorting: false,
			enableColumnFilter: false,
        },
        { 
            accessorKey: "c_link",
            header: "联动切换" , 
            cell: ({ row }) => (
                <Button variant="outline" size="sm" title="编辑JSON" disabled>LINK</Button>
            ),
            enableSorting: false,
			enableColumnFilter: false,
        },
        { 
            accessorKey: "note",
            header: "备注", 
            size: 40, 
            enableSorting: false,
            enableColumnFilter: false, 
        },
        { accessorKey: "sort",header: "排序" },
        { accessorKey: "create_time", header: "创建时间" },
        {
            id: "actions",
            header: "操作",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)} title="编辑">
                        <PencilIcon className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleSend(row.original.id)} title="内容下发">
                        <SendIcon className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)} title="测试">
                        <Code className="size-4" />
                    </Button>
                    <DeleteDialog view={<Trash2Icon className="size-4 text-destructive" />} label={'删除后不可恢复数据，请谨慎操作。'}  onDelete={()=>handleDelete(row.original.id)}/> 
                </div>
            ),
            enablePinning: true,
        },
    ];

    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6 h-full">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">内容管理</h1>
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
                                                                variant={selected?.id == e.id ? "default":"secondary"} 
                                                                className={`w-full pl-12 mt-2 flex flex-row justify-start items-center gap-4 `}
                                                                onClick={() => onSelect({ type: 2, id: e.id, row: e, parentId: m.id })}
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
                       <span className="text-muted-foreground">展项内容管理</span> 
                    </span>
                    {selected ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    <span className="text-muted-foreground">展项 — </span>{selected.row.name}
                                </span>
                                <Button size="default" variant="default" onClick={openAdd}><PlusIcon className="mr-1 size-4" /> 新增内容</Button>
                            </div>
                            <ScrollArea className="h-[calc(100dvh-240px)] border border-border px-4 py-2 rounded-lg">
                                <DataTable
                                    columns={columns}
                                    data={data}
                                    loading={loading}
                                    pageSize={18}
                                    searchPlaceholder="搜索指令名称/码..."
                                    onReorder={handleReorder}
                                    getRowId={(row) => row.id}
                                    />
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
                        请从左侧选择一个展项
                        </div>
                    )}
                </div>
            </div>

            {/* 内容 控制JSON Drawer */}
			<Drawer disablePointerDismissal={true} open={contentControlDrawerOpen} onOpenChange={handleContentControlDrawerOpenChange} swipeDirection="right">
				<DrawerPortal >
					<DrawerOverlay />
					<DrawerContent  className="h-full w-full max-w-4/5">
						<DrawerHeader>
							<div className="flex items-center justify-start gap-2">
								{selectedContent && (
									<Badge variant="outline" className="text-xl h-8">
										{selectedContent.c_name}
									</Badge>
								)}
								<DrawerTitle>命令管理</DrawerTitle>
							</div>
							<DrawerDescription>
								管理内容控制
							</DrawerDescription>
						</DrawerHeader>

						<div className="flex-1 overflow-y-auto px-4 py-4">
							<CodeFlow controlData={selectedContent}/>
						</div>

						<DrawerFooter className="flex flex-row">
							{/* <Button className="flex-1" onClick={handleContentControlSave}>提交</Button> */}
							<DrawerClose render={
								<Button variant="outline" className="flex-1">关闭</Button> 
							}>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</DrawerPortal>
			</Drawer>
            
            {/* --- 内容 编辑/新增 dialog --- */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-200">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑内容" : "新增内容"}</DialogTitle>
                        <DialogDescription>
                            {editing ? "修改内容信息" : "填写新内容的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="c_name">名称</FieldLabel>
								<Input id="c_name" type="text" value={formData.c_name} placeholder="名称" required onChange={(e) => setFormData({ ...formData, c_name: e.target.value })}/>
							</Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="c_file_status">存储位置</FieldLabel>
                                    <Select items={FileStatusItems} defaultValue="1" value={String(formData.c_file_status)} 
                                        onValueChange={(e) => {
                                            Number(e) == 1 ? setFormData({ ...formData, c_status: 1, c_file_status: Number(e)}): setFormData({ ...formData, c_status: 2, c_file_status: Number(e)})
                                        }}
                                        disabled={editing?tree:false}
                                        >
                                        <SelectTrigger id="c_file_status"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                            {FileStatusItems.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
									<FieldLabel htmlFor="c_file_type">文件类型</FieldLabel>
									<Select items={FileTypeItems} defaultValue="1" value={String(formData.c_file_type)} onValueChange={(e) => setFormData({ ...formData, c_file_type: Number(e) })} disabled={editing?tree:false}>
										<SelectTrigger id="c_file_type"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{FileTypeItems.map((item) => (
												<SelectItem key={item.value} value={item.value} disabled={formData.c_file_status == 1 && item.value=='5' ? true: false}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
                            </div>
							<Field className={ `${formData.c_file_status == 1 && [1,2,3,4,6].indexOf(formData.c_file_type) !== -1 ? '' : 'hidden'}` }>
								<FieldLabel htmlFor="file">上传文件</FieldLabel>
								<Input 
                                    ref={fileInputRef}
                                    id="file" 
                                    type="file"
                                    placeholder="上传文件..."
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />
                                <div className="flex flex-row justify-between items-center">
                                    {selectedFile && <p className="text-sm mt-1 text-muted-foreground">已选择：{selectedFile.name}</p>}
                                    {
                                        (formData.c_file_name || formData.c_file_addr) && !isUploading && (
                                            <Button variant="ghost" size="sm" onClick={()=>handleClearFile()}>清除已上传文件</Button>
                                        )
                                    }         
                                </div>
                                
                                {selectedFile && <Progress value={progress} className="mt-2"/>}
                                
							</Field>
                            <Field className={formData.c_file_status == 1 ? 'hidden' : ''} >
                                <FieldLabel htmlFor="file">文件地址</FieldLabel>
                                <Input id="c_file_addr" value={formData.c_file_addr} placeholder="请输入目标电脑详细文件地址，如： D:/软件/v1/demo.exe" onChange={(e) => setFormData({ ...formData, c_file_addr: e.target.value })}/>
                            </Field>
                            <Field className={formData.c_file_status == 1 ? 'hidden' : ''} >
                                <FieldLabel htmlFor="file">文件名称</FieldLabel>
                                <Input id="c_file_name" value={formData.c_file_name} placeholder="请输入详细文件名，带后缀，如： demo.exe，video.mp4" onChange={(e) => setFormData({ ...formData, c_file_name: e.target.value })}/>
                            </Field>

                            <Field className={formData.c_file_type == 1 && formData.c_file_status == 1 ? '' : 'hidden'}>
								<FieldLabel htmlFor="c_open">程序名（带后缀）</FieldLabel>
								<Input id="c_open" type="text" value={formData.c_open} placeholder="请输入ZIP目录中exe名称，需要携带.exe，如:demo.exe" onChange={(e) => setFormData({ ...formData, c_open: e.target.value })}/>
							</Field>
                            
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="c_default">当前打开状态</FieldLabel>
									<Select items={StatusItems} defaultValue="1" value={String(formData.c_default)} onValueChange={(e) => setFormData({ ...formData, c_default: Number(e) })} disabled>
										<SelectTrigger id="c_default"><SelectValue /></SelectTrigger>
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
                                <Field>
									<FieldLabel htmlFor="c_startup">开机启动</FieldLabel>
									<Select items={StatusItems} defaultValue="1" value={String(formData.c_startup)} onValueChange={(e) => setFormData({ ...formData, c_startup: Number(e) })} disabled>
										<SelectTrigger id="c_startup"><SelectValue /></SelectTrigger>
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
                            <Field className={formData.c_file_type == 1 ? '' : 'hidden'}>
								<FieldLabel htmlFor="c_control" >控制JSON</FieldLabel>
								<Textarea className="max-h-30" id="c_control" value={formData.c_control ?? ''} placeholder="JSON格式，可先不填写，内容添加完成后使用流程图方式创建" onChange={(e) => setFormData({ ...formData, c_control: e.target.value })}/>
							</Field>
                            <Field className={formData.c_file_type == 1 ? '' : 'hidden'}>
								<FieldLabel htmlFor="c_iframe">控制页面</FieldLabel>
								<Input id="c_iframe" type="text" value={formData.c_iframe} placeholder="可植入局域网下控制页面，进行iframe插入，可不填写" onChange={(e) => setFormData({ ...formData, c_iframe: e.target.value })}/>
							</Field >
                            <div className="grid grid-cols-2 gap-4">
                                <Field >
                                    <FieldLabel htmlFor="c_iframe_show">Iframe显示状态</FieldLabel>
                                        <Select items={StatusItems} defaultValue="1" value={String(formData.c_iframe_show)} onValueChange={(e) => setFormData({ ...formData, c_iframe_show: Number(e) })}>
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
                                <Field>
                                    <FieldLabel htmlFor="sort">排序</FieldLabel>
                                    <Input id="sort" type="number" value={formData.sort} placeholder="请输入排序" onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })}/>
                                </Field>
                            </div>
							<Field>
								<FieldLabel htmlFor="note">展区备注</FieldLabel>
								<Textarea id="note" value={formData.note??''} placeholder="请输入备注" onChange={(e) => setFormData({ ...formData, note: e.target.value })}/>
							</Field>
						</FieldGroup>
					</form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isUploading}>取消</Button>
                        <Button onClick={handleSave} disabled={isUploading}>{isUploading ? "上传中..." : "保存"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
