import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PenSquare, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExhibitList, updateExhibitControl } from "@/api/exhibition";
import { message_To_Client } from "@/api/quick.js";
import { ControlNodeForm, type ControlNode } from "./forms/ControlNodeForm";

/**
 * 展项快捷控制（e_link）面板。
 *
 * 数据结构（docs/json/e_link.json）：扁平的按钮数组
 * [{ label, show, sort, device_code: [{ id,label,name,format,protocal,ip,port,code,delay }] }]
 *
 * - 点击按钮：把该按钮绑定的设备指令下发给客户端
 * - 「添加按钮」/ 按钮右上角铅笔：编辑按钮与设备指令（受页面「显示编辑」开关控制）
 */

export interface ExhibitLinkPanelProps {
    exhibitId: number | null;
    exhibitName?: string;
    showEdit: boolean;
    /** colorVariants[color]：[文字色, 背景色, 纯色] */
    color: string[];
    /** 当前展项下的设备（用于绑定设备指令） */
    devices: Array<{ id: number; name: string; ip?: string }>;
    /** 保存后回调（例如刷新别的数据） */
    onSaved?: () => void;
}

const normalizeList = (raw: unknown): any[] => (Array.isArray(raw) ? raw : ((raw as any)?.items ?? []));

export function ExhibitLinkPanel({ exhibitId, exhibitName, showEdit, color, devices, onSaved }: ExhibitLinkPanelProps) {
    const [nodes, setNodes] = useState<ControlNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);

    const [dialog, setDialog] = useState<{
        open: boolean;
        mode: "add" | "edit";
        index: number | null;
        node: ControlNode | null;
    }>({ open: false, mode: "add", index: null, node: null });

    // 读取展项的 e_link
    const load = useCallback(async () => {
        if (exhibitId == null) {
            setNodes([]);
            return;
        }
        setLoading(true);
        try {
            const res = await getExhibitList({ page: 1, limit: 1000 });
            const row = normalizeList(res?.data).find((x: any) => x.id === exhibitId);
            const raw = row?.e_link;
            if (typeof raw === "string" && raw.trim()) {
                const parsed = JSON.parse(raw);
                setNodes(Array.isArray(parsed) ? parsed : []);
            } else {
                setNodes([]);
            }
        } catch {
            setNodes([]);
        } finally {
            setLoading(false);
        }
    }, [exhibitId]);

    useEffect(() => {
        void load();
    }, [load]);

    // 点击快捷控制按钮：下发设备指令
    const onPress = async (node: ControlNode) => {
        const deviceCodes = node.device_code ?? [];
        if (deviceCodes.length === 0) {
            toast.error("该按钮未绑定设备指令");
            return;
        }
        setSelected(node.sort ?? 0);
        try {
            const res = await message_To_Client({ content_code: [], device_code: deviceCodes });
            if ((res as any)?.data?.code == 200) {
                toast("指令已下发", { description: (res as any)?.data?.msg });
            } else {
                toast("下发失败", { description: (res as any)?.data?.msg ?? "" });
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "下发失败");
        }
    };

    // 保存节点
    const saveNode = (newNode: ControlNode) => {
        if (exhibitId == null) return void toast.error("请先选择展项");
        const next = [...nodes];
        if (dialog.mode === "edit" && dialog.index != null) {
            next[dialog.index] = newNode;
        } else {
            next.push(newNode);
        }
        updateExhibitControl({ id: exhibitId, e_link: JSON.stringify(next) })
            .then(() => {
                toast.success(dialog.mode === "edit" ? "按钮已更新" : "按钮已添加");
                setNodes(next);
                setDialog((prev) => ({ ...prev, open: false }));
                onSaved?.();
            })
            .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "保存失败"));
    };

    return (
        <div className="bg-[#F9F9FA] shadow-md rounded-md w-full h-full flex flex-col overflow-hidden">
            {/* 头部 */}
            <div className="flex w-full items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2">
                    <div className={`bg-current/20 p-2 rounded-md ${color[0]}`}>
                        <PenSquare size={20} />
                    </div>
                    <span className="text-base text-nowrap text-[#11181C]">
                        展项快捷控制{exhibitName ? ` · ${exhibitName}` : ""}
                    </span>
                </div>
                {showEdit && (
                    <Button
                        className="text-purple-500"
                        variant="outline"
                        size="default"
                        disabled={exhibitId == null}
                        onClick={() => setDialog({ open: true, mode: "add", index: null, node: null })}
                    >
                        <PlusIcon />添加按钮
                    </Button>
                )}
            </div>
            <div className="h-0.5 w-11/12 mx-auto bg-[#888888]/20 rounded-md" />

            {/* 按钮列表 */}
            <div className={`flex-1 overflow-y-auto px-3 py-3 scrollbar-line ${color[0]}`}>
                {loading && <div className="py-6 text-center text-sm text-muted-foreground">加载中...</div>}
                {!loading && exhibitId == null && (
                    <div className="py-6 text-center text-sm text-muted-foreground">请点击展项</div>
                )}
                {!loading && exhibitId != null && nodes.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        该展项还没有快捷控制按钮{showEdit ? "，点右上角「添加按钮」创建" : ""}
                    </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                    {nodes.map((node, index) =>
                        node.show === false ? null : (
                            <div
                                key={`${node.label}-${index}`}
                                className={`relative flex min-h-12 w-full items-center justify-center rounded-md border border-[#888888]/20 px-2 py-2 text-center text-sm ${
                                    selected === (node.sort ?? 0) ? "bg-current text-white" : "bg-white text-[#11181C]"
                                }`}
                                onClick={() => onPress(node)}
                            >
                                <span className="truncate">{node.label}</span>
                                {showEdit && (
                                    <button
                                        type="button"
                                        className="absolute right-0.5 top-0.5 text-yellow-600"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDialog({ open: true, mode: "edit", index, node });
                                        }}
                                    >
                                        <PenSquare className="size-3" />
                                    </button>
                                )}
                            </div>
                        ),
                    )}
                </div>
            </div>

            <ControlNodeForm
                open={dialog.open}
                onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
                mode={dialog.mode}
                level={1}
                node={dialog.node}
                exhibitId={exhibitId}
                devices={devices}
                variant="e_link"
                onSave={saveNode}
            />
        </div>
    );
}
