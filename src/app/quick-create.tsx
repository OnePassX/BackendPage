import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDownIcon, PenSquare, PlusIcon, EyeIcon, EyeOffIcon, Pen, Edit, CodeIcon } from "lucide-react";
import { get_Model_List,get_List,get_Content_List,get_Welcome,set_Welcome,get_HwModel_List,get_Now_HwModel,getEhMessage,get_Device,update_Note,change_Content } from "@/api/quick.js";
import {
    getPavilionList,
    getMachineList,
    getExhibitList as fetchExhibitList,
    getContentList,
    updateContentControl,
} from "@/api/exhibition";
import { getDeviceList, getCodeList } from "@/api/device";
import { getSmodelList, getHmodelList } from "@/api/model";
import { SiDropbox } from 'react-icons/si';
import { PiListBold } from 'react-icons/pi';
import { MdContentCopy,MdControlCamera,MdOutlineModeStandby,MdDeviceHub,MdOutlineTextSnippet} from "react-icons/md";
import { AiOutlineFullscreen,AiOutlineFullscreenExit,AiOutlineRedo } from "react-icons/ai";
import { XJ_Modal } from "@/components/quick-create/Modal";
import { HardwareControlPage, SoftwareControlPage, HardwareControlPage2 } from "@/components/quick-create/Control";
import {
    PavilionForm,
    MachineForm,
    ExhibitForm,
    ContentForm,
    DeviceForm,
    CodeForm,
    ModeForm,
} from "@/components/quick-create/forms/QuickForms";
import { ControlNodeForm, type ControlNode } from "@/components/quick-create/forms/ControlNodeForm";
import { ExhibitLinkPanel } from "@/components/quick-create/ExhibitLinkPanel";
import { ContentControlPanel } from "@/components/quick-create/ContentControlPanel";
import { VncPanel } from "@/components/quick-create/vnc/VncPanel";
import { HiPlusSm,HiOutlineMinusSm,HiOutlineVolumeOff,HiOutlineVolumeUp } from "react-icons/hi";
import { LuPanelBottomOpen, LuPanelTopOpen, LuPenLine, LuSave } from "react-icons/lu";
import { Separator } from "@/components/ui/separator";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

// const fileTypeData = [
//     {
//         type: "EXE",
//         icon: './assets/exe_icon.png',
//         icon_click: './assets/exe_click_icon.png',
//     },{
//         type: "VIDEO",
//         icon: './assets/mp4_icon.png',
//         icon_click: './assets/mp4_click_icon.png',
//     },{
//         type: "PIC",
//         icon: './assets/jpg_icon.png',
//         icon_click: './assets/jpg_click_icon.png',
//     },{
//         type: "PPT",
//         icon: './assets/ppt_icon.png',
//         icon_click: './assets/ppt_click_icon.png',
//     },{
//         type: "HTML",
//         icon: './assets/html_icon.png',
//         icon_click: './assets/html_click_icon.png',
//     }
// ]

const fileTypeData = [
    {
        type: "EXE",
        icon: './src/assets/exe_icon.png',
        icon_click: './src/assets/exe_click_icon.png',
    },{
        type: "VIDEO",
        icon: './src/assets/mp4_icon.png',
        icon_click: './src/assets/mp4_click_icon.png',
    },{
        type: "PIC",
        icon: './src/assets/jpg_icon.png',
        icon_click: './src/assets/jpg_click_icon.png',
    },{
        type: "PPT",
        icon: './src/assets/ppt_icon.png',
        icon_click: './src/assets/ppt_click_icon.png',
    },{
        type: "HTML",
        icon: './src/assets/html_icon.png',
        icon_click: './src/assets/html_click_icon.png',
    }
]

const baseButton = [
    {"id":"1","code":"dec","name":"音量加",'port':5566,'icon':<HiPlusSm size={20}/>},
    {"id":"2","code":"inc","name":"音量减",'port':5566,'icon':<HiOutlineMinusSm  size={20}/>},
    {"id":"3","code":"mute","name":"静音",'port':5566,'icon':<HiOutlineVolumeOff size={20}/>},
    {"id":"4","code":"unmute","name":"取消静音",'port':5566,'icon':<HiOutlineVolumeUp size={20}/>},
    {"id":"5","code":"open","name":"窗口打开",'port':5566,'icon':<LuPanelBottomOpen size={20}/>},
    {"id":"6","code":"close","name":"窗口关闭",'port':5566,'icon':<LuPanelTopOpen size={20}/>}
]

const SkeletonView = (
    <div className="space-y-3">
        <Skeleton className="h-3 w-3/5 rounded-lg" />
        <Skeleton className="h-3 w-4/5 rounded-lg" />
        <Skeleton className="h-3 w-4/5 rounded-lg" />
        <Skeleton className="h-3 w-2/5 rounded-lg" />
    </div>
)

/**
 * 通用可选列表（替代 HeroUI 的 Listbox）。
 *
 * 为什么自建：shadcn 没有 Listbox，Select 是下拉、Command 面向搜索，
 * 都不适合「常驻可见的单选列表 + 描述 + 图标 + 禁用」这种控制面板用法。
 * 选中态用 bg-current 沿用页面主色（父级设置了 text-[#xxxxxx]）。
 */
function SelectableList({
    items,
    selectedKey,
    onSelect,
    onEdit,
    empty,
    className,
    emptyClassName,
    showEdit = true,
}: {
    items: Array<{
        id: number | string;
        name: string;
        description?: string;
        icon?: React.ReactNode;
        disabled?: boolean;
    }>;
    selectedKey?: string;
    onSelect: (key: string) => void;
    onEdit: (key: string) => void;
    empty?: React.ReactNode;
    className?: string;
    emptyClassName?: string;
    /** 是否显示每项的「编辑」按钮（由页面的统一显隐开关控制） */
    showEdit?: boolean;
}) {
    if (items.length === 0) {
        return (
            <div className={cn("flex h-50 w-full items-center justify-center text-xl text-muted-foreground", emptyClassName)}>
                {empty ?? "暂无数据"}
            </div>
        );
    }
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {items.map((item) => {
                const selected = selectedKey != null && String(item.id) === selectedKey;
                return (
                    <div className="flex items-center gap-2">
                    <div
                        key={item.id}
                        onClick={() => onSelect(String(item.id))}
                        className={cn(
                            "flex w-full items-center gap-2  rounded-lg border border-[#888888]/20 px-2 py-2 text-left text-sm transition-colors",
                            selected ? "bg-current" : "bg-secondary ",
                            item.disabled && "cursor-not-allowed bg-gray-500/10 opacity-60",
                        )}
                    >
                        {item.icon}
                        <span className="min-w-0 flex-1">
                            <span className={`block truncate ${selected? 'text-white': 'text-secondary-foreground'}`}>{item.name}</span>
                            {item.description && (
                                <span className={cn("block truncate text-xs", selected ? "text-white/70" : "text-gray-400")}>
                                    {item.description}
                                </span>
                            )}
                        </span>
                        {showEdit && (
                            <Button variant="secondary" className="text-xs" onClick={()=> onEdit(String(item.id))}><PenSquare />编辑</Button>
                        )}
                    </div>
                    
                    </div>
                );
            })}
            
        </div>
    );
}

