import { useState, useEffect, useCallback } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    addEdge,
    SelectionMode,
    MiniMap,
    Panel,
    ReactFlowProvider,
    Position,
    useReactFlow,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type Connection,
    type OnNodesChange,
    type OnEdgesChange,
} from '@xyflow/react';
import CodeSideBar from './ExhibitionLinkSidebar'
import '@xyflow/react/dist/style.css';
import ButtonNode from './ButtonNode';
import dagre from '@dagrejs/dagre';
import { toast } from "sonner";
import { updateExhibitControl } from "@/api/exhibition";

const nodeWidth = 400;
const nodeHeight = 150;

// ---------- 数据类型 ----------
type CommandItem = {
    id?: string | number;
    label?: string;
    name: string;
    format?: number;
    protocal?: number;
    ip?: string;
    port?: string | number;
    code?: string;
    delay?: string | number;
    sort?: string | number;
};

type ControlItem = {
    label?: string;
    sort?: number;
    show?: boolean;
    device_code?: CommandItem[];
};

interface ContentControlData {
    id: number;
    label?: string;
    ip?: unknown;
    link?: unknown;
}

// ---------- 布局 ----------
const getLayoutedElements = (
    nodes: Node[],
    edges: Edge[],
    direction: 'TB' | 'LR' = 'TB',
) => {
    const isHorizontal = direction === 'LR';
    const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes: Node[] = nodes.map((node): Node => {
        const nodeWithPosition = dagreGraph.node(node.id);
        if (!nodeWithPosition) return node;
        return {
            ...node,
            targetPosition: isHorizontal ? Position.Left : Position.Top,
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            // dagre 以节点中心为锚点，转换为 React Flow 的左上角锚点
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: newNodes, edges };
};

const nodeTypes = { ButtonNode };

// ---------- 数据解析 ----------
function parseControlItems(controlData: ContentControlData | null): ControlItem[] {
    // console.log('parseControlItems', controlData);
    const raw = controlData?.link;
    if (raw == null || raw === '') return [];
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) return parsed as ControlItem[];
    } catch {
        console.log("非法 JSON，按空流程处理")
    }
    return [];
}

function normalizeItem(item: ControlItem): ControlItem {
    // console.log(item)
    return {
        label: typeof item?.label === 'string' ? item.label : '未命名',
        show: item?.show ?? true,
        sort: item?.sort ?? 1,
        device_code: Array.isArray(item?.device_code) ? item.device_code : [],
    };
}

// ---------- 树 → 图 ----------
function buildNode(items: ControlItem[]): { nodes: Node[]; edges: Edge[] } {

    // console.log(items)
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    nodes.push({
        id: 'start',
        data: { label: '开始' },
        position: { x: 0, y: 0 },
        selectable: false,
        style: { background: 'green', fontSize: '20px', color: 'white', border: '1px solid white' },
    });

    const makeButtonNode = (id: string, data: ControlItem): Node => ({
        id,
        data: normalizeItem(data),
        type: 'ButtonNode',
        position: { x: 0, y: 0 },
        selected: false,
    });

    const makeEdge = (source: string, target: string, handle:string): Edge => ({
        id: `e-${source}-${target}`,
        source,
        target,
        sourceHandle: handle,
        type: 'simplebezier',
        animated: true,
    });

    const recursiveTraverse = (
        list: ControlItem[],
        parentId: string | null,
        prefix: string,
    ) => {
        list.forEach((item, index) => {
            const curButtonId = prefix ? `button-${prefix}-${index}` : `button-${index}`;
            nodes.push(makeButtonNode(curButtonId, item));
            if (parentId) {
                edges.push(makeEdge(parentId, curButtonId,'children'));
            }
        });
    };

    recursiveTraverse(items, null, '');

    // 所有第一层按钮节点连接到 start 节点
    items.forEach((_item, index) => {
        edges.push(makeEdge('start', `button-${index}`,''));
    });

    return { nodes, edges };
}

