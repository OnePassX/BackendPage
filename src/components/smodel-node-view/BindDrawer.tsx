import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { addSmodelBind, deleteSmodelBind, updateSmodelBind } from "@/api/model";
import { getContentList, getControlList } from "@/api/exhibition";
import { getCodeList, getDeviceList } from "@/api/device";
import type { SmodelBindRow } from "./types";

interface Option {
    value: number;
    label: string;
}

export interface BindDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: { id: number; name: string } | null;
    pavilion: { id: number; name: string } | null;
    /** null 表示「展厅级绑定」 */
    exhibit: { id: number; name: string } | null;
    /** 有值 = 编辑（仅延时），为空 = 新增 */
    editing: SmodelBindRow | null;
    onChanged: () => void;
}

const TYPE_ITEMS = [
    { value: "1", label: "绑定内容" },
    { value: "2", label: "绑定设备" },
];

function normalizeList(raw: unknown): any[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "items" in (raw as any)) {
        return (raw as { items: any[] }).items ?? [];
    }
    return [];
}

/**
 * 绑定编辑 Drawer。
 *
 * 新增：类型 → 绑定对象 → 命令 → 延时（联动逻辑与 smodel.tsx 表格视图一致）
 * 编辑：后端 /smodelbind/update 只接受 { id, delay }，所以这里只能改延时；
 *       要改绑定对象请删除后重新新增。
 */
