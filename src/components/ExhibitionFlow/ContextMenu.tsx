import type { LucideIcon } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";

/**
 * 画布右键菜单。
 *
 * 菜单内容由调用方按上下文（空白画布 / 某个节点）组装成 groups，
 * 这里只负责定位、搜索过滤与点击后关闭，避免把业务判断塞进展示组件。
 */

export interface ContextMenuItem {
    label: string;
    icon?: LucideIcon;
    onSelect: () => void;
    /** 危险操作（如删除）用红色显示 */
    destructive?: boolean;
}

export interface ContextMenuGroup {
    heading: string;
    items: ContextMenuItem[];
}

interface FlowContextMenuProps {
    top: number | false;
    left: number | false;
    right: number | false;
    bottom: number | false;
    groups: ContextMenuGroup[];
    onClose: () => void;
}

const FlowContextMenu = ({ top, left, right, bottom, groups, onClose }: FlowContextMenuProps) => {
    // 原实现把 false 直接塞进 style，这里按需拼装，避免无效样式值
    const style: React.CSSProperties = {};
    if (typeof top === "number") style.top = top;
    if (typeof left === "number") style.left = left;
    if (typeof right === "number") style.right = right;
    if (typeof bottom === "number") style.bottom = bottom;

    return (
        <div style={style} className="absolute z-100 w-auto h-auto">
            <Command className="max-w-sm rounded-lg border">
                <CommandInput placeholder="输入命令或搜索..." />
                <CommandList className="scrollbar-thin">
                    <CommandEmpty>未找到结果。</CommandEmpty>
                    {groups.map((group, index) => (
                        <div key={group.heading}>
                            {index > 0 && <CommandSeparator />}
                            <CommandGroup heading={group.heading}>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <CommandItem
                                            key={item.label}
                                            onSelect={() => {
                                                item.onSelect();
                                                onClose();
                                            }}
                                        >
                                            {Icon && <Icon className="mr-2 size-4" />}
                                            <span className={item.destructive ? "text-destructive" : undefined}>
                                                {item.label}
                                            </span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </div>
                    ))}
                </CommandList>
            </Command>
        </div>
    );
};

export default FlowContextMenu;
