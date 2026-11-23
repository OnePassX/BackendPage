import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/upload-file";
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
} from "@/components/ui/combobox";
import { HiPlusSm, HiOutlineMinusSm, HiOutlineVolumeOff, HiOutlineVolumeUp } from "react-icons/hi";
import { PanelBottomOpen, PanelTopOpen } from "lucide-react";
import {
    addContent,
    addControl,
    addExhibit,
    addMachine,
    addPavilion,
    updateContent,
    updateControl,
    updateExhibit,
    updateMachine,
    updatePavilion,
} from "@/api/exhibition";
import { addCode, addDevice, updateCode, updateDevice } from "@/api/device";
import { addHmodel, addSmodel, updateHmodel, updateSmodel } from "@/api/model";
import { getIconList } from "@/api/icon";
import { EntityDialog } from "./EntityDialog";
import {
    AreaItems,
    CodeFormatItems,
    CodeProtocalItems,
    CodeTypeItems,
    DeviceTypeItems,
    FileStatusItems,
    FileTypeItems,
    PROBE_ENABLED_DTYPES,
    ProbeItems,
    ShowItems,
    StatusItems,
} from "./options";

/**
 * 展项「基础功能显示」（e_base）的可选按钮。
 * 取值与 `src/app/exhibition/pme.tsx` 的 BaseBtnItems 一致，保存时用 `_` 连接（如 1_2_3_4_5_6）。
 */
const BaseBtnItems = [
    { value: "1", label: "音量加", icon: <HiPlusSm size={16} /> },
    { value: "2", label: "音量减", icon: <HiOutlineMinusSm size={16} /> },
    { value: "3", label: "静音", icon: <HiOutlineVolumeOff size={16} /> },
    { value: "4", label: "取消静音", icon: <HiOutlineVolumeUp size={16} /> },
    { value: "5", label: "窗口打开", icon: <PanelBottomOpen size={16} /> },
    { value: "6", label: "窗口关闭", icon: <PanelTopOpen size={16} /> },
];

/** 各表单共用：保存态 + 错误提示 */
function useSaving() {
    const [saving, setSaving] = useState(false);
    const run = async (fn: () => Promise<void>) => {
        setSaving(true);
        try {
            await fn();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "操作失败");
        } finally {
            setSaving(false);
        }
    };
    return { saving, run };
}

// ─────────────────────────── 展馆 ───────────────────────────

export interface PavilionRow {
    id: number;
    p_name?: string;
    name?: string;
    p_summary?: string;
    p_re?: string;
    show?: number;
    sort?: number;
}

const emptyPavilion = { p_name: "", p_summary: "", p_re: "", show: 1, sort: 0 };

