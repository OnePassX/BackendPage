import { useState, useEffect, useRef, useMemo, useCallback, type DragEvent } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type Connection,
    SelectionMode,
    BackgroundVariant,
    Panel,
    ControlButton,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, FileIcon } from "lucide-react";
import { Building2Icon, Columns2, GalleryThumbnails,CodeXml,Code,PanelLeftIcon} from "lucide-react";
import { Button } from "@/components/ui/button";
import ContextMenu from "./ContextMenu" 
import PavilionNode from "./PavilionNode";
import MachineNode from "./MachineNode";
import ExhibitNode from "./ExhibitNode";
import DeviceNode from "./DeviceNode";
import ContentNode from "./ContentNode";
import { Sidebar, UNLINKED_DRAG_KEY } from "./Sidebar";
import { FlowActionsContext } from "./flowContext";
import type { FlowNodeData, FlowActions } from "./types";
import DisconnectEdge from "./DisconnectEdge";
import { toast } from "sonner";


// ── Re-export types ──
export type { FlowNodeData, FlowActions } from "./types";
export { useFlowActions } from "./flowContext";

// ── Layout constants ──
const NODE_W = 176;
const NODE_H = 102;
const H_GAP = 24;
const V_GAP = 100;
const PAD = 24;
const PAV_GROUP_GAP = 50;

// ── Layout algorithm ──

interface linkItem {
	id: number;
	name: string;
}

interface LayoutInput {
    pavilions: Array<{ id: number; p_name: string; p_summary: string; p_re: string; show: number; sort: number }>;
    machines: Array<{ id: number; m_name: string; m_p: linkItem | null; m_summary: string; show: number; sort: number }>;
    exhibits: Array<{ id: number; e_name: string; e_m: linkItem | null; e_summary: string; e_ip: string; e_re: string; show: number; sort: number }>;
    devices: Array<{ id: number; num: string; name: string; dtype: object; ip: string; conpare: string; area: number; link:number; other:string; major:Boolean; sort: number }>;
    contents: Array<{id: number; e_id: number; c_name: string;c_file_status: object;c_file_type: object;c_file_name: string;c_file_addr: string;c_open: number;c_status: number;c_default: number;c_startup: number;c_control: object;c_iframe: string;c_iframe_show: number;c_link: string;note: string;sort: number;}>;
    // selectedExhibitId: number | null;
}

function groupBy<T, K>(items: T[], key: (item: T) => K | null): Map<K | null, T[]> {
    const map = new Map<K | null, T[]>();
    for (const item of items) {
        const k = key(item);
        const list = map.get(k) ?? [];
        list.push(item);
        map.set(k, list);
    }
    return map;
}

// Total width of a row of `count` nodes: nodes plus the gaps between them
// (no trailing gap).
const rowWidth = (count: number) => (count > 0 ? count * (NODE_W + H_GAP) - H_GAP : 0);

