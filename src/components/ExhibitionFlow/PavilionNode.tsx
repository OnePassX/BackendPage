import { memo } from "react";
import { Position, useConnection, type ConnectionState } from "@xyflow/react";
import { Building2Icon, MoreHorizontalIcon, PencilIcon, Trash2Icon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ButtonHandle } from "@/components/xyflow/button-handle"
// import type { FlowNodeData } from "./types";
import { useFlowActions } from "./flowContext";

const selector = (connection: ConnectionState) => {
	return connection.inProgress;
};

const PavilionNode = ({ data, selected }) => {
	// console.log(data)
	const actions = useFlowActions();
	const connectionInProgress = useConnection(selector);
	return (
		<div className={`w-44 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow ${ selected ? "ring-4 ring-black/40 dark:ring-white/80" : ""}`}>
			{/* Header */}
			<div className="flex items-center justify-between rounded-t-lg border-b border-border bg-blue-800/80 px-3 py-2 text-white">
				<div className="flex items-center gap-2 min-w-0">
					<Building2Icon className="size-4 shrink-0" />
					<span className="text-sm font-semibold truncate">{data.label}</span>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger render={
						<Button variant="ghost" size="icon" className="nodrag size-6 shrink-0">
							<MoreHorizontalIcon className="size-3.5" />
						</Button>
					} />
					<DropdownMenuContent align="end" className="min-w-28">
						{/* <DropdownMenuItem onClick={() => actions.onAddChild(data)}>
							<PlusIcon className="mr-2 size-4" />
							添加展区
						</DropdownMenuItem> */}
						
						<DropdownMenuItem onClick={() => actions.onEdit(data)}>
							<PencilIcon className="mr-2 size-4" />
							编辑展厅
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-destructive"
							onClick={() => actions.onDelete(data)}
						>
							<Trash2Icon className="mr-2 size-4" />
							删除展厅
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Body */}
			<div className="px-3 py-2 space-y-1.5">
				{data.summary && (
					<div className="text-[11px] text-muted-foreground line-clamp-2">
						{data.summary}
					</div>
				)}
				<div className="flex items-center justify-between">
					<span className="text-[11px] text-muted-foreground">状态</span>
					<Badge
						variant={data.show === 1 ? "default" : "secondary"}
						className="h-5 text-[10px] px-1.5"
					>
						{data.show === 1 ? "显示" : "隐藏"}
					</Badge>
				</div>
			</div>
			<Separator />
			<div className="h-4 bg-muted/50"></div>
			{/* Source handle at bottom */}

			{/* <Handle
				id='manage'
				type="source"
				position={Position.Bottom}
				style={{left:'33%'}}
				className="size-3! border-2! border-background! bg-green-500!"
				/>

				<Handle
				id='pavilion_device'
				type="source"
				style={{left:'66%'}}
				position={Position.Bottom}
				className="size-3! border-2! border-background! bg-blue-500!"
				/> 
			*/}

			<ButtonHandle
				id="pavilion_machine"
				type="source"
				className="left-1/3! bg-blue-500!"
				position={Position.Bottom}
				showButton={!connectionInProgress}
				showLabel={true}
				title={'展区'}
			>
				<Button
					onClick={()=>actions.onAddChild(data,'machine')}
					size="icon"
					variant="secondary"
					className="rounded-full size-6"
				>
					<Plus className="size-3" />
				</Button>
			</ButtonHandle>

			<ButtonHandle
				id="pavilion_device"
				type="source"
				className="left-2/3! bg-green-500!"
				position={Position.Bottom}
				showButton={!connectionInProgress}
				showLabel={true}
				title={'设备'}
			>
				<Button
					onClick={()=>actions.onAddChild(data,'device')}
					size="xs"
					variant="secondary"
					className="size-6! rounded-full!"
				>
					<Plus className="size-3" />
				</Button>
			</ButtonHandle>

		</div>
	);
}

export default memo(PavilionNode);
