import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { addCode, deleteCode, getCodeList, updateCode } from "@/api/device";

/**
 * 设备命令管理 Drawer。
 *
 * 数据来源与展示结构参照 `src/app/device/code.tsx`：
 * 同样的列（IP / 命令名称 / 命令原文 / 端口 / 类型 / 格式 / 协议 / 创建时间）
 * 与同样的表单字段，只是把「设备」固定为画布上选中的那个节点，
 * 并通过 `/code/list?device=<id>` 过滤（后端 CodeViewSet.list 支持该参数）。
 */

interface NamedItem {
    id: number;
    name: string;
}

interface CodeItem {
    id: number;
    device: { id: number; name: string; ip: string | null } | null;
    code: string;
    name: string;
    ctype: NamedItem;
    cformat: NamedItem;
    protocal: NamedItem;
    cport: number;
    note: string;
    create_time?: string;
}

interface DeviceRef {
    id: number;
    name: string;
    ip?: string;
}

export interface DeviceCommandDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    device: DeviceRef | null;
}

// 选项与 device/code.tsx 保持一致
const CodeTypeItems = [
    { label: '设备开机', value: '1' }, { label: '设备关机', value: '2' }, { label: '电动门开启', value: '3' },
    { label: '电动门关闭', value: '4' }, { label: '灯光开启', value: '5' }, { label: '灯光关闭', value: '6' },
    { label: '灯光场景', value: '7' }, { label: '投影开启', value: '8' }, { label: '投影关闭', value: '9' },
    { label: '其他', value: '10' },
];

const CodeFormatItems = [
    { label: '字符串', value: '1' }, { label: '16进制', value: '2' }, { label: '网络唤醒', value: '3' }, { label: '远程关机', value: '4' },
];

const CodeProtocalItems = [
    { label: 'TCP Client', value: '1' }, { label: 'TCP Server', value: '2' }, { label: 'UDP Client', value: '3' }, { label: 'UDP Server', value: '4' },
    { label: 'HTTP POST', value: '5' }, { label: 'HTTP GET', value: '6' }, { label: 'HTTP Server', value: '7' }, { label: 'IO Server', value: '8' },
    { label: '其他', value: '9' },
];

const defaultForm = {
    device: null as number | null,
    code: '',
    name: '',
    ctype: 1,
    cformat: 1,
    protocal: 4,
    cport: 9,
    note: '',
};

export function DeviceCommandDrawer({ open, onOpenChange, device }: DeviceCommandDrawerProps) {
    const [data, setData] = useState<CodeItem[]>([]);
    const [loading, setLoading] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<CodeItem | null>(null);
    const [formData, setFormData] = useState(defaultForm);
    const [saving, setSaving] = useState(false);

    const deviceId = device?.id ?? null;

    const fetchData = useCallback(async () => {
        if (deviceId == null) {
            setData([]);
            return;
        }
        setLoading(true);
        try {
            const res = await getCodeList({ device: deviceId, page: 1, limit: 1000 });
            const raw = res.data;
            if (Array.isArray(raw)) {
                setData(raw);
            } else if (raw && typeof raw === "object" && "items" in raw) {
                setData((raw as { items: CodeItem[] }).items ?? []);
            } else {
                setData([]);
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    useEffect(() => {
        if (open) void fetchData();
    }, [open, fetchData]);

    // 关闭 Drawer 时收起内层弹窗，避免下次打开残留
    useEffect(() => {
        if (!open) {
            setDialogOpen(false);
            setEditing(null);
        }
    }, [open]);

    const openAdd = () => {
        setEditing(null);
        setFormData({ ...defaultForm, device: deviceId });
        setDialogOpen(true);
    };

    const openEdit = (row: CodeItem) => {
        setEditing(row);
        setFormData({
            device: row.device?.id ?? deviceId,
            code: row.code,
            name: row.name,
            ctype: row.ctype?.id ?? 1,
            cformat: row.cformat?.id ?? 1,
            protocal: row.protocal?.id ?? 4,
            cport: row.cport,
            note: row.note,
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
                await updateCode({ id: editing.id, ...formData, device: deviceId });
                toast.success("更新成功");
            } else {
                await addCode({ ...formData, device: deviceId });
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

    const handleDelete = async (id: number) => {
        try {
            await deleteCode(id);
            toast.success("删除成功");
            void fetchData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    const columns: ColumnDef<CodeItem>[] = [
        { accessorKey: "id", header: "ID", size: 60 },
        { accessorKey: "name", header: "命令名称" },
        { accessorKey: "code", header: "命令原文" },
        { accessorKey: "cport", header: "端口号", size: 80 },
        { accessorKey: "ctype", header: "类型", cell: ({ row }) => row.original.ctype?.name },
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
                        label={`确认删除命令「${row.original.name}」？`}
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
                                {device && (
                                    <Badge variant="outline" className="text-xl h-8">
                                        {device.name}
                                    </Badge>
                                )}
                                <DrawerTitle>设备命令管理</DrawerTitle>
                            </div>
                            <DrawerDescription>
                                {device?.ip ? `设备 IP：${device.ip}` : "管理该设备的控制命令"}
                            </DrawerDescription>
                        </DrawerHeader>

                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    共 {data.length} 条命令
                                </span>
                                <Button size="sm" onClick={openAdd} disabled={deviceId == null}>
                                    <PlusIcon className="mr-1 size-4" /> 新增命令
                                </Button>
                            </div>
                            <DataTable
                                columns={columns}
                                data={data}
                                loading={loading}
                                searchPlaceholder="搜索命令名称/原文..."
                                pageSize={10}
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
                                <FieldLabel htmlFor="cmd-name">命令名称</FieldLabel>
                                <Input id="cmd-name" value={formData.name} placeholder="请输入命令名称" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="cmd-ctype">类型</FieldLabel>
                                    <Select items={CodeTypeItems} defaultValue="1" value={String(formData.ctype)} onValueChange={(e) => setFormData({ ...formData, ctype: Number(e) })}>
                                        <SelectTrigger id="cmd-ctype"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {CodeTypeItems.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="cmd-cformat">格式</FieldLabel>
                                    <Select items={CodeFormatItems} defaultValue="1" value={String(formData.cformat)} onValueChange={(e) => setFormData({ ...formData, cformat: Number(e) })}>
                                        <SelectTrigger id="cmd-cformat"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {CodeFormatItems.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="cmd-protocal">通信协议</FieldLabel>
                                    <Select items={CodeProtocalItems} defaultValue="1" value={String(formData.protocal)} onValueChange={(e) => setFormData({ ...formData, protocal: Number(e) })}>
                                        <SelectTrigger id="cmd-protocal"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {CodeProtocalItems.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="cmd-cport">端口</FieldLabel>
                                    <Input id="cmd-cport" type="number" value={formData.cport} placeholder="端口号" onChange={(e) => setFormData({ ...formData, cport: Number(e.target.value) })} />
                                </Field>
                            </div>
                            <Field>
                                <FieldLabel htmlFor="cmd-code">控制命令</FieldLabel>
                                <Textarea id="cmd-code" value={formData.code} placeholder="请输入控制命令，可为字符串也可以为16进制" onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="cmd-note">备注</FieldLabel>
                                <Textarea id="cmd-note" value={formData.note} placeholder="可选输入，备注" onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
                            </Field>
                        </FieldGroup>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>取消</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
