import { useState, useEffect } from "react";
import { type ColumnDef,} from "@tanstack/react-table";

import { PencilIcon, Trash2Icon, PlusIcon, ToggleLeftIcon, ShieldCheckIcon, LoaderIcon,} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,} from "@/components/ui/dialog";

import { DataTable } from "@/components/data-table";

import { getRoleList, addRole, updateRole, deleteRole, updateRoleStatus, getRoleMenus, saveRoleMenus } from "@/api/system";
import { getMenuTree } from "@/api/menu";

// ── Types ──

interface RoleItem {
	id: number;
	name: string;
	code: string;
	note: string;
	status: number;
	create_time: string;
}

interface RoleFormData {
	name: string;
	code: string;
	status: number;
	note: string;
}

interface MenuNode {
	id: number;
	name: string;
	children?: MenuNode[];
}

// ── Recursive Menu Checkbox Tree ──

function MenuTreeCheckbox({
	items,
	checkedIds,
	onToggle,
	depth = 0,
}: {
	items: MenuNode[];
	checkedIds: Set<number>;
	onToggle: (id: number) => void;
	depth?: number;
}) {
	return (
		<>
			{items.map((item) => {
				const hasChildren = item.children && item.children.length > 0;
				return (
					<div key={item.id} className="flex flex-col">
						<div
							className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent/50"
							style={{ paddingLeft: `${12 + depth * 20}px` }}
						>
							<Checkbox
								id={`menu-${item.id}`}
								checked={checkedIds.has(item.id)}
								onCheckedChange={() => onToggle(item.id)}
							/>
							<Label
								htmlFor={`menu-${item.id}`}
								className="cursor-pointer text-sm font-normal"
							>
								{item.name}
							</Label>
						</div>
						{hasChildren && (
							<MenuTreeCheckbox
								items={item.children!}
								checkedIds={checkedIds}
								onToggle={onToggle}
								depth={depth + 1}
							/>
						)}
					</div>
				);
			})}
		</>
	);
}

// ── Page ──