// ---------- 图 → 树（序列化） ----------
function buildControlTree(nodes: Node[], edges: Edge[]): ControlItem[] {
    const dataMap = new Map<string, ControlItem>();
    for (const node of nodes) {
        if (node.id === 'start') continue;
        dataMap.set(node.id, (node.data ?? {}) as ControlItem);
    }

    console.log(dataMap)
    const childMap = new Map<string, string[]>();
    for (const edge of edges) {
        if (edge.source === 'start' || edge.source === edge.target) continue;
        const list = childMap.get(edge.source) ?? [];
        if (!list.includes(edge.target)) list.push(edge.target);
        childMap.set(edge.source, list);
    }

    const build = (id: string, visited: Set<string>): ControlItem => {
        const data = dataMap.get(id) ?? {};
        const item = normalizeItem(data);
        if (visited.has(id)) {
            // 防止循环连接导致死循环
            return item;
        }
        
        return item;
    };

    const roots = edges.filter((edge) => edge.source === 'start').map((edge) => edge.target);
    return roots.map((rootId) => build(rootId, new Set()));
}

// ---------- 画布（需要 Provider 内的 hook） ----------
const FlowCanvas = ({
    nodes,
    edges,
    fitVersion,
    onLayout,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodesDelete,
}: {
    nodes: Node[];
    edges: Edge[];
    fitVersion: number;
    onLayout: (direction: 'TB' | 'LR') => void;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (connection: Connection) => void;
    onNodesDelete: (deleted: Node[]) => void;
}) => {
    const { fitView } = useReactFlow();

    useEffect(() => {
        if (fitVersion > 0 && nodes.length > 0) {
            fitView({ padding: 0.2, duration: 200 });
        }
    }, [fitVersion, nodes.length, fitView]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            panOnScroll
            fitView
            deleteKeyCode={null}
            selectionMode={SelectionMode.Partial}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
        >
            <Panel position="top-right">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onLayout('TB')}
                        className="cursor-pointer rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-sm hover:bg-muted"
                    >
                        纵向布局
                    </button>
                    <button
                        type="button"
                        onClick={() => onLayout('LR')}
                        className="cursor-pointer rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-sm hover:bg-muted"
                    >
                        横向布局
                    </button>
                </div>
            </Panel>
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
            <Background />
            <Controls />
        </ReactFlow>
    );
};