function buildFlow(input: LayoutInput): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
    const { pavilions, machines, exhibits, devices, contents } = input;
    // const { pavilions, machines, exhibits, devices, contents, selectedExhibitId } = input;

    const nodes: Node<FlowNodeData>[] = [];
    const edges: Edge[] = [];

    // Children grouped under their parent: machines under pavilions, exhibits
    // under machines, devices under pavilions or exhibits.
    const pavMachineMap = groupBy(machines, (m) => m.m_p?.id);
    const machExhibitMap = groupBy(exhibits, (e) => e.e_m?.id);

    const pavDeviceMap = groupBy(devices.filter(item=>item.area==2), (d) => d.link);
    const exDeviceMap = groupBy(devices.filter(item=>item.area==1), (d) => d.link);

    const exContentMap = groupBy(contents, (e) => e.e_id);
    // console.log(exContentMap)
    // console.log(pavDeviceMap,exDeviceMap)
    // Width of a two-column (multi-row) grid holding `count` items.
    const gridWidth = (count: number): number => (count > 0 ? (count >= 2 ? 2 * NODE_W + H_GAP : NODE_W) : 0);

    // Horizontal half-extent an exhibit occupies below itself: its node, or
    // the side-by-side device/content grids (contents left, devices right)
    // once either exists.
    const gridHalfWidth = (e: (typeof exhibits)[number]): number => {
        const devW = gridWidth((exDeviceMap.get(e.id) ?? []).length);
        const contentW = gridWidth((exContentMap.get(e.id) ?? []).length);
        const w = devW > 0 && contentW > 0 ? devW + H_GAP + contentW : Math.max(devW, contentW, NODE_W);
        return w / 2;
    };

    // Column centers for a two-column grid: one per column, or a single
    // centered column for a single item.
    const gridColumns = (count: number, gridLeft: number, gridW: number): number[] =>
        count >= 2
            ? [gridLeft + gridW / 2 - (NODE_W + H_GAP) / 2, gridLeft + gridW / 2 + (NODE_W + H_GAP) / 2]
            : [gridLeft + gridW / 2];

    // Center-to-center spacing between consecutive exhibits, keeping H_GAP
    // clearance between their grids; plain NODE_W + H_GAP when neither has one.
    const exhibitGap = (a: (typeof exhibits)[number], b: (typeof exhibits)[number]): number => gridHalfWidth(a) + gridHalfWidth(b) + H_GAP;

    // Total width of an exhibit row: first node plus the gaps between centers.
    const exhibitRowWidth = (list: (typeof exhibits)): number => {
        let w = NODE_W;
        for (let i = 0; i + 1 < list.length; i++) w += exhibitGap(list[i], list[i + 1]);
        return list.length > 0 ? w : 0;
    };

    // Width each machine slot must reserve: the exhibit row (spaced so the
    // two-column device/content grids of neighboring exhibits never touch), plus the
    // outermost grid extent.
    const machineSlotWidths = new Map<number, number>();
    for (const m of machines) {
        const children = machExhibitMap.get(m.id) ?? [];
        const exTotalW = exhibitRowWidth(children);
        machineSlotWidths.set(
            m.id,
            children.length > 0
                ? Math.max(
                      NODE_W,
                      exTotalW,
                      exTotalW - NODE_W + 2 * Math.max(gridHalfWidth(children[0]), gridHalfWidth(children[children.length - 1])),
                  )
                : NODE_W,
        );
    }

    // ── Node factories ──

    const makePavilionNode = (pav: (typeof pavilions)[number], x: number, y: number): Node<FlowNodeData> => ({
        id: `pavilion-${pav.id}`,
        type: "pavilion",
        position: { x, y },
        data: { id: pav.id, label: pav.p_name, kind: "pavilion", show: pav.show, summary: pav.p_summary, re: pav.p_re },
    });

    const makeMachineNode = (m: (typeof machines)[number], x: number, y: number): Node<FlowNodeData> => ({
        id: `machine-${m.id}`,
        type: "machine",
        position: { x, y },
        data: { id: m.id, label: m.m_name, kind: "machine", show: m.show, summary: m.m_summary, m_p: m.m_p?.id },
    });

    const makeExhibitNode = (e: (typeof exhibits)[number], x: number, y: number): Node<FlowNodeData> => ({
        id: `exhibit-${e.id}`,
        type: "exhibit",
        position: { x, y },
        data: { id: e.id, label: e.e_name, kind: "exhibit", show: e.show, summary: e.e_summary, re: e.e_re, e_m: e.e_m?.id, e_ip: e.e_ip },
        // selected: selectedExhibitId === e.id,
    });

    const makeDeviceNode = (d: (typeof devices)[number], x: number, y: number): Node<FlowNodeData> => ({
        id: `device-${d.id}`,
        type: "device",
        position: { x, y },
        data: { id: d.id, label: d.name, kind: "device", num: d.num, dtype: d.dtype, ip: d.ip, conpare: d.conpare, link: d.link, major: d.major },
    });

    const makeContentNode = (c: (typeof contents)[number], x: number, y: number): Node<FlowNodeData> => ({
        id: `content-${c.id}`,
        type: "content",
        position: { x, y },
        data: { id: c.id, label: c.c_name, e_id:c.e_id, kind: "content", 
            c_file_status: c.c_file_status, c_file_type: c.c_file_type, c_file_name: c.c_file_name, c_file_addr: c.c_file_addr,
            c_open: c.c_open, c_status: c.c_status, c_default: c.c_default, c_startup: c.c_startup, c_control: c.c_control,
            c_iframe: c.c_iframe, c_iframe_show: c.c_iframe_show, c_link: c.c_link,note: c.note,sort: c.sort,
        }
    })

    // ── Edge factories ──

    const machineEdge = (pavId: string, mId: string): Edge => ({
        id: `e-${pavId}-${mId}`,
        source: pavId,
        sourceHandle: "pavilion_machine",
        target: mId,
        type: "disconnect_edge",
        animated: true,
        style: { stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "6 4" },
    });

    const exhibitEdge = (mId: string, eId: string): Edge => ({
        id: `e-${mId}-${eId}`,
        source: mId,
        target: eId,
        type: "disconnect_edge",
        animated: true,
        style: { stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "6 4" },
    });

    const deviceEdge = (idPrefix: string, source: string, dId: string, sourceHandle: "exhibit_device" | "pavilion_device"): Edge => ({
        id: `e-${idPrefix}-${dId}`,
        source,
        sourceHandle,
        target: dId,
        type: "disconnect_edge",
        animated: true,
        style: { stroke: "#1ACE0A", strokeWidth: 2, strokeDasharray: "6 4" },
    });
    
    const contentEdge = (eId: string, cId: string): Edge => ({
        id: `e-${eId}-${cId}`,
        source: eId,
        target: cId,
        type: "disconnect_edge",
        animated: true,
        style: { stroke: "#f0b100", strokeWidth: 2, strokeDasharray: "6 4" },
    });

    // Machine node plus its exhibit row, laid out around the horizontal center
    // `mCenterX`. Each exhibit's devices form a two-column grid directly below
    // it; exhibit spacing and the slot width keep every grid non-overlapping.
    const buildMachineSubtree = (
        m: (typeof machines)[number],
        pavId: string | null,
        mCenterX: number,
        y: number,
    ) => {
        const mId = `machine-${m.id}`;
        const subNodes: Node<FlowNodeData>[] = [makeMachineNode(m, mCenterX - NODE_W / 2, y)];
        const subEdges: Edge[] = [];
        const mExhibits = machExhibitMap.get(m.id) ?? [];
        // console.log(machExhibitMap)
        if (mExhibits.length > 0) {
            const exTotalW = exhibitRowWidth(mExhibits);
            let exX = mCenterX - exTotalW / 2;
            const eY = y + NODE_H + V_GAP;

            for (let i = 0; i < mExhibits.length; i++) {
                const e = mExhibits[i];
                const eId = `exhibit-${e.id}`;
                subNodes.push(makeExhibitNode(e, exX, eY));
                subEdges.push(exhibitEdge(mId, eId));
                const eCenterX = exX + NODE_W / 2;

                // Devices and contents in two-column grids side by side on the
                // device row: contents left, devices right, the pair centered
                // on the exhibit.
                const eDevices = exDeviceMap.get(e.id) ?? [];
                const eContents = exContentMap.get(e.id) ?? [];
                const devW = gridWidth(eDevices.length);
                const contentW = gridWidth(eContents.length);
                if (devW > 0 || contentW > 0) {
                    const gap = devW > 0 && contentW > 0 ? H_GAP : 0;
                    const rowLeft = eCenterX - (devW + gap + contentW) / 2;
                    const gY = eY + NODE_H + V_GAP;

                    if (eDevices.length > 0) {
                        const devLeft = rowLeft + contentW + gap;
                        const cols = gridColumns(eDevices.length, devLeft, devW);
                        for (let k = 0; k < eDevices.length; k++) {
                            const d = eDevices[k];
                            const dId = `device-${d.id}`;
                            subNodes.push(
                                makeDeviceNode(d, cols[k % 2] - NODE_W / 2, gY + Math.floor(k / 2) * (NODE_H + V_GAP)),
                            );
                            subEdges.push(deviceEdge(pavId ?? mId, eId, dId, "exhibit_device"));
                        }
                    }

                    if (eContents.length > 0) {
                        const cols = gridColumns(eContents.length, rowLeft, contentW);
                        for (let k = 0; k < eContents.length; k++) {
                            const c = eContents[k];
                            const cId = `content-${c.id}`;
                            subNodes.push(
                                makeContentNode(c, cols[k % 2] - NODE_W / 2, gY + Math.floor(k / 2) * (NODE_H + V_GAP)),
                            );
                            subEdges.push(contentEdge(eId, cId));
                        }
                    }
                }
                
                if (i + 1 < mExhibits.length) exX += exhibitGap(e, mExhibits[i + 1]);
                
            }
        }

        return { subNodes, subEdges };
    };

    let pavGroupX = PAD;

    for (const pav of pavilions) {
        const pMachines = pavMachineMap.get(pav.id) ?? [];
        const pDevices = pavDeviceMap.get(pav.id) ?? [];
        const pavTotalW =
            pMachines.reduce((sum, m) => sum + (machineSlotWidths.get(m.id) ?? NODE_W), 0) +
            Math.max(0, pMachines.length - 1) * H_GAP;
        // The machine row also holds the pavilion's direct devices (after the
        // machines + trailing H_GAP), so the group must fit both.
        const machineRowEnd = pMachines.length > 0 ? pavTotalW + H_GAP : 0;
        const deviceRowW = rowWidth(pDevices.length);
        const pavSlotW = Math.max(
            NODE_W,
            pavTotalW,
            pDevices.length > 0 ? machineRowEnd + deviceRowW : 0,
        );
        const pavY = PAD;
        const pavId = `pavilion-${pav.id}`;

        nodes.push(makePavilionNode(pav, pavGroupX + (pavSlotW - NODE_W) / 2, pavY));

        let machineSlotX = pavGroupX;

        for (const m of pMachines) {
            const slotW = machineSlotWidths.get(m.id) ?? NODE_W;
            edges.push(machineEdge(pavId, `machine-${m.id}`));
            const { subNodes, subEdges } = buildMachineSubtree(
                m,
                pavId,
                machineSlotX + slotW / 2,
                pavY + NODE_H + V_GAP,
            );
            nodes.push(...subNodes);
            edges.push(...subEdges);
            machineSlotX += slotW + H_GAP;
        }

        // Devices linked directly to the pavilion, laid out on the machine row,
        // starting right after the last machine's slot (+ trailing H_GAP).
        let deviceSlotX = 0;
        for (const d of pDevices) {
            const dId = `device-${d.id}`;
            nodes.push(makeDeviceNode(d, machineSlotX + deviceSlotX, pavY + NODE_H + V_GAP));
            edges.push(deviceEdge(pavId, pavId, dId, "pavilion_device"));
            deviceSlotX += NODE_W + H_GAP;
        }

        pavGroupX += pavSlotW + PAV_GROUP_GAP;
    }

    return { nodes, edges };
}

