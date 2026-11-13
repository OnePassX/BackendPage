import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import {
	PencilIcon, Trash2Icon, PlusIcon, FileIcon, PanelBottomOpen, PanelTopOpen
} from "lucide-react";
import { HiPlusSm,HiOutlineMinusSm,HiOutlineVolumeOff,HiOutlineVolumeUp } from "react-icons/hi";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import CodeFlow from '@/components/ContentControlFlow/ContentControlFlow';
import { Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,} from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,SelectGroup
} from "@/components/ui/select";
import {
	Drawer, DrawerPortal, DrawerOverlay, DrawerContent,
	DrawerHeader, DrawerTitle, DrawerDescription,
	DrawerFooter, DrawerClose,
} from "@/components/ui/drawer";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { FileUpload } from "@/components/upload-file";
import {
	AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogContent,
	AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
	AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import { DataTable } from "@/components/data-table";

import ExhibitionFlow from "@/components/ExhibitionFlow/ExhibitionFlow";
import ExhibitionLinkFlow from "@/components/ExhibitionLinkFlow/ExhibitionLinkFlow";
import { DeviceCommandDrawer } from "@/components/device-command-drawer";
import type { FlowNodeData } from "@/components/ExhibitionFlow/types";
import {
	getPavilionList, addPavilion, updatePavilion, deletePavilion,
	getMachineList, addMachine, updateMachine, deleteMachine,updateMachineLink,
	getExhibitList, addExhibit, updateExhibit, deleteExhibit,updateExhibitLink,
	getContentList, addContent, updateContent, deleteContent, updateContentDownload,
} from "@/api/exhibition";

import { 
	getDeviceList,addDevice,updateDevice,deleteDevice,updateDeviceLink,probeDevice
} from "@/api/device";

// --- Types (user-defined, matching API) ---

// 展厅
interface PavilionItem {
	id: number;
	p_name: string;
	p_summary: string;
	p_re: string;
	show: number;
	sort: number;
}

interface linkItem {
	id: number;
	name: string;
}

// 展区
interface MachineItem {
	id: number;
	m_name: string;
	m_p: linkItem | null; // 展厅id
	m_re: string;
	m_summary: string;
	show: number;
	sort: number;
}

// 展项
interface ExhibitItem {
	id: number;
	e_name: string;
	e_m: linkItem | null; // 展区id
	e_summary: string;
	e_re: string;
	e_base: string;
	e_link: string;
	e_ip: string;
	show: number;
	sort: number;
}

// 内容文件状态
interface FileStatusItem {
	id: number;
	name: string;
}
// 内容文件类型
interface FileTypeItem {
	id: number;
	name: string;
}


// 内容
interface ContentItem {
	id: number;
	e_id: number; // 展项id
	c_name: string;
	c_file_status: FileStatusItem;
	c_file_type: FileTypeItem;
	c_file_name: string;
	c_file_addr: string;
	c_open: string;
	c_status: number;
	c_default: number;
	c_startup: number;
	c_control: string;
	c_iframe: string;
	c_iframe_show: number;
	c_link: string;
	note: string;
	sort: number;
}

interface ContentControlItem {

}


// interface FileStatusItem {}

// 设备类型
interface DtypeItem {
	id: number;
	name: string;
	icon: string;
	icon_color: string;
}

// 设备
interface DeviceItem {
	id: number;
	num: string;
	name: string;
	dtype: DtypeItem;
	ip: string;
	conpare: string;
	area: number;
	link: number | undefined;
	other: string;
	major: boolean;
	probe_enabled: boolean;
	sort: number;
}


interface ContentFormData {
	e_id: number | null; // 展项id
	c_name: string;
	c_file_status: number;
	c_file_type: number;
	c_file_name: string;
	c_file_addr: string;
	c_open: string;
	c_status: number;
	c_default: number;
	c_startup: number;
	c_control: string;
	c_iframe: string;
	c_iframe_show: number;
	c_link: string;
	note: string;
	sort: number;
}

type BaseBtn = {
	label: string
	value: string
	icon: ReactNode
}


const ShowItems = [{label:'启用',value:'1'},{label:'禁用',value:'2'}]
const StatusItems = [{label:'是',value:'1'},{label:'否',value:'2'}]

const BaseBtnItems:BaseBtn[] = [
	{value:"1",label:"音量加",icon:<HiPlusSm size={16}/>},
	{value:"2",label:"音量减",icon:<HiOutlineMinusSm  size={16}/>},
	{value:"3",label:"静音",icon:<HiOutlineVolumeOff size={16}/>},
	{value:"4",label:"取消静音",icon:<HiOutlineVolumeUp size={16}/>},
	{value:"5",label:"窗口打开",icon:<PanelBottomOpen size={16}/>},
	{value:"6",label:"窗口关闭",icon:<PanelTopOpen size={16}/>}
]

const AreaItems = [
	{label:'无绑定',value:'0'},{label:'展项设备',value:'1'},{label:'展厅设备',value:'2'}
]

const DeviceTypeItems = [
	{label:'继电器',value:'1'},{label:'串口服务器',value:'2'},{label:'电脑主机',value:'3'},
	{label:'一体机',value:'4'},{label:'LED屏幕',value:'5'},{label:'拼接屏幕',value:'6'},
	{label:'投影机',value:'7'},{label:'窗帘控制器',value:'8'},{label:'电动门控制器',value:'9'},
	{label:'照明灯光',value:'10'},{label:'氛围灯光',value:'11'},{label:'PDU',value:'12'},
	{label:'空调设备',value:'13'},{label:'监控设备',value:'14'},{label:'其他',value:'15'},
]

const FileStatusItems = [
	{label:'中控服务器存储',value:'1'},{label:'展项客户端存储',value:'2'},{label:'其他',value:'3'},
]
const FileTypeItems = [
	{label:'程序文件',value:'1'},{label:'视频文件',value:'2'},{label:'图片文件',value:'3'},{label:'文档文件',value:'4'},{label:'网页地址',value:'5'},{label:'其他',value:'6'},
]

// 设备探活：与 device/index.tsx 的 PropeItems 一致（0 不启用 / 1 启用探活）
const ProbeItems = [
	{label:'不启用',value:'0'},{label:'启用探活',value:'1'},
]
// 只有「电脑主机(3)」「一体机(4)」支持探活，规则同 device/index.tsx
const PROBE_ENABLED_DTYPES = [3, 4];


// --- Page ---    
export default function ManagePage() {
	// Tree data
	const [pavilions, setPavilions] = useState<PavilionItem[]>([]);
	const [machines, setMachines] = useState<MachineItem[]>([]);
	const [exhibits, setExhibits] = useState<ExhibitItem[]>([]);
	const [devices, setDevices] = useState<DeviceItem[]>([]);
	const [contents,setContents] = useState<ContentItem[]>([]);

	const [treeLoading, setTreeLoading] = useState(true);

	const [selectedContent, setSelectedContent] = useState<FlowNodeData | null>(null);
	const [contentControlDrawerOpen, setContentControlDrawerOpen] = useState(false);

	// 展项快捷控制（e_link）Drawer
	const [selectedExhibitControl, setSelectedExhibitControl] = useState<any>(null);
	const [exhibitControlDrawerOpen, setExhibitControlDrawerOpen] = useState(false);

	/**
	 * 控制流程保存后的最新 JSON 缓存。
	 *
	 * 控制流程（c_control / e_link）不在画布上渲染，保存后没必要整树 fetchTree——
	 * 那会闪一次 loading 并让 ExhibitionFlow 重建节点、丢掉用户拖好的位置。
	 * 这里按 id 记住刚保存的 JSON，再次打开 Drawer 时优先用它；
	 * 任何一次真正的数据刷新（fetchTree）都会清空缓存，以服务端为准。
	 */
	const contentControlJsonRef = useRef<Map<number, string>>(new Map());
	const exhibitLinkJsonRef = useRef<Map<number, string>>(new Map());
	const editingContentIdRef = useRef<number | null>(null);
	const editingExhibitIdRef = useRef<number | null>(null);

	// 设备命令 Drawer
	const [selectedDevice, setSelectedDevice] = useState<{ id: number; name: string; ip?: string } | null>(null);
	const [deviceCommandDrawerOpen, setDeviceCommandDrawerOpen] = useState(false);

	const [contentDialogOpen, setContentDialogOpen] = useState(false);
	const [contentEditing, setContentEditing] = useState<ContentItem | null>(null);
	// 与 exhibition/content.tsx 的 defaultForm 保持一致
	const [contentFormData, setContentFormData] = useState<ContentFormData>(
		{
			e_id: null, c_name: "", c_file_status: 1, c_file_type: 1, c_file_name: "", c_file_addr: "",
			c_open: "", c_status: 1, c_default: 2, c_startup: 2, c_control: "", c_iframe: "", c_iframe_show: 2, c_link: "", note: "", sort: 1,
		}
	);
	// 内容文件上传中（上传期间禁用保存/取消）
	const [contentUploading, setContentUploading] = useState(false);

	// --- Pavilion dialog state ---
	const [pavDialogOpen, setPavDialogOpen] = useState(false);
	const [pavEditing, setPavEditing] = useState<PavilionItem | null>(null);
	const [pavForm, setPavForm] = useState({ p_name: "", p_summary: "", p_re: "", show: 1, sort: 0 });

	// --- Machine dialog state ---
	const [macDialogOpen, setMacDialogOpen] = useState(false);
	const [macEditing, setMacEditing] = useState<MachineItem | null>(null);
	const [macForm, setMacForm] = useState({ m_name: "", m_p: null, m_summary: "", m_re: "", show: 1, sort: 0 });

	// --- Delete confirmation state ---
	const [deleteConfirm, setDeleteConfirm] = useState<{
		open: boolean;
		title: string;
		message: string;
		onConfirm: () => Promise<void>;
	}>({ open: false, title: "", message: "", onConfirm: async () => { } });

	// --- Exhibit dialog state ---
	const [exhDialogOpen, setExhDialogOpen] = useState(false);
	const [exhEditing, setExhEditing] = useState<ExhibitItem | null>(null);
	const [exhForm, setExhForm] = useState({ e_name: "", e_m: null, e_summary: "", e_re: "", e_ip: "",e_base:"1_2_3_4_5_6", show: 1, sort:0 });
	
	// —— Device dialog state ——
	const [devDialogOpen,setDevDialogOpen] = useState(false);
	const [devEditing, setDevEditing] = useState<DeviceItem | null>(null);
	const [devForm,setDevForm] = useState({ num: "无" , name:"", dtype: 1, ip:"", conpare:"", area:1, link:null, other: "", major: false, probe_enabled: false, sort:0 })

	const [contentControlData, setContentControlData ] = useState<ContentControlItem[]>([]);
	const [contentControlLoading, setContentControlLoading] = useState(true);
	// --- Fetch tree data ---
	const extractArray = (data: unknown): unknown[] => {
		if (Array.isArray(data)) return data;
		if (data && typeof data === "object" && "items" in data) {
			const items = data.items;
			if (Array.isArray(items)) return items;
		}
		return [];
	};

	// 获取展厅数据
	const fetchTree = async () => {
		setTreeLoading(true);
		try {
			const [pRes, mRes, eRes, dRes, cRes] = await Promise.all([
				getPavilionList({show:1, page:1, limit:1000}),
				getMachineList({ page:1, limit:1000 }),
				getExhibitList({ page:1, limit:1000 }),
				getDeviceList({ page:1, limit:1000 }),
				getContentList({ page:1, limit:1000 }),
			]);
			const pavilionData = extractArray(pRes.data) as PavilionItem[];
			const machineData = extractArray(mRes.data) as MachineItem[];
			const exhibitData = extractArray(eRes.data) as ExhibitItem[];
			const deviceData = extractArray(dRes.data) as DeviceItem[];
			const contentData = extractArray(cRes.data) as ContentItem[];
			// console.log(deviceData)
			setPavilions(pavilionData);
			setMachines(machineData);
			setExhibits(exhibitData);
			setDevices(deviceData);
			setContents(contentData);
			// 数据已从服务端刷新，之前缓存的「控制流程最新 JSON」不再需要
			contentControlJsonRef.current.clear();
			exhibitLinkJsonRef.current.clear();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "加载树结构失败");
		} finally {
			setTreeLoading(false);
		}
	};

	useEffect(() => { fetchTree(); }, []);

	// --- Fetch content for selected exhibit ---
	// const fetchContent = async (eId: number) => {
	// 	setContentLoading(true);
	// 	try {
	// 		const res = await getContentList({ eid: eId });
	// 		const raw = res.data;
	// 		if (Array.isArray(raw)) {
	// 			setContentData(raw);
	// 		} else if (raw && typeof raw === "object" && "items" in raw) {
	// 			const items = raw.items;
	// 			if (Array.isArray(items)) setContentData(items as ContentItem[]);
	// 			else setContentData([]);
	// 		} else {
	// 			setContentData([]);
	// 		}
	// 	} catch (e: unknown) {
	// 		toast.error(e instanceof Error ? e.message : "加载内容失败");
	// 	} finally {
	// 		setContentLoading(false);
	// 	}
	// };


   	// --- 内容控制 编辑 ---
	const handleContentControlEdit = (node: FlowNodeData) => {
		// 内容节点的父展项 id 存在 e_id（ExhibitionFlow 的 makeContentNode 写入），
		// 不是 eid；取不到时退回节点自带的 ip，避免控制流程丢失设备地址
		const e = exhibits.find((x) => x.id === Number(node.e_id));
		// 优先用刚保存过的 JSON，避免读到画布上的旧节点数据
		const fresh = contentControlJsonRef.current.get(node.id);
		editingContentIdRef.current = node.id;
		setSelectedContent({
			...node,
			c_control: fresh ?? node.c_control,
			ip: e?.e_ip,
		});
		setContentControlDrawerOpen(true);
	};
	// --- 内容控制 drawer 状态改变 ---
	const handleContentControlDrawerOpenChange = useCallback((open: boolean) => {
		if (!open) {
			setContentControlDrawerOpen(false);
			setSelectedContent(null);
			// 不刷新画布：控制流程不影响画布渲染，保存结果已通过 onSaved 缓存
		}
	}, []);
	// --- 内容控制 保存成功 ---
	const handleContentControlSaved = useCallback((json: string) => {
		const id = editingContentIdRef.current;
		if (id != null) contentControlJsonRef.current.set(id, json);
	}, []);

	// --- 展项快捷控制（e_link）编辑 ---
	const handleExhibitControlEdit = (node: FlowNodeData) => {
		// ExhibitionLinkFlow 读取 { id, label, ip, link }；展项的 e_link 是磁盘上的 JSON 列
		const fresh = exhibitLinkJsonRef.current.get(node.id);
		editingExhibitIdRef.current = node.id;
		setSelectedExhibitControl({
			id: node.id,
			label: node.label,
			ip: node.e_ip,
			link: fresh ?? node.e_link,
		});
		setExhibitControlDrawerOpen(true);
	};
	// --- 展项快捷控制 保存成功 ---
	const handleExhibitControlSaved = useCallback((json: string) => {
		const id = editingExhibitIdRef.current;
		if (id != null) exhibitLinkJsonRef.current.set(id, json);
	}, []);

	// --- 内容 文件下发 ---
	const handleContentDownload = async (node: FlowNodeData) => {
		try {
			await updateContentDownload({ id: node.id });
			toast.success("指令已发送");
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "发送失败");
		}
	};

	// --- 设备 手动探活 ---
	const handleDeviceProbe = async (node: FlowNodeData) => {
		try {
			const res = await probeDevice({ device_id: node.id });
			toast.success(res?.msg || "探活已下发");
			fetchTree();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "探活失败");
		}
	};

	// --- 设备命令 编辑 ---
	const handleDeviceControlEdit = (node: FlowNodeData) => {
		setSelectedDevice({
			id: node.id,
			name: node.label,
			ip: typeof node.ip === "string" ? node.ip : undefined,
		});
		setDeviceCommandDrawerOpen(true);
	};
 
	// --- Sidebar 添加节点 ---
	// 展厅可直接创建；展区/展项允许不带父节点创建（后端 m_p / e_m 为 required=False），
	// 创建后进入侧栏「未连接」分组，拖到父节点即可建立关联。
	const handleAddNode = useCallback((kind: "pavilion" | "machine" | "exhibit" | "device") => {
		if (kind === "pavilion") openPavAdd();
		else if (kind === "machine") openMacAdd(null);
		else if (kind === "exhibit") openExhAdd(null);
	}, []);

	// --- 节点连接 ---
	const handleLinkNodes = useCallback(async (source: FlowNodeData, target: FlowNodeData) => {
		try {
			if (source.kind === "pavilion" && target.kind === "machine") {
				if(source.id !== target.m_p ){ 
					await updateMachineLink({ id: target.id, m_p: source.id });
					toast.success("展区已关联到展厅");
					fetchTree();
				}else{
					toast.warning("不可重复连接！");
				}
			} else if (source.kind === "machine" && target.kind === "exhibit") {
				if(source.id !== target.e_m ){ 
					await updateExhibitLink({ id: target.id, e_m: source.id });
					toast.success("展项已关联到展区");
					fetchTree();
				}else{
					toast.warning("不可重复连接！");
				}

			} else if (source.kind === "pavilion" && target.kind === "device") {
				if(source.id !== target.link){
					await updateDeviceLink({ id: target.id, area:2, link: source.id });
					toast.success("设备已关联到展厅");
					fetchTree();
				}else{
					toast.warning("不可重复连接！");
				}
				
			} else if (source.kind === "exhibit" && target.kind === "device") {
				if(source.id !== target.link){
					await updateDeviceLink({ id: target.id, area:1, link: source.id });
					toast.success("设备已关联到展项");
					fetchTree();
				}else{
					toast.warning("不可重复连接！");
				}
			} else {
				toast.error("不允许的连接类型");
			}
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "连接失败");
		}
	}, []);

	// --- 节点连接断开 ---
	const handleDeleteLink = useCallback(async (source:FlowNodeData,target:FlowNodeData) => {
		try{
			// 只有确实已关联时才需要断开；`target?.m_p || target.m_p !== null` 恒为真，
			// 会把未关联的节点也发一次空更新
			if (source.kind === "pavilion" && target.kind === "machine") {
				if (target.m_p != null) {
					await updateMachineLink({ id: target.id, m_p: null });
					toast.success("展区已取消关联");
					fetchTree();
				}
			}else if (source.kind === "machine" && target.kind === "exhibit") {
				if (target.e_m != null) {
					await updateExhibitLink({ id: target.id, e_m: null });
					toast.success("展项已取消关联");
					fetchTree();
				}
			}else if (source.kind === "pavilion" && target.kind === "device") {
				if (target.link != null) {
					await updateDeviceLink({ id: target.id, area:2, link: null });
					toast.success("设备已取消关联");
					fetchTree();
				}
			}else if (source.kind === "exhibit" && target.kind === "device") {
				if (target.link != null) {
					await updateDeviceLink({ id: target.id, area:1, link: null });
					toast.success("设备已取消关联");
					fetchTree();
				}
			}
		}catch(e:unknown){
			toast.error(e instanceof Error ? e.message : "断开连接失败");
		}
	},[],)

	// --- 展厅 新增 dialog open --- 
	const openPavAdd = () => {
		setPavEditing(null);
		setPavForm({ p_name: "", p_summary: "", p_re: "", show: 1, sort: 0 });
		setPavDialogOpen(true);
	};
	// --- 展厅 编辑 dialog open ---
	const openPavEdit = (node: FlowNodeData) => {
		const p = pavilions.find((x) => x.id === node.id);
		if (!p) return;
		setPavEditing(p);
		setPavForm({ p_name: p.p_name, p_summary: p.p_summary, p_re: p.p_re, show: p.show, sort: p.sort });
		setPavDialogOpen(true);
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
			fetchTree();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};
	// --- 展厅 删除 方法 ---
	const handlePavDelete = (node: FlowNodeData) => {
		setDeleteConfirm({
			open: true,
			title: "确认删除",
			message: `确认删除展馆「${node.label}」？`,
			onConfirm: async () => {
				await deletePavilion(node.id);
				toast.success("展馆已删除");
				fetchTree();
			},
		});
	};

	// --- 展区 新增 dialog open --- 
	const openMacAdd = (parentNode: FlowNodeData | null) => {
		setMacEditing(null);
		setMacForm({ m_name: "", m_p: parentNode?.id ?? null, m_summary: "", m_re:"", show: 1, sort:0 });
		setMacDialogOpen(true);
	}
	// --- 展区 编辑 dialog open ---
	const openMacEdit = (node: FlowNodeData) => {
		const m = machines.find((x) => x.id === node.id);
		if (!m) return;
		setMacEditing(m);
		setMacForm({ m_name: m.m_name, m_p: m.m_p?.id, m_summary: m.m_summary, m_re:m.m_re, show: m.show , sort:m.sort});
		setMacDialogOpen(true);
	}
	// --- 展区 编辑/新增 方法 ---
	const handleMacSave = async () => {
		try {
			// 未指定父展厅时省略 m_p（后端 IntegerField 不接受 null，省略即不绑定）
			const payload: Record<string, unknown> = { ...macForm };
			if (payload.m_p == null) delete payload.m_p;
			if (macEditing) {
				await updateMachine({ id: macEditing.id, ...payload });
				toast.success("展区更新成功");
			} else {
				await addMachine(payload);
				toast.success("展区添加成功");
			}
			setMacDialogOpen(false);
			fetchTree();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};
	// --- 展区 删除 方法 ---
	const handleMacDelete = (node: FlowNodeData) => {
		setDeleteConfirm({
			open: true,
			title: "确认删除",
			message: `确认删除展项「${node.label}」？`,
			onConfirm: async () => {
				await deleteMachine(node.id);
				toast.success("展项已删除");
				fetchTree();
			},
		});
	};

	// --- 展项 新增 dialog open --- 
	const openExhAdd = (parentNode: FlowNodeData | null) => {
		setExhEditing(null);
		setExhForm({ e_name: "",e_m: parentNode?.id ?? null, e_summary: "", e_re: "", e_ip: "192.168.1.255",e_base:"1_2_3_4_5_6", show: 1, sort:0 });
		setExhDialogOpen(true);
	}
	// --- 展项 编辑 dialog open --- 
	const openExhEdit = (node: FlowNodeData) => {
		const e = exhibits.find((x) => x.id === node.id);
		if (!e) return;
		setExhEditing(e);
		setExhForm({ e_name: e.e_name, e_m: e.e_m?.id, e_summary: e.e_summary, e_re: e.e_re, e_ip: e.e_ip, e_base: e.e_base, show: e.show, sort:e.sort });
		setExhDialogOpen(true);
	}
	// --- 展项 更新/新增 方法 ---
	const handleExhSave = async () => {
		try {
			// 未指定父展区时省略 e_m（同上）
			const payload: Record<string, unknown> = { ...exhForm };
			if (payload.e_m == null) delete payload.e_m;
			if (exhEditing) {
				await updateExhibit({ id: exhEditing.id, ...payload });
				toast.success("展项更新成功");
			} else {
				await addExhibit(payload);
				toast.success("展项添加成功");
			}
			setExhDialogOpen(false);
			fetchTree();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};
	// --- 展项 删除 方法 ---
	const handleExhDelete = (node: FlowNodeData) => {
		setDeleteConfirm({
			open: true,
			title: "确认删除",
			message: `确认删除展品「${node.label}」？`,
			onConfirm: async () => {
				await deleteExhibit(node.id);
				toast.success("展品已删除");
				fetchTree();
			},
		});
	};

	// --- 设备 新增 dialog open ---
	const openDevAdd = (parentNode: FlowNodeData,area:number) => {
		console.log(parentNode,area)
		setDevEditing(null);
		setDevForm({ num: "无" , name:"", dtype: 1, ip:"", conpare:"", area:area, link: parentNode.id, other: "", major: false, probe_enabled: false, sort:0 });
		setDevDialogOpen(true);
	}
	// --- 设备 编辑 dialog open ---
	const openDevEdit = (node: FlowNodeData) => {
		console.log(node)
		const d = devices.find((x) => x.id === node.id);
		if (!d) return;
		setDevEditing(d);
		setDevForm({ num: d.num , name:d.name, dtype: d.dtype.id, ip:d.ip, conpare:d.conpare, area:d.area, link: d.link, other: d.other, major: d.major, probe_enabled: d.probe_enabled, sort:d.sort });
		setDevDialogOpen(true);
	}
	// --- 设备 更新/新增 方法 ---
	const handleDevSave = async () => {
		try {
			if (devEditing) {
				await updateDevice({ id: devEditing.id, ...devForm });
				toast.success("设备更新成功");
			} else {
				await addDevice(devForm);
				toast.success("设备添加成功");
			}
			setDevDialogOpen(false);
			fetchTree();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};
	// --- 设备 删除 方法 ---
	const handleDevDelete = (node: FlowNodeData) => {
		setDeleteConfirm({
			open: true,
			title: "确认删除",
			message: `确认删除设备「${node.label}」？`,
			onConfirm: async () => {
				await deleteDevice(node.id);
				toast.success("设备已删除");
				fetchTree();
			},
		});
	};

	// --- 内容 新增 dialog open ---
	const openContentAdd = (parentNode: FlowNodeData) => {
		setContentEditing(null);
		setContentFormData({
			e_id: parentNode.id, c_name: "", c_file_status: 1, c_file_type: 1, c_file_name: "", c_file_addr: "",
			c_open: "", c_status: 1, c_default: 2, c_startup: 2, c_control: "", c_iframe: "", c_iframe_show: 2, c_link: "", note: "", sort: 1,
		});
		setContentDialogOpen(true);
	};
	// --- 内容 编辑 dialog open ---
	const openContentEdit = (node: FlowNodeData) => {
		const c = contents.find((x) => x.id === node.id);
		if (!c) return;
		setContentEditing(c);
		setContentFormData({
			e_id: c.e_id,
			c_name: c.c_name,
			c_file_status: c.c_file_status.id,
			c_file_type: c.c_file_type.id,
			c_file_name: c.c_file_name,
			c_file_addr: c.c_file_addr,
			c_open: c.c_open,
			c_status: c.c_status,
			c_default: c.c_default,
			c_startup: c.c_startup,
			c_control: c.c_control,
			c_iframe: c.c_iframe,
			c_iframe_show: c.c_iframe_show,
			c_link: c.c_link,
			note: c.note,
			sort: c.sort,
		});
		setContentDialogOpen(true);
	};
	// --- 内容 更新/新增 方法 ---
	const handleContentSave = async () => {
		try {
			if (contentEditing) {
				await updateContent({ id: contentEditing.id, ...contentFormData });
				toast.success("更新成功");
			} else {
				await addContent(contentFormData);
				toast.success("添加成功");
			}
			setContentDialogOpen(false);
			fetchTree();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	};
	// --- 内容 删除 方法 ---
	const handleContentDelete = (node: FlowNodeData) => {
		setDeleteConfirm({
			open: true,
			title: "确认删除",
			message: "确认删除该内容？",
			onConfirm: async () => {
				await deleteContent(node.id);
				toast.success("删除成功");
				fetchTree();
			},
		});
	};

	// --- 添加子节点动作 ---
	const handleAddChild = (node: FlowNodeData, type:string) => {
		// console.log(node,type)
		if (node.kind === "pavilion" && type === "machine") openMacAdd(node);
		else if (node.kind === "machine" && type === "exhibit") openExhAdd(node);
		else if (node.kind === "pavilion" && type === "device") openDevAdd(node,2);
		else if (node.kind === "exhibit" && type === "device") openDevAdd(node,1);
		else if (node.kind === "exhibit" && type === "content") openContentAdd(node);
	}

	// --- 编辑节点动作 --- 
	const handleEdit = (node: FlowNodeData) => {
		if (node.kind === "pavilion") openPavEdit(node);
		else if (node.kind === "machine") openMacEdit(node);
		else if (node.kind === "exhibit") openExhEdit(node);
		else if (node.kind === "device") openDevEdit(node);
		else if (node.kind === "content") openContentEdit(node);
	}

	// --- 删除节点动作 --- 
	const handleDelete = (node: FlowNodeData) => {
		if (node.kind === "pavilion") handlePavDelete(node);
		else if (node.kind === "machine") handleMacDelete(node);
		else if (node.kind === "exhibit") handleExhDelete(node);
		else if (node.kind === "device") handleDevDelete(node);
		else if (node.kind === "content") handleContentDelete(node);
	}

	// 内容表单联动规则（与 exhibition/content.tsx 保持一致）
	// 1) 存储位置=1（中控服务器）才需要上传文件，且只有 程序/视频/图片/文档/其他 需要文件
	// 2) 存储位置≠1 时手填文件地址与文件名
	// 3) 程序名只在「程序文件 + 中控服务器存储」时出现
	// 4) 控制 JSON / 控制页面只在「程序文件」时出现
	const isServerStorage = contentFormData.c_file_status === 1;
	const isUploadableType = [1, 2, 3, 4, 6].includes(contentFormData.c_file_type);

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6 h-full">
			<div className="flex-1 min-h-0">
				<ExhibitionFlow
					pavilions={pavilions}
					machines={machines}
					exhibits={exhibits}
					devices={devices}
					contents={contents}
					// selectedExhibitId={selectedContent?.id ?? null}
					loading={treeLoading}
					onAddChild={handleAddChild}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onAddNode={handleAddNode}
					onLinkNodes={handleLinkNodes}
					onDeleteLink={handleDeleteLink}
					onContentControlEdit={handleContentControlEdit}
					onDeviceControlEdit={handleDeviceControlEdit}
					onExhibitControlEdit={handleExhibitControlEdit}
					onContentDownload={handleContentDownload}
					onDeviceProbe={handleDeviceProbe}
					onRefresh={fetchTree}
				/>
			</div>

			{/* 内容 命令管理 Drawer */}
			<Drawer disablePointerDismissal={true} open={contentControlDrawerOpen} onOpenChange={handleContentControlDrawerOpenChange} swipeDirection="right">
				<DrawerPortal >
					<DrawerOverlay />
					<DrawerContent  className="h-full w-full max-w-4/5">
						<DrawerHeader>
							<div className="flex items-center justify-start gap-2">
								{selectedContent && (
									<Badge variant="outline" className="text-xl h-8">
										{selectedContent.label}
									</Badge>
								)}
								<DrawerTitle>命令管理</DrawerTitle>
							</div>
							<DrawerDescription>
								管理内容控制
							</DrawerDescription>
						</DrawerHeader>

						<div className="flex-1 overflow-y-auto px-4 py-4">
							<CodeFlow controlData={selectedContent} onSaved={handleContentControlSaved}/>
						</div>

						<DrawerFooter className="flex flex-row">
							{/* 保存动作由 ContentControlFlow 内部的「保存控制流程」按钮负责，
							    这里只提供关闭 */}
							<DrawerClose render={
								<Button variant="outline" className="flex-1">关闭</Button> 
							}>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</DrawerPortal>
			</Drawer>

			{/* 展项 快捷控制（e_link）Drawer —— 与 pme.tsx 的快捷命令管理一致 */}
			<Drawer
				disablePointerDismissal={true}
				open={exhibitControlDrawerOpen}
				onOpenChange={(open) => {
					if (!open) {
						setExhibitControlDrawerOpen(false);
						setSelectedExhibitControl(null);
						// 不刷新画布：e_link 不影响画布渲染，保存结果已通过 onSaved 缓存
					}
				}}
				swipeDirection="right"
			>
				<DrawerPortal>
					<DrawerOverlay />
					<DrawerContent className="h-full w-full max-w-4/5">
						<DrawerHeader>
							<div className="flex items-center justify-start gap-2">
								{selectedExhibitControl && (
									<Badge variant="outline" className="text-xl h-8">
										{selectedExhibitControl.label}
									</Badge>
								)}
								<DrawerTitle>快捷命令管理</DrawerTitle>
							</div>
							<DrawerDescription>
								管理展项快捷按钮控制
							</DrawerDescription>
						</DrawerHeader>

						<div className="flex-1 overflow-y-auto px-4 py-4">
							<ExhibitionLinkFlow controlData={selectedExhibitControl} onSaved={handleExhibitControlSaved} />
						</div>

						<DrawerFooter className="flex flex-row">
							{/* 保存动作由 ExhibitionLinkFlow 内部负责，这里只提供关闭 */}
							<DrawerClose render={
								<Button variant="outline" className="flex-1">关闭</Button>
							}>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</DrawerPortal>
			</Drawer>

			{/* 设备 命令管理 Drawer */}
			<DeviceCommandDrawer
				open={deviceCommandDrawerOpen}
				onOpenChange={setDeviceCommandDrawerOpen}
				device={selectedDevice}
			/>

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
								<FieldLabel htmlFor="m_p">所属展厅 ID</FieldLabel>
								<Input id="m_p" type="text" value={macForm.m_p ?? ""} placeholder="未绑定（可在画布拖拽关联）" onChange={(e) => setMacForm({ ...macForm, m_p: Number(e.target.value) })} disabled/>
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
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="e_m">展区 ID</FieldLabel>
									<Input id="e_m" type="number" value={exhForm.e_m ?? ""} placeholder="未绑定（可在画布拖拽关联）" onChange={(e) => setExhForm({ ...exhForm, e_m: Number(e.target.value) })} disabled/>
								</Field>
								<Field>
									<FieldLabel htmlFor="e_ip">展项 IP</FieldLabel>
									<Input id="e_ip" value={exhForm.e_ip} onChange={(e) => setExhForm({ ...exhForm, e_ip: e.target.value })} />
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
								<FieldLabel htmlFor="e_re">展区备注</FieldLabel>
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

			{/* --- 设备 编辑/新增 Dialog --- */}
			<Dialog open={devDialogOpen} onOpenChange={setDevDialogOpen}>
				<DialogContent className="sm:max-w-180">
					<DialogHeader>
						<DialogTitle>{devEditing ? "编辑设备" : "添加设备"}</DialogTitle>
					</DialogHeader>
					<form className="w-full">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="name">名称</FieldLabel>
								<Input id="name" value={devForm.name} onChange={(e) => setDevForm({ ...devForm, name: e.target.value })} placeholder="设备名称" />
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="num">编号</FieldLabel>
									<Input id="num" value={devForm.num} onChange={(e) => setDevForm({ ...devForm, num: e.target.value })} placeholder="设备编号" />
								</Field>
								<Field>
									<FieldLabel htmlFor="dtype">类型</FieldLabel>
									<Select items={DeviceTypeItems} defaultValue="1" value={String(devForm.dtype)} onValueChange={(e) => setDevForm({ ...devForm, dtype: Number(e) })}>
										<SelectTrigger id="dtype"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{DeviceTypeItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="ip">设备 IP</FieldLabel>
								<Input id="ip" value={devForm.ip} onChange={(e) => setDevForm({ ...devForm, ip: e.target.value })} />
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="conpare">设备厂家</FieldLabel>
									<Input id="conpare" value={devForm.conpare} onChange={(e) => setDevForm({ ...devForm, conpare: e.target.value })} />
								</Field>
								<Field>
									<FieldLabel htmlFor="probe_enabled">
										设备探活
										<span className="text-destructive/50 text-xs">*使用服务器30s一次设备活性探测</span>
									</FieldLabel>
									<Select
										items={ProbeItems}
										defaultValue="0"
										value={devForm.probe_enabled ? "1" : "0"}
										onValueChange={(e) => setDevForm({ ...devForm, probe_enabled: e === "1" })}
										// 与 device/index.tsx 一致：只有电脑主机(3)/一体机(4) 支持探活
										disabled={!PROBE_ENABLED_DTYPES.includes(devForm.dtype)}
									>
										<SelectTrigger id="probe_enabled"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{ProbeItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="area">所属位置</FieldLabel>
									<Select items={AreaItems} defaultValue="1" value={String(devForm.area)} onValueChange={(e) => setDevForm({ ...devForm, area: Number(e) })} disabled>
										<SelectTrigger id="area"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{AreaItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="link">绑定 ID</FieldLabel>
									<Input id="link" type="number" value={devForm.link} onChange={(e) => setDevForm({ ...devForm, link: Number(e.target.value) })} disabled/>
								</Field>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="major">是否为主内容设备</FieldLabel>
									<Input id="major" type="text" value={devForm.major?'是':'否'} onChange={(e) => setDevForm({ ...devForm, major: e.target.value=='是'? true : false })} disabled/>
								</Field>
								<Field>
									<FieldLabel htmlFor="sort">排序</FieldLabel>
									<Input id="sort" type="number" value={devForm.sort} placeholder="请输入排序" onChange={(e) => setDevForm({ ...devForm, sort: Number(e.target.value) })}/>
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="other">设备备注</FieldLabel>
								<Textarea id="other" value={devForm.other} placeholder="可选输入，设备备注" onChange={(e) => setDevForm({ ...devForm, other: e.target.value })}/>
							</Field>
						</FieldGroup>
					</form>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDevDialogOpen(false)}>取消</Button>
						<Button onClick={handleDevSave}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* --- 内容 编辑/新增 dialog（字段与联动规则对齐 exhibition/content.tsx） --- */}
			<Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
				<DialogContent className="sm:max-w-200">
					<DialogHeader>
						<DialogTitle>{contentEditing ? "编辑内容" : "新增内容"}</DialogTitle>
						<DialogDescription>
							{contentEditing ? "修改内容信息" : "填写新内容的信息"}
						</DialogDescription>
					</DialogHeader>
					<form className="w-full">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="c_name">名称</FieldLabel>
								<Input id="c_name" type="text" value={contentFormData.c_name} placeholder="名称" required onChange={(e) => setContentFormData({ ...contentFormData, c_name: e.target.value })}/>
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="c_file_status">存储位置</FieldLabel>
									<Select items={FileStatusItems} defaultValue="1" value={String(contentFormData.c_file_status)}
										onValueChange={(e) => {
											// 服务器存储 → 下发状态未下发(1)；本地/其他 → 无需下发(2)
											Number(e) === 1
												? setContentFormData({ ...contentFormData, c_status: 1, c_file_status: Number(e) })
												: setContentFormData({ ...contentFormData, c_status: 2, c_file_status: Number(e) });
										}}
										disabled={Boolean(contentEditing)}
									>
										<SelectTrigger id="c_file_status"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{FileStatusItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="c_file_type">文件类型</FieldLabel>
									<Select items={FileTypeItems} defaultValue="1" value={String(contentFormData.c_file_type)} onValueChange={(e) => setContentFormData({ ...contentFormData, c_file_type: Number(e) })} disabled={Boolean(contentEditing)}>
										<SelectTrigger id="c_file_type"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{FileTypeItems.map((item) => (
												// 服务器存储没有「网页地址」这种文件
												<SelectItem key={item.value} value={item.value} disabled={isServerStorage && item.value === '5'}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</div>

							<Field className={isServerStorage && isUploadableType ? '' : 'hidden'}>
								<FieldLabel htmlFor="file">上传文件</FieldLabel>
								<FileUpload
									accept=".jpg,.png,.jpeg,.pdf,.mp4,.zip,.pptx"
									maxSize={5 * 1024 * 1024 * 1024}
									value={contentFormData.c_file_addr}
									fileName={contentFormData.c_file_name}
									onUploaded={({ name, url }) => setContentFormData((prev) => ({
										...prev,
										c_file_name: name,
										c_file_addr: url,
									}))}
									onClear={() => setContentFormData((prev) => ({
										...prev,
										c_file_name: "",
										c_file_addr: "",
									}))}
									onUploadingChange={setContentUploading}
								/>
							</Field>

							<Field className={isServerStorage ? 'hidden' : ''}>
								<FieldLabel htmlFor="c_file_addr">文件地址</FieldLabel>
								<Input id="c_file_addr" value={contentFormData.c_file_addr} placeholder="请输入目标电脑详细文件地址，如： D:/软件/v1/demo.exe" onChange={(e) => setContentFormData({ ...contentFormData, c_file_addr: e.target.value })}/>
							</Field>

							<Field className={isServerStorage ? 'hidden' : ''}>
								<FieldLabel htmlFor="c_file_name">文件名称</FieldLabel>
								<Input id="c_file_name" value={contentFormData.c_file_name} placeholder="请输入详细文件名，带后缀，如： demo.exe，video.mp4" onChange={(e) => setContentFormData({ ...contentFormData, c_file_name: e.target.value })}/>
							</Field>

							<Field className={contentFormData.c_file_type === 1 && isServerStorage ? '' : 'hidden'}>
								<FieldLabel htmlFor="c_open">程序名（带后缀）</FieldLabel>
								<Input id="c_open" type="text" value={contentFormData.c_open} placeholder="请输入ZIP目录中exe名称，需要携带.exe，如:demo.exe" onChange={(e) => setContentFormData({ ...contentFormData, c_open: e.target.value })}/>
							</Field>

							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="c_default">当前打开状态</FieldLabel>
									<Select items={StatusItems} defaultValue="1" value={String(contentFormData.c_default)} onValueChange={(e) => setContentFormData({ ...contentFormData, c_default: Number(e) })} disabled>
										<SelectTrigger id="c_default"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{StatusItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="c_startup">开机启动</FieldLabel>
									<Select items={StatusItems} defaultValue="1" value={String(contentFormData.c_startup)} onValueChange={(e) => setContentFormData({ ...contentFormData, c_startup: Number(e) })} disabled>
										<SelectTrigger id="c_startup"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{StatusItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</div>

							<Field className={contentFormData.c_file_type === 1 ? '' : 'hidden'}>
								<FieldLabel htmlFor="c_control">控制JSON</FieldLabel>
								<Textarea className="max-h-30" id="c_control" value={contentFormData.c_control ?? ''} placeholder="JSON格式，可先不填写，内容添加完成后使用流程图方式创建" onChange={(e) => setContentFormData({ ...contentFormData, c_control: e.target.value })}/>
							</Field>

							<Field className={contentFormData.c_file_type === 1 ? '' : 'hidden'}>
								<FieldLabel htmlFor="c_iframe">控制页面</FieldLabel>
								<Input id="c_iframe" type="text" value={contentFormData.c_iframe} placeholder="可植入局域网下控制页面，进行iframe插入，可不填写" onChange={(e) => setContentFormData({ ...contentFormData, c_iframe: e.target.value })}/>
							</Field>

							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="c_iframe_show">Iframe显示状态</FieldLabel>
									<Select items={StatusItems} defaultValue="1" value={String(contentFormData.c_iframe_show)} onValueChange={(e) => setContentFormData({ ...contentFormData, c_iframe_show: Number(e) })}>
										<SelectTrigger id="c_iframe_show"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{StatusItems.map((item) => (
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
									<Input id="sort" type="number" value={contentFormData.sort} placeholder="请输入排序" onChange={(e) => setContentFormData({ ...contentFormData, sort: Number(e.target.value) })}/>
								</Field>
							</div>

							<Field>
								<FieldLabel htmlFor="note">展区备注</FieldLabel>
								<Textarea id="note" value={contentFormData.note ?? ''} placeholder="请输入备注" onChange={(e) => setContentFormData({ ...contentFormData, note: e.target.value })}/>
							</Field>
						</FieldGroup>
					</form>
					<DialogFooter>
						<Button variant="outline" onClick={() => setContentDialogOpen(false)} disabled={contentUploading}>取消</Button>
						<Button onClick={handleContentSave} disabled={contentUploading}>{contentUploading ? "上传中..." : "保存"}</Button>
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
