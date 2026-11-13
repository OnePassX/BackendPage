import React from 'react';
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { BadgeCheckIcon, ChevronRightIcon } from "lucide-react"

const FlowContextMenu = ({ top, left, right, bottom, ...props }) => {
    return (
        <div style={{ top, left, right, bottom }} 
            className="absolute z-100 w-auto h-auto" {...props}>
            <Command className="max-w-sm rounded-lg border">
                <CommandInput placeholder="输入命令或搜索..." />
                <CommandList className="scrollbar-thin">
                    <CommandEmpty>未找到结果。</CommandEmpty>
                    <CommandGroup heading="节点操作">
                        <CommandItem>添加展厅节点</CommandItem>
                        <CommandItem>添加展区节点</CommandItem>
                        <CommandItem>添加展项节点</CommandItem>
                        <CommandItem>添加设备节点</CommandItem>
                        <CommandItem>添加内容节点</CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="设置">
                        <CommandItem>刷新所有节点</CommandItem>
                        <CommandItem>视口重置</CommandItem>
                        <CommandItem>锁定节点</CommandItem>
                    </CommandGroup>
                </CommandList>
            </Command>
            
        </div>
  );
}

export default FlowContextMenu
