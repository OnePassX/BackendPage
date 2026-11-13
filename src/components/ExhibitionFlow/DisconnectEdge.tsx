import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    useReactFlow,
    type EdgeProps,
} from '@xyflow/react';
import { X } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button"
export default function DisconnectEdge({ id, sourceX, sourceY, targetX, targetY, style }: EdgeProps) {
    const { deleteElements, getEdges } = useReactFlow();
    
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });

    const deleteEdge = () => {
        const edge = getEdges().find((e) => e.id === id);
        if (edge) deleteElements({ edges: [edge] });
    };
    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} />
            <EdgeLabelRenderer>
                <AlertDialog>
                    <AlertDialogTrigger render={
                        <Button size='icon-xs' className='absolute! size-4.5' variant="destructive" style={{
                            position: 'absolute',
                            transform: `translate(-50%, -80%) translate(${targetX}px,${targetY}px)`,
                            pointerEvents: 'all',
                        }}>
                            <X className='size-3 '/>
                        </Button>
                    }>
                        
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle>取消连接</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription>
                            <span className='text-destructive'>是否确认断开连接？</span>
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                // setEdges((es) => es.filter((e) => e.id !== id));
                                deleteEdge()
                            }}>确定</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </EdgeLabelRenderer>
        </>
    );
}