// ── Node type registry ──

const nodeTypes = {
    pavilion: PavilionNode,
    machine: MachineNode,
    exhibit: ExhibitNode,
    device: DeviceNode,
    content: ContentNode,
};

// —— Edge type registry ——
const edgeTypes = {
    disconnect_edge: DisconnectEdge
}

// ── Props ──

export interface ExhibitionFlowProps {
    pavilions: LayoutInput["pavilions"];
    machines: LayoutInput["machines"];
    exhibits: LayoutInput["exhibits"];
    devices: LayoutInput["devices"];
    contents: LayoutInput["contents"];
    // selectedExhibitId: number | null;
    loading?: boolean;
    onAddChild: (node: FlowNodeData, type:string ) => void;
    onEdit: (node: FlowNodeData) => void;
    onDelete: (node: FlowNodeData) => void;
    onAddNode?: (kind: "pavilion" | "machine" | "exhibit" | "device") => void;
    onLinkNodes?: (source: FlowNodeData, target: FlowNodeData) => void;
    onDeleteLink?: (source: FlowNodeData, target: FlowNodeData) => void;
    onContentControlEdit: (node: FlowNodeData) => void;
    onDeviceControlEdit: (node: FlowNodeData) => void;
}

// ── Inner component (needs ReactFlowProvider context) ──

