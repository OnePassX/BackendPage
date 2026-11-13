import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,SelectGroup,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import {
    getMachineList, addMachine, updateMachine, deleteMachine
} from "@/api/exhibition";
import { Textarea } from "@/components/ui/textarea";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";

interface M_P {
    id: number;
    name: string;
}

// 展区
interface MachineItem {
	id: number;
	m_name: string;
	m_p: M_P | null ; // 展厅id
	m_re: string;
	m_summary: string;
	show: number;
	sort: number;
}

const ShowItems = [{label:'启用',value:'1'},{label:'禁用',value:'2'}]

const defaultForm = { m_name: '', m_summary: '',m_p: null , m_re: '', show: 1, sort: 1  };

export default function MachinePage() {
    const [data, setData] = useState<MachineItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<MachineItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);

    const [selectedIds,setSelectedIds] = useState<Set<number | string>>(new Set());

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getMachineList({page:1,limit:1000});
            // console.log(res.data)
            const raw = res.data;
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: MachineItem[] }).items ?? []);
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

    const openEdit = (row: MachineItem) => {
        setEditing(row);
        setFormData({ m_name: row.m_name,m_p:row.m_p?.id, m_summary: row.m_summary, m_re: row.m_re, show: row.show, sort: row.sort });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editing) {
                await updateMachine({ id: editing.id, ...formData });
                toast.success("更新成功");
            } else {
                await addMachine(formData);
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
            await deleteMachine(id);
            toast.success("删除成功");
            fetchData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const handleBatchDelete = async () => {
        if (!confirm(`确认删除选中的 ${selectedIds.size} 项？`)) return;
        try {
            const ids = Array.from(selectedIds).join(",");
            await deleteMachine(ids);
            toast.success(`已删除 ${selectedIds.size} 项`);
            setSelectedIds(new Set());
            fetchData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const handleSelectionChange = useCallback((selected: Set<number | string>) => {
        // console.log(selected)
		setSelectedIds(selected);
	}, []);

    const columns: ColumnDef<MachineItem>[] = [
        
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
			enableSorting: false,
			enableColumnFilter: false,
		},
        { accessorKey: "id", header: "ID" },
        { accessorKey: "m_p", header: "所属展厅",cell: ({ row }) => (row.original.m_p?.name),},
        { accessorKey: "m_name", header: "展区名称" },
        { accessorKey: "m_summary", header: "介绍" },
        { accessorKey: "m_re", header: "备注" },
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
                <h1 className="text-xl font-semibold">展区列表</h1>
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
                    <Button onClick={openAdd}>
                        <PlusIcon className="mr-1 size-4" /> 新增展区
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                searchPlaceholder="搜索名称"
                pageSize={20}
                onSelectionChange={handleSelectionChange}
            />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑展区" : "新增展区"}</DialogTitle>
                        <DialogDescription>
                            {editing ? "修改展区信息" : "填写新展区的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="m_name">展区名称</FieldLabel>
                                <Input id="m_name" type="text" value={formData.m_name} placeholder="名称" required onChange={(e) => setFormData({ ...formData, m_name: e.target.value })}/>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="m_summary">展区介绍</FieldLabel>
                                <Input id="m_summary" type="text" value={formData.m_summary} placeholder="介绍" onChange={(e) => setFormData({ ...formData, m_summary: e.target.value })} />
                            </Field>
                            <Field>
								<FieldLabel htmlFor="m_p">所属展厅 ID</FieldLabel>
								<Input id="m_p" type="text" value={formData.m_p} placeholder="所属展馆 ID" onChange={(e) => setFormData({ ...formData, m_p: Number(e.target.value) })}/>
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
                                <FieldLabel htmlFor="m_re">展区备注</FieldLabel>
                                <Textarea id="m_re" value={formData.m_re} placeholder="123 Main St" onChange={(e) => setFormData({ ...formData, m_re: e.target.value })}/>
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
