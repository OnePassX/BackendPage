import { useState, useEffect, useCallback } from "react";

import { PencilIcon, Trash2Icon, PlusIcon, } from "lucide-react";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel,} from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,SelectGroup} from "@/components/ui/select";

import { DataTableTree, type TreeColumn } from "@/components/data-table-tree";
import { DeleteDialog } from "@/components/delete-dialog";
import { IconPicker } from "@/components/icon-picker";

import { getMenuTree, addMenu, updateMenu, deleteMenu } from "@/api/menu";

// ── Types ──────────────────────────────────────────
interface MenuItem {
    id: number;
    name: string;
    icon: string;
    url: string;
    pid: number | null;
    type: number;
    permission: string;
    status: number;
    target: number;
    note: string;
    sort: number;
    children?: MenuItem[];
}

interface MenuFormData {
    name: string;
    icon: string;
    url: string;
    pid: number | null;
    type: number;
    permission: string;
    status: number;
    target: number;
    note: string;
    sort: number;
}

interface ResponseData {
    code: number;
    data: MenuItem[];
    msg: string;
}

const TypeItems = [
    {
        label: "路由菜单",
        value: "0",
    },
    {
        label: "权限节点",
        value: "1",
    },
];

const TargetItems = [
    {
        label: "内部打开",
        value: "1",
    },
    {
        label: "外部打开",
        value: "2",
    },
];

const StatusItems = [
    {
        label: "启用",
        value: "1",
    },
    {
        label: "禁用",
        value: "2",
    },
];

