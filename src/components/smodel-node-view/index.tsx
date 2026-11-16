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
import dagre from "@dagrejs/dagre";
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
import { getSmodelList, getSmodelBindList } from "@/api/model";
import { getExhibitTree } from "@/api/exhibition";
import SmodelNode from "./SmodelNode";
import { BindDrawer } from "./BindDrawer";
import type { SmodelBindRow, SmodelNodeData, TreePavilion } from "./types";

/**
 * 软件模式「节点视图」：模式 → 展厅 → 展区 → 展项 → 绑定。
 *
 * 数据：
 *   - 模式列表  GET /smodel/list
 *   - 展项树    GET /exhibition/tree
 *   - 绑定      GET /smodelbind/list
 *       优先 `?model_id&all=1`（后端支持后一次取全量）；
 *       后端尚未支持时回退为「按展厅 + 按展项」逐个取（N 次并行）。
 *
 * 交互：点击绑定节点编辑延时 / 删除；右键展项或展厅节点新增绑定；搜索定位。
 */

const NODE_SIZE: Record<SmodelNodeData["kind"], { w: number; h: number }> = {
    mode: { w: 176, h: 64 },
    pavilion: { w: 176, h: 60 },
    machine: { w: 160, h: 52 },
    exhibit: { w: 176, h: 76 },
    bind: { w: 208, h: 88 },
};

const nodeTypes = { smodel: SmodelNode };

function normalizeList(raw: unknown): any[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "items" in (raw as any)) {
        return (raw as { items: any[] }).items ?? [];
    }
    return [];
}

/** 后端是否已支持 `all=1`（首次探测后记住，避免每次多打一次请求） */
let allModeSupported: boolean | null = null;

async function fetchBinds(modeId: number, tree: TreePavilion[]): Promise<SmodelBindRow[]> {
    if (allModeSupported !== false) {
        try {
            const res = await getSmodelBindList({ model_id: modeId, all: 1 });
            allModeSupported = true;
            return normalizeList(res.data) as SmodelBindRow[];
        } catch {
            allModeSupported = false;
        }
    }

    const fetchOne = async (params: Record<string, unknown>): Promise<SmodelBindRow[]> => {
        try {
            const res = await getSmodelBindList(params);
            return normalizeList(res.data) as SmodelBindRow[];
        } catch {
            // 该范围没有绑定时后端返回 code:-1，按空处理
            return [];
        }
    };

    const tasks: Promise<SmodelBindRow[]>[] = [];
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

function layout(nodes: Node<SmodelNodeData>[], edges: Edge[]): Node<SmodelNodeData>[] {
    const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 90, marginx: 24, marginy: 24 });
    nodes.forEach((n) => {
        const size = NODE_SIZE[n.data.kind] ?? NODE_SIZE.bind;
        g.setNode(n.id, { width: size.w, height: size.h });
    });
    edges.forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    return nodes.map((n) => {
        const p = g.node(n.id);
        const size = NODE_SIZE[n.data.kind] ?? NODE_SIZE.bind;
        return p ? { ...n, position: { x: p.x - size.w / 2, y: p.y - size.h / 2 } } : n;
    });
}

function buildGraph(
    mode: { id: number; name: string; current?: number },
    tree: TreePavilion[],
    binds: SmodelBindRow[],
    showHidden: boolean,
): { nodes: Node<SmodelNodeData>[]; edges: Edge[] } {
    const nodes: Node<SmodelNodeData>[] = [];
    const edges: Edge[] = [];

    const byExhibit = new Map<number, SmodelBindRow[]>();
    const byPavilion = new Map<number, SmodelBindRow[]>();
    for (const b of binds) {
        const exId = b.exhibition?.id ?? null;
        if (exId != null) {
            if (!byExhibit.has(exId)) byExhibit.set(exId, []);
            byExhibit.get(exId)!.push(b);
        } else if (b.pavilion && typeof b.pavilion === "object") {
            if (!byPavilion.has(b.pavilion.id)) byPavilion.set(b.pavilion.id, []);
            byPavilion.get(b.pavilion.id)!.push(b);
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
        b: SmodelBindRow,
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
                label: b.type === 2 ? "设备绑定" : "内容绑定",
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

function NodeViewInner() {
    const [modes, setModes] = useState<any[]>([]);
    const [modeId, setModeId] = useState<number | null>(null);
    const [tree, setTree] = useState<TreePavilion[]>([]);
    const [binds, setBinds] = useState<SmodelBindRow[]>([]);
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
        editing: SmodelBindRow | null;
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
                const [mRes, tRes] = await Promise.all([getSmodelList({ page: 1, limit: 1000 }), getExhibitTree()]);
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
    }, []);

    const loadBinds = useCallback(async (id: number | null) => {
        if (id == null) {
            setBinds([]);
            return;
        }
        setLoading(true);
        try {
            setBinds(await fetchBinds(id, tree));
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载绑定失败");
            setBinds([]);
        } finally {
            setLoading(false);
        }
    }, [tree]);

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
                const hay = `${d.label} ${d.sub ?? ""} ${d.bind?.bind?.name ?? ""} ${d.bind?.code?.name ?? ""}`.toLowerCase();
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
                        placeholder="搜索展项 / 内容 / 命令"
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
                        {menu.node.kind === "bind" && (
                            <>
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
                            </>
                        )}
                        {menu.node.kind === "bind" && !menu.node.bind && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">无可用操作</div>
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

            <BindDrawer
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

export function SmodelNodeView() {
    return (
        <ReactFlowProvider>
            <NodeViewInner />
        </ReactFlowProvider>
    );
}

export default SmodelNodeView;
