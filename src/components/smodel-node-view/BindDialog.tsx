import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    addHmodelBind,
    addSmodelBind,
    deleteHmodelBind,
    deleteSmodelBind,
    updateHmodelBind,
    updateSmodelBind,
} from "@/api/model";
import { getContentList, getControlList } from "@/api/exhibition";
import { getCodeList, getDeviceList } from "@/api/device";
import type { GraphBind, ModeVariant } from "./types";

interface Option {
    value: number;
    label: string;
}

export interface BindDialogProps {
    variant: ModeVariant;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: { id: number; name: string } | null;
    pavilion: { id: number; name: string } | null;
    /** null 表示「展厅级绑定」 */
    exhibit: { id: number; name: string } | null;
    /** 有值 = 编辑（仅延时），为空 = 新增 */
    editing: GraphBind | null;
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
 * 绑定编辑弹窗（软件模式 / 硬件模式共用）。
 *
 * 新增：软件模式 = 类型 → 内容/设备 → 命令 → 延时；
 *       硬件模式 = 设备 → 命令 → 延时（没有「类型」这一层）。
 * 编辑：只改延时。软件模式后端只接受 {id, delay}；硬件模式虽然支持全量 update，
 *       为保持两种模式一致，这里也统一只做延时。
 */
export function BindDialog({
    variant,
    open,
    onOpenChange,
    mode,
    pavilion,
    exhibit,
    editing,
    onChanged,
}: BindDialogProps) {
    const isSoftware = variant === "software";

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
            setType(editing.bindKind === "content" ? 1 : 2);
            setBindId(editing.raw?.bind?.id ?? editing.raw?.device?.id ?? null);
            setCodeId(editing.code?.id ?? null);
            setDelay(editing.delay ?? 0);
            setBindOptions([{ value: editing.raw?.bind?.id ?? editing.raw?.device?.id ?? 0, label: editing.bindName }]);
            setCodeOptions(editing.code ? [{ value: editing.code.id, label: editing.code.name }] : []);
        } else {
            reset();
        }
    }, [open, editing, reset]);

    /** 加载「绑定对象」候选 */
    const loadBindOptions = useCallback(async (nextType: number) => {
        setBindOptions([]);
        setCodeOptions([]);
        setBindId(null);
        setCodeId(null);

        const loadDevices = async (area: number, link?: number) => {
            try {
                const res = await getDeviceList({ area, link, page: 1, limit: 1000 });
                setBindOptions(normalizeList(res.data).map((d) => ({ value: d.id, label: d.name })));
            } catch {
                setBindOptions([]);
            }
        };

        if (!isSoftware) {
            // 硬件模式：直接选设备
            setLoadingBind(true);
            try {
                await loadDevices(exhibit ? 1 : 2, exhibit ? exhibit.id : pavilion?.id);
            } finally {
                setLoadingBind(false);
            }
            return;
        }

        // 软件模式
        if (!exhibit) {
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
                    await loadDevices(2, pavilion?.id);
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
                await loadDevices(1, exhibit.id);
            }
        } finally {
            setLoadingBind(false);
        }
    }, [isSoftware, exhibit, pavilion?.id]);

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
            if (isSoftware && type === 1) {
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
    }, [isSoftware, type, exhibit?.id]);

    const handleSave = async () => {
        if (!mode || !pavilion) {
            toast.error("缺少模式或展厅信息");
            return;
        }
        setSaving(true);
        try {
            if (isEdit && editing) {
                if (isSoftware) await updateSmodelBind({ id: editing.id, delay });
                else await updateHmodelBind({ id: editing.id, delay });
                toast.success("延时已更新");
            } else if (isSoftware) {
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
            } else {
                await addHmodelBind({
                    model: mode.id,
                    pavilion: pavilion.id,
                    exhibition: exhibit?.id ?? null,
                    device: bindId ?? 0,
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
            if (isSoftware) await deleteSmodelBind(editing.id);
            else await deleteHmodelBind(editing.id);
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-180">
                <DialogHeader>
                    <div className="flex flex-wrap items-center gap-2">
                        <DialogTitle>{title}</DialogTitle>
                        {mode && <Badge variant="outline">{mode.name}</Badge>}
                        <Badge variant="secondary">{isSoftware ? "软件模式" : "硬件模式"}</Badge>
                    </div>
                    <DialogDescription>{scopeLabel}</DialogDescription>
                </DialogHeader>

                <form className="w-full">
                    <FieldGroup>
                        {isEdit ? (
                            <>
                                {isSoftware && (
                                    <Field>
                                        <FieldLabel>绑定类型</FieldLabel>
                                        <div className="text-sm text-muted-foreground">
                                            {editing?.bindKind === "device" ? "绑定设备" : "绑定内容"}
                                        </div>
                                    </Field>
                                )}
                                <Field>
                                    <FieldLabel>{isSoftware ? "绑定对象" : "绑定设备"}</FieldLabel>
                                    <div className="text-sm text-muted-foreground">{editing?.bindName || "-"}</div>
                                </Field>
                                <Field>
                                    <FieldLabel>命令</FieldLabel>
                                    <div className="text-sm text-muted-foreground">
                                    {
                                        editing?.code? 
                                        <>
                                            <div className="w-full flex flex-row justify-between items-center">
                                                <span className="text-[13px]">{editing.code.name}</span>
                                                
                                            </div>
                                            <div className="w-full flex flex-row justify-start items-center gap-2 text-muted-foreground">
                                                <span>Port: {editing.code.port}</span>
                                                <Separator orientation="vertical"/>
                                                <span>{editing.code.format}</span>
                                                <Separator orientation="vertical"/>
                                                <span>{editing.code.protocal}</span>
                                            </div>
                                            <span>CODE: {editing.code.code}</span>
                                        </>    
                                        : 
                                            "未配置"
                                    }
                                    </div>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="bind-delay">延时（毫秒）</FieldLabel>
                                    <Input
                                        id="bind-delay"
                                        type="number"
                                        value={delay}
                                        onChange={(e) => setDelay(Number(e.target.value))}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        当前仅支持修改延时；要更换绑定对象请删除后重新新增。
                                    </p>
                                </Field>
                            </>
                        ) : (
                            <>
                                {isSoftware && (
                                    <Field>
                                        <FieldLabel htmlFor="bind-type">绑定类型</FieldLabel>
                                        <Select
                                            items={TYPE_ITEMS}
                                            value={String(type)}
                                            onValueChange={(v) => setType(Number(v))}
                                        >
                                            <SelectTrigger id="bind-type"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {TYPE_ITEMS.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                )}

                                <Field>
                                    <FieldLabel htmlFor="bind-target">{isSoftware ? "绑定对象" : "绑定设备"}</FieldLabel>
                                    <Select
                                        items={bindOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                                        value={bindId == null ? undefined : String(bindId)}
                                        onValueChange={onBindChange}
                                        disabled={loadingBind || bindOptions.length === 0}
                                    >
                                        <SelectTrigger id="bind-target">
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
                                            {isSoftware
                                                ? (type === 2 ? "该范围下没有可绑定的设备" : "该展项下没有内容")
                                                : "该范围下没有可绑定的设备"}
                                        </p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="bind-code">命令</FieldLabel>
                                    <Select
                                        items={codeOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                                        value={codeId == null ? undefined : String(codeId)}
                                        onValueChange={(v) => setCodeId(Number(v))}
                                        disabled={loadingCode || codeOptions.length === 0 || bindId == null}
                                    >
                                        <SelectTrigger id="bind-code">
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
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="bind-delay-new">延时（毫秒）</FieldLabel>
                                    <Input
                                        id="bind-delay-new"
                                        type="number"
                                        value={delay}
                                        onChange={(e) => setDelay(Number(e.target.value))}
                                    />
                                </Field>
                            </>
                        )}
                    </FieldGroup>
                </form>

                <DialogFooter>
                    {isEdit && (
                        <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                            <Trash2Icon className="mr-1 size-4" /> 删除
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "保存中..." : "保存"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
