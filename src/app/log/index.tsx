import React,{useState, useEffect} from 'react';
import { type ColumnDef } from "@tanstack/react-table";

import { PlusIcon, UploadCloudIcon,Trash2Icon,Building2Icon,ChevronDownIcon } from "lucide-react";

import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DataTable } from "@/components/data-table";

import { getMenuTree, addMenu, updateMenu, deleteMenu } from "@/api/menu";

function DeleteLogTab() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: "", x: 0, y: 0 });


    const columns: ColumnDef<any>[] = [
        { accessorKey: "id", header: "ID" },
        { accessorKey: "name", header: "名称" },
       
        { id: "actions", header: "操作", cell: () => <div className="flex items-center gap-1"><Button variant="ghost" size="sm"><Trash2Icon className="size-4 text-destructive" /></Button></div> },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">共 {data.length} 条</span>
                <Button size="sm" onClick={()=>{}}><PlusIcon className="mr-1 size-4" /> 新增</Button>
            </div>
            <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="搜索点位..." pageSize={5} />
        </div>
    );
}

function EventLogTab() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">共 0 条</span>
            </div>
            
        </div>
    )
}

const BackendLogPage = () => {

    // --- 功能列表 ---
    const [tree, setTree] = useState<any>(null);
    const [treeLoading, setTreeLoading] = useState(true);

    const [selected, setSelected] = useState({ id:0, pavilion: null, label:'无绑定' }); // {type, id, row, parentId}

    const onSelect = (sel) => { setSelected(sel) };

    const fetchTree = async () => { 
        setTreeLoading(true);
        try {
            const res = await getMenuTree();
            console.log(res.data);
            setTree(res.data || []);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setTreeLoading(false);
        }
    };

    useEffect(() => { fetchTree(); }, []);

    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">后端操作日志</h1>
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
                                <p className="px-2 py-6 text-center text-xl text-muted-foreground">暂无展馆</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    { tree.map((p) => (
                                        p.children.map((m) => (
                                            m.children.map((e) => (
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
                                            ))  
                                        ))
                                    ))}
                                </div>
                            )}
                        </div> 
                    </ScrollArea>
                </div>
                <Tabs defaultValue="delete" className="w-full min-h-0 flex-1 flex flex-col">
                    <TabsList>
                        <TabsTrigger value="delete">删除日志</TabsTrigger>
                        <TabsTrigger value="event">操作日志</TabsTrigger>
                    </TabsList>
                    <TabsContent value="delete"><DeleteLogTab /></TabsContent>
                    <TabsContent value="event"><EventLogTab /></TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

export default BackendLogPage
