import { useEffect, useState } from "react";
import { PiWarningCircleFill } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

/**
 * 确认弹窗（原 HeroUI Modal 的 shadcn 实现）。
 *
 * 受控用法：父组件维护 open / onOk / onCancel。
 * - 点「取消」「确认」只调用父组件回调，由父组件把 open 置 false；
 * - 点遮罩 / ESC 视为取消，回调 onCancel（父组件同样会把 open 置 false）。
 */
export const XJ_Modal = (props) => {
    const { title, children, open, onOk, onCancel } = props;

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setIsOpen(!!open);
    }, [open]);

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(next) => {
                if (!next) {
                    setIsOpen(false);
                    onCancel?.();
                }
            }}
        >
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-black/40">{title}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-row items-center gap-2 text-xl text-[#8A42EB]">
                    <PiWarningCircleFill size={24} />
                    {children}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onCancel?.()}>
                        取消
                    </Button>
                    <Button onClick={() => onOk?.()}>
                        确认
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
