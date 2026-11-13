import { useState, useEffect, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon, PanelBottomOpen, PanelTopOpen } from "lucide-react";
import { HiPlusSm,HiOutlineMinusSm,HiOutlineVolumeOff,HiOutlineVolumeUp } from "react-icons/hi";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,} from "@/components/ui/combobox";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,SelectGroup,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import {
	getExhibitList, addExhibit, updateExhibit, deleteExhibit
} from "@/api/exhibition";
import { Textarea } from "@/components/ui/textarea";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";

interface E_M {
    id: number;
    name: string;
}

// 展项
interface ExhibitItem {
	id: number;
	e_name: string;
	e_m: E_M | null; // 展项id
	e_summary: string;
	e_re: string;
	e_base: string;
	e_link: string;
	e_ip: string;
	show: number;
	sort: number;
}


type BaseBtn = {
	label: string
	value: string
	icon: ReactNode
}

const ShowItems = [{label:'启用',value:'1'},{label:'禁用',value:'2'}]

const BaseBtnItems:BaseBtn[] = [
	{value:"1",label:"音量加",icon:<HiPlusSm size={16}/>},
	{value:"2",label:"音量减",icon:<HiOutlineMinusSm  size={16}/>},
	{value:"3",label:"静音",icon:<HiOutlineVolumeOff size={16}/>},
	{value:"4",label:"取消静音",icon:<HiOutlineVolumeUp size={16}/>},
	{value:"5",label:"窗口打开",icon:<PanelBottomOpen size={16}/>},
	{value:"6",label:"窗口关闭",icon:<PanelTopOpen size={16}/>}
]

const defaultForm = { e_name: '', e_summary: '',e_m: null , e_re: '',e_base:'',e_link:'',e_ip:'', show: 1, sort: 1  };

export default function ExhibitionPage() {
    const [data, setData] = useState<ExhibitItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ExhibitItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);

    const [selectedIds,setSelectedIds] = useState<Set<number | string>>(new Set());

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getExhibitList({page:1,limit:1000});
            // console.log(res.data)
            const raw = res.data;
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: ExhibitItem[] }).items ?? []);
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

    const openEdit = (row: ExhibitItem) => {
        setEditing(row);
        setFormData({ e_name: row.e_name,e_m:row.e_m?.id, e_summary: row.e_summary, e_re: row.e_re,e_base:row.e_base,e_link:row.e_link,e_ip:row.e_ip,show: row.show, sort: row.sort });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editing) {
                await updateExhibit({ id: editing.id, ...formData });
                toast.success("更新成功");
            } else {
                await addExhibit(formData);
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
            await deleteExhibit(id);
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
            await deleteExhibit(ids);
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

    const columns: ColumnDef<ExhibitItem>[] = [
        
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
        { accessorKey: "e_m", header: "所属展项",cell: ({ row }) => (row.original.e_m?.name),},
        { accessorKey: "e_name", header: "展项名称" },
        { accessorKey: "e_summary", header: "介绍" },
        { accessorKey: "e_ip", header: "展项IP" },
        { accessorKey: "e_base", header: "基础控制",cell: ({ row }) => (
                <div className="flex flex-row gap-2">
                    {
                        row.original.e_base && row.original.e_base.split('_').map((item,index) => (
                            <Badge variant="secondary" key={index}>
                                {BaseBtnItems.filter(e=>e.value == item)[0]?.icon}
                            </Badge>
                        ))
                    }
                </div>
            ),
        },
        { accessorKey: "e_link", header: "绑定控制" },
        { accessorKey: "e_re", header: "备注" },
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
                <h1 className="text-xl font-semibold">展项列表</h1>
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
                        <PlusIcon className="mr-1 size-4" /> 新增展项
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                searchPlaceholder="搜索名称/展项"
                pageSize={20}
                onSelectionChange={handleSelectionChange}
            />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑展项" : "新增展项"}</DialogTitle>
                        <DialogDescription>
                            {editing ? "修改展项信息" : "填写新展项的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup>
							<Field>
								<FieldLabel htmlFor="e_name">名称</FieldLabel>
								<Input id="e_name" value={formData.e_name} onChange={(e) => setFormData({ ...formData, e_name: e.target.value })} placeholder="展项名称" />
							</Field>
							
							<Field>
								<FieldLabel htmlFor="e_summary">简介</FieldLabel>
								<Input id="e_summary" value={formData.e_summary} onChange={(e) => setFormData({ ...formData, e_summary: e.target.value })} placeholder="展项简介" />
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="e_m">展区 ID</FieldLabel>
									<Input id="e_m" type="number" value={formData.e_m} onChange={(e) => setFormData({ ...formData, e_m: Number(e.target.value) })} disabled/>
								</Field>
								<Field>
									<FieldLabel htmlFor="e_ip">展项 IP</FieldLabel>
									<Input id="e_ip" value={formData.e_ip} onChange={(e) => setFormData({ ...formData, e_ip: e.target.value })} />
								</Field>
							</div>
							
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
								<FieldLabel>基础功能显示</FieldLabel>
								<Combobox
									items={BaseBtnItems}
									multiple
									value={ formData.e_base ? formData.e_base.split('_') : []}
									onValueChange={(e) => setFormData({ ...formData, e_base: e.join('_') })}
									>
									<ComboboxChips>
										<ComboboxValue>
										{ formData.e_base && formData.e_base.split('_').map((item) => (
											<ComboboxChip key={item}>{
												BaseBtnItems.filter(e=>e.value == item)[0]?.icon
											}</ComboboxChip>
										))}
										</ComboboxValue>
										<ComboboxChipsInput placeholder="添加基础按钮" />
									</ComboboxChips>
									<ComboboxContent>
										<ComboboxEmpty>未找到项目。</ComboboxEmpty>
										<ComboboxList>
										{(item) => (
											<ComboboxItem key={item.value} value={item.value}>
												{item.icon}
												{item.label}
											</ComboboxItem>
										)}
										</ComboboxList>
									</ComboboxContent>
								</Combobox>
							</Field>
							<Field>
								<FieldLabel htmlFor="e_re">展区备注</FieldLabel>
								<Textarea id="e_re" value={formData.e_re} placeholder="123 Main St" onChange={(e) => setFormData({ ...formData, e_re: e.target.value })}/>
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