function ExhibitionFlowInner({
    pavilions,
    machines,
    exhibits,
    devices,
    contents,
    // selectedExhibitId,
    loading = false,
    onAddChild,
    onEdit,
    onDelete,
    onAddNode,
    onLinkNodes,
    onDeleteLink,
    onContentControlEdit,
    onDeviceControlEdit,
}: ExhibitionFlowProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [initialized, setInitialized] = useState(false);
    const reactFlowInstance = useReactFlow();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const ref = useRef(null);
 
    const [contextMenu, setContextMenu] = useState(null);

    // Stable callbacks context
    const actions = useMemo<FlowActions>(
        () => ({ onAddChild, onEdit, onDelete, onContentControlEdit,onDeviceControlEdit }),
        [onAddChild, onEdit, onDelete, onContentControlEdit,onDeviceControlEdit],
    );

    // Unlinked items (no parent): shown in the sidebar instead of the canvas.
    const unlinked = useMemo(
        () => ({
            machines: machines
                .filter((m) => m.m_p == null)
                .map((m) => ({ id: m.id, label: m.m_name, kind: "machine" as const, m_p: m.m_p?.id })),
            exhibits: exhibits
                .filter((e) => e.e_m == null)
                .map((e) => ({ id: e.id, label: e.e_name, kind: "exhibit" as const, e_m: e.e_m?.id })),
            devices: devices
                .filter((d) => d.area == 0 || d.link == null)
                .map((d) => ({ id: d.id, label: d.name, kind: "device" as const, num: d.num, area: d.area, link: d.link })),
        }),
        [machines, exhibits, devices],
    );

    // Recompute layout when data changes
    useEffect(() => {
        if (loading) return;
        const { nodes: nn, edges: ne } = buildFlow({
            pavilions,
            machines,
            exhibits,
            devices,
            contents,
            // selectedExhibitId,
        });
        setNodes(nn);
        setEdges(ne);
        setInitialized(true);
    }, [pavilions, machines, exhibits, devices, contents, loading, setNodes, setEdges]);

    const hasData = nodes.length > 0;

    // ── Connection handler ──

    const onConnect = useCallback(
        (connection: Connection) => {
            if (!onLinkNodes) return;
            console.log(connection)
            // 判断handle id是否可以连接
            if (!connection.sourceHandle || connection.sourceHandle.split('_')[1] !== connection.targetHandle){
                toast.error("不可连接！"); 
                return;
            };
            const sourceNode = nodes.find((n) => n.id === connection.source);
            const targetNode = nodes.find((n) => n.id === connection.target);
            if (!sourceNode || !targetNode) return;
            onLinkNodes(sourceNode.data, targetNode.data);
        },
        [nodes, onLinkNodes],
    );

    // —— Delete handler ——
    
    const onEdgesDelete = useCallback(
        (e: any)=>{
            console.log(e,nodes)
            if(!onDeleteLink) return;
            // const sourceNode = edges.find((n) => n.source === e.source);
            // const targetNode = edges.find((n) => n.id === e.target);
            // if (!sourceNode || !targetNode) return;
            e.length > 0 && e.map((item: Edge)=>{
                const sourceNode = nodes.find((n) => n.id === item.source);
                const targetNode = nodes.find((n) => n.id === item.target);
                if (!sourceNode || !targetNode) return;
                onDeleteLink(sourceNode.data, targetNode.data);
            })
        },
        [edges,nodes],
    );

    // ── Sidebar add handler ──

    const handleSidebarAdd = useCallback(
        (kind: "pavilion" | "machine" | "exhibit") => {
            onAddNode?.(kind);
        },
        [onAddNode],
    );

    // ── Drag & Drop from sidebar ──
    const onDragStart = useCallback(() => setContextMenu(null), [setContextMenu]);
    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onPaneClick = useCallback(() => setContextMenu(null), [setContextMenu]);
    
    const onPaneContextMenu = useCallback(
        (event: MouseEvent | React.MouseEvent) => {
            event.preventDefault();
            const pane = ref.current.getBoundingClientRect();
            // console.log(event,pane);
            setContextMenu({
                top: event.clientY < pane.height - 200 && event.clientY - pane.top,
                left: event.clientX < pane.width - 200 && event.clientX - pane.left,
                right: event.clientX >= pane.width - 200 && pane.width - event.clientX + pane.left,
                bottom: event.clientY >= pane.height - 200 && pane.height - event.clientY + pane.top,
            });
        },
        [setContextMenu],
    );

    const onNodeContextMenu = useCallback(
        (event: MouseEvent | React.MouseEvent) => { 
            event.preventDefault();
        },
        [onAddChild, onEdit, onDelete, onContentControlEdit, onDeviceControlEdit],
    );

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData("application/reactflow");
            if (type) {
                onAddNode?.(type as "pavilion" | "machine" | "exhibit");
                return;
            }

            // Dropping an unlinked sidebar item onto its parent node relinks it.
            const raw = event.dataTransfer.getData(UNLINKED_DRAG_KEY);
            if (!raw || !onLinkNodes) return;
            const { kind, id } = JSON.parse(raw) as { kind: FlowNodeData["kind"]; id: number };
            const point = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
            const targetNode = nodes.find(
                (n) =>
                    point.x >= n.position.x &&
                    point.x <= n.position.x + (n.measured?.width ?? NODE_W) &&
                    point.y >= n.position.y &&
                    point.y <= n.position.y + (n.measured?.height ?? NODE_H),
            );

            let item: FlowNodeData | undefined;
            let parent: FlowNodeData | undefined;
            if (kind === "machine" && targetNode?.data.kind === "pavilion") {
                item = unlinked.machines.find((m) => m.id === id);
                parent = targetNode.data;
            } else if (kind === "exhibit" && targetNode?.data.kind === "machine") {
                item = unlinked.exhibits.find((e) => e.id === id);
                parent = targetNode.data;
            } else if (kind === "device" && targetNode) {
                const dev = unlinked.devices.find((d) => d.id === id);
                if (dev && ((targetNode.data.kind === "exhibit") || (targetNode.data.kind === "pavilion"))) {
                    item = dev;
                    parent = targetNode.data;
                }
            }

            if (!targetNode || !item || !parent) {
                toast.error("请拖到对应的父节点上释放");
                return;
            }
            onLinkNodes(parent, item);
        },
        [onAddNode, onLinkNodes, nodes, reactFlowInstance, unlinked],
    );

    const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 1 }), []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-100 rounded-lg border border-border">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" />
                    <span className="text-sm">加载中...</span>
                </div>
            </div>
        );
    }

    if (!loading && initialized && !hasData) {
        return (
            <div className="flex items-center justify-center h-full min-h-100 rounded-lg border border-dashed border-border text-muted-foreground">
                <div className="text-center">
                    <FileIcon className="mx-auto size-8 mb-2 opacity-40" />
                    <p className="text-sm">暂无展览结构数据</p>
                </div>
            </div>
        );
    }

    return (
        <FlowActionsContext.Provider value={actions}>
            <div className="flex h-full w-full min-h-100 rounded-lg border border-border overflow-hidden">
                <Sidebar onAdd={handleSidebarAdd} unlinked={unlinked} open={sidebarOpen}/>
                <div className="flex-1 relative">
                    <ReactFlow
                        ref={ref}
                        // 节点
                        nodes={nodes} 
                        // 边
                        edges={edges} 
                        // 节点类型
                        nodeTypes={nodeTypes} 
                        // 边类型
                        edgeTypes={edgeTypes} 
                        // 节点改变事件
                        onNodesChange={onNodesChange} 
                        // 边改变事件
                        onEdgesChange={onEdgesChange} 
                        // 节点连接事件
                        onConnect={onConnect} 
                        // 删除边事件
                        onEdgesDelete={onEdgesDelete} 
                        // onNodeClick={onNodeClick}
                        // 拖拽事件
                        onDrop={onDrop} 
                        // 拖拽事件
                        onDragOver={onDragOver} 
                        // 设置视口的初始位置和缩放比例。如果系统提供了默认视口，但 fitView 处于启用状态，则默认视口将被忽略。
                        defaultViewport={defaultViewport} 
                        // 当 true 时，画面会自动缩放和平移，以显示最初所显示的所有节点
                        fitView = {true}
                        // 配置视口缩放和平移选项
                        fitViewOptions={{ padding: 0.3, minZoom: 0.5, maxZoom: 1.5 }}
                        // 节点是否可拖动
                        nodesDraggable={true}
                        // 边是否可连接
                        nodesConnectable={true}
                        // 节点是否可选中, 当使用 true 模式时，可以通过点击来选中各个元素（节点和边）。不过，各元素可以通过设置其 selectable 属性来取消这一默认设置。
                        elementsSelectable={true}
                        // 控制是否可以通过在容器内滚动来调整视口的位置。可以使用 panOnScrollMode 来限制滚动方向。
                        panOnScroll
                        // 无需按住 selectionKey 键，即可使用选择框选中多个元素。
                        selectionOnDrag
                        // 当设置为 "partial" 时，用户通过点击和拖动来创建选择区域时，那些只部分位于该区域内的节点也会被选中。
                        selectionMode={SelectionMode.Partial}
                        // 视口最低缩放级别
                        minZoom={0.3}
                        // 视口最高缩放级别
                        maxZoom={2}
                        // 版权信息位置
                        attributionPosition="bottom-left"
                        // 版权信息设置
                        proOptions={{ hideAttribution: true }}
                        // 按下该键或点击该节点将会删除所有被选中的节点和边，例如，当按下 ["Delete", "Backspace"] 或某个键时，将会删除所选元素。
                        deleteKeyCode={null}
                        // 当用户在窗格内右键点击时，就会调用这个事件处理程序。
                        onPaneContextMenu = {onPaneContextMenu}
                        // 当用户在窗格内点击时，就会调用这个事件处理程序。
                        onPaneClick = {onPaneClick}
                        // 当用户开始平移或缩放视图窗口时，就会调用这个事件处理程序。
                        onMoveStart = {onDragStart}
                        // 当用户右键点击某个节点时，会触发这个事件处理程序。
                        onNodeContextMenu = {onNodeContextMenu}
                        // 当 true 时，当某个节点被选中时，视口会随之移动
                        autoPanOnNodeFocus = {true}
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
                        <Panel position="top-right">
                            <div className="flex flex-col items-start bg-muted/60 p-2 border rounded-md gap-2 select-none">
                                <span className="text-muted-foreground text-xs">节点颜色标识</span>
                                <div className="flex flex-row justify-items-center text-white gap-2">
                                    <div className="size-14 bg-blue-800/80 flex flex-col justify-center items-center rounded-md gap-2">
                                        <Building2Icon className="size-5 shrink-0" />
                                        <span className="text-xs truncate">展厅</span>
                                    </div>
                                    <div className="size-14 bg-blue-600/80 flex flex-col justify-center items-center rounded-md gap-2">
                                        <Columns2 className="size-5 shrink-0" />
                                        <span className="text-xs truncate">展区</span>
                                    </div>
                                    <div className="size-14 bg-blue-400/80 flex flex-col justify-center items-center rounded-md gap-2">
                                        <GalleryThumbnails className="size-5 shrink-0" />
                                        <span className="text-xs truncate">展项</span>
                                    </div>
                                    <div className="w-px h-14 bg-primary/50 rounded-full"></div>
                                    <div className="size-14 bg-green-800/80 flex flex-col justify-center items-center rounded-md gap-2">
                                        <GalleryThumbnails className="size-5 shrink-0" />
                                        <span className="text-xs truncate">设备</span>
                                    </div>
                                    <div className="size-14 bg-black/80 flex flex-col justify-center items-center rounded-md gap-2">
                                        <CodeXml className="size-5 shrink-0" />
                                        <span className="text-xs truncate">硬件命令</span>
                                    </div>
                                    <div className="w-px h-14 bg-primary/50 rounded-full"></div>
                                    <div className="size-14 bg-yellow-500/80 flex flex-col justify-center items-center rounded-md gap-2">
                                        <FileIcon className="size-5 shrink-0" />
                                        <span className="text-xs truncate">内容</span>
                                    </div>
                                    <div className="size-14 bg-gray-500/80 flex flex-col justify-center items-center rounded-md gap-2">
                                        <Code className="size-5 shrink-0" />
                                        <span className="text-xs truncate">软件命令</span>
                                    </div>
                                </div>
                            </div>
                        </Panel>
                        <Panel position="top-left"> 
                            <Button variant="secondary" className="size-8" onClick={()=>setSidebarOpen(prev=>!prev)}><PanelLeftIcon /></Button>
                        </Panel>
                        <Controls />
                        {/* <Controls>
                            <ControlButton onClick={() => alert('Something magical just happened. ✨')}>
                            <PanelLeftIcon />
                            </ControlButton>
                        </Controls> */}
                        {
                            contextMenu && (
                                <ContextMenu {...contextMenu}/>
                            )
                        }
                    </ReactFlow>

                    
                </div>
            </div>
        </FlowActionsContext.Provider>
    );
}

// ── Public wrapper (provides ReactFlow context) ──

export default function ExhibitionFlow(props: ExhibitionFlowProps) {
    return (
        <ReactFlowProvider>
            <ExhibitionFlowInner {...props} />
        </ReactFlowProvider>
    );
}