// ── Page ───────────────────────────────────────────
export default function MenuPage() {
    const [tree, setTree] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState<MenuFormData>({
        name: "", icon: "", url: "", pid: null, type: 0, permission: "", status: 1, target: 1, sort: 0, note: ""
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMenuTree() as ResponseData;
            console.log(res.data);
            setTree(res.data || []);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── CRUD ──
    const openAdd = (parent?: MenuItem) => {
        setEditing(null);
        setFormData({ name: "", icon: "", url: "", pid: parent?.id ?? null, type: 0, permission: "", status: 1, target: 1, sort: 0, note: "" });
        setDialogOpen(true);
    };

    const openEdit = (row: MenuItem) => {
        setEditing(row);
        setFormData({
            name: row.name,
            icon: row.icon,
            url: row.url,
            pid: row.pid,
            type: row.type,
            permission: row.permission,
            target: row.target,
            status: row.status,
            sort: row.sort,
            note: row.note
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editing) {
                await updateMenu({ id: editing.id, ...formData });
                toast.success("更新成功");
            } else {
                await addMenu(formData);
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
            await deleteMenu(id);
            toast.success("删除成功");
            fetchData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    // ── Columns ──
    const columns: TreeColumn<MenuItem>[] = [
        {
            id: "name",
            label: "名称",
            className: "w-60",
            cell: (item, depth) => (
                <span className={depth > 0 ? "text-sm" : "font-medium"}>{item.name}</span>
            ),
        },
        {
            id: "id",
            label: "ID",
            className: "w-auto",
            cell: (item) => <span className="text-xs text-muted-foreground">{item.id}</span>,
        },
        {
            id: "icon",
            label: "图标",
            className: "w-auto",
            cell: (item) => <span className="text-xs text-muted-foreground">{item.icon || "—"}</span>,
        },
        {
            id: "url",
            label: "路由",
            className: "w-auto",
            cell: (item) => <span className="text-xs">{item.url || "—"}</span>,
        },
        {
            id: "type",
            label: "类型",
            className: "w-auto",
            cell: (item) => (
                <Badge variant={item.type === 1 ? "secondary" : "default"} className="text-xs">
                    {item.type === 1 ? "节点" : "菜单"}
                </Badge>
            ),
        },
        {
            id: "permission",
            label: "权限标识",
            className: "w-auto",
            cell: (item) => <span className="text-xs">{item.permission || "—"}</span>,
        },
        {
            id: "status",
            label: "状态",
            className: "w-auto",
            cell: (item) => (
                <Badge
                    className={
                        item.status === 1
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }
                >
                    {item.status === 1 ? "启用" : "禁用"}
                </Badge>
            ),
        },
        {
            id: "target",
            label: "内部节点",
            className: "w-auto",
            cell: (item) => <span className="text-xs">{item.target === 1 ? "内部" : "外部"}</span>,
        },
        {
            id: "sort",
            label: "排序",
            className: "w-auto",
            cell: (item) => <span className="text-xs text-muted-foreground">{item.sort}</span>,
        },
        {
            id: "note",
            label: "备注",
            cell: (item) => <div className="w-10 overflow-hidden truncate">{item.note || "—"}</div>,
        },
        {
            id: "action",
            label: "操作",
            className: "w-auto text-center",
            cell: (item) => (
                <div className="flex flex-row justify-center items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="编辑">
                        <PencilIcon className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openAdd(item)} title="添加子菜单">
                        <PlusIcon className="size-4" />
                    </Button>
                    <DeleteDialog 
                        view={<Trash2Icon className="size-4 text-destructive" />} 
                        label={'删除后此目录下的子集会隐藏，请谨慎操作。'}  
                        onDelete={()=>handleDelete(item.id)}
                        /> 
                </div>
            ),
        },
    ];

    // ── search filter for DataTableTree ──
    const searchFilter = (item: MenuItem, search: string): boolean => {
        const q = search.toLowerCase();
        if (item.name.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)) return true;
        return false;
    };

    // ── parent select options from tree ──
    const renderParentOptions = (items: MenuItem[], depth = 0): React.ReactNode[] => {
        const options: React.ReactNode[] = [];
        for (const item of items) {
            const prefix = depth > 0 ? `${"　".repeat(depth)}` : "";
            if(item.type == 0)
                options.push(
                    <SelectItem key={item.id} value={String(item.id)}>
                        {prefix}{item.name}
                    </SelectItem>,
                );
            if (item.children && item.children.length > 0) {
                options.push(...renderParentOptions(item.children, depth + 1));
            }
        }
        return options;
    };

    // ── Render ──
    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">菜单管理</h1>
                <Button onClick={() => openAdd()}>
                    <PlusIcon className="mr-1 size-4" /> 新增菜单
                </Button>
            </div>

            {/* Tree Table */}
            <DataTableTree
                columns={columns}
                data={tree}
                loading={loading}
                searchPlaceholder="搜索菜单名称/路由..."
                searchFilter={searchFilter}
                getRowClassName={(_, depth) => (depth > 0 ? "bg-muted/20" : "")}
            />

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑菜单" : "新增菜单"}</DialogTitle>
                        <DialogDescription>
                            {editing ? "修改菜单信息" : "填写新菜单的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup> 
                            <Field>
                                <FieldLabel htmlFor="menu-name">菜单名称</FieldLabel>
                                <Input
                                    id="menu-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="请输入菜单名称"
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field className="w-fit">
                                    <FieldLabel htmlFor="menu-icon">图标选择</FieldLabel>
                                    <IconPicker
                                        id="menu-icon"
                                        value={formData.icon}
                                        onChange={(v) => setFormData({ ...formData, icon: v })}
                                        placeholder="请输入图标名称或点击右侧按钮选择"
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="menu-url">路径</FieldLabel>
                                    <Input
                                        id="menu-url"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="请输入路由路径"
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="menu-parent">父级菜单</FieldLabel>
                                    <Select
                                        value={formData.pid !== null ? String(formData.pid) : "0"}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, pid: val === "0" ? 0 : Number(val) })
                                        }
                                        >
                                        <SelectTrigger id="menu-parent">
                                            <SelectValue placeholder="选择父级菜单（可选）" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="0">无（顶级菜单）</SelectItem>
                                                {renderParentOptions(tree)}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
									<FieldLabel htmlFor="menu-type">类型</FieldLabel>
									<Select items={TypeItems} defaultValue="0" value={String(formData.type)} onValueChange={(e) => setFormData({ ...formData, type: Number(e) })}>
										<SelectTrigger id="menu-type"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{TypeItems.map((item) => (
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
                                    <FieldLabel htmlFor="menu-target">打开方式</FieldLabel>
                                    <Select items={TargetItems} defaultValue="0" value={String(formData.target)} onValueChange={(e) => setFormData({ ...formData, target: Number(e) })}>
										<SelectTrigger id="menu-target"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{TargetItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="menu-permission">权限节点</FieldLabel>
                                    <Input
                                        id="menu-permission"
                                        value={formData.permission}
                                        onChange={(e) => setFormData({ ...formData, permission: e.target.value })}
                                        placeholder="请输入权限节点 sys:test:index"
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="menu-status">状态</FieldLabel>
                                    <Select items={StatusItems} defaultValue="0" value={String(formData.status)} onValueChange={(e) => setFormData({ ...formData, status: Number(e) })}>
										<SelectTrigger id="menu-status"><SelectValue /></SelectTrigger>
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
                                    <FieldLabel htmlFor="menu-sort">排序</FieldLabel>
                                    <Input
                                        id="menu-sort"
                                        type="number"
                                        value={formData.sort}
                                        onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })}
                                        placeholder="请输入排序"
                                    />
                                </Field>
                            </div>
                            <Field>
								<FieldLabel htmlFor="note">备注</FieldLabel>
								<Textarea className="max-h-80" id="note" value={formData.note} placeholder="选填，输入菜单备注信息！" onChange={(e) => setFormData({ ...formData, note: e.target.value })}/>
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
