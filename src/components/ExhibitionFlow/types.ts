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
}
