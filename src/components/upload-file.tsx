import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadCloud } from "lucide-react";

interface FileUploadProps {
    accept?: string;
    maxSize?: number;
}

// 获取Django csrf token
function getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
}

export function FileUpload({ accept = "*", maxSize = 10 * 1024 * 1024 }: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    // 上传进度 0‑100
    const [uploadPercent, setUploadPercent] = useState(0);

    const handleSelectFile = (f: File) => {
        setMsg("");
        setUploadPercent(0);
        if (f.size > maxSize) {
            setMsg(`文件超过最大限制 ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
            return;
        }
        setFile(f);
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const targetFile = e.target.files?.[0];
        if (targetFile) handleSelectFile(targetFile);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const dropFile = e.dataTransfer.files?.[0];
        if (dropFile) handleSelectFile(dropFile);
    };

    // 使用 XMLHttpRequest 监听上传进度
    const handleUpload = () => {
        if (!file) return;
        setLoading(true);
        setMsg("");
        setUploadPercent(0);

        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "http://127.0.0.1:8000/api/upload/");
        xhr.withCredentials = true;
        xhr.setRequestHeader("X‑CSRFToken", getCsrfToken());

        // ✅上传进度回调
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadPercent(percent);
            }
        };

        xhr.onload = () => {
            setLoading(false);
            try {
                const res = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    setMsg(`✅上传成功：${res.url}`);
                } else {
                    setMsg(`❌${res.msg || "上传失败"}`);
                }
            } catch {
                setMsg("❌接口返回格式错误");
            }
        };

        xhr.onerror = () => {
            setLoading(false);
            setMsg("❌网络错误，请检查后端服务");
        };

        xhr.send(formData);
    };

    const handleClear = () => {
        setFile(null);
        setMsg("");
        setUploadPercent(0);
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="w-full space-y-4">
            <Card
                className={`p-6 border-2 border-dashed cursor-pointer transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                    }`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={onInputChange} value=""/>
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">点击 / 拖拽文件上传</p>
                    {file && <div className="text-sm font-medium mt-2">{file.name}</div>}
                </div>
            </Card>

            {/* 进度条，loading时显示 */}
            {loading && (
                <div className="space‑y‑1">
                    <Progress value={uploadPercent} />
                    <p className="text-xs text-muted‑foreground text-right">{uploadPercent}%</p>
                </div>
            )}

            {msg && <p className="text-sm">{msg}</p>}

            <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={!file || loading} className="flex‑1">
                    {loading ? "上传中..." : "提交上传"}
                </Button>
                <Button variant={"secondary"} onClick={handleClear}>清空</Button>
            </div>
        </div>
    );
}