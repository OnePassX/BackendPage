/**
 * 软件模式节点视图的共享类型。
 *
 * 数据来源：
 *   - 展项树：GET /exhibition/tree（展厅 → 展区 → 展项）
 *   - 绑定：  GET /smodelbind/list（建议按模式一次取全量，见 all=1）
 */

/** 展项树（getExhibitTree 的返回结构） */
export interface TreeExhibit {
    id: number;
    name: string;
}

export interface TreeMachine {
    id: number;
    name: string;
    children: TreeExhibit[];
}

export interface TreePavilion {
    id: number;
    name: string;
    children: TreeMachine[];
}

/** 绑定对象（后端 list 的返回结构） */
export interface BindCode {
    id: number;
    name: string;
    ip: string;
    format: string;
    protocal: string;
    port: number;
    code: string;
}

export interface SmodelBindRow {
    id: number;
    model: { id: number; name: string } | "";
    pavilion: { id: number; name: string } | "";
    /** 展厅级绑定时为 null */
    exhibition: { id: number; name: string } | null;
    /** 1 绑定内容 / 2 绑定设备 */
    type: number;
    bind: { id: number; name: string };
    /** 未配置命令时为 null */
    code: BindCode | null;
    delay: number;
}

/** 图节点数据 */
export interface SmodelNodeData {
    /** xyflow 的 Node 泛型要求 Record<string, unknown>，这里显式满足约束 */
    [key: string]: unknown;
    kind: "mode" | "pavilion" | "machine" | "exhibit" | "bind";
    label: string;
    /** 副标题（IP / 数量 / 命令摘要） */
    sub?: string;
    /** bind 节点对应的绑定记录 */
    bind?: SmodelBindRow;
    /** 所属展厅（用于新增绑定时回填） */
    pavilionId?: number;
    pavilionName?: string;
    /** 所属展项；展厅级绑定为 null */
    exhibitId?: number | null;
    exhibitName?: string;
    /** 展项在当前模式下没有任何绑定 */
    unbound?: boolean;
    /** 绑定已存在但没配命令 */
    missingCode?: boolean;
}
