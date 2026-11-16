import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    type Edge,
    type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { Loader2, PlusIcon, SearchIcon, XIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getSmodelList,
    getSmodelBindList,
    getHmodelList,
    getHmodelBindList,
} from "@/api/model";
import { getExhibitTree } from "@/api/exhibition";
import SmodelNode from "./SmodelNode";
import { BindDialog } from "./BindDialog";
import type { GraphBind, ModeVariant, SmodelNodeData, TreePavilion } from "./types";

/**
 * 模式「节点视图」：模式 → 展厅 → 展区 → 展项 → 绑定。
 * 软件模式（smodel）与硬件模式（hmodel）共用，差异集中在数据接口与绑定结构。
 *
 * 数据：
 *   - 模式列表  GET /smodel/list | /hmodel/list
 *   - 展项树    GET /exhibition/tree
 *   - 绑定      GET /smodelbind/list | /hmodelbind/list
 *       软件模式优先 `?model_id&all=1`（后端支持后一次取全量），否则回退逐个取；
 *       硬件模式列表接口强制按 exhibition 过滤，只能逐个取。
 *
 * 交互：点击绑定节点编辑延时 / 删除；右键展项或展厅节点新增绑定；搜索定位。
 */

// ── 布局常量（参考 ExhibitionFlow 的分层布局） ──
const TREE_W = 176;
const TREE_H = 96;
const BIND_W = 176;
const BIND_H = 104;
const H_GAP = 24;
const V_GAP = 80;
const PAD = 24;
const PAV_GAP = 60;

const nodeTypes = { smodel: SmodelNode };

const MODE_API = {
    software: {
        listModes: getSmodelList,
        listBinds: getSmodelBindList,
    },
    hardware: {
        listModes: getHmodelList,
        listBinds: getHmodelBindList,
    },
} as const;

function normalizeList(raw: unknown): any[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "items" in (raw as any)) {
        return (raw as { items: any[] }).items ?? [];
    }
    return [];
}

/** 把两种模式的绑定行归一化成 GraphBind */
function normalizeBind(variant: ModeVariant, row: any): GraphBind {
    if (variant === "hardware") {
        return {
            id: row.id,
            bindKind: "hardware",
            badge: "硬件",
            bindName: row.device?.name ?? "-",
            code: row.code ?? null,
            delay: row.delay ?? 0,
            raw: row,
        };
    }
    const isDevice = row.type === 2;
    return {
        id: row.id,
        bindKind: isDevice ? "device" : "content",
        badge: isDevice ? "设备" : "内容",
        bindName: row.bind?.name ?? "-",
        code: row.code ?? null,
        delay: row.delay ?? 0,
        raw: row,
    };
}

/** 后端是否已支持 `all=1`；硬件模式列表接口目前一定不支持 */
const allModeSupported: Record<ModeVariant, boolean | null> = {
    software: null,
    hardware: null,
};

async function fetchBinds(
    variant: ModeVariant,
    modeId: number,
    tree: TreePavilion[],
): Promise<GraphBind[]> {
    const api = MODE_API[variant];

    if (allModeSupported[variant] !== false) {
        try {
            const res = await api.listBinds({ model_id: modeId, all: 1 });
            allModeSupported[variant] = true;
            return normalizeList(res.data).map((row) => normalizeBind(variant, row));
        } catch {
            allModeSupported[variant] = false;
        }
    }

    const fetchOne = async (params: Record<string, unknown>): Promise<GraphBind[]> => {
        try {
            const res = await api.listBinds({ ...params, page: 1, limit: 1000 });
            return normalizeList(res.data).map((row) => normalizeBind(variant, row));
        } catch {
            // 该范围没有绑定时按空处理
            return [];
        }
    };

    const tasks: Promise<GraphBind[]>[] = [];
    for (const p of tree) {
        // 展厅级（exhibition 为空）
        tasks.push(fetchOne({ model_id: modeId, pavilion_id: p.id }));
        for (const m of p.children ?? []) {
            for (const e of m.children ?? []) {
                tasks.push(fetchOne({ model_id: modeId, pavilion_id: p.id, exhibition_id: e.id }));
            }
        }
    }
    const results = await Promise.all(tasks);
    return results.flat();
}