// ---------- 主组件 ----------
const Index = ({ controlData, onSaved }: { controlData: ContentControlData | null; onSaved?: (eLink: string) => void }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [fitVersion, setFitVersion] = useState(0);
    const [saving, setSaving] = useState(false);

    const contentId = controlData?.id ?? null;
    const rawIp = controlData?.ip;
    const defaultIp = typeof rawIp === 'string' ? rawIp : '';

    const applyLayout = useCallback(
        (nextNodes: Node[], nextEdges: Edge[], direction: 'TB' | 'LR' = 'TB') => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                nextNodes,
                nextEdges,
                direction,
            );
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
            setFitVersion((v) => v + 1);
        },
        [setNodes, setEdges],
    );

    // controlData 变化时重建流程图
    useEffect(() => {
        if (controlData == null) {
            setNodes([]);
            setEdges([]);
            return;
        }
        const items = parseControlItems(controlData);
        const { nodes: nn, edges: ne } = buildNode(items);
        applyLayout(nn, ne, 'TB');
    }, [controlData, applyLayout, setNodes, setEdges]);

    // 建立连接：阻止自连 / 指向开始节点 / 成环 / 重复连接
    const onConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) return;
            if (connection.source === connection.target) {
                toast.warning('不能连接节点自身');
                return;
            }
            if (connection.target === 'start') {
                toast.warning('「开始」节点不能作为子节点');
                return;
            }
            const exists = edges.some(
                (e) =>
                    e.source === connection.source &&
                    e.target === connection.target &&
                    e.sourceHandle === connection.sourceHandle,
            );
            if (exists) {
                toast.warning('已存在相同的连接');
                return;
            }
            // 检测是否成环：target 已是 source 的祖先
            const childMap = new Map<string, string[]>();
            for (const e of edges) {
                if (e.source === 'start') continue;
                const list = childMap.get(e.source) ?? [];
                list.push(e.target);
                childMap.set(e.source, list);
            }
            const stack = [connection.target];
            const seen = new Set<string>();
            let formsCycle = false;
            while (stack.length) {
                const cur = stack.pop() as string;
                if (cur === connection.source) {
                    formsCycle = true;
                    break;
                }
                if (seen.has(cur)) continue;
                seen.add(cur);
                stack.push(...(childMap.get(cur) ?? []));
            }
            if (formsCycle) {
                toast.warning('该连接会形成循环，已阻止');
                return;
            }
            setEdges((eds) => addEdge({ ...connection, type: 'simplebezier', animated: true }, eds));
        },
        [edges, setEdges],
    );

    // 键盘删除节点后，清理关联边
    const handleNodesDelete = useCallback(
        (deleted: Node[]) => {
            const ids = new Set(deleted.map((n) => n.id));
            setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
        },
        [setEdges],
    );

    // 侧边栏：添加按钮节点（选中节点的子节点；未选中时添加到顶层）
    const handleAddNode = useCallback(() => {
        const parentId = 'start';
        const newId = `button-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const newNode: Node = {
            id: newId,
            type: 'ButtonNode',
            position: { x: 0, y: 0 },
            data: normalizeItem({ label: '新按钮' }),
            selected: false,
        };
        const newEdge: Edge = {
            id: `e-${parentId}-${newId}`,
            source: parentId,
            target: newId,
            type: 'simplebezier',
            animated: true,
        };
        const nextNodes = nodes.map((n) => ({ ...n, selected: false }));
        nextNodes.push({ ...newNode, selected: true });
        applyLayout(nextNodes, [...edges, newEdge], 'TB');
    }, [nodes, edges, applyLayout]);

    // 侧边栏：删除节点及其子树
    const handleDeleteNode = useCallback(
        (node: Node | null | undefined) => {
            if (!node || node.id === 'start') return;
            const removeIds = new Set<string>([node.id]);
            let changed = true;
            while (changed) {
                changed = false;
                for (const edge of edges) {
                    if (removeIds.has(edge.source) && !removeIds.has(edge.target)) {
                        removeIds.add(edge.target);
                        changed = true;
                    }
                }
            }
            setNodes((nds) => nds.filter((n) => !removeIds.has(n.id)));
            setEdges((eds) => eds.filter((e) => !removeIds.has(e.source) && !removeIds.has(e.target)));
        },
        [edges, setNodes, setEdges],
    );

    const handleLayout = useCallback(
        (direction: 'TB' | 'LR') => {
            applyLayout(nodes, edges, direction);
        },
        [nodes, edges, applyLayout],
    );

    // 保存：图 → e_link JSON → 后端
    const handleSave = useCallback(async () => {
        if (contentId == null) {
            toast.error('缺少内容 ID，无法保存');
            return;
        }
        try {
            setSaving(true);
            const e_link = JSON.stringify(buildControlTree(nodes, edges));
            await updateExhibitControl({ id: contentId, e_link });
            toast.success('展项快捷控制保存成功');
            // 把最新 JSON 回传给宿主，宿主可据此更新本地缓存，避免关闭后整树刷新
            onSaved?.(e_link);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : '保存失败');
        } finally {
            setSaving(false);
        }
    }, [contentId, nodes, edges, onSaved]);

    return (
        <ReactFlowProvider>
            <div className="flex h-full w-full min-h-100 rounded-lg border border-border overflow-hidden">
                <div className="flex-1 relative">
                    <FlowCanvas
                        nodes={nodes}
                        edges={edges}
                        fitVersion={fitVersion}
                        onLayout={handleLayout}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodesDelete={handleNodesDelete}
                    />
                </div>
                <CodeSideBar
                    nodes={nodes}
                    setNodes={setNodes}
                    defaultIp={defaultIp}
                    onAddNode={handleAddNode}
                    onDeleteNode={handleDeleteNode}
                    onSave={handleSave}
                    saving={saving}
                />
            </div>
        </ReactFlowProvider>
    );
};

export default Index
