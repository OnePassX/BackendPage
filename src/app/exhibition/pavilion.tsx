import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,SelectGroup,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import {
    getPavilionList, addPavilion, updatePavilion, deletePavilion,
} from "@/api/exhibition";
import { Textarea } from "@/components/ui/textarea";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";

// 展厅
interface PavilionItem {
	id: number;
	p_name: string;
	p_summary: string;
	p_re: string;
	show: number;
	sort: number;
}

const ShowItems = [{label:'启用',value:'1'},{label:'禁用',value:'2'}]

const defaultForm = { p_name: '', p_summary: '', p_re: '', show: 1, sort: 1  };

export default function PavilionPage() {
    const [data, setData] = useState<PavilionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<PavilionItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getPavilionList({page:1,limit:1000});
            // console.log(res.data)
            const raw = res.data;
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: PavilionItem[] }).items ?? []);
            } else {
                setData([]);
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openAdd = () => {
        setEditing(null);
        setFormData(defaultForm);
        setDialogOpen(true);
    };

    const openEdit = (row: PavilionItem) => {
        setEditing(row);
        setFormData({ p_name: row.p_name, p_summary: row.p_summary, p_re: row.p_re, show: row.show, sort: row.sort });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editing) {
                await updatePavilion({ id: editing.id, ...formData });
                toast.success("更新成功");
            } else {
                await addPavilion(formData);
                toast.success("添加成功");
            }
            setDialogOpen(false);
            fetchData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("确认删除？")) return;
        try {
            await deletePavilion(id);
            toast.success("删除成功");
            fetchData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const columns: ColumnDef<PavilionItem>[] = [
        { accessorKey: "id", header: "ID" },
        { accessorKey: "p_name", header: "展厅名称" },
        { accessorKey: "p_summary", header: "介绍" },
        { accessorKey: "p_re", header: "备注" },
        { accessorKey: "sort", header: "排序" },
        {
            accessorKey: "show",
            header: "状态",
            cell: ({ row }) => (
                <Badge variant={row.original.show === 1 ? "default" : "secondary"}>
                    {row.original.show === 1 ? "启用" : "禁用"}
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
        <div className="flex flex-col gap-4 px-4 lg:px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">展厅列表</h1>
                <Button onClick={openAdd}>
                    <PlusIcon className="mr-1 size-4" /> 新增展厅
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                searchPlaceholder="搜索名称"
            />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑展厅" : "新增展厅"}</DialogTitle>
                        <DialogDescription>
                            {editing ? "修改展厅信息" : "填写新展厅的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="p_name">展厅名称</FieldLabel>
                                <Input id="p_name" type="text" value={formData.p_name} placeholder="展馆名称" required onChange={(e) => setFormData({ ...formData, p_name: e.target.value })}/>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="p_summary">展厅介绍</FieldLabel>
                                <Input id="p_summary" type="text" value={formData.p_summary} placeholder="展馆介绍" onChange={(e) => setFormData({ ...formData, p_summary: e.target.value })} />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="show">显示状态</FieldLabel>
                                    <Select items={ShowItems} defaultValue="1" value={String(formData.show)} onValueChange={(e) => setFormData({ ...formData, show: Number(e) })}>
                                        <SelectTrigger id="show"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                            {ShowItems.map((item) => (
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
                                <FieldLabel htmlFor="p_re">展厅备注</FieldLabel>
                                <Textarea id="p_re" value={formData.p_re} placeholder="123 Main St" onChange={(e) => setFormData({ ...formData, p_re: e.target.value })}/>
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
