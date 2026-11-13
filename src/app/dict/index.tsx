import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react";
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
  getDictList, addDict, updateDict, deleteDict,
  getDictDataList, addDictData, updateDictData, deleteDictData,
} from "@/api/dict";

interface DictType { id: number; name: string; type: string; status: number; }
interface DictData { id: number; label: string; value: string; sort: number; status: number; dictType?: string; }

const defaultTypeForm = { name: "", type: "", status: 1 };
const defaultDataForm = { label: "", value: "", sort: 0, status: 1 };

export default function DictPage() {
  const [types, setTypes] = useState<DictType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<DictType | null>(null);

  const [dataItems, setDataItems] = useState<DictData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Type dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeEditing, setTypeEditing] = useState<DictType | null>(null);
  const [typeForm, setTypeForm] = useState(defaultTypeForm);

  // Data dialog
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [dataEditing, setDataEditing] = useState<DictData | null>(null);
  const [dataForm, setDataForm] = useState(defaultDataForm);

  const fetchTypes = async () => {
    setTypesLoading(true);
    try {
      const res = await getDictList();
      const raw = res.data;
      if (Array.isArray(raw)) setTypes(raw);
      else if (raw && typeof raw === "object" && "items" in raw) setTypes((raw as { items: DictType[] }).items ?? []);
      else setTypes([]);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "加载失败"); }
    finally { setTypesLoading(false); }
  };

  useEffect(() => { fetchTypes(); }, []);

  const fetchDataItems = async (typeId: number) => {
    setDataLoading(true);
    try {
      const res = await getDictDataList({ dictType: typeId });
      const raw = res.data;
      if (Array.isArray(raw)) setDataItems(raw);
      else if (raw && typeof raw === "object" && "items" in raw) setDataItems((raw as { items: DictData[] }).items ?? []);
      else setDataItems([]);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "加载失败"); }
    finally { setDataLoading(false); }
  };

  const selectType = (type: DictType) => {
    setSelectedType(type);
    fetchDataItems(type.id);
  };

  // Type CRUD
  const openTypeAdd = () => { setTypeEditing(null); setTypeForm(defaultTypeForm); setTypeDialogOpen(true); };
  const openTypeEdit = (row: DictType) => { setTypeEditing(row); setTypeForm({ name: row.name, type: row.type, status: row.status }); setTypeDialogOpen(true); };
  const handleTypeSave = async () => {
    try {
      if (typeEditing) { await updateDict({ id: typeEditing.id, ...typeForm }); toast.success("更新成功"); }
      else { await addDict(typeForm); toast.success("添加成功"); }
      setTypeDialogOpen(false); fetchTypes();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
  };
  const handleTypeDelete = async (id: number) => {
    if (!confirm("确认删除？")) return;
    try { await deleteDict(id); toast.success("删除成功"); fetchTypes(); if (selectedType?.id === id) { setSelectedType(null); setDataItems([]); } }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "删除失败"); }
  };

  // Data CRUD
  const openDataAdd = () => { setDataEditing(null); setDataForm(defaultDataForm); setDataDialogOpen(true); };
  const openDataEdit = (row: DictData) => { setDataEditing(row); setDataForm({ label: row.label, value: row.value, sort: row.sort, status: row.status }); setDataDialogOpen(true); };
  const handleDataSave = async () => {
    try {
      const payload = { ...dataForm, dictType: selectedType?.type };
      if (dataEditing) { await updateDictData({ id: dataEditing.id, ...payload }); toast.success("更新成功"); }
      else { await addDictData(payload); toast.success("添加成功"); }
      setDataDialogOpen(false); if (selectedType) fetchDataItems(selectedType.id);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
  };
  const handleDataDelete = async (id: number) => {
    if (!confirm("确认删除？")) return;
    try { await deleteDictData(id); toast.success("删除成功"); if (selectedType) fetchDataItems(selectedType.id); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "删除失败"); }
  };

  const typeColumns: ColumnDef<DictType>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "字典名称" },
    { accessorKey: "type", header: "字典类型" },
    { accessorKey: "status", header: "状态", cell: ({ row }) => <Badge variant={row.original.status === 1 ? "default" : "secondary"}>{row.original.status === 1 ? "启用" : "禁用"}</Badge> },
    { id: "actions", header: "操作", cell: ({ row }) => <div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={() => openTypeEdit(row.original)}><PencilIcon className="size-4" /></Button><Button variant="ghost" size="sm" onClick={() => handleTypeDelete(row.original.id)}><Trash2Icon className="size-4 text-destructive" /></Button></div> },
  ];

  const dataColumns: ColumnDef<DictData>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "label", header: "字典标签" },
    { accessorKey: "value", header: "字典值" },
    { accessorKey: "sort", header: "排序" },
    { accessorKey: "status", header: "状态", cell: ({ row }) => <Badge variant={row.original.status === 1 ? "default" : "secondary"}>{row.original.status === 1 ? "启用" : "禁用"}</Badge> },
    { id: "actions", header: "操作", cell: ({ row }) => <div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={() => openDataEdit(row.original)}><PencilIcon className="size-4" /></Button><Button variant="ghost" size="sm" onClick={() => handleDataDelete(row.original.id)}><Trash2Icon className="size-4 text-destructive" /></Button></div> },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <h1 className="text-xl font-semibold">字典管理</h1>

      <div className="flex gap-4">
        {/* Left: dictionary types */}
        <div className="w-1/3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">字典类型</span>
            <Button size="sm" variant="outline" onClick={openTypeAdd}><PlusIcon className="size-4" /></Button>
          </div>
          <div className="rounded-lg border border-border">
            <DataTable columns={typeColumns} data={types} loading={typesLoading} searchPlaceholder="搜索字典..." pageSize={5} />
          </div>
        </div>

        {/* Right: dictionary data for selected type */}
        <div className="flex-1 min-w-0">
          {selectedType ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  字典数据 — <span className="text-muted-foreground">{selectedType.name}</span>
                </span>
                <Button size="sm" variant="outline" onClick={openDataAdd}><PlusIcon className="mr-1 size-4" /> 新增</Button>
              </div>
              <DataTable columns={dataColumns} data={dataItems} loading={dataLoading} searchPlaceholder="搜索数据..." pageSize={5} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
              请从左侧选择一个字典类型
            </div>
          )}
        </div>
      </div>

      {/* Type dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader><DialogTitle>{typeEditing ? "编辑字典类型" : "新增字典类型"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2"><Label>字典名称</Label><Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} /></div>
            <div className="flex flex-col gap-2"><Label>字典类型</Label><Input value={typeForm.type} onChange={(e) => setTypeForm({ ...typeForm, type: e.target.value })} /></div>
            <div className="flex flex-col gap-2"><Label>状态</Label><Select value={String(typeForm.status)} onValueChange={(v) => setTypeForm({ ...typeForm, status: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">启用</SelectItem><SelectItem value="0">禁用</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTypeDialogOpen(false)}>取消</Button><Button onClick={handleTypeSave}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Data dialog */}
      <Dialog open={dataDialogOpen} onOpenChange={setDataDialogOpen}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader><DialogTitle>{dataEditing ? "编辑字典数据" : "新增字典数据"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2"><Label>字典标签</Label><Input value={dataForm.label} onChange={(e) => setDataForm({ ...dataForm, label: e.target.value })} /></div>
            <div className="flex flex-col gap-2"><Label>字典值</Label><Input value={dataForm.value} onChange={(e) => setDataForm({ ...dataForm, value: e.target.value })} /></div>
            <div className="flex flex-col gap-2"><Label>排序</Label><Input type="number" value={dataForm.sort} onChange={(e) => setDataForm({ ...dataForm, sort: Number(e.target.value) })} /></div>
            <div className="flex flex-col gap-2"><Label>状态</Label><Select value={String(dataForm.status)} onValueChange={(v) => setDataForm({ ...dataForm, status: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">启用</SelectItem><SelectItem value="0">禁用</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDataDialogOpen(false)}>取消</Button><Button onClick={handleDataSave}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
