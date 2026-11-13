import type { ComponentProps } from "react";
import { Handle, type HandleProps } from "@xyflow/react";

import { cn } from "@/lib/utils";

export type BaseHandleProps = HandleProps;

export function BaseHandle({
    className,
    children,
    ...props
}: ComponentProps<typeof Handle>) {
    return (
        <Handle
            {...props}
            className={cn(
                "dark:border-secondary dark:bg-secondary size-3! rounded-full border-2! bg-slate-100 transition",
                className,
            )}
        >
            {children}
        </Handle>
    );
}