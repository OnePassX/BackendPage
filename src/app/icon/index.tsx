import { useState, useEffect, useRef } from "react";

import { Trash2Icon, UploadIcon, LoaderIcon } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

import { getIconList, addIcon, deleteIcon } from "@/api/icon";

interface IconItem {
    id: number;
    name: string;
    filename: string;
    address: string;
    svgname: string;
}

export default function IconPage() {
    const [icons, setIcons] = useState<IconItem[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const fetchIcons = async () => {
        setLoading(true);
        try {
            const res = await getIconList({ page: 1, limit: 1000 });
            // console.log(res)
            setIcons(res.data || []);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载图标失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchIcons(); }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const name = file.name.replace(/\.[^/.]+$/, "");
        setUploading(true);
        try {
            await addIcon(name, file);
            toast.success("上传成功");
            fetchIcons();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "上传失败");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("确认删除？")) return;
        try {
            await deleteIcon(id);
            toast.success("删除成功");
            fetchIcons();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">图标管理</h1>
                <div className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? (
                            <LoaderIcon className="mr-1 size-4 animate-spin" />
                        ) : (
                            <UploadIcon className="mr-1 size-4" />
                        )}
                        {uploading ? "上传中..." : "上传图标"}
                    </Button>
                </div>
            </div>
            <ScrollArea className="h-[calc(100dvh-200px)] border border-border rounded-lg" >
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">加载中...</div>
                ) : icons.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">暂无图标</div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 p-2">
                        {icons.map((icon) => (
                            <Card key={icon.id} className="group relative overflow-hidden">
                                <CardContent className="flex flex-col items-center gap-2 p-4">
                                    <div className="flex size-16 items-center justify-center">
                                        {
                                            icon.svgname == "" ? (
                                                <img src={icon.address} className="size-16" />
                                            ) : (
                                                <div className="max-h-full max-w-full object-contain inline-flex items-center justify-center text-foreground" dangerouslySetInnerHTML={{ __html: icon.svgname }} ></div>
                                            )
                                        }
                                    </div>
                                    <span className="max-w-full truncate text-base text-muted-foreground">{icon.name}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1 size-6 opacity-0 group-hover:opacity-100"
                                        onClick={() => handleDelete(icon.id)}
                                        title="删除"
                                    >
                                        <Trash2Icon className="size-4 text-destructive" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