/**
 * 自定义分层布局（参考 main.tsx 的 ExhibitionFlow）：
 *
 *   模式
 *    └ 展厅
 *        └ 展区
 *            └ 展项
 *                ├ 内容绑定（左列，≥2 个时两列网格）
 *                └ 设备绑定（右列，≥2 个时两列网格）
 *
 * 内容绑定与设备绑定各占一块区域，横向并排、整体在展项下方居中；
 * 展厅级绑定放在机器行右侧，避免和展区/展项重叠。
 */
function layout(nodes: Node<SmodelNodeData>[], _edges: Edge[]): Node<SmodelNodeData>[] {
    const pos = new Map<string, { x: number; y: number }>();
    const mode = nodes.find((n) => n.data.kind === "mode");
    const pavilions = nodes.filter((n) => n.data.kind === "pavilion");
    const machines = nodes.filter((n) => n.data.kind === "machine");
    const exhibits = nodes.filter((n) => n.data.kind === "exhibit");
    const binds = nodes.filter((n) => n.data.kind === "bind");

    const bindsOfExhibit = (id: number) => binds.filter((b) => b.data.exhibitId === id);
    const bindsOfPavilion = (id: number) =>
        binds.filter((b) => b.data.exhibitId == null && b.data.pavilionId === id);
    const contentOf = (list: Node<SmodelNodeData>[]) =>
        list.filter((b) => b.data.bind?.bindKind === "content");
    const deviceOf = (list: Node<SmodelNodeData>[]) =>
        list.filter((b) => b.data.bind?.bindKind !== "content");

    // 网格：1 个时单列，≥2 时两列
    const gridWidth = (count: number) => (count >= 2 ? 2 * BIND_W + H_GAP : count === 1 ? BIND_W : 0);
    const gridColumns = (count: number, left: number, width: number) =>
        count >= 2
            ? [left + width / 2 - (BIND_W + H_GAP) / 2, left + width / 2 + (BIND_W + H_GAP) / 2]
            : [left + width / 2];

    const bindBlockWidth = (list: Node<SmodelNodeData>[]) => {
        const cw = gridWidth(contentOf(list).length);
        const dw = gridWidth(deviceOf(list).length);
        return cw + dw + (cw > 0 && dw > 0 ? H_GAP : 0);
    };

    const exhibitHalfWidth = (e: Node<SmodelNodeData>) =>
        Math.max(TREE_W, bindBlockWidth(bindsOfExhibit(e.data.exhibitId!))) / 2;
    const exhibitGap = (a: Node<SmodelNodeData>, b: Node<SmodelNodeData>) =>
        exhibitHalfWidth(a) + exhibitHalfWidth(b) + H_GAP;
    const exhibitRowWidth = (list: Node<SmodelNodeData>[]) => {
        if (list.length === 0) return 0;
        let w = TREE_W;
        for (let i = 1; i < list.length; i++) w += exhibitGap(list[i - 1], list[i]);
        return w;
    };

    const machinesOf = (pavilionId: number) => machines.filter((m) => m.data.pavilionId === pavilionId);
    const exhibitsOf = (machineId: number) => exhibits.filter((e) => e.data.machineId === machineId);

    const machineSlotWidth = (m: Node<SmodelNodeData>) => {
        const list = exhibitsOf(m.data.machineId!);
        if (list.length === 0) return TREE_W;
        const rowW = exhibitRowWidth(list);
        const first = exhibitHalfWidth(list[0]);
        const last = exhibitHalfWidth(list[list.length - 1]);
        return Math.max(TREE_W, rowW, rowW - TREE_W + 2 * Math.max(first, last));
    };

    const pavilionWidth = (p: Node<SmodelNodeData>) => {
        const ms = machinesOf(p.data.pavilionId!);
        const machineAreaW =
            ms.reduce((s, m) => s + machineSlotWidth(m), 0) + Math.max(0, ms.length - 1) * H_GAP;
        const pb = bindsOfPavilion(p.data.pavilionId!);
        const pbW = bindBlockWidth(pb);
        return Math.max(TREE_W, machineAreaW + (pb.length > 0 ? (machineAreaW > 0 ? H_GAP : 0) + pbW : 0));
    };

    // 各行 y
    const yMode = 0;
    const yPavilion = yMode + TREE_H + V_GAP;
    const yMachine = yPavilion + TREE_H + V_GAP;
    const yExhibit = yMachine + TREE_H + V_GAP;
    const yBind = yExhibit + TREE_H + V_GAP;

    const groups = pavilions.map((p) => ({ p, w: pavilionWidth(p) }));
    const totalW = groups.reduce((s, g) => s + g.w, 0) + Math.max(0, groups.length - 1) * PAV_GAP;

    if (mode) pos.set(mode.id, { x: PAD + totalW / 2 - TREE_W / 2, y: yMode });

    let pavX = PAD;
    for (const { p, w } of groups) {
        const pavilionId = p.data.pavilionId!;
        const ms = machinesOf(pavilionId);
        const pb = bindsOfPavilion(pavilionId);
        const machineAreaW =
            ms.reduce((s, m) => s + machineSlotWidth(m), 0) + Math.max(0, ms.length - 1) * H_GAP;
        const pavCenterX = machineAreaW > 0 ? pavX + machineAreaW / 2 : pavX + w / 2;
        pos.set(p.id, { x: pavCenterX - TREE_W / 2, y: yPavilion });

        let mx = pavX;
        for (const m of ms) {
            const slot = machineSlotWidth(m);
            const mCenterX = mx + slot / 2;
            pos.set(m.id, { x: mCenterX - TREE_W / 2, y: yMachine });

            const list = exhibitsOf(m.data.machineId!);
            let exX = mCenterX - exhibitRowWidth(list) / 2;
            for (let i = 0; i < list.length; i++) {
                const e = list[i];
                pos.set(e.id, { x: exX, y: yExhibit });
                const eCenterX = exX + TREE_W / 2;

                const eb = bindsOfExhibit(e.data.exhibitId!);
                const content = contentOf(eb);
                const device = deviceOf(eb);
                const cw = gridWidth(content.length);
                const dw = gridWidth(device.length);
                if (cw > 0 || dw > 0) {
                    const total = cw + dw + (cw > 0 && dw > 0 ? H_GAP : 0);
                    const rowLeft = eCenterX - total / 2;
                    if (content.length > 0) {
                        const cols = gridColumns(content.length, rowLeft, cw);
                        content.forEach((b, k) => {
                            pos.set(b.id, {
                                x: cols[k % 2] - BIND_W / 2,
                                y: yBind + Math.floor(k / 2) * (BIND_H + V_GAP),
                            });
                        });
                    }
                    if (device.length > 0) {
                        const devLeft = rowLeft + cw + (cw > 0 ? H_GAP : 0);
                        const cols = gridColumns(device.length, devLeft, dw);
                        device.forEach((b, k) => {
                            pos.set(b.id, {
                                x: cols[k % 2] - BIND_W / 2,
                                y: yBind + Math.floor(k / 2) * (BIND_H + V_GAP),
                            });
                        });
                    }
                }

                if (i + 1 < list.length) exX += exhibitGap(e, list[i + 1]);
            }

            mx += slot + H_GAP;
        }

        // 展厅级绑定：机器行右侧（内容左、设备右）
        if (pb.length > 0) {
            const offset = machineAreaW > 0 ? machineAreaW + H_GAP : 0;
            const areaLeft = pavX + offset;
            const areaW = Math.max(0, w - offset);
            const content = contentOf(pb);
            const device = deviceOf(pb);
            const cw = gridWidth(content.length);
            const dw = gridWidth(device.length);
            const total = cw + dw + (cw > 0 && dw > 0 ? H_GAP : 0);
            const rowLeft = areaLeft + Math.max(0, (areaW - total) / 2);
            if (content.length > 0) {
                const cols = gridColumns(content.length, rowLeft, cw);
                content.forEach((b, k) => {
                    pos.set(b.id, {
                        x: cols[k % 2] - BIND_W / 2,
                        y: yMachine + Math.floor(k / 2) * (BIND_H + V_GAP),
                    });
                });
            }
            if (device.length > 0) {
                const devLeft = rowLeft + cw + (cw > 0 ? H_GAP : 0);
                const cols = gridColumns(device.length, devLeft, dw);
                device.forEach((b, k) => {
                    pos.set(b.id, {
                        x: cols[k % 2] - BIND_W / 2,
                        y: yMachine + Math.floor(k / 2) * (BIND_H + V_GAP),
                    });
                });
            }
        }

        pavX += w + PAV_GAP;
    }

    return nodes.map((n) => {
        const p = pos.get(n.id);
        return p ? { ...n, position: p } : n;
    });
}

