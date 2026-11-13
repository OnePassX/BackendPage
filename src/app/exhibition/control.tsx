import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon, SendIcon } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import {
  getControlList, addControl, updateControl, deleteControl, sendControl,
} from "@/api/exhibition";

interface ControlItem {
  id: number;
  name: string;
  code: string;
  device: string;
  params: string;
  status: number;
  create_time: string;
}

const defaultForm = { name: "", code: "", device: "", params: "", status: 1 };

export default function ControlPage() {
  const [data, setData] = useState<ControlItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ControlItem | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getControlList();
      const raw = res.data;
      if (Array.isArray(raw)) {
        setData(raw);
      } else if (raw && typeof raw === "object" && "items" in raw) {
        setData((raw as { items: ControlItem[] }).items ?? []);
      } else {
        setData([]);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setFormData(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (row: ControlItem) => {
    setEditing(row);
    setFormData({ name: row.name, code: row.code, device: row.device, params: row.params, status: row.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateControl({ id: editing.id, ...formData });
        toast.success("更新成功");
      } else {
        await addControl(formData);
        toast.success("添加成功");
      }
      setDialogOpen(false);
      fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除？")) return;
    try {
      await deleteControl(id);
      toast.success("删除成功");
      fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  };

  const handleSend = async (id: number) => {
    try {
      await sendControl({ id });
      toast.success("指令已发送");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "发送失败");
    }
  };

  const columns: ColumnDef<ControlItem>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "指令名称" },
    { accessorKey: "code", header: "指令码" },
    { accessorKey: "device", header: "设备" },
    { accessorKey: "params", header: "参数" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <Badge variant={row.original.status === 1 ? "default" : "secondary"}>
          {row.original.status === 1 ? "启用" : "禁用"}
        </Badge>
      ),
    },
    { accessorKey: "create_time", header: "创建时间" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)} title="编辑">
            <PencilIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleSend(row.original.id)} title="发送">
            <SendIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)} title="删除">
            <Trash2Icon className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">控制指令</h1>
        <Button onClick={openAdd}>
          <PlusIcon className="mr-1 size-4" /> 新增指令
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchPlaceholder="搜索指令名称/码..."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-180">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑指令" : "新增指令"}</DialogTitle>
            <DialogDescription>
              {editing ? "修改指令信息" : "填写新指令的信息"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ctrl-name">指令名称</Label>
              <Input id="ctrl-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入指令名称" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ctrl-code">指令码</Label>
              <Input id="ctrl-code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="请输入指令码" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ctrl-device">设备</Label>
              <Input id="ctrl-device" value={formData.device} onChange={(e) => setFormData({ ...formData, device: e.target.value })} placeholder="请输入设备" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ctrl-params">参数</Label>
              <Input id="ctrl-params" value={formData.params} onChange={(e) => setFormData({ ...formData, params: e.target.value })} placeholder="请输入参数" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ctrl-status">状态</Label>
              <Select value={String(formData.status)} onValueChange={(v) => setFormData({ ...formData, status: Number(v) })}>
                <SelectTrigger id="ctrl-status"><SelectValue placeholder="选择状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="0">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
