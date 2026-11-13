import { useState, useEffect } from "react";

import { PlusIcon, CheckIcon, XIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { toast } from "sonner";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { DataTable } from "@/components/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { TipButton } from "@/components/tip-button";

import { getProcessList, addProcess } from "@/api/model";

interface IntervalItem {
    id: number;
    every: number;
    period: string;
}

interface CrontanItem {
    id: number;
    minute: string;
    hour: string;
    day_of_week: string;
    day_of_month: string;
    month_of_year:string;
}

interface Process { 
    id: number;
    name: string;
    task: string; 
    interval: IntervalItem | null; 
    crontab: CrontanItem | null;
    description: string; 
}

export default function ProcessTab() {
    const [data, setData] = useState<Process[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: "", command: "", description: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getProcessList();
            const raw = res.data;
            if (Array.isArray(raw)) setData(raw);
            else if (raw && typeof raw === "object" && "items" in raw) setData((raw as { items: Process[] }).items ?? []);
            else setData([]);
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "加载失败"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);
    const openAdd = () => { setForm({ name: "", command: "", description: "" }); setDialogOpen(true); };

    const openEdit = (row: Process) => { }

    const handleSave = async () => {
        try { await addProcess(form); toast.success("添加成功"); setDialogOpen(false); fetchData(); }
        catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
    };

    const handleDelete = async( id: number) => {

    }

    const columns: ColumnDef<Process>[] = [
        { accessorKey: "id", header: "ID" },
        { accessorKey: "name", header: "名称" },
        { 
            accessorKey: "task", 
            header: "执行的TASK"
        },
        { 
            accessorKey: "interval", 
            header: "调度器", cell: ({ row }) => (
                row.original.interval !== null ?
                <div className="flex justify-start items-center gap-1">
                    <span>每</span>
                    <span>{row.original.interval.every}</span>
                    <span>{row.original.interval.period}</span>
                </div> 
                : 
                <div className="flex flex-col justify-start items-left gap-1">
                    <span>小时：{row.original.crontab.hour}</span>
                    <span>分钟：{row.original.crontab.minute}</span>
                    <span>每周的第 {row.original.crontab.day_of_week} 天</span>
                    <span>每月的第 {row.original.crontab.day_of_month} 天</span>
                    <span>每年的第 {row.original.crontab.month_of_year} 个月</span>
                </div>
            )
        },
        {
            accessorKey: "last_run_at", 
            header: "最后一次运行的时间",
            cell: (info) => (info.getValue() || "-")
        },
        {
            accessorKey: "total_run_count", 
            header: "运行总次数"
        },
        { 
            accessorKey: "enabled", 
            header: "启用", cell: (info) => (
                info.getValue() ? 
                <Button variant="default" size="icon-xs" className="rounded-full bg-green-500"><CheckIcon /></Button> 
                : 
                <Button variant="default" size="icon-xs" className="rounded-full bg-yellow-500"><XIcon /></Button>
            )
        },
        {
            id: "actions", header: "操作",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <TipButton view={<PencilIcon className="size-4" />} label="命令编辑" onClick={() => openEdit(row.original)} />
                    <DeleteDialog view={<Trash2Icon className="size-4 text-destructive" />} label={'删除后不可恢复数据，请谨慎操作。'}  onDelete={()=>handleDelete(row.original.id)}/>
                </div>
            ),
        }
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">共 {data.length} 条</span>
                <Button size="sm" onClick={openAdd}><PlusIcon className="mr-1 size-4" /> 新增</Button>
            </div>
            <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="搜索进程..." pageSize={5} />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader><DialogTitle>新增进程</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2"><Label>名称</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="flex flex-col gap-2"><Label>命令</Label><Input value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} /></div>
                        <div className="flex flex-col gap-2"><Label>描述</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                        <Button onClick={handleSave}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}