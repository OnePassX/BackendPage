import { useState, useEffect, useCallback } from "react";
import { type ColumnDef, } from "@tanstack/react-table";

import { PencilIcon, Trash2Icon, PlusIcon, KeyRoundIcon, ToggleLeftIcon, UploadCloudIcon, } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel,} from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,SelectGroup } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { Avatar,AvatarImage } from "@/components/ui/avatar";

import { DataTable, DragHandle } from "@/components/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { ImageCropper } from "@/components/image-cropper";

import { getUserList, addUser, updateUser, deleteUser, updateUserStatus, resetUserPwd, getRoleList } from "@/api/system";


interface RoleItem {
	id: number;
	name: string;
}

// ── Types ──────────────────────────────────────────
interface UserItem {
	id: number;
	username: string;
	re_name: string;
	re_phone: string;
	avatar: string;
	sort: number;
	status: number;
	roles: RoleItem | null;
	note: string;
	create_time: string;
}

interface UserFormData {
	username: string;
	re_name: string;
	re_phone: string;
	password?: string;
	avatar?: string;
	status: number;
	roles: number | null;
	sort: number;
	note: string;
}

const defaultFormData: UserFormData = {
	username: "",
	re_name: "",
	re_phone: "",
	password: "",
	avatar: "",
	status: 1,
	roles: null,
	sort: 0,
	note: "",
};

const ShowItems = [{label:'启用',value:'1'},{label:'禁用',value:'2'}]