export function PavilionForm({
    open,
    onOpenChange,
    editing,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: PavilionRow | null;
    onSaved: () => void;
}) {
    const [form, setForm] = useState(emptyPavilion);
    const { saving, run } = useSaving();

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                p_name: editing.p_name ?? editing.name ?? "",
                p_summary: editing.p_summary ?? "",
                p_re: editing.p_re ?? "",
                show: editing.show ?? 1,
                sort: editing.sort ?? 0,
            });
        } else {
            setForm(emptyPavilion);
        }
    }, [open, editing]);

    const submit = () => {
        if (!form.p_name.trim()) return void toast.error("请填写展馆名称");
        void run(async () => {
            if (editing) await updatePavilion({ id: editing.id, ...form });
            else await addPavilion(form);
            toast.success(editing ? "展馆已更新" : "展馆已创建");
            onOpenChange(false);
            onSaved();
        });
    };

    return (
        <EntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? "编辑展馆" : "新增展馆"}
            saving={saving}
            onSubmit={submit}
        >
            <Field>
                <FieldLabel htmlFor="qp_name" aria-required>展馆名称</FieldLabel>
                <Input id="qp_name" value={form.p_name} placeholder="请输入展馆名称" onChange={(e) => setForm({ ...form, p_name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qp_show">显示状态</FieldLabel>
                    <Select items={ShowItems} value={String(form.show)} onValueChange={(v) => setForm({ ...form, show: Number(v) })}>
                        <SelectTrigger id="qp_show"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{ShowItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qp_sort">排序</FieldLabel>
                    <Input id="qp_sort" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
                </Field>
            </div>
            <Field>
                <FieldLabel htmlFor="qp_summary">简介</FieldLabel>
                <Input id="qp_summary" value={form.p_summary} placeholder="展馆简介" onChange={(e) => setForm({ ...form, p_summary: e.target.value })} />
            </Field>
            <Field>
                <FieldLabel htmlFor="qp_re">备注</FieldLabel>
                <Textarea id="qp_re" value={form.p_re} placeholder="可选备注" onChange={(e) => setForm({ ...form, p_re: e.target.value })} />
            </Field>
        </EntityDialog>
    );
}

// ─────────────────────────── 展区 ───────────────────────────

export interface MachineRow {
    id: number;
    m_name?: string;
    name?: string;
    m_p?: { id: number } | number | null;
    m_summary?: string;
    m_re?: string;
    show?: number;
    sort?: number;
}

const emptyMachine = { m_name: "", m_p: null as number | null, m_summary: "", m_re: "", show: 1, sort: 0 };

export function MachineForm({
    open,
    onOpenChange,
    editing,
    pavilions,
    defaultPavilionId,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: MachineRow | null;
    pavilions: Array<{ id: number; name: string }>;
    defaultPavilionId?: number | null;
    onSaved: () => void;
}) {
    const [form, setForm] = useState(emptyMachine);
    const { saving, run } = useSaving();

    useEffect(() => {
        if (!open) return;
        if (editing) {
            const parent = editing.m_p;
            setForm({
                m_name: editing.m_name ?? editing.name ?? "",
                m_p: parent == null ? null : typeof parent === "number" ? parent : parent.id,
                m_summary: editing.m_summary ?? "",
                m_re: editing.m_re ?? "",
                show: editing.show ?? 1,
                sort: editing.sort ?? 0,
            });
        } else {
            setForm({ ...emptyMachine, m_p: defaultPavilionId ?? null });
        }
    }, [open, editing, defaultPavilionId]);

    const submit = () => {
        if (!form.m_name.trim()) return void toast.error("请填写展区名称");
        if (form.m_p == null) return void toast.error("请选择所属展馆");
        void run(async () => {
            if (editing) await updateMachine({ id: editing.id, ...form });
            else await addMachine(form);
            toast.success(editing ? "展区已更新" : "展区已创建");
            onOpenChange(false);
            onSaved();
        });
    };

    return (
        <EntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? "编辑展区" : "新增展区"}
            saving={saving}
            onSubmit={submit}
        >
            <Field>
                <FieldLabel htmlFor="qm_name" aria-required>展区名称</FieldLabel>
                <Input id="qm_name" value={form.m_name} placeholder="请输入展区名称" onChange={(e) => setForm({ ...form, m_name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qm_p" aria-required>所属展馆</FieldLabel>
                    <Select
                        items={pavilions.map((p) => ({ value: String(p.id), label: p.name }))}
                        value={form.m_p == null ? undefined : String(form.m_p)}
                        onValueChange={(v) => setForm({ ...form, m_p: Number(v) })}
                    >
                        <SelectTrigger id="qm_p"><SelectValue placeholder="请选择展馆" /></SelectTrigger>
                        <SelectContent><SelectGroup>{pavilions.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qm_sort">排序</FieldLabel>
                    <Input id="qm_sort" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qm_show">显示状态</FieldLabel>
                    <Select items={ShowItems} value={String(form.show)} onValueChange={(v) => setForm({ ...form, show: Number(v) })}>
                        <SelectTrigger id="qm_show"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{ShowItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qm_summary">简介</FieldLabel>
                    <Input id="qm_summary" value={form.m_summary} placeholder="展区简介" onChange={(e) => setForm({ ...form, m_summary: e.target.value })} />
                </Field>
            </div>
            <Field>
                <FieldLabel htmlFor="qm_re">备注</FieldLabel>
                <Textarea id="qm_re" value={form.m_re} placeholder="可选备注" onChange={(e) => setForm({ ...form, m_re: e.target.value })} />
            </Field>
        </EntityDialog>
    );
}

// ─────────────────────────── 展项 ───────────────────────────

export interface ExhibitRow {
    id: number;
    e_name?: string;
    name?: string;
    e_ip?: string;
    ip?: string;
    e_summary?: string;
    e_re?: string;
    note?: string;
    mac?: string;
    /** 基础功能显示：下划线连接的按钮 id，如 "1_2_3_4_5_6" */
    e_base?: string;
    show?: number;
    sort?: number;
}

const emptyExhibit = { e_name: "", e_m: null as number | null, e_ip: "", e_summary: "", e_re: "", mac: "00-00-00-00-00-00", e_base: "1_2_3_4_5_6", show: 1, sort: 0 };

export function ExhibitForm({
    open,
    onOpenChange,
    editing,
    machineId,
    machineName,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: ExhibitRow | null;
    machineId: number | null;
    machineName?: string;
    onSaved: () => void;
}) {
    const [form, setForm] = useState(emptyExhibit);
    const { saving, run } = useSaving();

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                e_name: editing.e_name ?? editing.name ?? "",
                e_m: machineId ?? null,
                e_ip: editing.e_ip ?? editing.ip ?? "",
                e_summary: editing.e_summary ?? "",
                e_re: editing.e_re ?? editing.note ?? "",
                mac: editing.mac ?? "00-00-00-00-00-00",
                e_base: editing.e_base ?? "1_2_3_4_5_6",
                show: editing.show ?? 1,
                sort: editing.sort ?? 0,
            });
        } else {
            setForm({ ...emptyExhibit, e_m: machineId ?? null });
        }
    }, [open, editing, machineId]);

    const submit = () => {
        if (!form.e_name.trim()) return void toast.error("请填写展项名称");
        if (form.e_m == null) return void toast.error("缺少所属展区");
        void run(async () => {
            if (editing) await updateExhibit({ id: editing.id, ...form });
            else await addExhibit(form);
            toast.success(editing ? "展项已更新" : "展项已创建");
            onOpenChange(false);
            onSaved();
        });
    };

    return (
        <EntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? "编辑展项" : "新增展项"}
            description={machineName ? `所属展区：${machineName}` : undefined}
            saving={saving}
            onSubmit={submit}
        >
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qe_name" aria-required>展项名称</FieldLabel>
                    <Input id="qe_name" value={form.e_name} placeholder="请输入展项名称" onChange={(e) => setForm({ ...form, e_name: e.target.value })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qe_ip">展项 IP</FieldLabel>
                    <Input id="qe_ip" value={form.e_ip} placeholder="192.168.1.100" onChange={(e) => setForm({ ...form, e_ip: e.target.value })} />
                </Field>
            </div>
            {!editing && (
                <Field>
                    <FieldLabel htmlFor="qe_mac">MAC 地址</FieldLabel>
                    <Input id="qe_mac" value={form.mac} onChange={(e) => setForm({ ...form, mac: e.target.value })} />
                </Field>
            )}
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qe_show">显示状态</FieldLabel>
                    <Select items={ShowItems} value={String(form.show)} onValueChange={(v) => setForm({ ...form, show: Number(v) })}>
                        <SelectTrigger id="qe_show"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{ShowItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qe_sort">排序</FieldLabel>
                    <Input id="qe_sort" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
                </Field>
            </div>
            <Field>
                <FieldLabel>基础功能显示</FieldLabel>
                <Combobox
                    items={BaseBtnItems}
                    multiple
                    value={form.e_base ? form.e_base.split("_") : []}
                    onValueChange={(e) => setForm({ ...form, e_base: e.join("_") })}
                >
                    <ComboboxChips>
                        <ComboboxValue>
                            {form.e_base && form.e_base.split("_").map((item) => (
                                <ComboboxChip key={item}>
                                    {BaseBtnItems.filter((e) => e.value == item)[0]?.icon}
                                </ComboboxChip>
                            ))}
                        </ComboboxValue>
                        <ComboboxChipsInput placeholder="添加基础按钮" />
                    </ComboboxChips>
                    <ComboboxContent>
                        <ComboboxEmpty>未找到项目。</ComboboxEmpty>
                        <ComboboxList>
                            {(item: any) => (
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
                <FieldLabel htmlFor="qe_summary">简介</FieldLabel>
                <Input id="qe_summary" value={form.e_summary} placeholder="展项简介" onChange={(e) => setForm({ ...form, e_summary: e.target.value })} />
            </Field>
            <Field>
                <FieldLabel htmlFor="qe_re">备注</FieldLabel>
                <Textarea id="qe_re" value={form.e_re} placeholder="可选备注" onChange={(e) => setForm({ ...form, e_re: e.target.value })} />
            </Field>
        </EntityDialog>
    );
}

// ─────────────────────────── 内容 ───────────────────────────

export interface ContentRow {
    id: number;
    c_name?: string;
    name?: string;
    c_file_status?: { id: number } | number;
    c_file_type?: { id: number } | number;
    c_file_name?: string;
    c_file_addr?: string;
    c_open?: string;
    c_status?: number;
    c_default?: number;
    c_startup?: number;
    c_control?: string;
    c_iframe?: string;
    c_iframe_show?: number;
    c_link?: string;
    note?: string;
    sort?: number;
}

const emptyContent = {
    c_name: "", c_file_status: 1, c_file_type: 1, c_file_name: "", c_file_addr: "",
    c_open: "", c_status: 1, c_default: 2, c_startup: 2, c_control: "", c_iframe: "",
    c_iframe_show: 2, c_link: "", note: "", sort: 1,
};

const idOf = (v: unknown): number => (v && typeof v === "object" ? (v as { id: number }).id : Number(v ?? 0));

export function ContentForm({
    open,
    onOpenChange,
    editing,
    exhibitId,
    exhibitName,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: ContentRow | null;
    exhibitId: number | null;
    exhibitName?: string;
    onSaved: () => void;
}) {
    const [form, setForm] = useState(emptyContent);
    const [uploading, setUploading] = useState(false);
    const { saving, run } = useSaving();

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                c_name: editing.c_name ?? editing.name ?? "",
                c_file_status: idOf(editing.c_file_status) || 1,
                c_file_type: idOf(editing.c_file_type) || 1,
                c_file_name: editing.c_file_name ?? "",
                c_file_addr: editing.c_file_addr ?? "",
                c_open: editing.c_open ?? "",
                c_status: editing.c_status ?? 1,
                c_default: editing.c_default ?? 2,
                c_startup: editing.c_startup ?? 2,
                c_control: editing.c_control ?? "",
                c_iframe: editing.c_iframe ?? "",
                c_iframe_show: editing.c_iframe_show ?? 2,
                c_link: editing.c_link ?? "",
                note: editing.note ?? "",
                sort: editing.sort ?? 1,
            });
        } else {
            setForm(emptyContent);
        }
    }, [open, editing]);

    const isServerStorage = form.c_file_status === 1;
    const isUploadableType = [1, 2, 3, 4, 6].includes(form.c_file_type);

    const submit = () => {
        if (!form.c_name.trim()) return void toast.error("请填写内容名称");
        if (exhibitId == null) return void toast.error("缺少所属展项");
        void run(async () => {
            if (editing) await updateContent({ id: editing.id, ...form, e_id: exhibitId });
            else await addContent({ ...form, e_id: exhibitId });
            toast.success(editing ? "内容已更新" : "内容已创建");
            onOpenChange(false);
            onSaved();
        });
    };

    return (
        <EntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? "编辑内容" : "新增内容"}
            description={exhibitName ? `所属展项：${exhibitName}` : undefined}
            saving={saving || uploading}
            onSubmit={submit}
        >
            <Field>
                <FieldLabel htmlFor="qc_name" aria-required>名称</FieldLabel>
                <Input id="qc_name" value={form.c_name} placeholder="内容名称" onChange={(e) => setForm({ ...form, c_name: e.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qc_status">存储位置</FieldLabel>
                    <Select
                        items={FileStatusItems}
                        value={String(form.c_file_status)}
                        onValueChange={(v) => {
                            const next = Number(v);
                            setForm({ ...form, c_file_status: next, c_status: next === 1 ? 1 : 2 });
                        }}
                        disabled={Boolean(editing)}
                    >
                        <SelectTrigger id="qc_status"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{FileStatusItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qc_type">文件类型</FieldLabel>
                    <Select items={FileTypeItems} value={String(form.c_file_type)} onValueChange={(v) => setForm({ ...form, c_file_type: Number(v) })} disabled={Boolean(editing)}>
                        <SelectTrigger id="qc_type"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{FileTypeItems.map((i) => <SelectItem key={i.value} value={i.value} disabled={isServerStorage && i.value === "5"}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
            </div>

            {isServerStorage && isUploadableType && (
                <Field>
                    <FieldLabel htmlFor="qc_file">上传文件</FieldLabel>
                    <FileUpload
                        accept=".jpg,.png,.jpeg,.pdf,.mp4,.zip,.pptx"
                        maxSize={5 * 1024 * 1024 * 1024}
                        value={form.c_file_addr}
                        fileName={form.c_file_name}
                        onUploaded={({ name, url }) => setForm((prev) => ({ ...prev, c_file_name: name, c_file_addr: url }))}
                        onClear={() => setForm((prev) => ({ ...prev, c_file_name: "", c_file_addr: "" }))}
                        onUploadingChange={setUploading}
                    />
                </Field>
            )}

            {!isServerStorage && (
                <>
                    <Field>
                        <FieldLabel htmlFor="qc_addr">文件地址</FieldLabel>
                        <Input id="qc_addr" value={form.c_file_addr} placeholder="目标电脑完整路径，如 D:/软件/demo.exe" onChange={(e) => setForm({ ...form, c_file_addr: e.target.value })} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="qc_fname">文件名称</FieldLabel>
                        <Input id="qc_fname" value={form.c_file_name} placeholder="带后缀，如 demo.exe" onChange={(e) => setForm({ ...form, c_file_name: e.target.value })} />
                    </Field>
                </>
            )}

            {form.c_file_type === 1 && isServerStorage && (
                <Field>
                    <FieldLabel htmlFor="qc_open">程序名（带后缀）</FieldLabel>
                    <Input id="qc_open" value={form.c_open} placeholder="ZIP 目录中的 exe，如 demo.exe" onChange={(e) => setForm({ ...form, c_open: e.target.value })} />
                </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qc_control">控制 JSON</FieldLabel>
                    <Textarea className="max-h-40" id="qc_control" value={form.c_control} placeholder="可选，内容控制流程 JSON" onChange={(e) => setForm({ ...form, c_control: e.target.value })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qc_iframe">控制页面</FieldLabel>
                    <Input id="qc_iframe" value={form.c_iframe} placeholder="可选，iframe 地址" onChange={(e) => setForm({ ...form, c_iframe: e.target.value })} />
                </Field>
            </div>

            <Field>
                <FieldLabel htmlFor="qc_note">备注</FieldLabel>
                <Textarea id="qc_note" value={form.note} placeholder="可选备注" onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>

            <Field>
                <FieldLabel htmlFor="qc_sort">排序</FieldLabel>
                <Input id="qc_sort" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
            </Field>
        </EntityDialog>
    );
}

// ─────────────────────────── 设备 ───────────────────────────

export interface DeviceRow {
    id: number;
    num?: string;
    name?: string;
    dtype?: { id: number } | number;
    ip?: string;
    conpare?: string;
    area?: number;
    link?: number | null;
    other?: string;
    major?: boolean;
    probe_enabled?: boolean;
    sort?: number;
}

const emptyDevice = { num: "无", name: "", dtype: 1, ip: "", conpare: "", area: 1, link: null as number | null, other: "", major: false, probe_enabled: false, sort: 0 };

export function DeviceForm({
    open,
    onOpenChange,
    editing,
    exhibitId,
    machineId,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: DeviceRow | null;
    exhibitId: number | null;
    machineId: number | null;
    onSaved: () => void;
}) {
    const [form, setForm] = useState(emptyDevice);
    const { saving, run } = useSaving();

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                num: editing.num ?? "无",
                name: editing.name ?? "",
                dtype: idOf(editing.dtype) || 1,
                ip: editing.ip ?? "",
                conpare: editing.conpare ?? "",
                area: editing.area ?? 1,
                link: editing.link ?? null,
                other: editing.other ?? "",
                major: Boolean(editing.major),
                probe_enabled: Boolean(editing.probe_enabled),
                sort: editing.sort ?? 0,
            });
        } else {
            setForm({ ...emptyDevice, area: exhibitId != null ? 1 : 2, link: exhibitId ?? machineId ?? null });
        }
    }, [open, editing, exhibitId, machineId]);

    const submit = () => {
        if (!form.name.trim()) return void toast.error("请填写设备名称");
        if (!form.ip.trim()) return void toast.error("请填写设备 IP");
        void run(async () => {
            const payload = {
                ...form,
                link: form.area === 0 ? null : form.area === 1 ? exhibitId ?? form.link : machineId ?? form.link,
            };
            if (editing) await updateDevice({ id: editing.id, ...payload });
            else await addDevice(payload);
            toast.success(editing ? "设备已更新" : "设备已创建");
            onOpenChange(false);
            onSaved();
        });
    };

    const probeEnabled = PROBE_ENABLED_DTYPES.includes(form.dtype);

    return (
        <EntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? "编辑设备" : "新增设备"}
            saving={saving}
            onSubmit={submit}
        >
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qd_name" aria-required>设备名称</FieldLabel>
                    <Input id="qd_name" value={form.name} placeholder="请输入设备名称" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qd_ip" aria-required>设备 IP</FieldLabel>
                    <Input id="qd_ip" value={form.ip} placeholder="192.168.1.100" onChange={(e) => setForm({ ...form, ip: e.target.value })} />
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qd_type">类型</FieldLabel>
                    <Select items={DeviceTypeItems} value={String(form.dtype)} onValueChange={(v) => setForm({ ...form, dtype: Number(v) })}>
                        <SelectTrigger id="qd_type"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{DeviceTypeItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qd_area">绑定范围</FieldLabel>
                    <Select items={AreaItems} value={String(form.area)} onValueChange={(v) => setForm({ ...form, area: Number(v) })}>
                        <SelectTrigger id="qd_area"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{AreaItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qd_conpare">设备厂家</FieldLabel>
                    <Input id="qd_conpare" value={form.conpare} placeholder="可为空" onChange={(e) => setForm({ ...form, conpare: e.target.value })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qd_probe">设备探活</FieldLabel>
                    <Select
                        items={ProbeItems}
                        value={form.probe_enabled ? "1" : "0"}
                        onValueChange={(v) => setForm({ ...form, probe_enabled: v === "1" })}
                        disabled={!probeEnabled}
                    >
                        <SelectTrigger id="qd_probe"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{ProbeItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qd_num">设备编号</FieldLabel>
                    <Input id="qd_num" value={form.num} placeholder="无" onChange={(e) => setForm({ ...form, num: e.target.value })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qd_sort">排序</FieldLabel>
                    <Input id="qd_sort" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
                </Field>
            </div>
            <Field>
                <FieldLabel htmlFor="qd_other">设备备注</FieldLabel>
                <Textarea id="qd_other" value={form.other} placeholder="可选备注" onChange={(e) => setForm({ ...form, other: e.target.value })} />
            </Field>
        </EntityDialog>
    );
}

// ─────────────────────────── 设备命令 ───────────────────────────

export interface CodeRow {
    id: number;
    name?: string;
    code?: string;
    ctype?: number;
    cformat?: { id: number } | number;
    protocal?: { id: number } | number;
    cport?: number;
    note?: string;
}

const emptyCode = { device: null as number | null, code: "", name: "", ctype: 10, cformat: 2, protocal: 4, cport: 5566, note: "" };

export function CodeForm({
    open,
    onOpenChange,
    editing,
    deviceId,
    deviceName,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: CodeRow | null;
    deviceId: number | null;
    deviceName?: string;
    onSaved: () => void;
}) {
    const [form, setForm] = useState(emptyCode);
    const { saving, run } = useSaving();

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                device: deviceId,
                name: editing.name ?? "",
                code: editing.code ?? "",
                ctype: editing.ctype ?? 10,
                cformat: idOf(editing.cformat) || 2,
                protocal: idOf(editing.protocal) || 4,
                cport: editing.cport ?? 5566,
                note: editing.note ?? "",
            });
        } else {
            setForm({ ...emptyCode, device: deviceId });
        }
    }, [open, editing, deviceId]);

    const submit = () => {
        if (!form.name.trim()) return void toast.error("请填写命令名称");
        if (!form.code.trim()) return void toast.error("请填写命令原文");
        if (deviceId == null) return void toast.error("缺少所属设备");
        void run(async () => {
            if (editing) await updateCode({ id: editing.id, ...form });
            else await addCode(form);
            toast.success(editing ? "命令已更新" : "命令已创建");
            onOpenChange(false);
            onSaved();
        });
    };

    return (
        <EntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? "编辑命令" : "新增命令"}
            description={deviceName ? `所属设备：${deviceName}` : undefined}
            saving={saving}
            onSubmit={submit}
        >
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qk_name" aria-required>命令名称</FieldLabel>
                    <Input id="qk_name" value={form.name} placeholder="如：开机" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qk_type">命令类型</FieldLabel>
                    <Select items={CodeTypeItems} value={String(form.ctype)} onValueChange={(v) => setForm({ ...form, ctype: Number(v) })}>
                        <SelectTrigger id="qk_type"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{CodeTypeItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
            </div>
            <Field>
                <FieldLabel htmlFor="qk_code" aria-required>命令原文</FieldLabel>
                <Textarea id="qk_code" value={form.code} placeholder="字符串或 16 进制，如 1A 2B 3C" onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qk_format">格式</FieldLabel>
                    <Select items={CodeFormatItems} value={String(form.cformat)} onValueChange={(v) => setForm({ ...form, cformat: Number(v) })}>
                        <SelectTrigger id="qk_format"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{CodeFormatItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qk_protocal">通信协议</FieldLabel>
                    <Select items={CodeProtocalItems} value={String(form.protocal)} onValueChange={(v) => setForm({ ...form, protocal: Number(v) })}>
                        <SelectTrigger id="qk_protocal"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{CodeProtocalItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qk_port">端口</FieldLabel>
                    <Input id="qk_port" type="number" value={form.cport} onChange={(e) => setForm({ ...form, cport: Number(e.target.value) })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qk_note">备注</FieldLabel>
                    <Input id="qk_note" value={form.note} placeholder="可选备注" onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </Field>
            </div>
        </EntityDialog>
    );
}

// ─────────────────────────── 内容控制命令（软件命令） ───────────────────────────

export interface ControlRow {
    id: number;
    name?: string;
    cformat?: { id: number } | number;
    protocal?: { id: number } | number;
    ip?: string;
    port?: number;
    code?: string;
    note?: string;
    sort?: number;
}

const emptyControl = { name: "", cformat: 1, protocal: 4, ip: "", port: 10023, code: "", note: "", sort: 0 };

export function ControlForm({
    open,
    onOpenChange,
    editing,
    exhibitId,
    exhibitName,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: ControlRow | null;
    exhibitId: number | null;
    exhibitName?: string;
    onSaved: () => void;
}) {
    const [form, setForm] = useState(emptyControl);
    const { saving, run } = useSaving();

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                name: editing.name ?? "",
                cformat: idOf(editing.cformat) || 1,
                protocal: idOf(editing.protocal) || 4,
                ip: editing.ip ?? "",
                port: editing.port ?? 10023,
                code: editing.code ?? "",
                note: editing.note ?? "",
                sort: editing.sort ?? 0,
            });
        } else {
            setForm(emptyControl);
        }
    }, [open, editing]);

    const submit = () => {
        if (!form.name.trim()) return void toast.error("请填写命令名称");
        if (!form.code.trim()) return void toast.error("请填写命令原文");
        if (exhibitId == null) return void toast.error("请先选择展项");
        void run(async () => {
            if (editing) {
                await updateControl({ id: editing.id, ...form });
                toast.success("命令已更新");
            } else {
                await addControl({ e_id: exhibitId, ...form });
                toast.success("命令已添加");
            }
            onOpenChange(false);
            onSaved();
        });
    };

    return (
        <EntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? "编辑内容控制命令" : "新增内容命令"}
            description={exhibitName ? `所属展项：${exhibitName}` : undefined}
            saving={saving}
            onSubmit={submit}
        >
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qctrl_name" aria-required>命令名称</FieldLabel>
                    <Input id="qctrl_name" value={form.name} placeholder="如：播放" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qctrl_ip">IP</FieldLabel>
                    <Input id="qctrl_ip" value={form.ip} placeholder="目标设备 IP" onChange={(e) => setForm({ ...form, ip: e.target.value })} />
                </Field>
            </div>
            <Field>
                <FieldLabel htmlFor="qctrl_code" aria-required>命令原文</FieldLabel>
                <Textarea id="qctrl_code" value={form.code} placeholder="字符串或 16 进制" onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qctrl_format">格式</FieldLabel>
                    <Select items={CodeFormatItems} value={String(form.cformat)} onValueChange={(v) => setForm({ ...form, cformat: Number(v) })}>
                        <SelectTrigger id="qctrl_format"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{CodeFormatItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qctrl_protocal">通信协议</FieldLabel>
                    <Select items={CodeProtocalItems} value={String(form.protocal)} onValueChange={(v) => setForm({ ...form, protocal: Number(v) })}>
                        <SelectTrigger id="qctrl_protocal"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{CodeProtocalItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qctrl_port">端口</FieldLabel>
                    <Input id="qctrl_port" type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qctrl_sort">排序</FieldLabel>
                    <Input id="qctrl_sort" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
                </Field>
            </div>
            <Field>
                <FieldLabel htmlFor="qctrl_note">备注</FieldLabel>
                <Textarea id="qctrl_note" value={form.note} placeholder="可选备注" onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
            <p className="text-xs text-muted-foreground">所属展项 ID：{exhibitId ?? "-"}</p>
        </EntityDialog>
    );
}

