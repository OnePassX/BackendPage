import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getControlList } from "@/api/exhibition";
import { getCodeList } from "@/api/device";
import { EntityDialog } from "./EntityDialog";
import { ShowItems } from "./options";

/**
 * 内容控制（c_control）按钮节点的添加/编辑弹窗。
 *
 * 数据结构（见 docs/json/c_control.json）：
 * {
 *   label, show, sort, children: [],
 *   content_code: [{ id,label,name,format,protocal,ip,port,code,delay }],
 *   device_code:  [{ ...同上 }]
 * }
 *
 * - 添加：在指定层级追加节点
 * - 编辑：修改名称/显示/排序，并增删该按钮绑定的内容指令、设备指令
 */

interface CodeSnapshot {
    id: number;
    label: string;
    name: string;
    format: number;
    protocal: number;
    ip: string;
    port: number;
    code: string;
    delay: number;
}

interface Option {
    value: string;
    label: string;
}

export interface ControlNode {
    label: string;
    show: boolean;
    sort: number;
    children?: ControlNode[];
    content_code?: CodeSnapshot[];
    device_code?: CodeSnapshot[];
}

export interface ControlNodeFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "add" | "edit";
    /** 1~5 级（e_link 固定 1 级） */
    level: number;
    node: ControlNode | null;
    exhibitId: number | null;
    /** 当前展项下的设备（用于选择设备指令） */
    devices: Array<{ id: number; name: string; ip?: string }>;
    onSave: (node: ControlNode) => void;
    /** c_control：内容控制按钮（含内容指令/子级）；e_link：展项快捷控制（仅设备指令） */
    variant?: "c_control" | "e_link";
}

const idOf = (v: unknown): number => (v && typeof v === "object" ? (v as { id: number }).id : Number(v ?? 0));

const normalizeList = (raw: unknown): any[] => (Array.isArray(raw) ? raw : ((raw as any)?.items ?? []));