function buildGraph(
    mode: { id: number; name: string; current?: number },
    tree: TreePavilion[],
    binds: GraphBind[],
    showHidden: boolean,
): { nodes: Node<SmodelNodeData>[]; edges: Edge[] } {
    const nodes: Node<SmodelNodeData>[] = [];
    const edges: Edge[] = [];

    const byExhibit = new Map<number, GraphBind[]>();
    const byPavilion = new Map<number, GraphBind[]>();
    for (const b of binds) {
        const exId = b.raw?.exhibition?.id ?? null;
        if (exId != null) {
            if (!byExhibit.has(exId)) byExhibit.set(exId, []);
            byExhibit.get(exId)!.push(b);
        } else if (b.raw?.pavilion?.id != null) {
            const pid = b.raw.pavilion.id;
            if (!byPavilion.has(pid)) byPavilion.set(pid, []);
            byPavilion.get(pid)!.push(b);
        }
    }

    const edge = (source: string, target: string, danger = false): Edge => ({
        id: `e-${source}-${target}`,
        source,
        target,
        type: "smoothstep",
        style: danger
            ? { stroke: "hsl(var(--destructive))", strokeDasharray: "4 4" }
            : undefined,
    });

    const pushBind = (
        b: GraphBind,
        sourceId: string,
        pavilion: TreePavilion,
        exhibit: { id: number; name: string } | null,
        hidden: boolean,
    ) => {
        const id = `bind-${b.id}`;
        nodes.push({
            id,
            type: "smodel",
            position: { x: 0, y: 0 },
            data: {
                kind: "bind",
                label: b.bindKind === "content" ? "内容绑定" : b.bindKind === "device" ? "设备绑定" : "硬件绑定",
                bind: b,
                pavilionId: pavilion.id,
                pavilionName: pavilion.name,
                exhibitId: exhibit?.id ?? null,
                exhibitName: exhibit?.name ?? null,
                missingCode: !b.code,
                hidden,
            },
        });
        edges.push(edge(sourceId, id, !b.code));
    };

    const modeId = `mode-${mode.id}`;
    nodes.push({
        id: modeId,
        type: "smodel",
        position: { x: 0, y: 0 },
        data: {
            kind: "mode",
            label: mode.name,
            sub: mode.current === 1 ? "当前模式" : undefined,
        },
    });

    for (const p of tree) {
        // show !== 1 视为隐藏；默认不展示，打开「显示隐藏节点」后展示（置灰）
        const pHidden = p.show !== undefined && p.show !== 1;
        if (pHidden && !showHidden) continue;

        const pId = `pavilion-${p.id}`;
        const pavilionBinds = byPavilion.get(p.id) ?? [];
        nodes.push({
            id: pId,
            type: "smodel",
            position: { x: 0, y: 0 },
            data: {
                kind: "pavilion",
                label: p.name,
                sub: `${p.children?.length ?? 0} 个展区`,
                pavilionId: p.id,
                pavilionName: p.name,
                exhibitId: null,
                hidden: pHidden,
            },
        });
        edges.push(edge(modeId, pId));

        for (const b of pavilionBinds) pushBind(b, pId, p, null, pHidden);

        for (const m of p.children ?? []) {
            const mHidden = pHidden || (m.show !== undefined && m.show !== 1);
            if (mHidden && !showHidden) continue;

            const mId = `machine-${m.id}`;
            nodes.push({
                id: mId,
                type: "smodel",
                position: { x: 0, y: 0 },
                data: {
                    kind: "machine",
                    label: m.name,
                    pavilionId: p.id,
                    pavilionName: p.name,
                    machineId: m.id,
                    hidden: mHidden,
                },
            });
            edges.push(edge(pId, mId));

            for (const e of m.children ?? []) {
                const eHidden = mHidden || (e.show !== undefined && e.show !== 1);
                if (eHidden && !showHidden) continue;

                const eId = `exhibit-${e.id}`;
                const exhibitBinds = byExhibit.get(e.id) ?? [];
                nodes.push({
                    id: eId,
                    type: "smodel",
                    position: { x: 0, y: 0 },
                    data: {
                        kind: "exhibit",
                        label: e.name,
                        sub: exhibitBinds.length > 0 ? `${exhibitBinds.length} 条绑定` : "",
                        unbound: exhibitBinds.length === 0,
                        pavilionId: p.id,
                        pavilionName: p.name,
                        exhibitId: e.id,
                        exhibitName: e.name,
                        machineId: m.id,
                        hidden: eHidden,
                    },
                });
                edges.push(edge(mId, eId));
                for (const b of exhibitBinds) pushBind(b, eId, p, e, eHidden);
            }
        }
    }

    return { nodes: layout(nodes, edges), edges };
}

