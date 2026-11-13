import { useState, useEffect, useCallback,type ReactNode } from "react";
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
import { Switch } from "@/components/ui/switch";
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
import type { FlowNodeData } from "@/components/ExhibitionFlow/types";
import {
	getPavilionList, addPavilion, updatePavilion, deletePavilion,
	getMachineList, addMachine, updateMachine, deleteMachine,updateMachineLink,
	getExhibitList, addExhibit, updateExhibit, deleteExhibit,updateExhibitLink,
	getContentList, addContent, updateContent, deleteContent,updateContentControl,
	getControlList,
} from "@/api/exhibition";

import { 
	getDeviceList,addDevice,updateDevice,deleteDevice,updateDeviceLink
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
	c_open: number;
	c_status: number;
	c_default: number;
	c_startup: number;
	c_control: object;
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
	sort: number;
}


interface ContentFormData {
	e_id: number; // 展项id
	c_name: string;
	c_file_status: number;
	c_file_type: number;
	c_file_name: string;
	c_file_addr: string;
	c_open: number;
	c_status: number;
	c_default: number;
	c_startup: number;
	c_control: object;
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
	{label:'服务器存储',value:'1'},{label:'展项电脑存储',value:'2'},{label:'其他',value:'3'},
]

const FileTypeItems = [
	{label:'程序文件',value:'1'},{label:'视频文件',value:'2'},{label:'图片文件',value:'3'},{label:'文档文件',value:'4'},{label:'网页地址',value:'5'},{label:'其他',value:'6'},
]


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

	const [contentDialogOpen, setContentDialogOpen] = useState(false);
	const [contentEditing, setContentEditing] = useState<ContentItem | null>(null);
	const [contentFormData, setContentFormData] = useState(
		{
			e_id: null,c_name: "",c_file_status: 1,c_file_type: 1,c_file_name: '',c_file_addr: '',
			c_open: 1,c_status: 1,c_default: 1,c_startup: 1,c_control: {},c_iframe: '',c_iframe_show: 1,c_link: '',note: '',sort: 0,
		}
	);

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
	const [devForm,setDevForm] = useState({ num: "无" , name:"", dtype: 1, ip:"", conpare:"", area:1, link:null, other: "", major: false, sort:0 })

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
		console.log(node)
		const e = exhibits.find((x) => x.id === node.eid);
		setSelectedContent({...node, ip: e?.e_ip});
		setContentControlDrawerOpen(true);
	};
	// --- 内容控制 drawer 状态改变 ---
	const handleContentControlDrawerOpenChange = useCallback((open: boolean) => {
		if (!open) {
			setContentControlDrawerOpen(false);
			setSelectedContent(null);
			fetchTree();
		}
	}, []);
	// --- 内容控制 编辑保存 ---
	const handleContentControlSave = async (c_control) => {
		try {
			await updateContentControl({ id: selectedContent.id, c_control:c_control });
			toast.success("内容控制成功");
			// fetchTree();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "操作失败");
		}
	}

	// --- 设备命令 编辑 ---
	const handleDeviceControlEdit = (node: FlowNodeData) =>{

	}
 
	// --- Sidebar 添加节点 ---
	const handleAddNode = useCallback((kind: "pavilion" | "machine" | "exhibit") => {
		if (kind === "pavilion") openPavAdd();
		// else if (kind === "machine") openMacAdd({ id: 0, label: "", kind: "machine", show: 1 });
		// else if (kind === "exhibit") openExhAdd({ id: 0, label: "", kind: "exhibit", show: 1 });
	}, []);

	// --- 节点连接 ---
	const handleLinkNodes = useCallback(async (source: FlowNodeData, target: FlowNodeData) => {
		try {
			if (source.kind === "pavilion" && target.kind === "machine") {
				if(source.id !== target.m_p ){ 
					await updateMachineLink({ id: target.id, m_p: source.id });
					toast.success("展项已关联到展馆");
					fetchTree();
				}else{
					toast.warning("不可重复连接！");
				}
			} else if (source.kind === "machine" && target.kind === "exhibit") {
				if(source.id !== target.e_m ){ 
					await updateExhibitLink({ id: target.id, e_m: source.id });
					toast.success("展品已关联到展项");
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
			console.log(source,target)
			if (source.kind === "pavilion" && target.kind === "machine") {
				if(target?.m_p || target.m_p !== null){
					await updateMachineLink({ id: target.id, m_p: null });
					toast.success("展区已取消关联");
					fetchTree();
				}
			}else if (source.kind === "machine" && target.kind === "exhibit") {
				if(target?.e_m || target.e_m !== null){
					await updateExhibitLink({ id: target.id, e_m: null });
					toast.success("展项已取消关联");
					fetchTree();
				}
			}else if (source.kind === "pavilion" && target.kind === "device") {
				if(target?.link || target.e_m !== null){
					await updateDeviceLink({ id: target.id, area:2, link: null });
					toast.success("设备已取消关联");
					fetchTree();
				}
			}else if (source.kind === "exhibit" && target.kind === "device") {
				if(target?.link || target.e_m !== null){
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
	const openMacAdd = (parentNode: FlowNodeData) => {
		setMacEditing(null);
		setMacForm({ m_name: "", m_p: parentNode.id, m_summary: "", m_re:"", show: 1, sort:0 });
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
			if (macEditing) {
				await updateMachine({ id: macEditing.id, ...macForm });
				toast.success("展项更新成功");
			} else {
				await addMachine(macForm);
				toast.success("展项添加成功");
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
	const openExhAdd = (parentNode: FlowNodeData) => {
		setExhEditing(null);
		setExhForm({ e_name: "",e_m: parentNode.id, e_summary: "", e_re: "", e_ip: "192.168.1.255",e_base:"1_2_3_4_5_6", show: 1, sort:0 });
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
			if (exhEditing) {
				await updateExhibit({ id: exhEditing.id, ...exhForm });
				toast.success("展品更新成功");
			} else {
				await addExhibit(exhForm);
				toast.success("展品添加成功");
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
		setDevForm({ num: "无" , name:"", dtype: 1, ip:"", conpare:"", area:area, link: parentNode.id, other: "", major: false, sort:0 });
		setDevDialogOpen(true);
	}
	// --- 设备 编辑 dialog open ---
	const openDevEdit = (node: FlowNodeData) => {
		console.log(node)
		const d = devices.find((x) => x.id === node.id);
		if (!d) return;
		setDevEditing(d);
		setDevForm({ num: d.num , name:d.name, dtype: d.dtype.id, ip:d.ip, conpare:d.conpare, area:d.area, link: d.link, other: d.other, major: d.major, sort:d.sort });
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
			e_id: parentNode.id, c_name: "",c_file_status: 1,c_file_type: 1,c_file_name: '',c_file_addr: '',
			c_open: 1,c_status: 1,c_default: 1,c_startup: 1,c_control: {},c_iframe: '',c_iframe_show: 1,c_link: '',note: '',sort: 0,
		});
		setContentDialogOpen(true);
	};
	// --- 内容 编辑 dialog open ---
	const openContentEdit = (node: FlowNodeData) => {
		console.log(node)
		const c = contents.find((x) => x.id === node.id);
		if (!c) return;
		setContentEditing(c);
		setContentFormData({
			e_id: c.e_id, c_name:c.c_name, c_file_status: c.c_file_status.id,c_file_type: c.c_file_type.id,c_file_name: c.c_file_name,c_file_addr: c.c_file_addr,
			c_open: c.c_open,c_status: c.c_status,c_default: c.c_default,c_startup: c.c_startup,c_control: c.c_control,c_iframe: c.c_iframe,c_iframe_show: c.c_iframe_show,c_link: c.c_link,note: c.note,sort: c.sort,
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
							<CodeFlow controlData={selectedContent}/>
						</div>

						<DrawerFooter className="flex flex-row">
							{/* <Button className="flex-1" onClick={handleContentControlSave}>提交</Button> */}
							<DrawerClose render={
								<Button variant="outline" className="flex-1">关闭</Button> 
							}>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</DrawerPortal>
			</Drawer>

			{/* 设备 命令管理 Drawer */}

			{/* --- 展厅 编辑/新增 Dialog --- */}
			<Dialog open={pavDialogOpen} onOpenChange={setPavDialogOpen}>
				<DialogContent className="sm:max-w-120">
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
				<DialogContent className="sm:max-w-120">
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
				<DialogContent className="sm:max-w-120">
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
									<Input id="e_m" type="number" value={exhForm.e_m} onChange={(e) => setExhForm({ ...exhForm, e_m: Number(e.target.value) })} disabled/>
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
				<DialogContent className="sm:max-w-120">
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
							<Field>
								<FieldLabel htmlFor="conpare">设备厂家</FieldLabel>
								<Input id="conpare" value={devForm.conpare} onChange={(e) => setDevForm({ ...devForm, conpare: e.target.value })} />
							</Field>
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

			{/* --- 内容 编辑/新增 dialog --- */}
			<Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
				<DialogContent className="sm:max-w-200">
					<DialogHeader>
						<DialogTitle>{contentEditing ? "编辑内容" : "新增内容"}</DialogTitle>
					</DialogHeader>
					<form className="w-full">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="name">名称</FieldLabel>
								<Input id="name" value={contentFormData.c_name} onChange={(e) => setContentFormData({ ...contentFormData, c_name: e.target.value })} placeholder="内容名称" />
							</Field>
							<Field>
								<FieldLabel htmlFor="note">介绍</FieldLabel>
								<Input id="note" value={contentFormData.note} onChange={(e) => setContentFormData({ ...contentFormData, note: e.target.value })} placeholder="内容介绍" />
							</Field>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="c_file_status">文件地址</FieldLabel>
									<Select items={FileStatusItems} defaultValue="1" value={String(contentFormData.c_file_status)} onValueChange={(e) => setContentFormData({ ...contentFormData, c_file_status: Number(e) })} disabled={contentEditing?true:false}>
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
									<Select items={FileTypeItems} defaultValue="1" value={String(contentFormData.c_file_type)} onValueChange={(e) => setContentFormData({ ...contentFormData, c_file_type: Number(e) })} disabled={contentEditing?true:false}>
										<SelectTrigger id="c_file_type"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
											{FileTypeItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</div>

							<FileUpload accept=".jpg,.png,.jpeg,.pdf,.mp4,.zip,.pptx" maxSize={5 * 1024 * 1024 * 1024}/>

							<div className="grid grid-cols-2 gap-4">
								<Field orientation="horizontal" className="flex items-center">
									<Switch className="m-1" id="c_default" size="default" defaultChecked={contentFormData.c_default === 1?true:false}/>
									<FieldLabel htmlFor="c_default">当前打开状态</FieldLabel>
								</Field>
								<Field orientation="horizontal">
									<Switch className="m-1" id="c_startup" size="default" defaultChecked={contentFormData.c_startup === 1?true:false}/>
									<FieldLabel htmlFor="c_startup" >默认启动状态</FieldLabel>
								</Field>
							</div>

							<Field>
								<FieldLabel htmlFor="c_link">绑定控制 ID</FieldLabel>
								<Input id="c_link" value={contentFormData.c_link} onChange={(e) => setContentFormData({ ...contentFormData, c_link: e.target.value })} disabled/>
							</Field>
							
							<Field>
								<FieldLabel htmlFor="c_iframe">第三方控制地址</FieldLabel>
								<Input id="c_iframe" value={contentFormData.c_iframe} onChange={(e) => setContentFormData({ ...contentFormData, c_iframe: e.target.value })} placeholder="可不填写，如需填写请填写网站路由" />
							</Field>
			
							<div className="grid grid-cols-2 gap-4">
								<Field orientation="horizontal">
									<Switch className="m-1" id="c_iframe_show" size="default" defaultChecked={contentFormData.c_iframe_show === 1?true:false}/>
									<FieldLabel htmlFor="c_iframe_show">控制地址是否显示</FieldLabel>
								</Field>
								<Field orientation="horizontal">
									<FieldLabel htmlFor="sort" className="w-12 leading">排序 :</FieldLabel>
									<Input id="sort" type="number" value={devForm.sort} placeholder="请输入排序" onChange={(e) => setDevForm({ ...devForm, sort: Number(e.target.value) })}/>
								</Field>
							</div>
							
						</FieldGroup>
					</form>
					<DialogFooter>
						<Button variant="outline" onClick={() => setContentDialogOpen(false)}>取消</Button>
						<Button onClick={handleContentSave}>保存</Button>
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