const Index = () =>{

    // 路由跳转
    const navigate = useNavigate();
    // 欢迎词抽屉开关
    const [isOpen, setIsOpen] = useState(false);
    // 抽屉方向
    const [drawerPlacement] = useState<'top' | 'right' | 'bottom' | 'left'>('top');

    // 欢迎词信息
    const [welcomeText, setWelcomeText] = useState('');
    // 全屏参数
    const [fullScreen,setFullScreen] = useState(false);
    // 是否显示所有「添加/编辑」按钮（默认隐藏，保持控制界面干净）
    const [showEditActions, setShowEditActions] = useState(false);
    // 时间参数
    const [currentTime, setCurrentTime] = useState({ time: '', week: '', date: '' });

    // 当前选择的模式
    const [currentModel, setCurrentModel] = useState();
    // 软件模式列表
    const [modelList,setModelList] = useState([]);
    // 硬件模式列表
    const [hwModelList,setHwModelList] = useState([]);
    // 当前选择的硬件模式
    const [currentHwModel, setCurrentHwModel] = useState();
    // 当前选择的展区
    const [currentHall,setCurrentHall] = useState(0)
    // 当前选择的展项
    const [currentExhibit,setCurrentExhibit] = useState(new Set(['0']));
    // 当前展项解说词
    const [exhibitNote,setExhibitNote] = useState('');
    // 解说词编辑状态
    const [editable,setEditable] = useState(false);
    // 展项列表状态
    const [exhibitStatus,setExhibitStatus] = useState(true);
    // 展项列表
    const [exhibitList,setExhibitList] = useState([]);
    // 完整树：展馆 → 展区 → 展项（快捷创建需要展馆 id，不能拍平）
    const [tree, setTree] = useState<any[]>([])
    // 当前选中的展馆（顶部切换，决定下方展区/展项列表）
    const [currentPavilion, setCurrentPavilion] = useState<number | null>(null)
    // 快捷创建弹窗：kind + 是否打开 + 正在编辑的行 + 父级 id
    const [dialog, setDialog] = useState<{
        kind: "pavilion" | "machine" | "exhibit" | "content" | "device" | "code" | "smodel" | "hmodel";
        open: boolean;
        editing: any;
        parentId?: number | null;
    }>({ kind: "pavilion", open: false, editing: null })

    const openDialog = (
        kind: "pavilion" | "machine" | "exhibit" | "content" | "device" | "code" | "smodel" | "hmodel",
        editing: any = null,
        parentId?: number | null,
    ) => setDialog({ kind, open: true, editing, parentId })
    const closeDialog = (open: boolean) => setDialog((prev) => ({ ...prev, open }))
    // 展开的展厅（空集合 = 全部展开）
    const [openHalls, setOpenHalls] = useState<Set<string>>(new Set())

    const toggleHall = (id: string) => {
        setOpenHalls((prev) => {
            // 首次交互时把"全部展开"落成显式集合，再切换
            const base = prev.size === 0 ? new Set(exhibitList.map((h) => String(h.id))) : new Set(prev)
            if (base.has(id)) base.delete(id)
            else base.add(id)
            return base
        })
    }

    // 当前展示内容
    const [currentContent,setCurrentContent] = useState(new Set(['0']));
    // 不可交互的内容
    const [disabledContent,setDisabledContent] = useState(new Set(['0']));
    // 内容列表
    const [contentList,setContentList] = useState([]);
    // 内容控制列表
    const [softwareControlList,setSoftwareControlList] = useState([]);
    // base控制列表
    const [baseControlList,setBaseControlList] = useState([]);
    // link控制列表
    const [linkControlList,setLinkControlList] = useState([]);
    // global设备状态
    const [globalDeviceStatus,setGlobalDeviceStatus] = useState(false);
    // 设备列表
    const [deviceList,setDeviceList] = useState([]);
    // 设备命令列表刷新（改 key 重挂载 HardwareControlPage2）
    const [codeRefreshKey, setCodeRefreshKey] = useState(0);
    // 当前选择设备
    const [currentDevice,setCurrentDevice] = useState(new Set(['0']));

    // 模态框数据
    const [modalData, setModalData] = useState<{
        title: string;
        children: React.ReactNode;
        open: boolean;
        onOk?: () => void;
        onCancel?: () => void;
    }>({
        title: '提示信息',
        children: '',
        open: false,
    });
    // 中控色系 #B69151
    const [color, setColor] = useState('blue');
    // 颜色
    const colorVariants = {
        // 'blue':['text-[#1818C7]','bg-[#1818C7]','#1818C7'],
        'blue':['text-[#0940ad]','bg-[#0940ad]','#0940ad'],
        'yellow': ['text-[#B69151]','bg-[#B69151]','#B69151'],
        'green': ['text-[#5EB04E]','bg-[#5EB04E]','#5EB04E'],
        'red': ['text-[#D02E2E]','bg-[#D02E2E]','#D02E2E'],
        'orange': ['text-[#F08E0E]','bg-[#F08E0E]','#F08E0E'],
        'pink': ['text-[#EA4EA4]','bg-[#EA4EA4]','#EA4EA4'],
        'purple': ['text-[#7E4EA4]','bg-[#7E4EA4]','#7E4EA4'],
        'brown': ['text-[#A05E2E]','bg-[#A05E2E]','#A05E2E'],
        'gray': ['text-[#A0A0A0]','bg-[#A0A0A0]','#A0A0A0'],
        'black': ['text-[#000000]','bg-[#000000]','#000000'],
        'white': ['text-[#888888]','bg-[#888888]','#888888'],
        'cyan': ['text-[#0EA5A5]','bg-[#0EA5A5]','#0EA5A5']
    }

    const week = ["星期天", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

    const getTime = () => {
        let date = new Date()
        const add_zero = (val) => {
            //不足两位补零
            if (val < 10) {
                return "0" + val
            } else {
                return val
            }
        }
        return {time:`${date.getHours()}:${add_zero(date.getMinutes())}`, week:`${week[date.getDay()]}`, date:`${date.getMonth() + 1}月${add_zero(date.getDate())}日`}
    }

    // 获取整馆软件模式列表
    const getModelList = () => { 
        get_Model_List().then(res=>{
            // console.log(res.data)
            if(res.data.code == 200){
                setModelList(res.data.data)
                
                const currentModel = (res.data.data ?? []).find(item=>item.current == 1)
                if (currentModel) setCurrentModel(currentModel.id)
            }
        }).catch(err=>{
            console.log(err)
        })
    }

    // 获取展馆/展区/展项树
    const getExhibitList = () =>{
        get_List().then(res=>{
            if(res.data.code == 200){
                const list = res.data.data ?? []
                setTree(list)
                // 当前展馆失效（首次加载 / 被删除）时回落到第一个
                setCurrentPavilion((prev: number | null) => {
                    if (prev != null && list.some((p: any) => p.id === prev )) return prev
                    return list[0]?.id ?? null
                })
                // 派生展区列表（带上所属展馆 id，供「添加展区」使用）
                const machines: any[] = []
                list.forEach((p: any) => {
                    (p.data ?? []).forEach((m: any) => {
                        if (m.show == 1) machines.push({ ...m, p_id: p.id, p_name: p.name })
                    })
                })
                setExhibitList(machines)
            }
        })
    }

    // 改变svg颜色和大小
    const changeIconColor = (val, color='#201f2c', size = '100%') => {
        val = val && val.replaceAll(/fill=".*?"/g, `fill="${color || '#FFFFFF'}"`);
        val = val && val.replaceAll(/width=".*?"/g, `width="${size || '100%'}"`);
        val = val && val.replaceAll(/width=".*?"/g, `height="${size || '100%'}"`);
        return val
    }

    // 点击全屏
    const onFullScreenPress = () => { 
    
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                toast('提示信息', { description: '进入全屏成功！' })
                setFullScreen(true)
            }).catch(() => {
                toast('提示信息', { description: '进入全屏失败！' })
                setFullScreen(false)
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setFullScreen(false)
            }
        }
    }



    // 展项切换
    const onExhibitChange = (key,id) => {
        const e_id = Array.from(key)[0]
        console.log("展项ID:",e_id)
        setCurrentExhibit(key)
        setCurrentHall(id)
        const alist = []

        get_Content_List(e_id).then(res=>{
            console.log(res.data)
            if(res.data.code == 200){
                setContentList(res.data.data)
                setBaseControlList(res.data.basebtn ? res.data.basebtn.split('_') : [])
                setLinkControlList(res.data.codebtn)
                const controlData = (res.data.data ?? []).find(item=>item.openStatus == 1)
                setSoftwareControlList(controlData)
                setCurrentContent(new Set([controlData?.id?.toString() ?? '0']))
            }else{
                setContentList([])
                setSoftwareControlList([])
                setBaseControlList([])
                setLinkControlList([])
                toast('提示信息', { description: res.data.msg })
            }
        }).catch(err=>{
            console.log(err)
            toast('提示信息', { description: err })
        })

        
    }

    
    useEffect(()=>{
        
        const fetchData = async () => { 
            try { 
                get_Device(Number(Array.from(currentExhibit)[0])).then(res=>{
                    setCurrentDevice(new Set(['0']))
                    if(res.data.code == 200){
                        setDeviceList(res.data.data)
                    }else{
                        setDeviceList([])
                        toast('提示信息', { description: res.data.msg })
                    }
                }).catch(err=>{
                    console.log(err)
                    setDeviceList([])
                    toast('提示信息', { description: err })
                })
                
                exhibitList.length > 0 && exhibitList.map((item)=>{
                    if(item.id == currentHall){
                        item.data.map((item2)=>{
                            if(item2.id == Number(Array.from(currentExhibit)[0])){
                                setExhibitNote(item2.note)
                            }
                        })
                    }
                })
            } catch (error) { 
                console.log(error)
            }
        };

        !currentExhibit.has('0') && fetchData();
    
        return () => { 
            // console.log('组件销毁')
        }
       
    },[currentExhibit,exhibitList,currentHall])

    const onContentChange = (key) => {
        const c_id = Array.from(key)[0]
        setCurrentContent(key)
        setSoftwareControlList(contentList.filter(item=>item.id==c_id)[0])
    }

    const onDevicePress = (key) => { 
        console.log("设备ID:",key)
        setCurrentDevice(key)
    }

    // 获取欢迎词信息
    const getWelcome = () => { 
        get_Welcome().then(res=>{ 
            // console.log(res.data.data)
            if (res.data.code == 200) {
                setWelcomeText(res.data.data?.[0]?.msg ?? '')
            }else{
                setWelcomeText('')
            }
        }).catch(err=>{
            console.log(err)
        })
    }

    // 设置欢迎词信息
    const setWelcome = () => {
        
        set_Welcome(welcomeText).then(res=>{ 
            res.data.code==200 && toast('提示信息', { description: res.data.msg })
        }).catch(err=>{ 
            console.log(err)
        })
    }

    // 获取硬件模式列表
    const getHwModel = () => { 

        get_HwModel_List().then(res=>{
            if(res.data.code == 200){
                setHwModelList(res.data.data)
            }else{
                setHwModelList([])
                toast('提示信息', { description: res.data.msg })
            }
        }).catch(err=>{ 
            console.log(err)
            toast('提示信息', { description: '接口访问错误！' })
        })
        
        get_Now_HwModel().then(res=>{
            if(res.data.code == 200){
                const nowModel = res.data.data?.[0]
                if (nowModel) setCurrentHwModel(nowModel.id)
            }
        }).catch(err=>{ 
            console.log(err)
            toast('提示信息', { description: '接口访问错误！' })
        })
    }

    const getMessage = () => { 
        getEhMessage().then(res => {
            // console.log(res.data.data)
            if(res.data.code == 200){
                const ehMessage = res.data.data?.[0]
                if (ehMessage) setColor(ehMessage.color)
            }
        }).catch(err=>{
            console.log(err)
        })
    }

    useEffect(() => { 
        setCurrentTime(getTime())
        getExhibitList()
        getWelcome()
        getHwModel()
        getModelList()
        getMessage()

    }, [])


    useEffect(()=>{ 
        setInterval(()=>{ 
            setCurrentTime(getTime())
        },1000*60)
    },[])


    const onNoteChange = (id,data) =>{ 
        console.log(id,data)
        update_Note(id,data).then(res=>{
            if(res.data.code == 200){
                toast('提示信息', { description: res.data.msg })
            }else{
                toast('提示信息', { description: res.data.msg })
            }
        }).catch(err=>{ 
            console.log(err)
            toast('提示信息', { description: err })
        })
        setEditable(false)
    }



    // 切换展厅：清空当前展区/展项选中，避免右侧还显示别的展厅数据
    const onPavilionChange = (pavilionId: number) => {
        if (pavilionId === currentPavilion) return
        setCurrentPavilion(pavilionId)
        setCurrentHall(0)
        setCurrentExhibit(new Set(['0']))
        setContentList([])
        setSoftwareControlList([])
        setBaseControlList([])
        setLinkControlList([])
        setDeviceList([])
        setCurrentDevice(new Set(['0']))
    }

    // 内容控制按钮节点（c_control）编辑弹窗
    const [controlNodeDialog, setControlNodeDialog] = useState<{
        open: boolean;
        mode: "add" | "edit";
        level: number;
        path: number[];
        node: ControlNode | null;
    }>({ open: false, mode: "add", level: 1, path: [], node: null })

    const openAddControlNode = (level: number, parentPath: number[]) => {
        setControlNodeDialog({ open: true, mode: "add", level, path: parentPath, node: null })
    }

    const openEditControlNode = (node: ControlNode, path: number[]) => {
        setControlNodeDialog({ open: true, mode: "edit", level: path.length + 1, path, node })
    }

    // ── 快捷创建：编辑前先拉管理端数据（快捷接口返回的字段不全，避免保存时覆盖丢失） ──
    const normalize = (raw: any) => (Array.isArray(raw) ? raw : (raw?.items ?? []));

    const loadAndEdit = async (
        kind: "pavilion" | "machine" | "exhibit" | "content" | "device" | "code" | "smodel" | "hmodel",
        id: number,
        fetcher: () => Promise<any>,
        parentId?: number | null,
    ) => {
        try {
            const res = await fetcher();
            const row = normalize(res?.data).find((x: any) => x.id === id);
            if (!row) {
                toast.error("未找到该记录，请刷新后重试");
                return;
            }
            openDialog(kind, row, parentId);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        }
    };

    // ── 快捷创建：保存后的局部刷新 ──

    // 刷新内容列表（保存内容后）：尽量保持当前选中的内容
    const refreshContent = () => {
        const eid = Array.from(currentExhibit)[0]
        if (!eid || eid === '0') return
        const keepId = (softwareControlList as any)?.id
        get_Content_List(eid).then(res => {
            if (res.data.code == 200) {
                const list = res.data.data ?? []
                setContentList(list)
                setBaseControlList(res.data.basebtn ? res.data.basebtn.split('_') : [])
                setLinkControlList(res.data.codebtn)
                const same = keepId != null ? list.find((item: any) => item.id === keepId) : null
                const target = same ?? list.find((item: any) => item.openStatus == 1)
                setSoftwareControlList(target)
                setCurrentContent(new Set([target?.id?.toString() ?? '0']))
            }
        }).catch(() => {})
    }

    // 保存内容控制按钮节点（c_control）
    const saveControlNode = (newNode: ControlNode) => {
        const contentId = (softwareControlList as any)?.id
        if (!contentId) return void toast.error("请先选择内容")
        const raw = (softwareControlList as any)?.controlJson
        const root: ControlNode[] = Array.isArray(raw) ? JSON.parse(JSON.stringify(raw)) : []
        const { mode, path } = controlNodeDialog

        if (mode === "edit") {
            if (path.length === 1) {
                root[path[0]] = newNode
            } else {
                let parent: any = root[path[0]]
                for (let i = 1; i < path.length - 1; i++) parent = parent?.children?.[path[i]]
                if (!parent) return void toast.error("未找到父节点")
                if (!Array.isArray(parent.children)) parent.children = []
                parent.children[path[path.length - 1]] = newNode
            }
        } else {
            let children: ControlNode[] = root
            for (const idx of path) {
                const node = children[idx]
                if (!node) return void toast.error("未找到父节点")
                if (!Array.isArray(node.children)) node.children = []
                children = node.children
            }
            children.push(newNode)
        }

        updateContentControl({ id: contentId, c_control: JSON.stringify(root) })
            .then(() => {
                toast.success(mode === "edit" ? "按钮已更新" : "按钮已添加")
                setControlNodeDialog((prev) => ({ ...prev, open: false }))
                refreshContent()
            })
            .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "保存失败"))
    }

    // 刷新设备列表（保存设备后）
    const refreshDevice = () => {
        const eid = Number(Array.from(currentExhibit)[0])
        if (!eid) return
        get_Device(eid).then(res => {
            if (res.data.code == 200) setDeviceList(res.data.data)
        }).catch(() => {})
    }

    return (
        <div className="w-full h-full flex flex-col gap-4">
            {/* 展厅切换条：点击切换下方展区/展项列表 */}
            <div className="h-16 w-full flex flex-row gap-4">
                {tree.length > 0 && tree.map((p: any) => (
                    p.show == 1 &&
                    <div
                        key={p.id}
                        onClick={() => onPavilionChange(p.id)}
                        className={cn(
                            "flex-1  rounded-lg border flex flex-row items-center justify-center gap-2 px-2 py-2 text-sm font-semibold cursor-pointer transition-colors",
                            currentPavilion === p.id
                                ? `${colorVariants[color][1]} border-transparent text-white`
                                : "border-[#888888]/30 bg-white text-[#11181C]",
                        )}
                    >
                        {/* 展馆 */}
                        <span className="truncate text-xl">{p.name}</span>
                        {showEditActions && (
                            <Button
                                className="text-yellow-500"
                                variant="secondary"
                                size="default"
                                title="编辑展馆"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    loadAndEdit("pavilion", p.id, () => getPavilionList({ page: 1, limit: 1000 }));
                                }}
                            >
                                <PenSquare /> 编辑展厅
                            </Button>
                        )}
                    </div>

                ))}
                {showEditActions && (
                    <Button
                        className="h-full shrink-0 text-purple-500"
                        variant="outline"
                        onClick={() => openDialog("pavilion", null)}
                        title="添加展厅"
                    >
                        <PlusIcon /> 添加展厅
                    </Button>
                )}
            </div>
            <div className="relative w-full h-full dark:bg-[#11181C] bg-gray-50 tracking-widest flex justify-center overflow-hidden touch-manipulation rounded-2xl">

                {/* <div className={`${colorVariants[color][0]} absolute -top-80 -left-25 w-240 h-240 bg-current/60 blur-[300px] z-0`}></div>
                <div className={`${colorVariants[color][0]} absolute top-25 left-150 w-130 h-130 bg-current/60 blur-[300px] z-0`}></div>
                <div className={`${colorVariants[color][0]} absolute -top-37.5 right-0 w-230 h-240 bg-current/60 blur-[300px] z-0`}></div>
                <div className={`${colorVariants[color][0]} absolute bottom-20 w-240 h-240 bg-current/60 blur-[300px] z-0`}></div> */}

                <div className={`${colorVariants[color][0]} absolute w-full h-full bg-current/60 z-0 bg-linear-to-b from-current/50 to-white dark:to-black`}></div>
                {/* <div className={`${colorVariants[color][0]} absolute w-full h-full bg-current/60 z-0 bg-linear-to-b from-[#002E7B] to-[#7CB3FF]`}></div> */}
        
                <XJ_Modal {...modalData}/>
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetContent side={drawerPlacement} className="gap-0">
                        <SheetHeader>
                            <SheetTitle className="text-center">欢迎词编辑</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 px-4 py-4">
                            <Input
                                placeholder="请输入欢迎词"
                                value={welcomeText ?? ""}
                                onChange={(e) => setWelcomeText(e.target.value)}
                            />
                        </div>
                        <SheetFooter className="flex-row justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsOpen(false)}>
                                退出
                            </Button>
                            <Button onClick={() => { setWelcome(); setIsOpen(false); }}>
                                确认
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>

                <HardwareControlPage status={globalDeviceStatus} color={colorVariants[color]}></HardwareControlPage>
                
                <div className="relative w-full h-full flex flex-col max-w-400">
                    <div className="w-full h-36 py-4 px-10 flex flex-row justify-between items-center gap-8">
                        {/* 时间及用户信息 */}
                        <div className="w-auto h-full flex md:flex-row flex-col justify-center md:items-center items-start md:gap-4 gap-1 text-white" >
                            <span className="md:text-7xl text-3xl">{currentTime.time}</span>
                            <div className="flex md:flex-col flex-row justify-center items-start w-24">
                                <span className="md:text-xl text-xs text-nowrap">{currentTime.date}</span>
                                <span className="md:text-xl text-xs">{currentTime.week}</span>
                            </div>
                        </div>
                        {/* 功能按钮 */}
                        <div className="w-auto h-full flex flex-row items-center gap-4 text-[#11181C]">
                            <Button variant="secondary" className="z-30 h-10" onClick={()=> setIsOpen(true)}>
                                <Edit /> 欢迎词编辑
                            </Button>
                            <Button variant="secondary" className="z-30 h-10" onClick={() => setShowEditActions((v) => !v)}>
                                {showEditActions ? <EyeOffIcon /> : <EyeIcon />}
                                {showEditActions ? "隐藏编辑" : "显示编辑"}
                            </Button>
                            <Button variant="secondary" className="z-50 h-10" onClick={()=>setGlobalDeviceStatus(prev=>!prev)}> 
                                <CodeIcon /> 整馆指令
                            </Button>
                            <Button variant="secondary" className="z-50 h-10"  onClick={()=>onFullScreenPress()}>
                                { fullScreen ? <AiOutlineFullscreenExit /> : <AiOutlineFullscreen /> }全屏
                            </Button>
                            <Button variant="secondary" className="z-50 h-10"  onClick={() => {navigate("/server/quickcreate")}}>
                                <AiOutlineRedo className="animate-rotate360"/>刷新
                            </Button>
                        </div>
                    </div>
                    <div className={`w-full h-10/12 px-10 pb-10 flex flex-row gap-0 sm:gap-4`} >
                        {/* 硬件模式列表 */}
                        <div className={`flex-none w-0 lg:w-auto lg:flex-2 h-full ${colorVariants[color][0]} bg-secondary lg:flex flex-col justify-center gap-2 items-center rounded-lg overflow-hidden shadow-md hidden p-2`}>
                            {
                                hwModelList.length > 0 && hwModelList?.map((item) => (
                                
                                    <div key={item.id} className={` ${ currentHwModel == item.id ? " bg-current": 'border border-[#888888]/20 bg-white/20 '} w-full h-full flex-1 flex flex-col justify-center items-center gap-2 p-4 rounded-lg shadow-md cursor-pointer`} >
                                        {
                                            item.modelIconSvg ? 
                                            <div className={`w-auto ${hwModelList.length >= 7 ? 'h-8': 'h-12'}`} dangerouslySetInnerHTML={{ __html: changeIconColor(item.modelIconSvg,`${currentHwModel==item.id ? '#FFFFFF':'#201f2c'}`)}}></div>
                                            :
                                            <MdOutlineModeStandby className={ ` w-auto h-12 ${currentHwModel==item.id ? 'text-[#FFFFFF]':'text-[#201f2c]'}`} />
                                        }
                                        <span className={`${currentHwModel == item.id ? "text-white": "text-[#201f2c]"} text-sm text-center`}>{item.modelName}</span>

                                        {showEditActions && (
                                            <Badge
                                                variant="secondary"
                                                className="cursor-pointer"
                                                onClick={(e) => { e.stopPropagation(); loadAndEdit("hmodel", item.id, () => getHmodelList({ page: 1, limit: 1000 })); }}
                                            >
                                                <PenSquare />编辑模式
                                            </Badge>
                                        )}
                                    </div>
                                ))
                                
                            }
                            {showEditActions && (
                                <div
                                    onClick={() => openDialog("hmodel", null)}
                                    className="w-full h-full flex-1 flex flex-col justify-center items-center gap-2 p-4  rounded-lg shadow-md text-purple-500 border bg-secondary cursor-pointer"
                                >
                                    <MdOutlineModeStandby className="w-auto h-12" />
                                    <span className="text-sm text-center">添加硬件模式</span>
                                </div>
                            )}
                        </div>
                        {/* 软件模式列表 */}
                        <div className={`flex-none w-0 lg:w-auto lg:flex-3 h-full bg-secondary shadow-md pb-2  rounded-lg relative overflow-hidden`}>
                            <div className="absolute top-0 left-0 w-full h-20 flex flex-col justify-center items-center gap-3 bg-secondary z-10">
                                <div className={`w-full flex flex-row justify-start items-center px-3 gap-2 overflow-hidden`}>
                                    <div className={`bg-current/20 p-2  rounded-lg ${colorVariants[color][0]}`}><SiDropbox size={24}/></div>
                                    <span className="text-base text-nowrap text-secondary-foreground">模式</span>
                                </div>
                                <div className="h-0.5 w-11/12 bg-[#888888]/30  rounded-lg"></div>
                            </div>
                            <div className={`w-full h-full overflow-y-auto z-0 px-2 scrollbar-line scroll-smooth ${colorVariants[color][0]}`}>
                                <div className="h-20" />
                                <div className={`w-full h-[calc(100%-6rem)] bg-[#F9F9FA] flex flex-col justify-start items-center rounded-lg shadow-md`}>
                                    {
                                        modelList.length > 0 && modelList?.map((item) => (
                                        
                                            <div key={item.id} className={` ${ currentModel == item.id ? " bg-current": ' bg-secondary '} w-full flex-1 h-auto border-b border-[#888888]/20 first:rounded-t-md last:rounded-b-md last:border-0 flex flex-col justify-center items-center gap-4 py-4 cursor-pointer `}>
                                                {
                                                    item.modelIconSvg ? 
                                                    <div className={`w-1/3 h-auto ${ item.current == 1 ? 'bg-white': 'bg-current/20' } p-1  rounded-lg `} dangerouslySetInnerHTML={{ __html: changeIconColor(item.modelIconSvg,colorVariants[color][2])}}></div>
                                                    :
                                                    <div className={`w-1/3 h-auto ${ item.current == 1 ? 'bg-white': 'bg-current/20' } p-1  rounded-lg flex justify-center items-center`}><span className={`inline-block align-middle ${colorVariants[color][0]}`}>{ item.modelName[0] }</span></div>
                                                }
                                                <span className={`${ currentModel == item.id ? "text-white": "text-[#201f2c]"} text-sm`}>{item.modelName}</span>
                                                {showEditActions && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="cursor-pointer"
                                                        onClick={(e) => { e.stopPropagation(); loadAndEdit("smodel", item.id, () => getSmodelList({ page: 1, limit: 1000 })); }}
                                                    >
                                                        <PenSquare />编辑模式
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                        ))
                                    }
                                    {showEditActions && (
                                        <div
                                            onClick={() => openDialog("smodel", null)}
                                            className="w-full h-full flex-1 flex flex-col justify-center items-center gap-2 p-4 rounded-b-lg shadow-md text-purple-500 bg-secondary cursor-pointer"
                                        >
                                            <MdOutlineModeStandby className="w-auto h-12" />
                                            <span className="text-sm text-center">添加软件模式</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* 展项列表区域 */}
                        <div className="flex-none w-0 sm:w-auto sm:flex-6  rounded-lg bg-secondary shadow-md h-full flex flex-row items-center text-secondary-foreground overflow-hidden ">
                            
                            {/* 展项列表 */}
                            <div className="flex-1 relative h-full w-auto pb-2 overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-20 flex flex-col justify-center items-center gap-3 bg-secondary z-10">
                                    <div className={`w-full flex flex-row justify-between items-center px-3 gap-2 overflow-hidden`}>
                                        <div className="flex flex-row justify-center items-center gap-2" >
                                            <div className={`bg-current/20 p-2  rounded-lg ${colorVariants[color][0]}`}><PiListBold size={24}/></div>
                                            <span className="text-md text-nowrap">展区/展项列表</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {showEditActions && (<Button className="text-purple-500" variant="outline" size="default" disabled={currentPavilion == null} onClick={() => openDialog("machine", null, currentPavilion)} title="添加展区"><PlusIcon />添加展区</Button>)}
                                        </div>
                                        
                                    </div>
                                    <div className="h-0.5 w-11/12 bg-[#888888]/30  rounded-lg"></div>
                                </div>
                                <div className={`w-full h-full overflow-y-auto z-0 scrollbar-line px-2 scroll-smooth ${colorVariants[color][0]}`} >
                                    <div className="h-20" />

                                    {/* 当前展馆下的展区/展项 */}
                                    <div className="flex flex-col gap-2">
                                        {(tree.find((p: any) => p.id === currentPavilion)?.data ?? [])
                                            .filter((m: any) => m.show == 1)
                                            .map((m: any) => {
                                                const expanded = openHalls.size === 0 || openHalls.has(String(m.id));
                                                return (
                                                    <div key={m.id} className={` rounded-lg ${m.id == currentHall ? "bg-current/20" : ""}`}>
                                                        <div className="flex w-full items-center justify-between px-2 py-2 text-left text-sm">
                                                            <div className="flex min-w-0 items-center gap-1">
                                                                <button type="button" onClick={() => toggleHall(String(m.id))} className="flex min-w-0 items-center gap-1">
                                                                    <ChevronDownIcon className={cn("size-4 shrink-0 transition-transform", expanded ? "rotate-180" : "")} />
                                                                    <span className="truncate">{m.name}</span>
                                                                </button>
                                                                {showEditActions && (<Button className="text-yellow-500" variant="outline" size="icon-sm" title="编辑展区" onClick={() => loadAndEdit("machine", m.id, () => getMachineList({ page: 1, limit: 1000 }), currentPavilion)}><PenSquare /></Button>)}
                                                            </div>
                                                            {showEditActions && (<Button className="text-purple-500" variant="outline" size="sm" title="添加展项" onClick={() => openDialog("exhibit", null, m.id)}><PlusIcon />展项</Button>)}
                                                        </div>
                                                        {expanded && (
                                                            <div className="px-2 pb-2">
                                                                {(m.data ?? []).map((e: any) => (
                                                                    <div key={e.id} className="mb-2 flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onExhibitChange(new Set([String(e.id)]), m.id)}
                                                                            className={cn(
                                                                                "flex-1  rounded-lg border border-[#888888]/20 px-2 py-2 text-left text-sm",
                                                                                Array.from(currentExhibit)[0] === String(e.id) ? "bg-current " : "bg-secondary text-secondary-foreground",
                                                                            )}
                                                                        >
                                                                            <span className={`block truncate  ${ Array.from(currentExhibit)[0] === String(e.id) ? 'text-secondary-foreground': 'text-secondary-foreground'}`}>{e.name}</span>
                                                                        </button>
                                                                        {showEditActions && (<Button className="text-yellow-500" variant="outline" size="icon-sm" title="编辑展项" onClick={() => loadAndEdit("exhibit", e.id, () => fetchExhibitList({ page: 1, limit: 1000 }), m.id)}><PenSquare /></Button>)}
                                                                    </div>
                                                                ))}
                                                                {(m.data ?? []).length === 0 && (
                                                                    <div className="px-2 py-2 text-xs text-muted-foreground">暂无展项</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        {(tree.find((p: any) => p.id === currentPavilion)?.data ?? []).filter((m: any) => m.show == 1).length === 0 && (
                                            <div className="px-2 py-2 text-xs text-muted-foreground">该展馆暂无展区</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* 软件控制及硬件控制区域 */}
                        <div className={`flex-14 md:flex-14 h-full flex flex-col justify-start items-start gap-4 w-auto ${colorVariants[color][0]}`}>
                            <Tabs defaultValue="content" className="w-full h-full flex flex-col gap-2">
                                <TabsList className="w-full h-14!" >
                                    <TabsTrigger value="content" className={`flex-1 text-base dark:data-active:bg-purple-700 data-active:bg-white`}>内容控制</TabsTrigger>
                                    <TabsTrigger value="device" className="flex-1 text-base dark:data-active:bg-purple-700 data-active:bg-white">设备命令</TabsTrigger>
                                    {   
                                        showEditActions &&
                                        <>
                                        <TabsTrigger value="control" className="flex-1 text-base dark:data-active:bg-purple-700 data-active:bg-white">内容命令</TabsTrigger>
                                        <TabsTrigger value="link" className="flex-1 text-base dark:data-active:bg-purple-700 data-active:bg-white">快捷控制</TabsTrigger>
                                        <TabsTrigger value="vnc" className="flex-1 text-base dark:data-active:bg-purple-700 data-active:bg-white">远程画面</TabsTrigger>
                                        </>
                                    }
                                    <TabsTrigger value="commentary" className="flex-1 text-base dark:data-active:bg-purple-700 data-active:bg-white">讲解词</TabsTrigger>
                                </TabsList>
                                {/* 内容控制 */}
                                <TabsContent value="content" className="w-full h-[calc(100%-3.6rem)]">
                                    <div className="bg-secondary shadow-md  rounded-lg w-full h-full flex flex-row justify-center items-center overflow-hidden">
                                        {/* 内容列表 */}
                                        <ResizablePanelGroup orientation="horizontal">
                                            <ResizablePanel defaultSize="30%" className="relative ">
                                                <div className="absolute top-0 left-0 w-full h-auto flex flex-col justify-start items-center gap-3 bg-secondary p-2 z-10 ">
                                                    <div className={`w-full flex flex-row justify-between items-center gap-2 overflow-hidden `}>
                                                        <div className="flex gap-2 justify-center items-center">
                                                            <div className={`bg-current/20 p-2  rounded-lg ${colorVariants[color][0]}`}><MdContentCopy size={24}/></div>
                                                            <span className="text-base text-nowrap text-secondary-foreground">内容列表</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {showEditActions && (<Button className="text-purple-500" variant="outline" size="default" onClick={() => openDialog("content", null)} title="添加内容"> <PlusIcon />添加内容</Button>)}
                                                        </div>
                                                        
                                                    </div>
                                                    <Separator orientation="horizontal" className=" rounded-lg w-1/2" />
                                                </div>
                                                <div className={`w-full h-full overflow-y-auto z-0 p-2 scrollbar-line scroll-smooth ${colorVariants[color][0]}`}>
                                                    <div className="h-16" />
                                                    <SelectableList
                                                        items={contentList.map((item) => ({
                                                            id: item.id,
                                                            name: item.name,
                                                            description: item.note == null ? "---" : item.note,
                                                            disabled: disabledContent.has(String(item.id)),
                                                            icon: (
                                                                <div className="flex h-full items-center justify-center rounded-sm bg-white p-1">
                                                                    <img src={fileTypeData.filter((item2) => item2.type == item.fileType)[0]?.icon} className="h-10 w-10 object-contain" alt="file" />
                                                                </div>
                                                            ),
                                                        }))}
                                                        selectedKey={Array.from(currentContent)[0] as string}
                                                        onSelect={(key) => onContentChange(new Set([key]))}
                                                        showEdit={showEditActions}
                                                        onEdit={(key) => loadAndEdit("content", Number(key), () => getContentList({ e_id: Number(Array.from(currentExhibit)[0]), page: 1, limit: 1000 }))}
                                                        empty="请点击展项"
                                                    />
                                                </div>
                                            </ResizablePanel>
                                            <ResizableHandle withHandle />
                                            <ResizablePanel defaultSize="70%" className="flex flex-col">
                                                <div className="w-full h-auto flex flex-col justify-center items-center gap-3 bg-secondary p-2 z-10">
                                                    <div className={`w-full flex flex-row justify-between items-center gap-2 overflow-hidden `}>
                                                        <div className="flex gap-2 justify-center items-center">
                                                            <div className={`bg-current/20 p-2 rounded-lg ${colorVariants[color][0]}`}><MdControlCamera  size={24}/></div>
                                                            <span className="text-base text-nowrap text-secondary-foreground">内容控制</span>
                                                        </div>
                                                    </div>
                                                    <Separator orientation="horizontal" className=" rounded-lg w-1/2" />
                                                </div>
                                                {
                                                    softwareControlList?.length == 0 &&
                                                    <div className="h-50 w-full flex justify-center items-center text-2xl">请点击展项</div>
                                                }
                                                <SoftwareControlPage
                                                    color={colorVariants[color]}
                                                    contentData={softwareControlList}
                                                    exhibitData={exhibitList}
                                                    currentHall={currentHall}
                                                    currentExhibit={currentExhibit}
                                                    baseControl={baseControlList}
                                                    linkControl={linkControlList}
                                                    showEdit={showEditActions}
                                                    onAddControlNode={openAddControlNode}
                                                    onEditControlNode={openEditControlNode}
                                                />
                                            </ResizablePanel>
                                        </ResizablePanelGroup>
                                    </div>
                                </TabsContent>
                                {/* 设备控制 */}
                                <TabsContent value="device" className="w-full h-[calc(100%-3.5rem)]">
                                    <div className="bg-secondary shadow-md  rounded-lg w-full h-full flex flex-row justify-center items-center overflow-hidden">
                                        {/* 设备列表 */}
                                        <div className={`flex-1 relative h-full w-auto overflow-hidden`}>
                                            <div className="absolute top-0 left-0 w-full h-20 flex flex-col justify-center items-center gap-3 bg-secondary z-10">
                                                <div className={`w-full flex flex-row justify-between items-center px-3 gap-2 overflow-hidden ${colorVariants[color][0]}`}>
                                                    <div className="flex gap-2 justify-center items-center">
                                                        <div className={`bg-current/20 p-2  rounded-lg`}><MdDeviceHub size={24}/></div>
                                                        <span className="text-base text-nowrap text-secondary-foreground">设备列表</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {/* <Button
                                                            className="text-yellow-500"
                                                            variant="outline"
                                                            size="default"
                                                            disabled={Array.from(currentDevice)[0] === '0'}
                                                            onClick={() => loadAndEdit("device", Number(Array.from(currentDevice)[0]), () => getDeviceList({ area: 1, link: Number(Array.from(currentExhibit)[0]), page: 1, limit: 1000 }))}
                                                            title="编辑设备"
                                                        >
                                                            <PenSquare />编辑设备
                                                        </Button> */}
                                                        {showEditActions && (<Button className="text-purple-500" variant="outline" size="default" onClick={() => openDialog("device", null)} title="添加设备"> <PlusIcon />添加设备</Button>)}
                                                    </div>
                                                </div>
                                                <div className="h-0.5 w-11/12 bg-[#888888]/20  rounded-lg"></div>
                                            </div>
                                            <div className="w-full h-full overflow-y-auto z-0 px-2 scrollbar-line scroll-smooth bg-secondary">
                                                <div className="h-20" />
                                                <SelectableList
                                                    items={deviceList.map((item) => ({
                                                        id: item.id,
                                                        name: item.deviceName,
                                                        description: item.deviceIp == null ? "---" : item.deviceIp,
                                                        icon: (
                                                            <div className="flex size-8 items-center justify-center rounded-sm bg-white/80 p-1">
                                                                <div className="h-auto w-8" dangerouslySetInnerHTML={{ __html: changeIconColor(item.iconSvg, colorVariants[color][2]) }} />
                                                            </div>
                                                        ),
                                                    }))}
                                                    selectedKey={Array.from(currentDevice)[0] as string}
                                                    onSelect={(key) => onDevicePress(new Set([key]))}
                                                    showEdit={showEditActions}
                                                    onEdit={(key) => loadAndEdit("device", Number(key), () => getDeviceList({ area: 1, link: Number(Array.from(currentExhibit)[0]), page: 1, limit: 1000 }))}
                                                    empty="请点击展项"
                                                />
                                            </div>
                                        </div>
                                        <div className={`h-[calc(100%-2rem)] w-0.5 bg-[#888888]/20 rounded-lg `}></div>
                                        {/* 设备控制 */}
                                        <div className="flex-2 relative h-full w-auto overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-20 flex flex-col justify-center items-center gap-3 bg-secondary z-10">
                                                <div className={`w-full flex flex-row justify-between items-center px-3 gap-2 overflow-hidden ${colorVariants[color][0]}`}>
                                                    <div className="flex gap-2 justify-center items-center">
                                                        <div className={`bg-current/20 p-2  rounded-lg`}><MdControlCamera  size={24}/></div>
                                                        <span className="text-md text-nowrap text-secondary-foreground">设备控制</span>
                                                    </div>
                                                    {showEditActions && (<Button className="text-purple-500" variant="outline" size="default" disabled={Array.from(currentDevice)[0] === '0'} onClick={() => openDialog("code", null)} title="添加命令"> <PlusIcon />添加命令</Button>)}
                                                </div>
                                                <div className="h-0.5 w-11/12 bg-[#888888]/20  rounded-lg"></div>
                                                
                                            </div>
                                            <div className="relative w-full h-full z-0 bg-secondary " >
                                                <div className="h-20" />
                                                <HardwareControlPage2
                                                    key={codeRefreshKey}
                                                    currentDevice={Array.from(currentDevice)[0]}
                                                    showEdit={showEditActions}
                                                    onEditCode={(id: number) => loadAndEdit("code", Number(id), () => getCodeList({ device: Number(Array.from(currentDevice)[0]), page: 1, limit: 1000 }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                                {/* 快捷控制 */}
                                <TabsContent value="link" className="w-full h-[calc(100%-3.5rem)]">
                                    <ExhibitLinkPanel
                                        exhibitId={Number(Array.from(currentExhibit)[0]) || null}
                                        exhibitName={
                                            tree
                                                .flatMap((p: any) => p.data ?? [])
                                                .flatMap((m: any) => m.data ?? [])
                                                .find((e: any) => String(e.id) === String(Array.from(currentExhibit)[0]))?.name
                                        }
                                        showEdit={showEditActions}
                                        color={colorVariants[color]}
                                        devices={deviceList.map((d: any) => ({ id: d.id, name: d.deviceName, ip: d.deviceIp }))}
                                    />
                                </TabsContent>
                                {/* 内容命令 */}
                                <TabsContent value="control" className="w-full h-[calc(100%-3.5rem)]">
                                    <ContentControlPanel
                                        exhibitId={Number(Array.from(currentExhibit)[0]) || null}
                                        exhibitName={
                                            tree
                                                .flatMap((p: any) => p.data ?? [])
                                                .flatMap((m: any) => m.data ?? [])
                                                .find((e: any) => String(e.id) === String(Array.from(currentExhibit)[0]))?.name
                                        }
                                        showEdit={showEditActions}
                                        color={colorVariants[color]}
                                    />
                                </TabsContent>
                                {/* 远程画面 */}
                                <TabsContent value="vnc" className="w-full h-[calc(100%-3.5rem)]">
                                    <VncPanel
                                        devices={deviceList}
                                        exhibitName={
                                            tree
                                                .flatMap((p: any) => p.data ?? [])
                                                .flatMap((m: any) => m.data ?? [])
                                                .find((e: any) => String(e.id) === String(Array.from(currentExhibit)[0]))?.name
                                        }
                                    />
                                </TabsContent>
                                {/* 讲解词 */}
                                <TabsContent value="commentary" className="w-full h-[calc(100%-3.5rem)]">
                                    <div className="bg-[#F9F9FA] shadow-md  rounded-lg w-full h-full flex flex-row justify-center items-center overflow-hidden">
                                        
                                        <div className={`flex-1 relative h-full w-auto overflow-hidden`}>
                                            <div className="absolute top-0 left-0 w-full h-20 flex flex-col justify-center items-center gap-3 bg-[#F9F9FA] z-10">
                                                <div className={`w-full flex flex-row justify-between items-center px-3 gap-2 overflow-hidden ${colorVariants[color][0]}`}>
                                                    <div className="w-auto h-auto flex flex-row justify-start items-center gap-2">
                                                        <div className={`bg-current/20 p-2  rounded-lg ${colorVariants[color][0]}`}><MdOutlineTextSnippet size={24}/></div>
                                                        <span className="text-base text-nowrap text-[#11181C]">展项讲解词</span>
                                                    </div>
                                                    <div className={`w-auto h-auto flex flex-row justify-start items-center gap-2 `}>
                                                        {showEditActions && (
                                                            <>
                                                                <Button className={`text-sm bg-current ${colorVariants[color][0]}`} size="icon" onClick={()=>setEditable(prev=>!prev)}><LuPenLine className="text-white" size={14}/></Button>
                                                                <Button className={`text-sm bg-current ${colorVariants[color][0]}`} size="icon" onClick={()=>onNoteChange(Array.from(currentExhibit)[0],exhibitNote)}><LuSave className="text-white" size={14}/></Button>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                </div>
                                                <div className="h-0.5 w-11/12 bg-[#888888]/20  rounded-lg"></div>
                                            </div>
                                            <div className="w-full h-full overflow-y-auto z-0 px-2 scrollbar-line scroll-smooth ">
                                                <div className="h-20" />
                                                <Textarea disabled={!editable} className="h-[calc(100%-5.5rem)]" placeholder="请输入解说词，并点击保存按钮进行保存" value={exhibitNote} onChange={(e)=>setExhibitNote(e.target.value)}/>
                                                {/* <NoteControl status={Array.from(currentExhibit)[0]} editable={editable} note={exhibitNote} onChange={(e)=>setExhibitNote(e)}/> */}
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                                
                            </Tabs>
                        </div>
                    </div>
                </div>

                {/* ── 快捷创建弹窗 ── */}
                <PavilionForm
                    open={dialog.open && dialog.kind === "pavilion"}
                    onOpenChange={closeDialog}
                    editing={dialog.editing}
                    onSaved={getExhibitList}
                />
                <MachineForm
                    open={dialog.open && dialog.kind === "machine"}
                    onOpenChange={closeDialog}
                    editing={dialog.editing}
                    pavilions={tree.map((p: any) => ({ id: p.id, name: p.name }))}
                    defaultPavilionId={dialog.parentId ?? null}
                    onSaved={getExhibitList}
                />
                <ExhibitForm
                    open={dialog.open && dialog.kind === "exhibit"}
                    onOpenChange={closeDialog}
                    editing={dialog.editing}
                    machineId={dialog.parentId ?? currentHall}
                    machineName={exhibitList.find((m: any) => m.id === (dialog.parentId ?? currentHall))?.name}
                    onSaved={getExhibitList}
                />
                <ContentForm
                    open={dialog.open && dialog.kind === "content"}
                    onOpenChange={closeDialog}
                    editing={dialog.editing}
                    exhibitId={Number(Array.from(currentExhibit)[0]) || null}
                    exhibitName={
                        tree
                            .flatMap((p: any) => p.data ?? [])
                            .flatMap((m: any) => m.data ?? [])
                            .find((e: any) => String(e.id) === String(Array.from(currentExhibit)[0]))?.name
                    }
                    onSaved={refreshContent}
                />
                <DeviceForm
                    open={dialog.open && dialog.kind === "device"}
                    onOpenChange={closeDialog}
                    editing={dialog.editing}
                    exhibitId={Number(Array.from(currentExhibit)[0]) || null}
                    machineId={currentHall || null}
                    onSaved={refreshDevice}
                />
                <CodeForm
                    open={dialog.open && dialog.kind === "code"}
                    onOpenChange={closeDialog}
                    editing={dialog.editing}
                    deviceId={Number(Array.from(currentDevice)[0]) || null}
                    deviceName={deviceList.find((d: any) => String(d.id) === String(Array.from(currentDevice)[0]))?.deviceName}
                    onSaved={() => setCodeRefreshKey((k) => k + 1)}
                />
                <ControlNodeForm
                    open={controlNodeDialog.open}
                    onOpenChange={(open) => setControlNodeDialog((prev) => ({ ...prev, open }))}
                    mode={controlNodeDialog.mode}
                    level={controlNodeDialog.level}
                    node={controlNodeDialog.node}
                    exhibitId={Number(Array.from(currentExhibit)[0]) || null}
                    devices={deviceList.map((d: any) => ({ id: d.id, name: d.deviceName, ip: d.deviceIp }))}
                    onSave={saveControlNode}
                />
                <ModeForm
                    open={dialog.open && dialog.kind === "smodel"}
                    onOpenChange={closeDialog}
                    editing={dialog.editing}
                    variant="smodel"
                    onSaved={getModelList}
                />
                <ModeForm
                    open={dialog.open && dialog.kind === "hmodel"}
                    onOpenChange={closeDialog}
                    editing={dialog.editing}
                    variant="hmodel"
                    onSaved={getHwModel}
                />
            </div>
        </div>
    )
}

export default Index