function NodeViewInner({ variant }: { variant: ModeVariant }) {
    const api = MODE_API[variant];

    const [modes, setModes] = useState<any[]>([]);
    const [modeId, setModeId] = useState<number | null>(null);
    const [tree, setTree] = useState<TreePavilion[]>([]);
    const [binds, setBinds] = useState<GraphBind[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [onlyUnbound, setOnlyUnbound] = useState(false);
    /** 是否把 show !== 1 的展厅/展区/展项也画出来（默认隐藏） */
    const [showHidden, setShowHidden] = useState(false);

    const [menu, setMenu] = useState<{ x: number; y: number; node: SmodelNodeData } | null>(null);
    const [drawer, setDrawer] = useState<{
        open: boolean;
        pavilion: { id: number; name: string } | null;
        exhibit: { id: number; name: string } | null;
        editing: GraphBind | null;
    }>({ open: false, pavilion: null, exhibit: null, editing: null });

    const wrapRef = useRef<HTMLDivElement>(null);
    const { fitView } = useReactFlow();

    const currentMode = useMemo(
        () => modes.find((m) => m.id === modeId) ?? null,
        [modes, modeId],
    );

    // 首次加载：模式 + 展项树
    useEffect(() => {
        (async () => {
            try {
                const [mRes, tRes] = await Promise.all([api.listModes({ page: 1, limit: 1000 }), getExhibitTree()]);
                const list = normalizeList(mRes.data);
                setModes(list);
                const preferred = list.find((m) => m.current === 1) ?? list[0];
                if (preferred) setModeId(preferred.id);
                setTree(normalizeList(tRes.data) as TreePavilion[]);
            } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "加载失败");
            } finally {
                setLoading(false);
            }
        })();
    }, [api]);

    const loadBinds = useCallback(async (id: number | null) => {
        if (id == null) {
            setBinds([]);
            return;
        }
        setLoading(true);
        try {
            setBinds(await fetchBinds(variant, id, tree));
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载绑定失败");
            setBinds([]);
        } finally {
            setLoading(false);
        }
    }, [variant, tree]);

    useEffect(() => {
        if (modeId == null) return;
        void loadBinds(modeId);
    }, [modeId, loadBinds]);

    const graph = useMemo(
        () => (currentMode ? buildGraph(currentMode, tree, binds, showHidden) : { nodes: [], edges: [] }),
        [currentMode, tree, binds, showHidden],
    );

    // 搜索 / 只看未绑定：只改透明度，不增删节点
    const dimmed = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term && !onlyUnbound) return null;
        const keep = new Set<string>();
        for (const n of graph.nodes) {
            const d = n.data;
            if (term) {
                const hay = `${d.label} ${d.sub ?? ""} ${d.bind?.bindName ?? ""} ${d.bind?.code?.name ?? ""}`.toLowerCase();
                if (!hay.includes(term)) continue;
            }
            if (onlyUnbound && d.kind === "bind") continue;
            if (onlyUnbound && d.kind === "exhibit" && !d.unbound) continue;
            keep.add(n.id);
        }
        return keep;
    }, [graph.nodes, search, onlyUnbound]);

    const displayNodes = useMemo(() => {
        if (!dimmed) return graph.nodes;
        return graph.nodes.map((n) => ({
            ...n,
            style: { ...n.style, opacity: dimmed.has(n.id) ? 1 : 0.15 },
        }));
    }, [graph.nodes, dimmed]);

    const displayEdges = useMemo(() => {
        if (!dimmed) return graph.edges;
        return graph.edges.map((e) => ({
            ...e,
            style: {
                ...e.style,
                opacity: dimmed.has(e.source) && dimmed.has(e.target) ? 1 : 0.08,
            },
        }));
    }, [graph.edges, dimmed]);

    const openAdd = (node: SmodelNodeData) => {
        if (node.exhibitId != null) {
            setDrawer({
                open: true,
                pavilion: { id: node.pavilionId!, name: node.pavilionName ?? "" },
                exhibit: { id: node.exhibitId, name: node.exhibitName ?? "" },
                editing: null,
            });
        } else if (node.pavilionId != null) {
            setDrawer({
                open: true,
                pavilion: { id: node.pavilionId, name: node.pavilionName ?? "" },
                exhibit: null,
                editing: null,
            });
        }
    };

    if (loading && modes.length === 0) {
        return (
            <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> 加载中...
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-100 flex-col gap-2">
            {/* 工具条 */}
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    items={modes.map((m) => ({ value: String(m.id), label: m.name }))}
                    value={modeId == null ? undefined : String(modeId)}
                    onValueChange={(v) => setModeId(Number(v))}
                >
                    <SelectTrigger className="h-8 w-48">
                        <SelectValue placeholder="选择模式" />
                    </SelectTrigger>
                    <SelectContent>
                        {modes.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                                {m.name}{m.current === 1 ? "（当前）" : ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-1 rounded-md border border-border px-2">
                    <SearchIcon className="size-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="搜索展项 / 绑定对象 / 命令"
                        className="h-8 w-52 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                    />
                    {search && (
                        <Button variant="ghost" size="icon" className="size-6" onClick={() => setSearch("")}>
                            <XIcon className="size-3.5" />
                        </Button>
                    )}
                </div>

                <Button
                    variant={onlyUnbound ? "default" : "outline"}
                    size="sm"
                    className="h-8"
                    onClick={() => setOnlyUnbound((v) => !v)}
                >
                    只看未绑定
                </Button>

                <Button
                    variant={showHidden ? "default" : "outline"}
                    size="sm"
                    className="h-8"
                    title="展厅 / 展区 / 展项的 show 字段为隐藏时，默认不显示"
                    onClick={() => setShowHidden((v) => !v)}
                >
                    {showHidden ? <EyeIcon className="mr-1 size-4" /> : <EyeOffIcon className="mr-1 size-4" />}
                    显示隐藏节点
                </Button>

                <Badge variant="secondary" className="h-8 px-2">
                    绑定 {binds.length} 条
                </Badge>

                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => fitView({ duration: 300, padding: 0.2 })}>
                        适应视图
                    </Button>
                    <Button size="sm" className="h-8" onClick={() => modeId != null && void loadBinds(modeId)}>
                        刷新
                    </Button>
                </div>
            </div>

            {/* 画布 */}
            <div ref={wrapRef} className="relative flex-1 overflow-hidden rounded-lg border border-border">
                <ReactFlow
                    nodes={displayNodes}
                    edges={displayEdges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2, minZoom: 0.2, maxZoom: 1.2 }}
                    minZoom={0.15}
                    maxZoom={1.8}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable
                    proOptions={{ hideAttribution: true }}
                    onPaneClick={() => setMenu(null)}
                    onNodeContextMenu={(event, node) => {
                        event.preventDefault();
                        const rect = wrapRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        setMenu({
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top,
                            node: node.data as unknown as SmodelNodeData,
                        });
                    }}
                    onNodeClick={(_event, node) => {
                        const d = node.data as unknown as SmodelNodeData;
                        if (d.kind === "bind" && d.bind) {
                            setDrawer({
                                open: true,
                                pavilion: { id: d.pavilionId!, name: d.pavilionName ?? "" },
                                exhibit: d.exhibitId != null ? { id: d.exhibitId, name: d.exhibitName ?? "" } : null,
                                editing: d.bind,
                            });
                        }
                    }}
                >
                    <Background variant={BackgroundVariant.Dots} size={1} gap={20} color="hsl(var(--border))" />
                    <Controls showInteractive={false} className="opacity-60!" />
                    <MiniMap
                        nodeStrokeWidth={2}
                        zoomable
                        pannable
                        className="border! border-border!"
                        maskColor="hsl(var(--muted) / 0.3)"
                    />
                </ReactFlow>

                {/* 右键菜单 */}
                {menu && (
                    <div
                        className="absolute z-50 min-w-36 rounded-md border border-border bg-popover p-1 shadow-md"
                        style={{ left: menu.x, top: menu.y }}
                    >
                        {(menu.node.kind === "exhibit" || menu.node.kind === "pavilion") && (
                            <button
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                                onClick={() => { openAdd(menu.node); setMenu(null); }}
                            >
                                <PlusIcon className="size-3.5" /> 新增绑定
                            </button>
                        )}
                        {menu.node.kind === "bind" && menu.node.bind && (
                            <button
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                                onClick={() => {
                                    const d = menu.node;
                                    setDrawer({
                                        open: true,
                                        pavilion: { id: d.pavilionId!, name: d.pavilionName ?? "" },
                                        exhibit: d.exhibitId != null ? { id: d.exhibitId, name: d.exhibitName ?? "" } : null,
                                        editing: d.bind ?? null,
                                    });
                                    setMenu(null);
                                }}
                            >
                                编辑绑定
                            </button>
                        )}
                    </div>
                )}

                {!loading && binds.length === 0 && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                        <span className="rounded-md border border-border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground">
                            当前模式还没有任何绑定：右键展项或展厅节点可新增
                        </span>
                    </div>
                )}
            </div>

            <BindDialog
                variant={variant}
                open={drawer.open}
                onOpenChange={(open) => setDrawer((prev) => ({ ...prev, open }))}
                mode={currentMode ? { id: currentMode.id, name: currentMode.name } : null}
                pavilion={drawer.pavilion}
                exhibit={drawer.exhibit}
                editing={drawer.editing}
                onChanged={() => void loadBinds(modeId)}
            />
        </div>
    );
}

export function ModeNodeView({ variant }: { variant: ModeVariant }) {
    return (
        <ReactFlowProvider>
            <NodeViewInner variant={variant} />
        </ReactFlowProvider>
    );
}

/** 兼容旧引用：软件模式 */
export function SmodelNodeView() {
    return <ModeNodeView variant="software" />;
}

export default ModeNodeView;