export function ControlNodeForm({
    open,
    onOpenChange,
    mode,
    level,
    node,
    exhibitId,
    devices,
    onSave,
    variant = "c_control",
}: ControlNodeFormProps) {
    const isLink = variant === "e_link";
    const [label, setLabel] = useState("");
    const [show, setShow] = useState(1);
    const [sort, setSort] = useState(1);
    const [contentCodes, setContentCodes] = useState<CodeSnapshot[]>([]);
    const [deviceCodes, setDeviceCodes] = useState<CodeSnapshot[]>([]);

    // 可选的内容指令 / 设备指令
    const [contentOptions, setContentOptions] = useState<Option[]>([]);
    const [deviceId, setDeviceId] = useState<string>("");
    const [deviceOptions, setDeviceOptions] = useState<Option[]>([]);
    const [pickedContent, setPickedContent] = useState<string>("");
    const [pickedDevice, setPickedDevice] = useState<string>("");

    // 打开时初始化
    useEffect(() => {
        if (!open) return;
        setLabel(node?.label ?? "");
        setShow(node?.show === false ? 2 : 1);
        setSort(node?.sort ?? 1);
        setContentCodes(node?.content_code ? [...node.content_code] : []);
        setDeviceCodes(node?.device_code ? [...node.device_code] : []);
        setPickedContent("");
        setPickedDevice("");
        setDeviceId("");
        setDeviceOptions([]);
    }, [open, node]);

    // 内容指令候选
    useEffect(() => {
        if (!open || exhibitId == null) return;
        getControlList({ e_id: exhibitId, page: 1, limit: 1000 })
            .then((res: any) => {
                setContentOptions(
                    normalizeList(res?.data).map((c: any) => ({ value: String(c.id), label: c.name })),
                );
            })
            .catch(() => setContentOptions([]));
    }, [open, exhibitId]);

    const loadDeviceCodes = useCallback(async (id: string) => {
        if (!id) {
            setDeviceOptions([]);
            return;
        }
        try {
            const res = await getCodeList({ device: Number(id), page: 1, limit: 1000 });
            setDeviceOptions(
                normalizeList(res?.data).map((c: any) => ({ value: String(c.id), label: c.name })),
            );
        } catch {
            setDeviceOptions([]);
        }
    }, []);

    // 选择设备后加载该设备的命令
    useEffect(() => {
        void loadDeviceCodes(deviceId);
    }, [deviceId, loadDeviceCodes]);

    const addContentCode = () => {
        const id = Number(pickedContent);
        if (!id) return void toast.error("请选择内容指令");
        if (contentCodes.some((c) => c.id === id)) return void toast.error("该指令已添加");
        getControlList({ e_id: exhibitId ?? 0, page: 1, limit: 1000 })
            .then((res: any) => {
                const found = normalizeList(res?.data).find((c: any) => c.id === id);
                if (!found) return void toast.error("未找到该指令");
                setContentCodes((prev) => [
                    ...prev,
                    {
                        id: found.id,
                        label: "指令解释？",
                        name: found.name,
                        format: idOf(found.cformat),
                        protocal: idOf(found.protocal),
                        ip: found.ip ?? "",
                        port: found.port ?? 0,
                        code: found.code ?? "",
                        delay: 0,
                    },
                ]);
                setPickedContent("");
            })
            .catch(() => toast.error("添加失败"));
    };

    const addDeviceCode = async () => {
        const id = Number(pickedDevice);
        if (!id) return void toast.error("请选择设备指令");
        if (deviceCodes.some((c) => c.id === id)) return void toast.error("该指令已添加");
        const device = devices.find((d) => String(d.id) === deviceId);
        try {
            const res = await getCodeList({ device: Number(deviceId), page: 1, limit: 1000 });
            const found = normalizeList(res?.data).find((c: any) => c.id === id);
            if (!found) return void toast.error("未找到该指令");
            setDeviceCodes((prev) => [
                ...prev,
                {
                    id: found.id,
                    label: "指令解释？",
                    name: found.name,
                    format: idOf(found.cformat),
                    protocal: idOf(found.protocal),
                    ip: device?.ip ?? "",
                    port: found.cport ?? 0,
                    code: found.code ?? "",
                    delay: 0,
                },
            ]);
            setPickedDevice("");
        } catch {
            toast.error("添加失败");
        }
    };

    const submit = () => {
        if (!label.trim()) return void toast.error("请填写按钮名称");
        const base = {
            label: label.trim(),
            show: show === 1,
            sort,
            device_code: deviceCodes,
        };
        onSave(
            isLink
                ? base
                : { ...base, children: node?.children ?? [], content_code: contentCodes },
        );
        onOpenChange(false);
    };

    return (
        <EntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title={`${mode === "add" ? "添加" : "编辑"}${isLink ? "快捷控制按钮" : `控制按钮（第 ${level} 级）`}`}
            saving={false}
            onSubmit={submit}
        >
            <div className="grid grid-cols-3 gap-4">
                <Field className="col-span-1">
                    <FieldLabel htmlFor="qcn_label" aria-required>按钮名称</FieldLabel>
                    <Input id="qcn_label" value={label} placeholder="如：待机" onChange={(e) => setLabel(e.target.value)} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qcn_show">显示</FieldLabel>
                    <Select items={ShowItems} value={String(show)} onValueChange={(v) => setShow(Number(v))}>
                        <SelectTrigger id="qcn_show"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{ShowItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qcn_sort">排序</FieldLabel>
                    <Input id="qcn_sort" type="number" value={sort} onChange={(e) => setSort(Number(e.target.value))} />
                </Field>
            </div>

            {/* 内容指令（仅 c_control） */}
            {!isLink && (
            <Field>
                <FieldLabel>内容指令（content_code）</FieldLabel>
                <div className="flex items-center gap-2">
                    <Select items={contentOptions} value={pickedContent || undefined} onValueChange={setPickedContent}>
                        <SelectTrigger><SelectValue placeholder="选择内容控制指令" /></SelectTrigger>
                        <SelectContent><SelectGroup>{contentOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={addContentCode}>添加</Button>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                    {contentCodes.length === 0 && <span className="text-xs text-muted-foreground">未绑定内容指令</span>}
                    {contentCodes.map((c, i) => (
                        <div key={`${c.id}-${i}`} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                            <span className="min-w-0 flex-1 truncate">{c.name} · {c.protocal}/{c.port}</span>
                            <Input
                                className="h-7 w-32"
                                value={c.label}
                                placeholder="指令解释"
                                onChange={(e) => setContentCodes((prev) => prev.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                            />
                            <Input
                                className="h-7 w-16"
                                type="number"
                                value={c.delay}
                                title="延时(ms)"
                                onChange={(e) => setContentCodes((prev) => prev.map((x, k) => (k === i ? { ...x, delay: Number(e.target.value) } : x)))}
                            />
                            <Button type="button" size="icon" variant="ghost" onClick={() => setContentCodes((prev) => prev.filter((_, k) => k !== i))}><Trash2Icon className="size-4 text-destructive" /></Button>
                        </div>
                    ))}
                </div>
            </Field>
            )}

            {/* 设备指令 */}
            <Field>
                <FieldLabel>设备指令（device_code）</FieldLabel>
                <div className="flex items-center gap-2">
                    <Select
                        items={devices.map((d) => ({ value: String(d.id), label: d.name }))}
                        value={deviceId || undefined}
                        onValueChange={(v) => { setDeviceId(v); setPickedDevice(""); }}
                    >
                        <SelectTrigger><SelectValue placeholder="选择设备" /></SelectTrigger>
                        <SelectContent><SelectGroup>{devices.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                    <Select items={deviceOptions} value={pickedDevice || undefined} onValueChange={setPickedDevice} disabled={!deviceId}>
                        <SelectTrigger><SelectValue placeholder="选择设备命令" /></SelectTrigger>
                        <SelectContent><SelectGroup>{deviceOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={addDeviceCode}>添加</Button>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                    {deviceCodes.length === 0 && <span className="text-xs text-muted-foreground">未绑定设备指令</span>}
                    {deviceCodes.map((c, i) => (
                        <div key={`${c.id}-${i}`} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                            <span className="min-w-0 flex-1 truncate">{c.name} · {c.ip}:{c.port}</span>
                            <Input
                                className="h-7 w-32"
                                value={c.label}
                                placeholder="指令解释"
                                onChange={(e) => setDeviceCodes((prev) => prev.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                            />
                            <Input
                                className="h-7 w-16"
                                type="number"
                                value={c.delay}
                                title="延时(ms)"
                                onChange={(e) => setDeviceCodes((prev) => prev.map((x, k) => (k === i ? { ...x, delay: Number(e.target.value) } : x)))}
                            />
                            <Button type="button" size="icon" variant="ghost" onClick={() => setDeviceCodes((prev) => prev.filter((_, k) => k !== i))}><Trash2Icon className="size-4 text-destructive" /></Button>
                        </div>
                    ))}
                </div>
            </Field>
        </EntityDialog>
    );
}
