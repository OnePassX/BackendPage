import { useState, useEffect, useCallback, type ReactNode } from "react";

import { PencilIcon, Trash2Icon, PlusIcon, PanelBottomOpen, PanelTopOpen } from "lucide-react";
import { HiPlusSm, HiOutlineMinusSm, HiOutlineVolumeOff, HiOutlineVolumeUp } from "react-icons/hi";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,} from "@/components/ui/dialog";
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxValue,} from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,SelectGroup } from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel,} from "@/components/ui/field";
import { DataTableTree, type TreeColumn } from "@/components/data-table-tree";
import { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,} from "@/components/ui/alert-dialog";
import { Drawer, DrawerPortal, DrawerOverlay, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, DrawerContent,} from "@/components/ui/drawer";

import ExhibitionLinkFlow from "@/components/ExhibitionLinkFlow/ExhibitionLinkFlow";

import { getExhibitTree, addPavilion, updatePavilion, deletePavilion, addMachine, updateMachine, deleteMachine, addExhibit, updateExhibit, deleteExhibit,} from "@/api/exhibition";
import { getCodeList } from "@/api/device";

// ── Types ──────────────────────────────────────────
interface TreeItem {
    id: number;
    name: string;
    parentId: number | null;
    summary:  string;
    re: string;
    show: number;
    sort: number;
    type: 'pavilion' | 'machine' | 'exhibition'
    ip: string | null;
    base: string | null;
    link: string | null;
    children?: TreeItem[];
}

interface MenuFormData {
    name: string;
    icon: string;
    url: string;
    pid: number | null;
    type: number;
    permission: string;
    status: number;
    target: number;
    note: string;
    sort: number;
}

interface ResponseData {
    code: number;
    data: TreeItem[];
    msg: string;
}

type BaseBtn = {
	label: string
	value: string
	icon: ReactNode
}

// 类型
interface typeItem {
    id: number;
    name: string;
    ip: string|null;
}

// 命令
interface CodeItem {
    id: number;
    device: typeItem | null;
    code: string;
    name: string;
    ctype: typeItem;
    cformat: typeItem;
    protocal: typeItem;
    cport: number;
    note: string;
}