// ─────────────────────────── 软件/硬件模式 ───────────────────────────

export interface ModeRow {
    id: number;
    name: string;
    msg?: string;
    status?: number;
    icon?: { id: number; name?: string } | null;
    sort?: number;
    note?: string;
}

const emptyMode = { name: "", msg: "", status: 1, icon: null as number | null, sort: 0, note: "" };

export function ModeForm({
    open,
    onOpenChange,
    editing,
    variant,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: ModeRow | null;
    variant: "smodel" | "hmodel";
    onSaved: () => void;
}) {
    const [form, setForm] = useState(emptyMode);
    const [icons, setIcons] = useState<Array<{ id: number; name: string }>>([]);
    const { saving, run } = useSaving();
    const isSoftware = variant === "smodel";

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                name: editing.name ?? "",
                msg: editing.msg ?? "",
                status: editing.status ?? 1,
                icon: editing.icon?.id ?? null,
                sort: editing.sort ?? 0,
                note: editing.note ?? "",
            });
        } else {
            setForm(emptyMode);
        }
        getIconList({ page: 1, limit: 1000 })
            .then((res: any) => setIcons(res.data ?? []))
            .catch(() => setIcons([]));
    }, [open, editing]);

    const submit = () => {
        if (!form.name.trim()) return void toast.error("请填写模式名称");
        void run(async () => {
            const payload = { ...form, icon: form.icon ?? null };
            if (isSoftware) {
                if (editing) await updateSmodel({ id: editing.id, ...payload });
                else await addSmodel(payload);
            } else {
                if (editing) await updateHmodel({ id: editing.id, ...payload });
                else await addHmodel(payload);
            }
            toast.success(editing ? "模式已更新" : "模式已创建");
            onOpenChange(false);
            onSaved();
        });
    };

    return (
        <EntityDialog
            open={open}
            onOpenChange={onOpenChange}
            title={`${editing ? "编辑" : "新增"}${isSoftware ? "软件" : "硬件"}模式`}
            saving={saving}
            onSubmit={submit}
        >
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qmo_name" aria-required>模式名称</FieldLabel>
                    <Input id="qmo_name" value={form.name} placeholder="请输入模式名称" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field>
                    <FieldLabel htmlFor="qmo_status">状态</FieldLabel>
                    <Select items={StatusItems} value={String(form.status)} onValueChange={(v) => setForm({ ...form, status: Number(v) })}>
                        <SelectTrigger id="qmo_status"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{StatusItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field>
                    <FieldLabel htmlFor="qmo_icon">图标</FieldLabel>
                    <Select
                        items={icons.map((i) => ({ value: String(i.id), label: i.name }))}
                        value={form.icon == null ? undefined : String(form.icon)}
                        onValueChange={(v) => setForm({ ...form, icon: Number(v) })}
                    >
                        <SelectTrigger id="qmo_icon"><SelectValue placeholder="可选" /></SelectTrigger>
                        <SelectContent><SelectGroup>{icons.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel htmlFor="qmo_sort">排序</FieldLabel>
                    <Input id="qmo_sort" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
                </Field>
            </div>
            <Field>
                <FieldLabel htmlFor="qmo_msg">模式介绍</FieldLabel>
                <Input id="qmo_msg" value={form.msg} placeholder="可选介绍" onChange={(e) => setForm({ ...form, msg: e.target.value })} />
            </Field>
            <Field>
                <FieldLabel htmlFor="qmo_note">备注</FieldLabel>
                <Textarea id="qmo_note" value={form.note} placeholder="可选备注" onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
        </EntityDialog>
    );
}
