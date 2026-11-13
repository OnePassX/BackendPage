import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LoaderIcon, FileIcon } from "lucide-react";
import { getMenuTree } from "@/api/menu";

interface ApiMenu {
    id: number;
    name: string;
    url: string;
    children?: ApiMenu[];
}

function findMenuItem(items: ApiMenu[], path: string): string | null {
    for (const item of items) {
        if (item.children) {
            const found = findMenuItem(item.children, path);
            if (found) return found;
        }
        const itemUrl = item.url?.startsWith("/") ? item.url : `/server/${item.url}`;
        if (itemUrl === path) return item.name;
    }
    return null;
}

export default function MenuRoutePage() {
    const location = useLocation();
    const [label, setLabel] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLabel = async () => {
            try {
                const res = await getMenuTree();
                const list: ApiMenu[] = Array.isArray(res.data) ? res.data : [];
                const found = findMenuItem(list, location.pathname);
                setLabel(found);
            } catch {
                setLabel(null);
            } finally {
                setLoading(false);
            }
        };
        fetchLabel();
    }, [location.pathname]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <FileIcon className="size-12 opacity-30" />
            <p className="text-lg font-medium">{label ?? "未知页面"}</p>
            <p className="text-sm">页面组件待实现</p>
        </div>
    );
}
