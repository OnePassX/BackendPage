
import {
	Trash2Icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export function DeleteDialog({
	view,
    label,
	onDelete
}: {
	view: React.ReactNode;
    label: string;
	onDelete: () => void;
}) { 
	return (
		<AlertDialog>
			<AlertDialogTrigger render={
				<Button variant="ghost" size="sm" >{view}</Button>
			}>
			</AlertDialogTrigger>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
						<Trash2Icon />
					</AlertDialogMedia>
					<AlertDialogTitle>确认删除?</AlertDialogTitle>
					<AlertDialogDescription>
                        { label }
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
				<AlertDialogCancel variant="outline">取消</AlertDialogCancel>
				<AlertDialogAction variant="destructive" onClick={()=>onDelete()}>确认</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
    	</AlertDialog>
	)
};
