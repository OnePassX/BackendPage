import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { apiUploadContent } from "@/api/apiClient";

export interface UploadedFile {
    /** 后端返回的文件名（缺省回退本地文件名） */
    name: string;
    /** 后端返回的访问地址 */
    url: string;
}

interface FileUploadProps {
    accept?: string;
    maxSize?: number;
    /** 上传接口，默认内容素材上传；后端返回 { code, msg, url, name } */
    url?: string;
    /** 已有文件地址（编辑时回显） */
    value?: string;
    /** 已有文件名（编辑时回显） */
    fileName?: string;
    disabled?: boolean;
    /** 上传成功：把文件名/地址交给表单 */
    onUploaded?: (file: UploadedFile) => void;
    /** 清空：父级同时清掉表单里的文件名/地址 */
    onClear?: () => void;
    /** 上传中状态变化，父级可用于禁用保存 */
    onUploadingChange?: (uploading: boolean) => void;
}

/**
 * 文件上传（受控输出）。
 *
 * 走 transport（apiUploadContent），因此会话 cookie、CSRF、错误归一都与其他接口一致；
 * 不再自己拼 XHR、不再硬编码后端地址。
 * 选择文件后立即上传，成功后通过 onUploaded 把 { name, url } 回填给表单。
 */
export function FileUpload({
    accept = "*",
    maxSize = 10 * 1024 * 1024,
    url = "/api/upload/uploadContent",
    value = "",
    fileName = "",
    disabled = false,
    onUploaded,
    onClear,
    onUploadingChange,
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const [currentName, setCurrentName] = useState(fileName);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [percent, setPercent] = useState(0);
    const [error, setError] = useState("");

    // 外部（打开编辑弹窗）切换文件时同步显示
    useEffect(() => {
        setCurrentName(fileName);
    }, [fileName]);

    // 卸载时中断进行中的上传
    useEffect(() => () => {
        abortRef.current?.abort();
    }, []);

    const changeUploading = (next: boolean) => {
        setUploading(next);
        onUploadingChange?.(next);
    };

    const upload = async (file: File) => {
        // 同一时间只允许一个上传
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        // 旧请求被中断后其 finally 仍会执行，这里用身份判断避免它关掉新请求的上传中状态
        const isCurrent = () => abortRef.current === controller;

        setError("");
        setPercent(0);
        changeUploading(true);
        try {
            const res = await apiUploadContent({
                url,
                file,
                signal: controller.signal,
                onUploadProgress: (e) => {
                    if (isCurrent() && e.total) setPercent(Math.round((e.loaded / e.total) * 100));
                },
            });
            if (!isCurrent()) return;
            const uploaded: UploadedFile = {
                name: res?.name || file.name,
                url: res?.url || "",
            };
            setCurrentName(uploaded.name);
            onUploaded?.(uploaded);
            toast.success("上传成功");
        } catch (e) {
            if (!isCurrent()) return;
            // 主动取消不提示
            const name = (e as Error)?.name;
            if (name === "CanceledError" || name === "AbortError") return;
            const msg = e instanceof Error ? e.message : "上传失败，请重新选择文件";
            setError(msg);
            setCurrentName("");
            toast.error(msg);
        } finally {
            if (isCurrent()) changeUploading(false);
        }
    };

    const pickFile = (file?: File | null) => {
        if (!file || disabled) return;
        if (file.size > maxSize) {
            const msg = `文件超过最大限制 ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
            setError(msg);
            toast.error(msg);
            return;
        }
        setCurrentName(file.name);
        void upload(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        pickFile(e.target.files?.[0]);
        // 允许重复选择同一个文件
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        pickFile(e.dataTransfer.files?.[0]);
    };

    const handleClear = () => {
        abortRef.current?.abort();
        setCurrentName("");
        setPercent(0);
        setError("");
        if (inputRef.current) inputRef.current.value = "";
        onClear?.();
    };

    const hasFile = Boolean(currentName || value);

    return (
        <div className="w-full space-y-2">
            <Card
                className={`p-4 border-2 border-dashed transition-colors ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"}`}
                onClick={() => !disabled && !uploading && inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled && !uploading) setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept={accept}
                    disabled={disabled || uploading}
                    onChange={handleInputChange}
                />
                <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        {uploading ? "上传中…" : "点击 / 拖拽文件上传"}
                    </p>
                    {hasFile && (
                        <p className="text-xs font-medium break-all">
                            {currentName || value}
                        </p>
                    )}
                    {value && !uploading && (
                        <p className="text-[11px] text-muted-foreground break-all">{value}</p>
                    )}
                </div>
            </Card>

            {uploading && (
                <div className="space-y-1">
                    <Progress value={percent} />
                    <p className="text-xs text-muted-foreground text-right">{percent}%</p>
                </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            {hasFile && !uploading && (
                <div className="flex justify-end">
                    <Button type="button" variant="secondary" size="sm" onClick={handleClear} disabled={disabled}>
                        清空文件
                    </Button>
                </div>
            )}
        </div>
    );
}
