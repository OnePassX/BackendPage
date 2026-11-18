import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    DrawerPortal,
    DrawerTitle,
} from "@/components/ui/drawer";
import { DataTable } from "@/components/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import {
    addControl,
    batchAddControl,
    deleteControl,
    getControlList,
    updateControl,
} from "@/api/exhibition";

/**
 * 展项控制命令 Drawer。
 *
 * 数据来源与展示结构参照 `src/app/exhibition/code.tsx`：
 * 同样的列（IP / 命令名称 / 命令原文 / 端口 / 格式 / 协议 / 创建时间）、
 * 同样的新增/编辑字段与批量录入格式，只是把「展项」固定为画布上选中的节点，
 * 并通过 `/control/list?e_id=<id>` 过滤（后端 ControlViewSet.list 支持该参数）。
 */

interface NamedItem {
    id: number;
    name: string;
}

interface ControlItem {
    id: number;
    e_id: number | null;
    name: string;
    cformat: NamedItem;
    protocal: NamedItem;
    ip: string;
    port: number;
    code: string;
    note: string;
    sort: number;
    create_time?: string;
}

export interface ExhibitRef {
    id: number;
    name: string;
    ip?: string;
}

export interface ExhibitCommandDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    exhibit: ExhibitRef | null;
}

// 选项与 exhibition/code.tsx 保持一致
const CodeFormatItems = [
    { label: '字符串', value: '1' }, { label: '16进制', value: '2' },
];

const CodeProtocalItems = [
    { label: 'TCP Client', value: '1' }, { label: 'TCP Server', value: '2' }, { label: 'UDP Client', value: '3' }, { label: 'UDP Server', value: '4' },
    { label: 'HTTP POST', value: '5' }, { label: 'HTTP GET', value: '6' }, { label: 'HTTP Server', value: '7' }, { label: 'IO Server', value: '8' },
    { label: '其他', value: '9' },
];

const defaultForm = { e_id: null as number | null, name: '', cformat: 1, protocal: 4, ip: '', code: '', port: 10023, note: '', sort: 0 };

