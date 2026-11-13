import { useState, useEffect } from "react";
import { type ColumnDef } from "@tanstack/react-table";

import { PencilIcon, Trash2Icon, PlusIcon, UploadCloudIcon } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel,} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DataTable } from "@/components/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { TipButton } from "@/components/tip-button";
import { ImageCropper } from "@/components/image-cropper";

import { getPreviewList, addPreview, updatePreview, deletePreview, getPointList, addPoint, deletePoint,} from "@/api/preview";
import { getPavilionList } from "@/api/exhibition";

interface Pavlion { 
    id: number; 
    name: string; 
}

interface Preview { 
    id: number; 
    name: string; 
    pavilion: Pavlion | null;
    title: string;
    address: string;
    msg: string;
}

interface Point { id: number; name: string; x: number; y: number; }

function PreviewTab({selected}) {

    const [data, setData] = useState<Preview[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ pavilion: null ,name: "", title: "", address: "", msg: "" });
    const [editing, setEditing] = useState<Preview | null>(null);

    const fetchData = async (params) => {
        setLoading(true);
        try {
            const res = await getPreviewList({pavilion: params});
            const raw = res.data;
            // console.log(raw);
            if (Array.isArray(raw)) setData(raw);
            else if (raw && typeof raw === "object" && "items" in raw) setData((raw as { items: Preview[] }).items ?? []);
            else setData([]);
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "加载失败"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(selected); }, [selected]);

    const openAdd = () => { 
        setEditing(null); 
        setForm({ pavilion: selected, name: "", title: "", address: "", msg: "" }); 
        setDialogOpen(true); 
    };

    const openEdit = (row: Preview) => { 
        setEditing(row); 
        setForm({ pavilion: row.pavilion ,name: row.name, title: row.title, address: row.address, msg: row.msg }); 
        setDialogOpen(true); 
    };

    const handleSave = async () => {
        try {
            if (editing) { 
                await updatePreview({ id: editing.id, ...form }); 
            } else { 
                await addPreview(form); 
            }
            toast.success("操作成功"); 
            setDialogOpen(false); 
            fetchData(selected);
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
    };
    const handleDelete = async (id: number) => {
        if (!confirm("确认删除？")) return;
        try { await deletePreview(id); toast.success("删除成功"); fetchData(selected); }
        catch (e: unknown) { toast.error(e instanceof Error ? e.message : "删除失败"); }
    };

    const columns: ColumnDef<Preview>[] = [
        { accessorKey: "id", header: "ID" },
        { accessorKey: "name", header: "名称" },
        { accessorKey: "title", header: "标题" },
        { accessorKey: "address", header: "图片", cell: ({row}) => <img src={row.original.address} width={200} height={100} alt="图片" /> },
        { accessorKey: "msg", header: "描述" },
        { 
            id: "actions", 
            header: "操作",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <TipButton view={<PencilIcon className="size-4" />} label="命令编辑" onClick={() => openEdit(row.original)} />
                    <DeleteDialog view={<Trash2Icon className="size-4 text-destructive" />} label={'删除后不可恢复数据，请谨慎操作。'}  onDelete={()=>handleDelete(row.original.id)}/>
                </div> 
            )
        },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">共 {data.length} 条</span>
                <Button size="sm" onClick={openAdd}><PlusIcon className="mr-1 size-4" /> 新增</Button>
            </div>
            <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="搜索预览..." pageSize={5} />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader><DialogTitle>新增展厅预览图</DialogTitle></DialogHeader>
                    <form className="w-full">
						<FieldGroup>
                            <Field > 
								<FieldLabel htmlFor="pavilion">所属</FieldLabel>
								<Input id="pavilion" type="text" value={form.pavilion} placeholder="所属展厅" required onChange={(e) => setForm({ ...form, pavilion: e.target.value })} disabled={selected ? true : false}/>
							</Field>
							<Field>
								<FieldLabel htmlFor="name">名称</FieldLabel>
								<Input id="name" type="text" value={form.name} placeholder="名称" required onChange={(e) => setForm({ ...form, name: e.target.value })}/>
							</Field>
                            <Field>
								<FieldLabel htmlFor="title">标题</FieldLabel>
								<Input id="title" type="text" value={form.title} placeholder="图片标题" required onChange={(e) => setForm({ ...form, title: e.target.value })}/>
							</Field>
                            <Field>
								<FieldLabel htmlFor="file">上传文件</FieldLabel>
								<ImageCropper
									aspectRatio={16/9}
									maxSize={1920}
									onUploaded={(fileUrl) => {
										setForm((prev) => ({ ...prev, address: fileUrl }));
										toast.success("图片上传成功");
									}}
									onError={(e) => toast.error(e instanceof Error ? e.message : "上传失败，请重新选择图片")}
									trigger={({ onClick }) => (
										<div className="flex flex-wrap items-center gap-3">
											<Button type="button" variant="outline" className="w-30 h-20 flex flex-col"  onClick={onClick}>
												<UploadCloudIcon className="mr-1 size-6" />
												<span className="text-warp">选择图片并裁剪</span>
											</Button>
											{form.address && (
												<div className="flex flex-col justify-center items-center">
													<img src={form.address} className="w-40 h-20" />
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => setForm((prev) => ({ ...prev, address: "" }))}
													>
														清除已上传文件
													</Button>
												</div>
											)}
										</div>
									)}
								/>
							</Field>
                            <Field className='hidden'>
                                <FieldLabel htmlFor="address">地址</FieldLabel>
                                <Input id="address" value={form.address} placeholder="请输入目标电脑详细文件地址，如： D:/软件/v1/demo.exe" onChange={(e) => setForm({ ...form, address: e.target.value })}/>
                            </Field>
                            <Field>
								<FieldLabel htmlFor="msg">预览图描述</FieldLabel>
								<Textarea id="msg" value={form.msg??''} placeholder="请输入描述" onChange={(e) => setForm({ ...form, msg: e.target.value })}/>
							</Field>
                        </FieldGroup>
                    </form>
                    <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function PointTab() {
    const [data, setData] = useState<Point[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: "", x: 0, y: 0 });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getPointList();
            const raw = res.data;
            if (Array.isArray(raw)) setData(raw);
            else if (raw && typeof raw === "object" && "items" in raw) setData((raw as { items: Point[] }).items ?? []);
            else setData([]);
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "加载失败"); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const openAdd = () => { setForm({ name: "", x: 0, y: 0 }); setDialogOpen(true); };

    const handleSave = async () => {
        try { await addPoint(form); toast.success("添加成功"); setDialogOpen(false); fetchData(); }
        catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
    };
    const handleDelete = async (id: number) => {
        if (!confirm("确认删除？")) return;
        try { await deletePoint(id); toast.success("删除成功"); fetchData(); }
        catch (e: unknown) { toast.error(e instanceof Error ? e.message : "删除失败"); }
    };

    const columns: ColumnDef<Point>[] = [
        { accessorKey: "id", header: "ID" },
        { accessorKey: "name", header: "点位名称" },
        { accessorKey: "x", header: "X" },
        { accessorKey: "y", header: "Y" },
        { id: "actions", header: "操作", cell: ({ row }) => <div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)}><Trash2Icon className="size-4 text-destructive" /></Button></div> },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">共 {data.length} 条</span>
                <Button size="sm" onClick={openAdd}><PlusIcon className="mr-1 size-4" /> 新增</Button>
            </div>
            <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="搜索点位..." pageSize={5} />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-120">
                    <DialogHeader><DialogTitle>新增点位</DialogTitle></DialogHeader>
                    
                    <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function PreviewPage() {

    // --- 设备列表 ---
    const [tree, setTree] = useState<any>(null);
    const [treeLoading, setTreeLoading] = useState(true);

    const [selected, setSelected] = useState({ pavilion: null, label:'无绑定' }); // {type, id, row, parentId}

    const onSelect = (sel) => { setSelected(sel) };

    const fetchTree = async () => { 
        setTreeLoading(true);
        try {
            const res = await getPavilionList({ page: 1, limit: 1000 });
            setTree(res.data || []);
            setSelected({ pavilion: null, label:'无绑定' });
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
                <h1 className="text-xl font-semibold">预览管理</h1>
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
                                        variant={selected?.pavilion == null ? "default":"secondary"} 
                                        onClick={() => onSelect({ pavilion: null, label:'无绑定命令' })}
                                        >
                                        <span className="truncate">无绑定</span>
                                    </Button>
                                    { tree?.map((d) => (
                                        
                                        <Button
                                            key={d.id}
                                            variant={selected?.pavilion == d.id ? "default":"secondary"} 
                                            onClick={() => onSelect({ pavilion: d.id, label:d.p_name })}
                                            >
                                            <span className="text-sm opacity-70">--</span>
                                            <span className="truncate">{d.p_name}</span>
                                            <span className="text-sm opacity-70">--</span>
                                        </Button>
                                    
                                    ))}
                                     
                                </div>
                            )}
                        </div> 
                    </ScrollArea>
                </div>
                <Tabs defaultValue="preview" className="w-full min-h-0 flex-1 flex flex-col">
                    <TabsList>
                        <TabsTrigger value="preview">预览列表</TabsTrigger>
                        <TabsTrigger value="point">预览点位</TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview"><PreviewTab selected={selected.pavilion}/></TabsContent>
                    <TabsContent value="point"><PointTab /></TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
