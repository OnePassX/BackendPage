export interface FlowNodeData {
  [key: string]: unknown;
  id: number;
  label: string;
  kind: "pavilion" | "machine" | "exhibit" | "device" | "content";
  summary?: string;
  re?: string;
  e_base?: string;
  m_p?: number;
  e_m?: number;
  show?: number;
}

export interface FlowActions {
  onAddChild: ( node: FlowNodeData, type:string ) => void;
  onEdit: (node: FlowNodeData) => void;
  onDelete: (node: FlowNodeData) => void;
  onContentControlEdit: (node: FlowNodeData) => void;
  onDeviceControlEdit: (node: FlowNodeData) => void;
  /** 展项：编辑快捷控制（e_link） */
  onExhibitControlEdit: (node: FlowNodeData) => void;
  /** 内容：文件下发 */
  onContentDownload: (node: FlowNodeData) => void;
  /** 设备：手动探活 */
  onDeviceProbe: (node: FlowNodeData) => void;
}