export function BindDrawer({
    open,
    onOpenChange,
    mode,
    pavilion,
    exhibit,
    editing,
    onChanged,
}: BindDrawerProps) {
    const [type, setType] = useState(1);
    const [bindId, setBindId] = useState<number | null>(null);
    const [codeId, setCodeId] = useState<number | null>(null);
    const [delay, setDelay] = useState(0);

    const [bindOptions, setBindOptions] = useState<Option[]>([]);
    const [codeOptions, setCodeOptions] = useState<Option[]>([]);
    const [loadingBind, setLoadingBind] = useState(false);
    const [loadingCode, setLoadingCode] = useState(false);
    const [saving, setSaving] = useState(false);

    const isEdit = editing != null;
    const scopeLabel = exhibit ? `展项：${exhibit.name}` : `展厅级：${pavilion?.name ?? "-"}`;

    const reset = useCallback(() => {
        setType(1);
        setBindId(null);
        setCodeId(null);
        setDelay(0);
        setBindOptions([]);
        setCodeOptions([]);
    }, []);

    // 打开时初始化
    useEffect(() => {
        if (!open) return;
        if (editing) {
            setType(editing.type);
            setBindId(editing.bind?.id ?? null);
            setCodeId(editing.code?.id ?? null);
            setDelay(editing.delay ?? 0);
            setBindOptions(editing.bind ? [{ value: editing.bind.id, label: editing.bind.name }] : []);
            setCodeOptions(editing.code ? [{ value: editing.code.id, label: editing.code.name }] : []);
        } else {
            reset();
        }
    }, [open, editing, reset]);

    /** 按类型加载「绑定对象」候选 */
    const loadBindOptions = useCallback(async (nextType: number) => {
        setBindOptions([]);
        setCodeOptions([]);
        setBindId(null);
        setCodeId(null);
        if (!exhibit) {
            // 展厅级：内容固定为「全局内容绑定」，命令取 e_id=0 的控制命令
            if (nextType === 1) {
                setBindOptions([{ value: 0, label: "全局内容绑定" }]);
                setBindId(0);
                setLoadingCode(true);
                try {
                    const res = await getControlList({ e_id: 0, page: 1, limit: 1000 });
                    setCodeOptions(normalizeList(res.data).map((c) => ({ value: c.id, label: c.name })));
                } catch {
                    setCodeOptions([]);
                } finally {
                    setLoadingCode(false);
                }
            } else {
                setLoadingBind(true);
                try {
                    const res = await getDeviceList({ area: 2, link: pavilion?.id, page: 1, limit: 1000 });
                    setBindOptions(normalizeList(res.data).map((d) => ({ value: d.id, label: d.name })));
                } catch {
                    setBindOptions([]);
                } finally {
                    setLoadingBind(false);
                }
            }
            return;
        }

        setLoadingBind(true);
        try {
            if (nextType === 1) {
                const res = await getContentList({ e_id: exhibit.id, page: 1, limit: 1000 });
                setBindOptions(normalizeList(res.data).map((c) => ({ value: c.id, label: c.c_name })));
            } else {
                const res = await getDeviceList({ area: 1, link: exhibit.id, page: 1, limit: 1000 });
                setBindOptions(normalizeList(res.data).map((d) => ({ value: d.id, label: d.name })));
            }
        } catch {
            setBindOptions([]);
        } finally {
            setLoadingBind(false);
        }
    }, [exhibit, pavilion?.id]);

    // 新增时，类型变化 / 打开时加载候选
    useEffect(() => {
        if (!open || isEdit) return;
        void loadBindOptions(type);
    }, [open, isEdit, type, loadBindOptions]);

    /** 选中绑定对象后加载命令候选 */
    const onBindChange = useCallback(async (value: string) => {
        const id = Number(value);
        setBindId(id);
        setCodeId(null);
        setCodeOptions([]);
        setLoadingCode(true);
        try {
            if (type === 1) {
                const res = await getControlList({ e_id: exhibit?.id ?? 0, page: 1, limit: 1000 });
                setCodeOptions(normalizeList(res.data).map((c) => ({ value: c.id, label: c.name })));
            } else {
                const res = await getCodeList({ device: id, page: 1, limit: 1000 });
                setCodeOptions(normalizeList(res.data).map((c) => ({ value: c.id, label: c.name })));
            }
        } catch {
            setCodeOptions([]);
        } finally {
            setLoadingCode(false);
        }
    }, [type, exhibit?.id]);

    const handleSave = async () => {
        if (!mode || !pavilion) {
            toast.error("缺少模式或展厅信息");
            return;
        }
        setSaving(true);
        try {
            if (isEdit && editing) {
                await updateSmodelBind({ id: editing.id, delay });
                toast.success("延时已更新");
            } else {
                await addSmodelBind({
                    model: mode.id,
                    pavilion: pavilion.id,
                    exhibition: exhibit?.id ?? null,
                    type,
                    bind: bindId ?? 0,
                    code: codeId ?? 0,
                    delay,
                });
                toast.success("绑定已新增");
            }
            onOpenChange(false);
            onChanged();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            await deleteSmodelBind(editing.id);
            toast.success("已删除");
            onOpenChange(false);
            onChanged();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        } finally {
            setSaving(false);
        }
    };

    const title = useMemo(() => (isEdit ? "编辑绑定" : "新增绑定"), [isEdit]);

    return (
        <Drawer disablePointerDismissal={true} open={open} onOpenChange={onOpenChange} swipeDirection="right">
            <DrawerPortal>
                <DrawerOverlay />
                <DrawerContent className="h-full w-full max-w-md">
                    <DrawerHeader>
                        <div className="flex items-center gap-2">
                            <DrawerTitle>{title}</DrawerTitle>
                            {mode && <Badge variant="outline">{mode.name}</Badge>}
                        </div>
                        <DrawerDescription>{scopeLabel}</DrawerDescription>
                    </DrawerHeader>

                    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-2">
                        {isEdit ? (
                            <>
                                <div className="space-y-1">
                                    <Label>绑定类型</Label>
                                    <div className="text-sm text-muted-foreground">
                                        {editing?.type === 2 ? "绑定设备" : "绑定内容"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>绑定对象</Label>
                                    <div className="text-sm text-muted-foreground">{editing?.bind?.name || "-"}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label>命令</Label>
                                    <div className="text-sm text-muted-foreground">
                                        {editing?.code ? `${editing.code.name} · ${editing.code.protocal}/${editing.code.port}` : "未配置"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="bind-delay">延时（毫秒）</Label>
                                    <Input
                                        id="bind-delay"
                                        type="number"
                                        value={delay}
                                        onChange={(e) => setDelay(Number(e.target.value))}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        后端仅支持修改延时；要更换绑定对象请删除后重新新增。
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <Label>绑定类型</Label>
                                    <Select
                                        items={TYPE_ITEMS}
                                        value={String(type)}
                                        onValueChange={(v) => setType(Number(v))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {TYPE_ITEMS.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label>绑定对象</Label>
                                    <Select
                                        items={bindOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                                        value={bindId == null ? undefined : String(bindId)}
                                        onValueChange={onBindChange}
                                        disabled={loadingBind || bindOptions.length === 0}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingBind ? "加载中..." : "请选择绑定对象"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bindOptions.map((o) => (
                                                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!loadingBind && bindOptions.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {type === 2 ? "该范围下没有可绑定的设备" : "该展项下没有内容"}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <Label>命令</Label>
                                    <Select
                                        items={codeOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                                        value={codeId == null ? undefined : String(codeId)}
                                        onValueChange={(v) => setCodeId(Number(v))}
                                        disabled={loadingCode || codeOptions.length === 0 || bindId == null}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingCode ? "加载中..." : "请选择命令"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {codeOptions.map((o) => (
                                                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!loadingCode && bindId != null && codeOptions.length === 0 && (
                                        <p className="text-xs text-muted-foreground">该绑定对象下没有命令，可先不配置</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="bind-delay-new">延时（毫秒）</Label>
                                    <Input
                                        id="bind-delay-new"
                                        type="number"
                                        value={delay}
                                        onChange={(e) => setDelay(Number(e.target.value))}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DrawerFooter className="flex flex-row gap-2">
                        {isEdit && (
                            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                                <Trash2Icon className="mr-1 size-4" /> 删除
                            </Button>
                        )}
                        <DrawerClose render={
                            <Button variant="outline" className="flex-1" disabled={saving}>取消</Button>
                        }>
                        </DrawerClose>
                        <Button className="flex-1" onClick={handleSave} disabled={saving}>
                            {saving ? "保存中..." : "保存"}
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </DrawerPortal>
        </Drawer>
    );
}