export function ExhibitCommandDrawer({ open, onOpenChange, exhibit }: ExhibitCommandDrawerProps) {
    const [data, setData] = useState<ControlItem[]>([]);
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ControlItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);
    const [saving, setSaving] = useState(false);

    const [batchDialogOpen, setBatchDialogOpen] = useState(false);
    const [batchText, setBatchText] = useState("");
    const [batchSaving, setBatchSaving] = useState(false);

    const exhibitId = exhibit?.id ?? null;

    const fetchData = useCallback(async () => {
        if (exhibitId == null) {
            setData([]);
            return;
        }
        setLoading(true);
        try {
            const res = await getControlList({ e_id: exhibitId, page: 1, limit: 1000 });
            const raw = res.data;
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: ControlItem[] }).items ?? []);
            } else {
                setData([]);
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setLoading(false);
        }
    }, [exhibitId]);

    useEffect(() => {
        if (open) void fetchData();
    }, [open, fetchData]);

    // 关闭时收起内层弹窗，避免下次打开残留
    useEffect(() => {
        if (!open) {
            setDialogOpen(false);
            setBatchDialogOpen(false);
            setEditing(null);
        }
    }, [open]);

    const openAdd = () => {
        setEditing(null);
        setFormData({ ...defaultForm, e_id: exhibitId, ip: exhibit?.ip ?? "" });
        setDialogOpen(true);
    };

    const openEdit = (row: ControlItem) => {
        setEditing(row);
        setFormData({
            e_id: row.e_id ?? exhibitId,
            name: row.name,
            cformat: row.cformat?.id ?? 1,
            protocal: row.protocal?.id ?? 4,
            ip: row.ip,
            port: row.port,
            code: row.code,
            note: row.note,
            sort: row.sort,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("请填写命令名称");
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await updateControl({ id: editing.id, ...formData, e_id: exhibitId });
                toast.success("更新成功");
            } else {
                await addControl({ ...formData, e_id: exhibitId });
                toast.success("添加成功");
            }
            setDialogOpen(false);
            void fetchData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        } finally {
            setSaving(false);
        }
    };

    const handleBatchSave = async () => {
        if (!batchText.trim()) {
            toast.error("请粘贴命令数据");
            return;
        }
        setBatchSaving(true);
        try {
            await batchAddControl({ table_text: batchText, e_id: exhibitId });
            toast.success("批量添加成功");
            setBatchDialogOpen(false);
            setBatchText("");
            void fetchData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        } finally {
            setBatchSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteControl(id);
            toast.success("删除成功");
            void fetchData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const columns: ColumnDef<ControlItem>[] = [
        { accessorKey: "id", header: "ID", size: 60 },
        { accessorKey: "name", header: "命令名称" },
        {
            accessorKey: "code",
            header: "命令原文",
            cell: ({ row }) => (
                <span className="block max-w-80 truncate" title={row.original.code}>
                    {row.original.code || "-"}
                </span>
            ),
        },
        { accessorKey: "ip", header: "IP" },
        { accessorKey: "port", header: "端口号", size: 80 },
        { accessorKey: "cformat", header: "格式", cell: ({ row }) => row.original.cformat?.name },
        { accessorKey: "protocal", header: "控制协议", cell: ({ row }) => row.original.protocal?.name },
        { accessorKey: "create_time", header: "创建时间" },
        {
            id: "actions",
            header: "操作",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)} title="编辑">
                        <PencilIcon className="size-4" />
                    </Button>
                    <DeleteDialog
                        view={<Trash2Icon className="size-4 text-destructive" />}
                        label={`确认删除命令「${row.original.name}」？删除后可去操作日志中恢复`}
                        onDelete={() => handleDelete(row.original.id)}
                    />
                </div>
            ),
        },
    ];

    return (
        <>
            <Drawer
                disablePointerDismissal={true}
                open={open}
                onOpenChange={onOpenChange}
                swipeDirection="right"
            >
                <DrawerPortal>
                    <DrawerOverlay />
                    <DrawerContent className="h-full w-full max-w-4/5">
                        <DrawerHeader>
                            <div className="flex items-center justify-start gap-2">
                                {exhibit && (
                                    <Badge variant="outline" className="text-xl h-8">
                                        {exhibit.name}
                                    </Badge>
                                )}
                                <DrawerTitle>展项控制命令</DrawerTitle>
                            </div>
                            <DrawerDescription>
                                {exhibit?.ip ? `展项 IP：${exhibit.ip}` : "管理该展项的控制命令"}
                            </DrawerDescription>
                        </DrawerHeader>

                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    共 {data.length} 条命令
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setBatchDialogOpen(true)} disabled={exhibitId == null}>
                                        <UploadIcon className="mr-1 size-4" /> 批量添加
                                    </Button>
                                    <Button size="sm" onClick={openAdd} disabled={exhibitId == null}>
                                        <PlusIcon className="mr-1 size-4" /> 新增命令
                                    </Button>
                                </div>
                            </div>
                            <DataTable
                                columns={columns}
                                data={data}
                                loading={loading}
                                searchPlaceholder="搜索命令名称/原文/IP..."
                                pageSize={18}
                            />
                        </div>

                        <DrawerFooter className="flex flex-row">
                            <DrawerClose render={
                                <Button variant="outline" className="flex-1">关闭</Button>
                            }>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </DrawerPortal>
            </Drawer>

            {/* 命令 新增/编辑 */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑命令" : "新增命令"}</DialogTitle>
                        <DialogDescription>
                            {editing ? "修改命令信息" : "填写新命令的信息"}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="ctrl-name" aria-required>命令名称</FieldLabel>
                                <Input id="ctrl-name" value={formData.name} placeholder="请输入命令名称" required onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="ctrl-e_id">展项ID</FieldLabel>
                                    <Input id="ctrl-e_id" value={formData.e_id ?? ""} disabled />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="ctrl-sort">排序</FieldLabel>
                                    <Input id="ctrl-sort" type="number" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })} />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="ctrl-cformat">格式</FieldLabel>
                                    <Select items={CodeFormatItems} defaultValue="1" value={String(formData.cformat)} onValueChange={(e) => setFormData({ ...formData, cformat: Number(e) })}>
                                        <SelectTrigger id="ctrl-cformat"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {CodeFormatItems.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="ctrl-protocal">通信协议</FieldLabel>
                                    <Select items={CodeProtocalItems} defaultValue="1" value={String(formData.protocal)} onValueChange={(e) => setFormData({ ...formData, protocal: Number(e) })}>
                                        <SelectTrigger id="ctrl-protocal"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {CodeProtocalItems.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="ctrl-ip">IP</FieldLabel>
                                    <Input id="ctrl-ip" value={formData.ip} placeholder="设备IP" onChange={(e) => setFormData({ ...formData, ip: e.target.value })} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="ctrl-port">端口</FieldLabel>
                                    <Input id="ctrl-port" value={formData.port} placeholder="端口号" onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })} />
                                </Field>
                            </div>
                            <Field>
                                <FieldLabel htmlFor="ctrl-code">控制命令</FieldLabel>
                                <Textarea id="ctrl-code" value={formData.code} placeholder="请输入控制命令，可为字符串也可以为16进制" onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="ctrl-note">备注</FieldLabel>
                                <Textarea id="ctrl-note" value={formData.note} placeholder="可选输入，备注" onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
                            </Field>
                        </FieldGroup>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>取消</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 批量添加 */}
            <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader>
                        <DialogTitle>批量添加命令</DialogTitle>
                        <DialogDescription>
                            每行一条，格式：name ip port format protocal code
                        </DialogDescription>
                    </DialogHeader>
                    <form className="w-full">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="ctrl-batch">请把数据复制到下方输入框内</FieldLabel>
                                <Textarea
                                    id="ctrl-batch"
                                    className="max-h-80 h-40"
                                    value={batchText}
                                    placeholder="格式：name ip port format protocal code"
                                    onChange={(e) => setBatchText(e.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBatchDialogOpen(false)} disabled={batchSaving}>取消</Button>
                        <Button onClick={handleBatchSave} disabled={batchSaving}>{batchSaving ? "保存中..." : "保存"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
