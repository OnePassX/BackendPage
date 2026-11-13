import { useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import { GridIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type IconComponent = React.ComponentType<{ className?: string }>;

// lucide-react 全部导出（与 app-sidebar 的图标解析方式一致，按名称索引组件）
const iconModule = LucideIcons as unknown as Record<string, unknown>;
// const iconModule = LucideIcons as unknown as Record<
//     string,
//     React.ComponentType<{ className?: string }>
// >
const iconLookup = iconModule as Record<string, IconComponent>;

// 预收集去重后的图标名称：同一组件同时导出基础名与 Icon 后缀名，优先保留 Icon 后缀，
// 与现有菜单数据（如 BoxIcon、MenuIcon）保持一致
const ICON_NAMES: string[] = (() => {
	const seen = new Map<unknown, string>();
	for (const [name, comp] of Object.entries(iconModule)) {
		if (typeof comp !== "object" || comp === null) continue;
		// 仅保留带字符串 displayName 的图标组件，排除 base `Icon`（displayName 为 undefined）
		// 及其他非图标导出（函数、icons 映射等）
		if (typeof (comp as { displayName?: unknown }).displayName !== "string") continue;
		const existing = seen.get(comp);
		if (!existing || (name.endsWith("Icon") && !existing.endsWith("Icon"))) {
			seen.set(comp, name);
		}
	}
	return [...seen.values()].sort((a, b) => a.localeCompare(b));
})();

interface IconPickerProps {
	/** 当前图标名称（lucide-react 导出名，如 MenuIcon） */
	value: string;
	/** 图标变化回调（手动输入或从面板选择都会触发） */
	onChange: (value: string) => void;
	/** 透传给内部 Input 的 id（用于 FieldLabel htmlFor 关联） */
	id?: string;
	placeholder?: string;
	disabled?: boolean;
}

export function IconPicker({
	value,
	onChange,
	id,
	placeholder,
	disabled = false,
}: IconPickerProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [search, setSearch] = useState("");

	const CurrentIcon = iconLookup[value];
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return ICON_NAMES;
		return ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
	}, [search]);

	const handleSelect = (name: string) => {
		onChange(name);
		setDialogOpen(false);
	};

	return (
		<div className="flex items-center gap-2">
			<Input
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder ?? "请输入图标名称或点击右侧按钮选择"}
				disabled={disabled}
			/>
			<Button
				type="button"
				variant="outline"
				size="icon"
				title="选择图标"
				onClick={() => setDialogOpen(true)}
				disabled={disabled}
			>
				{CurrentIcon ? <CurrentIcon className="size-4" /> : <GridIcon className="size-4" />}
			</Button>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-180">
					<DialogHeader>
						<DialogTitle>选择图标</DialogTitle>
						<DialogDescription>共 {ICON_NAMES.length} 个图标，可输入关键字搜索</DialogDescription>
					</DialogHeader>
					<Input
						autoFocus
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="搜索图标名称..."
					/>
					<div className="max-h-80 overflow-y-auto rounded-lg border p-2">
						<div className="flex flex-wrap justify-center gap-1">
							{filtered.map((name) => {
								const Icon = iconLookup[name];
								const isSelected = name === value;
								return (
									<button
										type="button"
										key={name}
										title={name}
										onClick={() => handleSelect(name)}
										className={cn(
											"flex size-9 items-center justify-center rounded-md transition-colors",
											isSelected
												? "bg-primary text-primary-foreground"
												: "hover:bg-muted"
										)}
									>
										<Icon className="size-4" />
									</button>
								);
							})}
						</div>
						{filtered.length === 0 && (
							<p className="py-8 text-center text-sm text-muted-foreground">未找到匹配的图标</p>
						)}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
							取消
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
