import { useCallback, useEffect, useState } from "react";
import { PenSquare, PlusIcon, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getControlList } from "@/api/exhibition";
import { ControlForm, type ControlRow } from "./forms/QuickForms";

/**
 * 内容命令面板：展示当前展项的内容控制命令（/control，C_Control）。
 *
 * 数据字段：id / name / code / cformat / protocal / ip / port / sort / note
 * 支持新增、编辑（受页面「显示编辑」开关控制）。
 */

export interface ContentControlPanelProps {
    exhibitId: number | null;
    exhibitName?: string;
    showEdit: boolean;
    /** colorVariants[color]：[文字色, 背景色, 纯色] */
    color: string[];
}

const normalizeList = (raw: unknown): any[] => (Array.isArray(raw) ? raw : ((raw as any)?.items ?? []));

/** 后端返回的格式/协议可能是对象 {id,name}，也可能已映射成字符串 */
const nameOf = (v: unknown): string => {
    if (v == null) return "-";
    if (typeof v === "object") return (v as { name?: string }).name ?? "-";
    return String(v);
};

export function ContentControlPanel({ exhibitId, exhibitName, showEdit, color }: ContentControlPanelProps) {
    const [rows, setRows] = useState<ControlRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialog, setDialog] = useState<{ open: boolean; editing: ControlRow | null }>({
        open: false,
        editing: null,
    });

    const load = useCallback(async () => {
        if (exhibitId == null) {
            setRows([]);
            return;
        }
        setLoading(true);
        try {
            const res = await getControlList({ e_id: exhibitId, page: 1, limit: 1000 });
            setRows(normalizeList(res?.data) as ControlRow[]);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [exhibitId]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <div className="bg-[#F9F9FA] shadow-md rounded-md w-full h-full flex flex-col overflow-hidden">
            {/* 头部 */}
            <div className="flex w-full items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2">
                    <div className={`bg-current/20 p-2 rounded-md ${color[0]}`}>
                        <Terminal size={20} />
                    </div>
                    <span className="text-base text-nowrap text-[#11181C]">
                        内容控制命令{exhibitName ? ` · ${exhibitName}` : ""}
                    </span>
                </div>
                {showEdit && (
                    <Button
                        className="text-purple-500"
                        variant="outline"
                        size="default"
                        disabled={exhibitId == null}
                        onClick={() => setDialog({ open: true, editing: null })}
                    >
                        <PlusIcon />添加命令
                    </Button>
                )}
            </div>
            <div className="mx-auto h-0.5 w-11/12 rounded-md bg-[#888888]/20" />

            {/* 列表 */}
            <div className={`flex-1 overflow-y-auto px-3 py-2 scrollbar-line ${color[0]}`}>
                {loading && <div className="py-6 text-center text-sm text-muted-foreground">加载中...</div>}
                {!loading && exhibitId == null && (
                    <div className="py-6 text-center text-sm text-muted-foreground">请点击展项</div>
                )}
                {!loading && exhibitId != null && rows.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        该展项还没有内容控制命令{showEdit ? "，点右上角「添加命令」创建" : ""}
                    </div>
                )}
                {rows.length > 0 && (
                    <div className="grid grid-cols-[1.2fr_2fr_.7fr_1fr_1.4fr_.5fr_.6fr] items-center gap-2 border-b border-[#888888]/20 px-2 py-2 text-xs text-muted-foreground">
                        <span>名称</span>
                        <span>命令原文</span>
                        <span>格式</span>
                        <span>协议</span>
                        <span>IP:端口</span>
                        <span>排序</span>
                        <span className="text-right">操作</span>
                    </div>
                )}
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="grid grid-cols-[1.2fr_2fr_.7fr_1fr_1.4fr_.5fr_.6fr] items-center gap-2 border-b border-[#888888]/10 px-2 py-2 text-sm"
                    >
                        <span className="truncate" title={row.name}>{row.name || "-"}</span>
                        <span className="truncate font-mono text-xs" title={row.code}>{row.code || "-"}</span>
                        <span className="truncate">{nameOf(row.cformat)}</span>
                        <span className="truncate">{nameOf(row.protocal)}</span>
                        <span className="truncate">{row.ip || "-"}:{row.port ?? "-"}</span>
                        <span>{row.sort ?? "-"}</span>
                        <div className="flex justify-end">
                            {showEdit && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    title="编辑命令"
                                    onClick={() => setDialog({ open: true, editing: row })}
                                >
                                    <PenSquare className="size-4 text-yellow-500" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <ControlForm
                open={dialog.open}
                onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
                editing={dialog.editing}
                exhibitId={exhibitId}
                exhibitName={exhibitName}
                onSaved={load}
            />
        </div>
    );
}
