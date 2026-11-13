

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"


export function TipButton({
	view,
    label,
	variant = "ghost",
	size = "sm",
	onClick,
}: {
	view: React.ReactNode;
    label: string;
	variant?: "ghost" | "default" | "outline" | "secondary" | "destructive" | "link" ;
	size?: "sm" | "lg" | "default" | "xs" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
	onClick: () => void;
}) { 
	return (
		<Tooltip>
			<TooltipTrigger render={
				<Button variant={variant} size={size} onClick={()=>onClick()}>{view}</Button>
			}>
			</TooltipTrigger >
			<TooltipContent>
                { label }
			</TooltipContent>
    	</Tooltip>
	)
};
