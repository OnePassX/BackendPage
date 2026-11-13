import { Position, type HandleProps } from "@xyflow/react";
import { BaseHandle } from "@/components/xyflow/base-handle";
 
const wrapperClassNames: Record<Position, string> = {
  [Position.Top]:
    "flex-col-reverse left-1/2 -translate-y-full -translate-x-1/2",
  [Position.Bottom]: "flex-col left-1/2 translate-y-[10px] -translate-x-1/2",
  [Position.Left]:
    "flex-row-reverse top-1/2 -translate-x-full -translate-y-1/2",
  [Position.Right]: "top-1/2 -translate-y-1/2 translate-x-[10px]",
};
 
export function ButtonHandle({
  showButton = true,
  showLabel = true,
  title,
  position = Position.Bottom,
  children,
  ...props
}: HandleProps & { showButton?: boolean,showLabel?:boolean,title: string }) {
  const wrapperClassName = wrapperClassNames[position || Position.Bottom];
  const vertical = position === Position.Top || position === Position.Bottom;
 
  return (
    <BaseHandle position={position} id={props.id} {...props}>
      {showButton && (
        <div
          className={`absolute flex items-center ${wrapperClassName} pointer-events-none`}
        >
          <div
            className={`bg-gray-300 ${vertical ? "h-4 w-px" : "h-px w-4"}`}
          />
          <div className="nodrag nopan pointer-events-auto">{children}</div>
        </div>
      )}
      {showLabel && (
        <label className="absolute -top-3 text-foreground text-nowrap text-[8px] pointer-events-none">
          {title}
        </label>
      )
      }
    </BaseHandle>
  );
}