// ── Page ───────────────────────────────────────────
export default function UserPage() {
	const [data, setData] = useState<UserItem[]>([]);
	const [loading, setLoading] = useState(true);

	// Dialog states
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<UserItem | null>(null);
	const [formData, setFormData] = useState<UserFormData>(defaultFormData);

	const [resetPwdDialogOpen, setResetPwdDialogOpen] = useState(false);
	const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
	const [newPassword, setNewPassword] = useState("");

	// --- roles ---
	const [roleItems, setRoleItems] = useState([]);

	// Selection state
	const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

	// ── data fetching ──
	const fetchData = async () => {
		setLoading(true);
		try {
			const resUser = await getUserList();
			const resRole = await getRoleList();
			const rawUser = resUser.data;
			const rawRole = resRole.data;
			// console.log(resUser,rawRole)
			if (rawUser && typeof rawUser === "object" && "items" in rawUser) {
				const paginated = rawUser as { items: UserItem[] };
				setData(paginated.items ?? []);
			} else if (Array.isArray(rawUser)) {
				setData(rawUser);
			} else {
				setData([]);
			}

			if (rawRole && typeof rawRole === "object" && "items" in rawRole) {
				const paginated = rawRole as { items: RoleItem[] };
				setRoleItems(paginated.items ?? []);
			} else if (Array.isArray(rawRole)) {
				const a = rawRole.map(item => ({
					...item,
					value: item.id,
					label: item.name,
				}));
				setRoleItems(a);

			} else {
				setRoleItems([]);
			}

		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "加载失败");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchData(); }, []);

	// ── columns ──
	// Drag/select columns are defined here — DataTable auto-detects them by `id`
	const columns: ColumnDef<UserItem>[] = [
		{
			id: "drag",
			header: () => null,
			cell: ({ row }) => <DragHandle id={row.id} />,
			size: 40,
			enableSorting: false,
			enableColumnFilter: false, 
			enableHiding: false,
		},
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
			enableHiding: false,
		},
		{
			accessorKey: "id",
			header: "ID",
		},
		{
			accessorKey: "username",
			header: "用户名",
			enableSorting: false,
			enableColumnFilter: false,
		},
		{
			accessorKey: "re_name",
			header: "姓名",
			enableSorting: false,
			enableColumnFilter: false,
		},
		{
			accessorKey: "re_phone",
			header: "手机号",
			enableSorting: false,
			enableColumnFilter: false,
		},
		{
			accessorKey: "avatar",
			header: "头像",
			cell: ({ row }) => (
				<Avatar>
					<AvatarImage src={row.original.avatar} alt="avatar" />
				</Avatar>
			),
			enableSorting: false,
			enableColumnFilter: false,
		},
		{
			accessorKey: "status",
			header: "状态",
			cell: ({ row }) => (
				<Badge
					className={
						row.original.status === 1
						? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
						: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
					}
				>
					{row.original.status === 1 ? "启用" : "禁用"}
			  	</Badge>
			),
		},
		{
			accessorKey: "roles",
			header: "用户角色",
			cell: ({ row }) => (
				<Badge variant="outline">
					{row.original.roles.name}
				</Badge>
			),
			enableSorting: false,
			enableColumnFilter: false,
		},
		{
			accessorKey: "sort",
			header: "排序",
		},
		{
			accessorKey: "note",
			header: "备注",
			maxSize: 40,
			cell: ({ row }) => (
				<div className="w-40 overflow-hidden truncate">
					{row.original.note || '-'}
				</div>
			),
			enableSorting: false,
			enableColumnFilter: false,
		},
		{
			accessorKey: "create_time",
			header: "创建时间",
		},
		{
			id: "actions",
			header: "操作",
			cell: ({ row }) => (
				<div className="flex items-center gap-1 ">
					<Button variant="ghost" size="sm" onClick={() => openEdit(row.original)} title="编辑">
						<PencilIcon className="size-4" />
					</Button>
					<Button variant="ghost" size="sm" onClick={() => openResetPwd(row.original)} title="重置密码">
						<KeyRoundIcon className="size-4" />
					</Button>
					<Button variant="ghost" size="sm" onClick={() => handleToggleStatus(row.original)} title="切换状态">
						<ToggleLeftIcon className="size-4" />
					</Button>
					{/* <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)} title="删除">
						<Trash2Icon className="size-4 text-destructive" />
					</Button> */}
					<DeleteDialog view={<Trash2Icon className="size-4 text-destructive" />} label={'如果您登录的是此用户，则此操作将登出此用户。删除后不可恢复数据，请谨慎操作。'}  onDelete={()=>handleDelete(row.original.id)}/> 
				</div>
			),
		},
	];
	

	// ── CRUD ──
	const openAdd = () => {
		setEditing(null);
		setFormData(defaultFormData);
		setDialogOpen(true);
	};

	const openEdit = (row: UserItem) => {
		// console.log(row)
		setEditing(row);
		setFormData({ avatar:row.avatar, username: row.username, re_name:row.re_name ,re_phone: row.re_phone, password: "",roles: row.roles?.id,status: row.status,sort: row.sort,note: row.note });
		setDialogOpen(true);
	};

	const handleSave = async () => {
		try {
			if (editing) {
				await updateUser({ id: editing.id, ...formData });
				toast.success("更新成功");
			} else {
				await addUser(formData);
				toast.success("添加成功");
			}
			setDialogOpen(false);
			fetchData();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};

	const handleDelete = async (id: number) => {
		try {
			await deleteUser(id);
			toast.success("删除成功");
			fetchData();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "删除失败");
		}
	};

	const handleToggleStatus = async (row: UserItem) => {
		try {
			await updateUserStatus(row.id, row.status === 1 ? 2 : 1);
			toast.success("状态已更新");
			fetchData();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};

	const openResetPwd = (row: UserItem) => {
		setResetTarget(row);
		setNewPassword("");
		setResetPwdDialogOpen(true);
	};

	const handleResetPwd = async () => {
		if (!resetTarget || !newPassword) return;
		try {
			await resetUserPwd(resetTarget.id, newPassword);
			toast.success("密码已重置");
			setResetPwdDialogOpen(false);
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "重置失败");
		}
	};

	const handleReorder = useCallback((reordered: UserItem[]) => {
		setData(reordered);
		console.log(reordered);
		toast.success("排序已更新");
	}, []);

	const handleSelectionChange = useCallback((selected: Set<number | string>) => {
		setSelectedIds(selected);
	}, []);

	// ── Render ──
	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">用户管理</h1>
				<div className="flex items-center gap-2">
					{selectedIds.size > 0 && (
						<Button
							variant="destructive"
							size="sm"
							onClick={() => {
								if (!confirm(`确认删除选中的 ${selectedIds.size} 项？`)) return;
								toast.success(`已删除 ${selectedIds.size} 项`);
								setSelectedIds(new Set());
								fetchData();
							}}
						>
							批量删除 ({selectedIds.size})
						</Button>
					)}
					<Button onClick={openAdd}>
						<PlusIcon className="mr-1 size-4" /> 新增用户
					</Button>
				</div>
			</div>

			{/* Data Table */}
			<DataTable
				columns={columns}
				data={data}
				loading={loading}
				searchPlaceholder="搜索用户名/手机号..."
				onSelectionChange={handleSelectionChange}
				onReorder={handleReorder}
				getRowId={(row) => row.id}
			/>

			{/* Add/Edit Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-180">
					<DialogHeader>
						<DialogTitle>{editing ? "编辑用户" : "新增用户"}</DialogTitle>
						<DialogDescription>
							{editing ? "修改用户信息" : "填写新用户的信息"}
						</DialogDescription>
					</DialogHeader>
					<form className="w-full">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="avatar">用户头像</FieldLabel>
								<ImageCropper
									aspectRatio={1}
									maxSize={200}
									onUploaded={(fileUrl) => {
										setFormData((prev) => ({ ...prev, avatar: fileUrl }));
										toast.success("头像上传成功");
									}}
									onError={(e) => toast.error(e instanceof Error ? e.message : "上传失败，请重新选择图片")}
									trigger={({ onClick }) => (
										<div className="flex flex-wrap items-center gap-3">
											<Button type="button" variant="outline" className="w-30 h-20 flex flex-col"  onClick={onClick}>
												<UploadCloudIcon className="mr-1 size-6" />
												<span className="text-warp">选择图片并裁剪</span>
											</Button>
											{formData.avatar && (
												<div className="flex flex-col justify-center items-center">
													<Avatar className="size-10">
														<AvatarImage src={formData.avatar} alt="头像预览" />
													</Avatar>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => setFormData((prev) => ({ ...prev, avatar: "" }))}
													>
														清除已上传文件
													</Button>
												</div>
											)}
										</div>
									)}
								/>
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="re_name">姓名</FieldLabel>
									<Input id="re_name" type="text" value={formData.re_name} placeholder="请输入真实姓名" onChange={(e) => setFormData({ ...formData, re_name: e.target.value })} />
								</Field>
								<Field>
									<FieldLabel htmlFor="re_phone">手机号</FieldLabel>
									<Input id="re_phone" type="tel" value={formData.re_phone} placeholder="请输入手机号码" onChange={(e) => setFormData({ ...formData, re_phone: e.target.value })} />
								</Field>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="username">用户名</FieldLabel>
									<Input id="username" type="text" value={formData.username} placeholder="请输入登录用户名" required onChange={(e) => setFormData({ ...formData, username: e.target.value })}/>
								</Field>
								{!editing && (
									<Field>
										<FieldLabel htmlFor="user-password">密码</FieldLabel>
										<Input
											id="user-password"
											type="password"
											value={formData.password ?? ""}
											onChange={(e) => setFormData({ ...formData, password: e.target.value })}
											placeholder="请输入密码"
										/>
									</Field>
								)}
							</div>
							<Field>
								<FieldLabel htmlFor="roles">角色权限绑定</FieldLabel>
								<Select items={roleItems} value={formData.roles} onValueChange={(e) => setFormData({ ...formData, roles: Number(e) })} >
									<SelectTrigger id="roles"><SelectValue placeholder="请选择角色" /></SelectTrigger>
									<SelectContent>
										<SelectGroup>
										{roleItems.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="status">显示状态</FieldLabel>
									<Select items={ShowItems} defaultValue="1" value={String(formData.status)} onValueChange={(e) => setFormData({ ...formData, status: Number(e) })}>
										<SelectTrigger id="status"><SelectValue /></SelectTrigger>
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
								<FieldLabel htmlFor="note">用户备注</FieldLabel>
								<Textarea className="max-h-80" id="note" value={formData.note} placeholder="选填，输入用户备注信息！" onChange={(e) => setFormData({ ...formData, note: e.target.value })}/>
							</Field>
						</FieldGroup>
					</form>
						
					
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
						<Button onClick={handleSave}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reset Password Dialog */}
			<Dialog open={resetPwdDialogOpen} onOpenChange={setResetPwdDialogOpen}>
				<DialogContent className="sm:max-w-100">
					<DialogHeader>
						<DialogTitle>重置密码</DialogTitle>
						<DialogDescription>
							为 {resetTarget?.username} 设置新密码
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						<Label htmlFor="reset-pwd">新密码</Label>
						<Input
							id="reset-pwd"
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="请输入新密码"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setResetPwdDialogOpen(false)}>取消</Button>
						<Button onClick={handleResetPwd}>确认重置</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
