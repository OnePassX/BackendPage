import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";

export interface EntityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    /** 保存中：禁用按钮，防止重复提交 */
    saving?: boolean;
    onSubmit: () => void;
    children: ReactNode;
    submitText?: string;
}

/**
 * 快捷创建各实体表单的统一弹窗外壳。
 *
 * 只负责布局与按钮状态，字段与保存逻辑由各自的 Form 组件提供，
 * 与后台管理页的 Dialog 保持同一套视觉。
 */
export function EntityDialog({
    open,
    onOpenChange,
    title,
    description,
    saving = false,
    onSubmit,
    children,
    submitText = "保存",
}: EntityDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-180">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                <form
                    className="w-full"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!saving) onSubmit();
                    }}
                >
                    <FieldGroup>{children}</FieldGroup>
                </form>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        取消
                    </Button>
                    <Button onClick={onSubmit} disabled={saving}>
                        {saving ? "保存中..." : submitText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
