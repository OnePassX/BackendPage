/**
 * 模式节点视图（软件模式 / 硬件模式共用）的共享类型。
 *
 * 数据来源：
 *   - 展项树：GET /exhibition/tree（展厅 → 展区 → 展项）
 *   - 绑定：  GET /smodelbind/list 或 /hmodelbind/list
 *
 * 两种模式的绑定结构不同：
 *   软件模式：{ type: 1 内容 / 2 设备, bind: {id,name}, code, delay }
 *   硬件模式：{ device: {id,name,ip}, code, delay }（没有 type）
 * 图里统一归一化成 GraphBind。
 */

export type ModeVariant = "software" | "hardware";

/** 展项树（getExhibitTree 的返回结构） */
export interface TreeExhibit {
    id: number;
    name: string;
    /** 1 显示 / 2 隐藏 */
    show?: number;
}

export interface TreeMachine {
    id: number;
    name: string;
    show?: number;
    children: TreeExhibit[];
}

export interface TreePavilion {
    id: number;
    name: string;
    show?: number;
    children: TreeMachine[];
}

/** 命令信息（两种模式的 code 结构基本一致，缺 ip 时可选） */
export interface GraphCode {
    id: number;
    name: string;
    ip?: string;
    format?: string;
    protocal?: string;
    port?: number;
    code?: string;
}

/** 归一化后的绑定，图与 Drawer 都用这个 */
export interface GraphBind {
    id: number;
    /** 配色与徽标：内容 / 设备 / 硬件 */
    bindKind: "content" | "device" | "hardware";
    /** 徽标文案 */
    badge: string;
    /** 绑定对象名称（内容名 / 设备名） */
    bindName: string;
    code: GraphCode | null;
    delay: number;
    /** 原始行，Drawer 编辑时用 */
    raw: any;
}

/** 图节点数据 */
export interface SmodelNodeData {
    /** xyflow 的 Node 泛型要求 Record<string, unknown>，这里显式满足约束 */
    [key: string]: unknown;
    kind: "mode" | "pavilion" | "machine" | "exhibit" | "bind";
    label: string;
    /** 副标题（数量 / 命令摘要） */
    sub?: string;
    /** bind 节点对应的绑定记录 */
    bind?: GraphBind;
    /** 所属展厅（用于新增绑定时回填） */
    pavilionId?: number;
    pavilionName?: string;
    /** 所属展项；展厅级绑定为 null */
    exhibitId?: number | null;
    exhibitName?: string;
    /** 机器（展区）id：machine 节点存自身 id，exhibit 节点存父机器 id，用于自定义布局 */
    machineId?: number;
    /** 展项在当前模式下没有任何绑定 */
    unbound?: boolean;
    /** 绑定已存在但没配命令 */
    missingCode?: boolean;
    /** 展厅/展区/展项的 show !== 1（含祖先被隐藏的情况） */
    hidden?: boolean;
}