// ── Page ───────────────────────────────────────────
export default function PmePage() {

    const [tree, setTree] = useState<TreeItem[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Pavilion dialog state ---
	const [pavDialogOpen, setPavDialogOpen] = useState(false);
	const [pavEditing, setPavEditing] = useState<TreeItem | null>(null);
	const [pavForm, setPavForm] = useState({ p_name: "", p_summary: "", p_re: "", show: 1, sort: 0 });

	// --- Machine dialog state ---
	const [macDialogOpen, setMacDialogOpen] = useState(false);
	const [macEditing, setMacEditing] = useState<TreeItem | null>(null);
	const [macForm, setMacForm] = useState({ m_name: "", m_p: null, m_summary: "", m_re: "", show: 1, sort: 0 });

    // --- Exhibit dialog state ---
	const [exhDialogOpen, setExhDialogOpen] = useState(false);
	const [exhEditing, setExhEditing] = useState<TreeItem | null>(null);
	const [exhForm, setExhForm] = useState({ e_name: "", e_m: null, e_summary: "", e_re: "", e_ip: "", mac: "00-00-00-00-00-00",e_base:"1_2_3_4_5_6", show: 1, sort:0 });

    // --- Exhibit Control Flow Drawer state ---
    const [exhControlFlowDrawerOpen, setExhControlFlowDrawerOpen] = useState(false);
    const [selectedExh, setSelectedExh] = useState(null);

	// --- Device Code data ---
	const [deviceCodeData, setDeviceCodeData] = useState<CodeItem[]>([]);

    // --- Delete confirmation state ---
	const [deleteConfirm, setDeleteConfirm] = useState<{
		open: boolean;
		title: string;
		message: string;
		onConfirm: () => Promise<void>;
	}>({ open: false, title: "", message: "", onConfirm: async () => { } });

    const ShowItems = [{label:'显示',value:'1'},{label:'隐藏',value:'2'}]

    const BaseBtnItems:BaseBtn[] = [
        {value:"1",label:"音量加",icon:<HiPlusSm size={16}/>},
        {value:"2",label:"音量减",icon:<HiOutlineMinusSm  size={16}/>},
        {value:"3",label:"静音",icon:<HiOutlineVolumeOff size={16}/>},
        {value:"4",label:"取消静音",icon:<HiOutlineVolumeUp size={16}/>},
        {value:"5",label:"窗口打开",icon:<PanelBottomOpen size={16}/>},
        {value:"6",label:"窗口关闭",icon:<PanelTopOpen size={16}/>}
    ]
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getExhibitTree() as ResponseData;
            // console.log(res.data);
            setTree(res.data || []);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        } finally {
            setLoading(false);
        }
    }, []);

	const fetchDeviceCodeData = useCallback(async () => {
		try {
			const res = await getCodeList({ page: 1, limit: 10000 });
			const raw = res.data;
			// console.log(raw);
			if (Array.isArray(raw)) {
				setDeviceCodeData(raw);
			} else if (raw && typeof raw === "object" && "items" in raw) {
				setDeviceCodeData((raw as { items: CodeItem[] }).items ?? []);
			} else {
				setDeviceCodeData([]);
			}
		} catch (e: unknown) {
			setDeviceCodeData([]);
		}
	},[]);

	useEffect(() => { fetchDeviceCodeData(); }, [fetchDeviceCodeData]);

    useEffect(() => { fetchData(); }, [fetchData]);

	// --- 展厅 新增 dialog open --- 
	const openAdd = (row?: TreeItem) => {
        if(!row){
            setPavEditing(null);
            setPavForm({ p_name: "", p_summary: "", p_re: "", show: 1, sort: 0 });
            setPavDialogOpen(true);
        }else{
            if(row.type == 'pavilion'){
                setMacEditing(null);
                setMacForm({ m_name: "", m_p: row.id, m_summary: "", m_re:"", show: 1, sort:0 });
                setMacDialogOpen(true);
            }else if(row.type == 'machine'){ 
                setExhEditing(null);
                setExhForm({ e_name: "",e_m: row.id, e_summary: "", e_re: "", e_ip: "192.168.1.255", mac: "00-00-00-00-00-00" ,e_base:"1_2_3_4_5_6", show: 1, sort:0 });
                setExhDialogOpen(true);
            }
        }
	};

	// --- 展厅 编辑 dialog open ---
	const openEdit = (row:TreeItem) => {
        if(row.type == 'pavilion'){
            setPavEditing(row);
            setPavForm({ p_name: row.name, p_summary: row.summary, p_re: row.re, show: row.show, sort: row.sort });
            setPavDialogOpen(true);
        }else if(row.type == 'machine'){
            setMacEditing(row);
            setMacForm({ m_name: row.name, m_p: row.parentId, m_summary: row.summary, m_re:row.re, show: row.show , sort:row.sort});
            setMacDialogOpen(true);
        }else if(row.type == 'exhibition'){
            setExhEditing(row);
            setExhForm({ e_name: row.name, e_m: row.parentId, e_summary: row.summary, e_re: row.re, e_ip: row.ip , mac: null, e_base: row.base, show: row.show, sort:row.sort });
            setExhDialogOpen(true);
        }
	}

	// --- 展厅 编辑/新增 方法 ---
	const handlePavSave = async () => {
		try {
			if (pavEditing) {
				await updatePavilion({ id: pavEditing.id, ...pavForm });
				toast.success("展馆更新成功");
			} else {
				await addPavilion(pavForm);
				toast.success("展馆添加成功");
			}
			setPavDialogOpen(false);
			fetchData();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};
	
	// --- 展区 编辑/新增 方法 ---
	const handleMacSave = async () => {
		try {
			if (macEditing) {
				await updateMachine({ id: macEditing.id, ...macForm });
				toast.success("展项更新成功");
			} else {
				await addMachine(macForm);
				toast.success("展项添加成功");
			}
			setMacDialogOpen(false);
			fetchData();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};

	// --- 展项 更新/新增 方法 ---
	const handleExhSave = async () => {
        console.log(exhForm)
		try {
			if (exhEditing) {
				await updateExhibit({ id: exhEditing.id, ...exhForm });
				toast.success("展品更新成功");
			} else {
				await addExhibit(exhForm);
				toast.success("展品添加成功");
			}
			setExhDialogOpen(false);
			fetchData();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};
    
	// --- 删除 方法 ---
	const handleDelete = (row: TreeItem) => {
		setDeleteConfirm({
			open: true,
			title: "确认删除",
			message: `确认删除${row.type}「${row.name}」？`,
			onConfirm: async () => {
                if(row.type === "pavilion"){
                    await deletePavilion(row.id);
                }else if(row.type === "exhibition"){
                    await deleteExhibit(row.id);
                }else if(row.type === "machine"){
                    await deleteMachine(row.id);
                }
				toast.success("已删除");
				fetchData();
			},
		});
	};

    // --- 展项 控制 节点 编辑 ---
	const handleExbitionLinkEdit = (item: TreeItem) => {
		
		const newData = []
		if (item !== null && item.link !== null && item.link !== "") {
			const link = JSON.parse(item.link)
			// console.log(link)
			link.forEach((item) => {
				const newDeviceCode = []
				item.device_code.length > 0 && item.device_code.forEach((c) => {
					const code = deviceCodeData.find(x=>x.id === c.id)
					// console.log(code)
					code && newDeviceCode.push({
						...c,
						name: code.name,
						format: code.cformat.id,
						protocal: code.protocal.id,
						ip: code.device.ip,
						port: code.cport,
						code: code.code,
					})
				})
				newData.push({
					...item,
					device_code: newDeviceCode,
				})
			})	
		}
		setSelectedExh({...item,link:newData});
		setExhControlFlowDrawerOpen(true);
	};

    // --- 展项 控制 节点 drawer 状态改变 ---
	const handleExhControlDrawerOpenChange = useCallback((open: boolean) => {
		if (!open) {
			setExhControlFlowDrawerOpen(false);
			// setSelectedContent(null);
            setSelectedExh(null);
			// fetchTree();
		}
	}, []);

    // ── Columns (inside component for closure access to CRUD callbacks) ──
    const columns: TreeColumn<TreeItem>[] = [
        {
            id: "name",
            label: " 展厅 -> 展区 -> 展项 名称",
            className: "w-80 pl-4",
            cell: (item, depth) => (
                <span className={depth > 0 ? "text-sm" : "font-medium"}>{item.name}</span>
            ),
        },
        {
            id: "id",
            label: "ID",
            className: "w-20",
            cell: (item) => <span className="text-xs text-muted-foreground">{item.id}</span>,
        },
        {
            id: "summary",
            label: "介绍",
            className: "w-auto",
            cell: (item) => <span className="text-xs text-muted-foreground">{item.summary || "—"}</span>,
        },
        {
            id: "ip",
            label: "IP",
            className: "w-auto",
            cell: (item) => <span className="text-xs">{item.ip || "—"}</span>,
        },
        {
            id: "base",
            label: "基础控制按钮",
            className: "w-auto",
            cell: (item) => 
                <div className="flex flex-row gap-2">
                    {
                        item.base && item.base.split('_').map((item,index) => (
                            <Badge variant="secondary" key={index}>
                                {BaseBtnItems.filter(e=>e.value == item)[0]?.icon}
                            </Badge>
                        ))
                    }
                </div>
            ,
        },
        {
            id: "link",
            label: "快捷指令",
            className: "w-auto",
            cell: (item) => (
                item.type === 'exhibition' && <Button variant="outline" size="sm" onClick={() => handleExbitionLinkEdit(item)} title="编辑JSON">JSON</Button>
            ),
        },
        {
            id: "show",
            label: "状态",
            className: "w-auto",
            cell: (item) => (
                <Badge
                    className={
                        item.show === 1
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }
                >
                    {item.show === 1 ? "显示" : "隐藏"}
                </Badge>
            ),
        },
        {
            id: "sort",
            label: "排序",
            className: "w-auto",
            cell: (item) => <span className="text-xs text-muted-foreground">{item.sort}</span>,
        },
        {
            id: "re",
            label: "讲解词",
            cell: (item) => <div className="w-40 overflow-hidden truncate">{item.re || "—"}</div>,
        },
        {
            id: "action",
            label: "操作",
            className: "w-40 text-center",
            cell: (item) => (
                <div className="flex flex-row justify-end items-center gap-1">
                    {
                        item.type !== 'exhibition' &&
                        <Button variant="ghost" size="sm" onClick={() => openAdd(item)} title="添加子菜单">
                            <PlusIcon className="size-4" />
                        </Button>
                    }
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="编辑">
                        <PencilIcon className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} title="删除">
                        <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ];

    // ── search filter for DataTableTree ──
    const searchFilter = (item: TreeItem, search: string): boolean => {
        const q = search.toLowerCase();
        if (item.name.toLowerCase().includes(q) || item.ip.toLowerCase().includes(q)) return true;
        return false;
    };

    // ── parent select options from tree ──
    const renderParentOptions = (items: TreeItem[], depth = 0): React.ReactNode[] => {
        const options: React.ReactNode[] = [];
        for (const item of items) {
            const prefix = depth > 0 ? `${"　".repeat(depth)}` : "";
            options.push(
                <SelectItem key={item.id} value={String(item.id)}>
                    {prefix}{item.name}
                </SelectItem>,
            );
            if (item.children && item.children.length > 0) {
                options.push(...renderParentOptions(item.children, depth + 1));
            }
        }
        return options;
    };

    // ── Render ──
    return (
        <div className="flex flex-col gap-4 px-4 pb-4 lg:px-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">展项总管理</h1>
                <Button onClick={() => openAdd()}>
                    <PlusIcon className="mr-1 size-4" /> 新增展厅
                </Button>
            </div>

            {/* Tree Table */}
            <DataTableTree
                columns={columns}
                data={tree}
                loading={loading}
                expanded={true}
                searchPlaceholder="搜索菜单名称/路由..."
                searchFilter={searchFilter}
                getRowClassName={(_, depth) => (depth > 0 ? "bg-muted/20" : "")}
            />

            {/* 内容 控制JSON Drawer */}
			<Drawer disablePointerDismissal={true} open={exhControlFlowDrawerOpen} onOpenChange={handleExhControlDrawerOpenChange} swipeDirection="right">
				<DrawerPortal >
					<DrawerOverlay />
					<DrawerContent  className="h-full w-full max-w-4/5">
						<DrawerHeader>
							<div className="flex items-center justify-start gap-2">
								{selectedExh && (
									<Badge variant="outline" className="text-xl h-8">
										{selectedExh.name}
									</Badge>
								)}
								<DrawerTitle>快捷命令管理</DrawerTitle>
							</div>
							<DrawerDescription>
								管理快捷按钮控制
							</DrawerDescription>
						</DrawerHeader>

						<div className="flex-1 overflow-y-auto px-4 py-4">
							<ExhibitionLinkFlow controlData={selectedExh}/>
						</div>

						<DrawerFooter className="flex flex-row">
							{/* <Button className="flex-1" onClick={handleContentControlSave}>提交</Button> */}
							<DrawerClose render={
								<Button variant="outline" size="default" className="flex-1 h-10" onClick={fetchData}>关闭</Button> 
							}>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</DrawerPortal>
			</Drawer>

           	{/* --- 展厅 编辑/新增 Dialog --- */}
			<Dialog open={pavDialogOpen} onOpenChange={setPavDialogOpen}>
				<DialogContent className="sm:max-w-180">
					<DialogHeader>
						<DialogTitle>{pavEditing ? "编辑展馆" : "添加展馆"}</DialogTitle>
					</DialogHeader>
					<form className="w-full">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="p_name">展厅名称</FieldLabel>
								<Input id="p_name" type="text" value={pavForm.p_name} placeholder="展馆名称" required onChange={(e) => setPavForm({ ...pavForm, p_name: e.target.value })}/>
							</Field>
							<Field>
								<FieldLabel htmlFor="p_summary">展厅介绍</FieldLabel>
								<Input id="p_summary" type="text" value={pavForm.p_summary} placeholder="展馆介绍" onChange={(e) => setPavForm({ ...pavForm, p_summary: e.target.value })} />
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="show">显示状态</FieldLabel>
									<Select items={ShowItems} defaultValue="1" value={String(pavForm.show)} onValueChange={(e) => setPavForm({ ...pavForm, show: Number(e) })}>
										<SelectTrigger id="show"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{ShowItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="sort">排序</FieldLabel>
									<Input id="sort" type="number" value={pavForm.sort} placeholder="请输入排序" onChange={(e) => setPavForm({ ...pavForm, sort: Number(e.target.value) })}/>
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="p_re">展厅备注</FieldLabel>
								<Textarea id="p_re" value={pavForm.p_re} placeholder="123 Main St" onChange={(e) => setPavForm({ ...pavForm, p_re: e.target.value })}/>
							</Field>
							{/* <Field orientation="horizontal">
								<Button type="button" variant="outline">
									Cancel
								</Button>
								<Button type="submit">Submit</Button>
							</Field> */}
						</FieldGroup>
					</form>
					<DialogFooter>
						<Button variant="outline" onClick={() => setPavDialogOpen(false)}>取消</Button>
						<Button type='submit' onClick={handlePavSave}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* --- 展区 编辑/新增 Dialog --- */}
			<Dialog open={macDialogOpen} onOpenChange={setMacDialogOpen}>
				<DialogContent className="sm:max-w-180">
					<DialogHeader>
						<DialogTitle>{macEditing ? "编辑展区" : "添加展区"}</DialogTitle>
					</DialogHeader>
					<form className="w-full">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="m_name">展区名称</FieldLabel>
								<Input id="m_name" type="text" value={macForm.m_name} placeholder="展区名称" required onChange={(e) => setMacForm({ ...macForm, m_name: e.target.value })}/>
							</Field>
							<Field>
								<FieldLabel htmlFor="m_summary">展区介绍</FieldLabel>
								<Input id="m_summary" type="text" value={macForm.m_summary} placeholder="展区介绍" onChange={(e) => setMacForm({ ...macForm, m_summary: e.target.value })} />
							</Field>
							<Field>
								<FieldLabel htmlFor="m_p">所属展馆 ID</FieldLabel>
								<Input id="m_p" type="text" value={macForm.m_p} placeholder="所属展馆 ID" onChange={(e) => setMacForm({ ...macForm, m_p: Number(e.target.value) })} disabled/>
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="show">显示状态</FieldLabel>
									<Select items={ShowItems} defaultValue="1" value={String(macForm.show)} onValueChange={(e) => setMacForm({ ...macForm, show: Number(e) })}>
										<SelectTrigger id="show"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{ShowItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="sort">排序</FieldLabel>
									<Input id="sort" type="number" value={macForm.sort} placeholder="请输入排序" onChange={(e) => setMacForm({ ...macForm, sort: Number(e.target.value) })}/>
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="m_re">展区备注</FieldLabel>
								<Textarea id="m_re" value={macForm.m_re} placeholder="123 Main St" onChange={(e) => setMacForm({ ...macForm, m_re: e.target.value })}/>
							</Field>
						</FieldGroup>
					</form>
					<DialogFooter showCloseButton={false}>
						<Button variant="outline" onClick={() => setMacDialogOpen(false)}>取消</Button>
						<Button onClick={handleMacSave}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* --- 展项 编辑/新增 Dialog --- */}
			<Dialog open={exhDialogOpen} onOpenChange={setExhDialogOpen}>
				<DialogContent className="sm:max-w-180">
					<DialogHeader>
						<DialogTitle>{exhEditing ? "编辑展项" : "添加展项"}</DialogTitle>
					</DialogHeader>
					<form className="w-full">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="e_name">名称</FieldLabel>
								<Input id="e_name" value={exhForm.e_name} onChange={(e) => setExhForm({ ...exhForm, e_name: e.target.value })} placeholder="展项名称" />
							</Field>
							
							<Field>
								<FieldLabel htmlFor="e_summary">简介</FieldLabel>
								<Input id="e_summary" value={exhForm.e_summary} onChange={(e) => setExhForm({ ...exhForm, e_summary: e.target.value })} placeholder="展项简介" />
							</Field>
							<div className={`grid gap-4 ${exhEditing ? ' grid-cols-2' : ' grid-cols-3'}`}>
								<Field>
									<FieldLabel htmlFor="e_m">展区 ID</FieldLabel>
									<Input id="e_m" type="number" value={exhForm.e_m} onChange={(e) => setExhForm({ ...exhForm, e_m: Number(e.target.value) })} disabled/>
								</Field>
								<Field>
									<FieldLabel htmlFor="e_ip">展项 IP</FieldLabel>
									<Input id="e_ip" value={exhForm.e_ip} onChange={(e) => setExhForm({ ...exhForm, e_ip: e.target.value })} />
								</Field>
								<Field className={exhEditing ? 'hidden' : ''}>
									<FieldLabel htmlFor="e_ip">MAC 地址</FieldLabel>
									<Input id="mac" value={exhForm.mac} onChange={(e) => setExhForm({ ...exhForm, mac: e.target.value })} />
								</Field>
							</div>
							
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="show">显示状态</FieldLabel>
									<Select items={ShowItems} defaultValue="1" value={String(exhForm.show)} onValueChange={(e) => setExhForm({ ...exhForm, show: Number(e) })}>
										<SelectTrigger id="show"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{ShowItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="sort">排序</FieldLabel>
									<Input id="sort" type="number" value={exhForm.sort} placeholder="请输入排序" onChange={(e) => setExhForm({ ...exhForm, sort: Number(e.target.value) })}/>
								</Field>
							</div>
							<Field>
								<FieldLabel>基础功能显示</FieldLabel>
								<Combobox
									items={BaseBtnItems}
									multiple
									value={ exhForm.e_base ? exhForm.e_base.split('_') : []}
									onValueChange={(e) => setExhForm({ ...exhForm, e_base: e.join('_') })}
									>
									<ComboboxChips>
										<ComboboxValue>
										{ exhForm.e_base && exhForm.e_base.split('_').map((item) => (
											<ComboboxChip key={item}>{
												BaseBtnItems.filter(e=>e.value == item)[0]?.icon
											}</ComboboxChip>
										))}
										</ComboboxValue>
										<ComboboxChipsInput placeholder="添加基础按钮" />
									</ComboboxChips>
									<ComboboxContent>
										<ComboboxEmpty>未找到项目。</ComboboxEmpty>
										<ComboboxList>
										{(item) => (
											<ComboboxItem key={item.value} value={item.value}>
												{item.icon}
												{item.label}
											</ComboboxItem>
										)}
										</ComboboxList>
									</ComboboxContent>
								</Combobox>
							</Field>
							<Field>
								<FieldLabel htmlFor="e_re">展项备注</FieldLabel>
								<Textarea id="e_re" value={exhForm.e_re} placeholder="123 Main St" onChange={(e) => setExhForm({ ...exhForm, e_re: e.target.value })}/>
							</Field>
						</FieldGroup>
					</form>
					<DialogFooter>
						<Button variant="outline" onClick={() => setExhDialogOpen(false)}>取消</Button>
						<Button onClick={handleExhSave}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

            {/* --- 确认删除 Dialog --- */}
			<AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}>
				<AlertDialogPortal>
					<AlertDialogOverlay />
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{deleteConfirm.title}</AlertDialogTitle>
							<AlertDialogDescription>{deleteConfirm.message}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>取消</AlertDialogCancel>
							<AlertDialogAction onClick={async () => {
								try {
									await deleteConfirm.onConfirm();
								} finally {
									setDeleteConfirm((prev) => ({ ...prev, open: false }));
								}
							}}>确认</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogPortal>
			</AlertDialog>
        </div>
    );
}