export default function RolePage() {
	const [data, setData] = useState<RoleItem[]>([]);
	const [loading, setLoading] = useState(true);

	// Add/Edit dialog
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<RoleItem | null>(null);
	const [formData, setFormData] = useState<RoleFormData>({ name: "", code: "", status: 1, note: "" });

	// Permission dialog
	const [permDialogOpen, setPermDialogOpen] = useState(false);
	const [permRole, setPermRole] = useState<RoleItem | null>(null);
	const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
	const [checkedMenuIds, setCheckedMenuIds] = useState<Set<number>>(new Set());
	const [permSaving, setPermSaving] = useState(false);
	const [permLoading, setPermLoading] = useState(false);

	// ── data fetching ──
	const fetchData = async () => {
		setLoading(true);
		try {
			const res = await getRoleList();
			const raw = res.data;
			console.log(raw)
			if (Array.isArray(raw)) {
				setData(raw);
			} else if (raw && typeof raw === "object" && "items" in raw) {
				setData((raw as { items: RoleItem[] }).items ?? []);
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

	// ── columns ──
	const columns: ColumnDef<RoleItem>[] = [
		{ accessorKey: "id", header: "ID" },
		{ accessorKey: "name", header: "角色名称" },
		{ accessorKey: "code", header: "角色标识" },
		{ accessorKey: "note", header: "描述" },
		{
			accessorKey: "status",
			header: "状态",
			cell: ({ row }) => (
				<Badge variant={row.original.status === 1 ? "default" : "secondary"}>
					{row.original.status === 1 ? "启用" : "禁用"}
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
					<Button variant="ghost" size="sm" onClick={() => openPermDialog(row.original)} title="权限分配">
						<ShieldCheckIcon className="size-4" />
					</Button>
					<Button variant="ghost" size="sm" onClick={() => handleToggleStatus(row.original)} title="切换状态">
						<ToggleLeftIcon className="size-4" />
					</Button>
					<Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)} title="删除">
						<Trash2Icon className="size-4 text-destructive" />
					</Button>
				</div>
			),
		},
	];

	// ── CRUD ──
	const openAdd = () => {
		setEditing(null);
		setFormData({ name: "", code: "", status: 1, note: "" });
		setDialogOpen(true);
	};

	const openEdit = (row: RoleItem) => {
		setEditing(row);
		setFormData({ name: row.name, code: row.code, status: row.status, note: row.note });
		setDialogOpen(true);
	};

	const handleSave = async () => {
		try {
			if (editing) {
				await updateRole({ id: editing.id, ...formData });
				toast.success("更新成功");
			} else {
				await addRole(formData);
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
			await deleteRole(id);
			toast.success("删除成功");
			fetchData();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "删除失败");
		}
	};

	const handleToggleStatus = async (row: RoleItem) => {
		try {
			await updateRoleStatus(row.id, row.status === 1 ? 0 : 1);
			toast.success("状态更新成功");
			fetchData();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "状态更新失败");
		}
	};

	// ── Permission dialog ──

	/** Collect all descendant ids for a given node */
	const collectDescendantIds = (item: MenuNode): number[] => {
		const ids: number[] = [item.id];
		if (item.children) {
			for (const child of item.children) {
				ids.push(...collectDescendantIds(child));
			}
		}
		return ids;
	};

	const openPermDialog = async (row: RoleItem) => {
		setPermRole(row);
		setPermDialogOpen(true);
		setPermLoading(true);

		try {
			// Fetch menu tree + current role permissions in parallel
			const [treeRes, permRes] = await Promise.all([
				getMenuTree(),
				getRoleMenus(row.id),
			]);
			console.log(treeRes, permRes)

			const tree = treeRes.data || [];
			setMenuTree(tree);

			// permRes.data might be {menu_ids: [...]} or [...] or {ids: [...]}
			const permData = permRes.data;
			let ids: number[] = [];
			// if (Array.isArray(permData)) {
			// 	ids = permData;
			// } else if (permData && typeof permData === "object") {
			// 	ids = (permData as Record<string, unknown>).menu_ids as number[]
			// 		|| (permData as Record<string, unknown>).ids as number[]
			// 		|| [];
			// }
			const resultIds = permData.reduce<number[]>((acc, item) => {
				if (item.checked === true) {
				  acc.push(item.id);
				}
				return acc;
			}, [...ids]);
			setCheckedMenuIds(new Set(resultIds));
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "加载权限数据失败");
		} finally {
			setPermLoading(false);
		}
	};

	const handleToggleMenu = (id: number) => {
		setCheckedMenuIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleSavePerm = async () => {
		if (!permRole) return;
		setPermSaving(true);
		try {
			await saveRoleMenus(permRole.id, [...checkedMenuIds].join(','));
			toast.success("权限保存成功");
			setPermDialogOpen(false);
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "权限保存失败");
		} finally {
			setPermSaving(false);
		}
	};

	// ── Render ──
	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">角色管理</h1>
				<Button onClick={openAdd}>
					<PlusIcon className="mr-1 size-4" /> 新增角色
				</Button>
			</div>

			{/* Data Table */}
			<DataTable
				columns={columns}
				data={data}
				loading={loading}
				searchPlaceholder="搜索角色名称/标识..."
			/>

			{/* Add/Edit Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-180">
					<DialogHeader>
						<DialogTitle>{editing ? "编辑角色" : "新增角色"}</DialogTitle>
						<DialogDescription>
							{editing ? "修改角色信息" : "填写新角色的信息"}
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="role-name">角色名称</Label>
							<Input
								id="role-name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								placeholder="请输入角色名称"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="role-code">角色标识</Label>
							<Input
								id="role-code"
								value={formData.code}
								onChange={(e) => setFormData({ ...formData, code: e.target.value })}
								placeholder="请输入角色标识"
							/>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="role-status"
								checked={formData.status === 1}
								onCheckedChange={(v) => setFormData({ ...formData, status: v ? 1 : 0 })}
							/>
							<Label htmlFor="role-status" className="cursor-pointer">
								{formData.status === 1 ? "启用此角色" : "禁用此角色"}
							</Label>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="role-note">描述</Label>
							<Input
								id="role-note"
								value={formData.note}
								onChange={(e) => setFormData({ ...formData, note: e.target.value })}
								placeholder="请输入角色描述"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
						<Button onClick={handleSave}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Permission Dialog */}
			<Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
				<DialogContent className="sm:max-w-125 max-h-[80vh] flex flex-col">
					<DialogHeader>
						<DialogTitle>权限分配</DialogTitle>
						<DialogDescription>
							为角色「{permRole?.name}」分配菜单权限
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-y-auto border rounded-lg p-3">
						{permLoading ? (
							<div className="flex items-center justify-center py-8">
								<LoaderIcon className="size-5 animate-spin text-muted-foreground" />
								<span className="ml-2 text-sm text-muted-foreground">加载菜单树...</span>
							</div>
						) : menuTree.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">暂无菜单数据</p>
						) : (
							<MenuTreeCheckbox
								items={menuTree}
								checkedIds={checkedMenuIds}
								onToggle={handleToggleMenu}
							/>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setPermDialogOpen(false)}>取消</Button>
						<Button onClick={handleSavePerm} disabled={permSaving || permLoading}>
							{permSaving && <LoaderIcon className="mr-2 size-4 animate-spin" />}
							保存权限
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
