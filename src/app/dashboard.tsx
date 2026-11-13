
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom";

import { TrendingUpIcon, UploadCloudIcon, HardDriveIcon, CodeXml, ContainerIcon, CircuitBoard, Waypoints, FileBox, CodeIcon, Share2, ScanEyeIcon, InspectIcon, ChevronRightIcon, MousePointerClick } from "lucide-react";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; 
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldGroup, FieldLabel,FieldDescription } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {Card,CardAction,CardDescription,CardFooter,CardHeader,CardTitle,CardContent} from "@/components/ui/card";
import {Carousel,CarouselContent,CarouselItem,CarouselNext,CarouselPrevious,} from "@/components/ui/carousel";

import { TipButton } from "@/components/tip-button";
import { ImageCropper } from "@/components/image-cropper";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";

import { getDashboard , saveEhData, saveWelcome, saveEhActive } from "@/api/main";

interface WelcomeItem { 
    id: number;
    show: boolean;
    msg: string;
    other: string;
}

const wholeForm = { id:1, cn_name: "", en_name: "", bg: "", icon: "", color: "", msg:'' };

const welcomeForm = { id:1, msg: "", other: "",show:true };

export default function Page() {

    const navigate = useNavigate()

    const [data, setData] = useState<any>(null)

    // 欢迎词
    const [welcomeData,setWelcomeData] = useState<WelcomeItem>(welcomeForm);
    const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);

    // 展厅信息
    const [wholeData, setWholeData] = useState<any>(wholeForm);
    const [wholeDialogOpen, setWholeDialogOpen] = useState(false);

    // 中控激活信息
    const [activeData,setActiveData] = useState<any>({active:''});
    const [activeDialogOpen, setActiveDialogOpen] = useState(false);


    // --- 获取dashboard数据 ---
    const fetchData = async () => {
        try {
            const res = await getDashboard();
            const raw = res.data;
            console.log(raw);
            setData(raw);
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "加载失败"); 
        } finally { }
    }

    useEffect(() => {fetchData()}, [])  

    // --- 编辑欢迎词 ---
    const openWelcomeEdit = () => { 
        setWelcomeData(data.welcome_data); 
        setWelcomeDialogOpen(true);
    };

    // --- 编辑展厅基础信息 ---
    const openWholeDataEdit = () => { 
        setWholeData(data.whole_data); 
        setWholeDialogOpen(true);
    };

    // --- 欢迎词保存 ---
    const hanldeWelcomeSave = async () => { 
        try{
            await saveWelcome(welcomeData); 
            toast.success("操作成功"); 
            fetchData();
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "操作失败"); 
        } finally { 
            setWelcomeDialogOpen(false); 
        }
    }

    // --- 展厅基础信息保存 ---
    const hanldeWholeSave = async () => { 
        try{
            await saveEhData(wholeData); 
            toast.success("操作成功"); 
            fetchData();
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "操作失败"); 
        } finally { setWholeDialogOpen(false); }
    }

    // --- 展厅中控信息保存 ---
    const hanldeActiveSave = async () => { 
        try{
            await saveEhActive(activeData); 
            toast.success("操作成功"); 
            fetchData();
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "操作失败"); 
        } finally { setActiveDialogOpen(false); }
    }

    return (
        <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <div className="px-4 lg:px-6 grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @3xl/main:grid-cols-4 @5xl/main:grid-cols-6 dark:*:data-[slot=card]:bg-card">
                        <Card className="@container/card">
                            <CardHeader>
                                <CardDescription>当前软件模式</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                    {data?.smodel_data || 'Null'}
                                </CardTitle>
                                <CardAction>
                                    <Button variant="outline" size="icon-lg" className="rounded-full"><CircuitBoard/></Button>
                                </CardAction>
                            </CardHeader>
                        </Card>
                        <Card className="@container/card">
                            <CardHeader>
                                <CardDescription>当前硬件模式</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                    {data?.hmodel_data || ''}
                                </CardTitle>
                                <CardAction>
                                    <Button variant="outline" size="icon-lg" className="rounded-full"><Waypoints/></Button>
                                </CardAction>
                            </CardHeader>
                            
                        </Card>
                        <Card className="@container/card">
                            <CardHeader>
                                <CardDescription>整馆展项总数</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                    {data?.exhibition_data || ''}
                                </CardTitle>
                                <CardAction>
                                    <Button variant="outline" size="icon-lg" className="rounded-full"><ContainerIcon/></Button>
                                </CardAction>
                            </CardHeader>
                            
                        </Card>
                        <Card className="@container/card">
                            <CardHeader>
                                <CardDescription>整馆展区总数</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                    {data?.machine_data || ''}
                                </CardTitle>
                                <CardAction>
                                    <Button variant="outline" size="icon-lg" className="rounded-full"><ContainerIcon/></Button>
                                </CardAction>
                            </CardHeader>
                            
                        </Card>
                        <Card className="@container/card">
                            <CardHeader>
                                <CardDescription>展项设备总数</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                    {data?.device_data || ''}
                                </CardTitle>
                                <CardAction>
                                    <Button variant="outline" size="icon-lg" className="rounded-full"><HardDriveIcon/></Button>
                                </CardAction>
                            </CardHeader>
                            
                        </Card>
                        <Card className="@container/card">
                            <CardHeader>
                                <CardDescription>设备命令总数</CardDescription>
                                <CardTitle className="text-3xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                    {data?.code_data || ''}
                                </CardTitle>
                                <CardAction>
                                    <Button variant="outline" size="icon-lg" className="rounded-full"><CodeXml/></Button>
                                </CardAction>
                            </CardHeader>
                        </Card>
                    </div>

                    <div className="px-4 lg:px-6 ">
                        <Card className="gap-2">
                            <CardHeader className="flex flex-row justify-start items-center gap-4"> 
                                <span className="text-base">快捷跳转</span>
                                <TrendingUpIcon className="size-4" />
                                <span className="text-sm text-muted-foreground">点击按钮快捷跳转</span>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 @sm/main:grid-cols-2 @xl/main:grid-cols-4 @3xl/main:grid-cols-6 @6xl/main:grid-cols-8 @7xl/main:grid-cols-12 ">
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/main", { replace: true })}><CodeXml/> 首页</Button>
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/pme", { replace: true })}><ContainerIcon/> 展项管理</Button>
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/content", { replace: true })}><FileBox /> 内容管理</Button>
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/contentcode", { replace: true })}><CodeIcon/> 内容命令</Button>
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/device", { replace: true })}><HardDriveIcon/> 设备管理</Button>
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/code", { replace: true })}><CodeXml/> 设备命令</Button>
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/smodel", { replace: true })}><CircuitBoard/> 内容模式</Button>
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/hmodel", { replace: true })}><Waypoints/> 硬件模式</Button>
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/process", { replace: true })}><Share2/> 流程管理</Button>
                                <Button variant="outline" className="w-full h-20 drop-shadow-xl" onClick={()=>navigate("/server/preview", { replace: true })}><ScanEyeIcon/> 轴测图</Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="px-4 lg:px-6 flex flex-row gap-4">
                        <Card className="@container/card relative w-full max-w-xl pt-0">
                            <div className="absolute inset-0 z-30 top-4 left-4 text-muted-foreground w-30 h-10 hidden @sm/card:block" >
                                <img src={data?.whole_data.icon} className="relative z-20 aspect-video w-full object-cover " />
                            </div>
                            <img
                                src={data?.whole_data.bg}
                                className="relative z-20 aspect-video w-full object-cover "
                            />
                            <CardHeader>
                                <CardTitle>展厅信息</CardTitle>
                                <CardDescription>
                                    <span className="hidden @sm/card:block">
                                        展厅基础信息，使用于展厅控制端
                                    </span>
                                    {/* <span className="@[540px]/card:hidden">Last 3 months</span> */}
                                </CardDescription>
                                <CardAction>
                                    <Button variant="outline" onClick={()=>openWholeDataEdit()}>编辑</Button>
                                </CardAction>
                                
                            </CardHeader>
                            <CardContent>
                                <ul className="grid gap-2 text-sm">
                                    <li className="flex gap-2">
                                        <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                        <span>前提标识：</span>
                                        <span>{data?.whole_data.msg}</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                        <span>主要标题：</span>
                                        <span>{data?.whole_data.cn_name}</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                        <span>二级标题：</span>
                                        <span>{data?.whole_data.en_name}</span>
                                    </li>
                                    <CardAction className="flex flex-col justify-center items-center">
                                        <span>色系</span>
                                        <Badge variant="secondary" className="uppercase">{data?.whole_data.color}</Badge>
                                    </CardAction>
                                </ul>
                            </CardContent>
                            <CardFooter className="flex-row justify-between gap-2 h-full">
                                <span className="hidden @sm/card:block text-muted-foreground">
                                    点击按钮进入前端控制界面
                                </span>
                                <div className="flex gap-2">
                                    <TipButton variant="outline" size="icon-lg" view={<InspectIcon />} label="点击进入旧版界面" onClick={() => {window.open('http://192.168.4.43:3101/#/', '_blank');}} />
                                    <TipButton variant="outline" size="icon-lg" view={<MousePointerClick />} label="点击进入新版界面" onClick={() => {window.open('http://192.168.4.35:3100/#/', '_blank');}} />
                                </div>
                            </CardFooter>
                        </Card>
                        <div className="w-full h-full flex flex-col gap-4">
                            <Card className="@container/card w-full h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        欢迎词信息
                                        {
                                            data?.welcome_data.show ?
                                            <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">启用</Badge>
                                            :
                                            <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">禁用</Badge>
                                        }
                                    </CardTitle>
                                    <CardDescription>
                                        <span className="hidden @sm/card:block">
                                            若启用了欢迎词功能，则在序厅或欢迎屏中将显示此欢迎词。
                                        </span>
                                        
                                    </CardDescription>
                                    <CardAction>
                                        <Button variant="outline" onClick={()=>openWelcomeEdit()}>编辑</Button>
                                    </CardAction>
                                    
                                </CardHeader>
                                <CardFooter className="text-5xl flex justify-center h-full">
                                    <div className="text-center leading-14 " dangerouslySetInnerHTML={{ __html: data?.welcome_data.msg}}></div>
                                </CardFooter>
                            </Card>
                            <Card className="@container/card w-full max-w-2xl h-auto shrink-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        展厅过期权限
                                        {
                                            data?.active_data.enable ?
                                            <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">启用</Badge>
                                            :
                                            <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">禁用</Badge>
                                        }
                                    </CardTitle>
                                    <CardDescription>
                                        <span className="hidden @sm/card:block">
                                            若启用了过期管理功能，则在以下日期后系统直接到期，请到期前联系软件提供商。
                                        </span>
                                        
                                    </CardDescription>
                                    <CardAction>
                                        <Button variant="outline" onClick={()=>setActiveDialogOpen(true)}>续期</Button>
                                    </CardAction>
                                    
                                </CardHeader>
                                <CardFooter className="font-bold text-3xl ">
                                    <span>到期日：{data?.active_data.expire_time}</span>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>

                    <div className="px-4 lg:px-6">
                        <Card className="gap-2">
                            <CardHeader className="flex flex-row justify-start items-center gap-4"> 
                                <span className="text-base">展厅预览图</span>
                                <ScanEyeIcon className="size-4" />
                                <span className="text-sm text-muted-foreground">请在管理中添加图片</span>
                                <CardAction className="ml-auto gap-2 flex flex-row">
                                    <Button variant="outline" onClick={()=>navigate("/server/preview",{replace: true})}>添加图片</Button>
                                </CardAction>
                            </CardHeader>
                            <CardContent className="px-20">
                                <Tabs className="w-full min-h-0 flex-1 flex flex-col items-center">
                                    <TabsList >
                                        {
                                            data?.preview_data.length > 0 && data?.preview_data.map((item, index) => (
                                                <TabsTrigger key={index} value={item.pavilion_id}>{item.pavilion_name}</TabsTrigger>
                                            ))
                                        }
                                    </TabsList>
                                    {
                                        data?.preview_data.length > 0 && data?.preview_data.map((item, index) => (
                                            <TabsContent value={item.pavilion_id} key={index}>
                                                <Carousel className="w-full h-full ">
                                                    <CarouselContent>
                                                        {
                                                            item.pavilion_preview.length > 0 && item.pavilion_preview.map((item2, index2) => (
                                                            <CarouselItem key={index2} className="basis-1/3">
                                                                <div className="p-1">
                                                                    <Card>
                                                                        <img src={item2.address} className="w-full h-full object-cover" />
                                                                        <CardContent className="flex items-center justify-center gap-2">
                                                                            <span>{item2.name}</span>
                                                                            <Separator orientation="vertical"/>
                                                                            <span>{item2.title}</span>
                                                                        </CardContent>
                                                                    </Card>
                                                                </div>
                                                                
                                                            </CarouselItem>
                                                            ))
                                                        }
                                                    </CarouselContent>
                                                    {
                                                        item.pavilion_preview.length > 0 && <>
                                                            <CarouselPrevious />
                                                            <CarouselNext />
                                                        </>
                                                    }
                                                </Carousel>
                                            </TabsContent>
                                        ))
                                    }
                                    
                                    <TabsContent value="tableView"></TabsContent>
                                </Tabs>
                                
                            </CardContent>
                        </Card>
                    </div>

                    <div className="px-4 lg:px-6">
                        <ChartAreaInteractive />
                    </div>
                </div>
            </div>
            
            {/* 展厅欢迎词编辑弹窗 */}
            <Dialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader><DialogTitle>编辑欢迎词</DialogTitle></DialogHeader>
                        <form className="w-full">
                            <FieldGroup>
                                <Field className="hidden">
                                    <FieldLabel htmlFor="id">ID</FieldLabel>
                                    <Input id="id" value={welcomeData?.id} />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="msg">欢迎词</FieldLabel>
                                    <Textarea className="min-h-40" id="msg" value={welcomeData?.msg} placeholder="请输入欢迎词" onChange={(e) => setWelcomeData({ ...welcomeData, msg: e.target.value })} />
                                    <FieldDescription >可使用{`<br>`}进行换行，也可使用其他标签进行文字变化</FieldDescription>
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="msg">其他信息</FieldLabel>
                                        <Input id="other" value={welcomeData?.other} placeholder="可选输入，备注" onChange={(e) => setWelcomeData({ ...welcomeData, other: e.target.value })} />
                                        
                                    </Field>
                                    <Field >
                                        <FieldLabel >展厅欢迎词是否启用</FieldLabel>
                                        <div className="flex items-center gap-2">
                                            <Switch  className="m-1" id="show" size="default" checked={welcomeData?.show ? true:false} onCheckedChange={(e) => setWelcomeData({...welcomeData, show: e})}/>
                                            {welcomeData?.show ? '启用':'禁用'}
                                        </div>
                                    </Field>
                                </div>
                            </FieldGroup>
                        </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setWelcomeDialogOpen(false)}>取消</Button>
                        <Button onClick={hanldeWelcomeSave}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 展厅基础信息编辑弹窗 */}
            <Dialog open={wholeDialogOpen} onOpenChange={setWholeDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader><DialogTitle>编辑展厅基础信息</DialogTitle></DialogHeader>
                        <form className="w-full">
                            <FieldGroup>
                                
                                <Field className="hidden">
                                    <FieldLabel htmlFor="id">ID</FieldLabel>
                                    <Input id="id" value={wholeData.id} />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="cn_name">展厅中文名称</FieldLabel>
                                    <Input id="cn_name" value={wholeData.cn_name} onChange={(e) => setWholeData({ ...wholeData, cn_name: e.target.value })}/>
                                </Field>
                                
                                <Field>
                                    <FieldLabel htmlFor="en_name">展厅英文名称</FieldLabel>
                                    <Input id="en_name" value={wholeData.en_name} onChange={(e) => setWholeData({ ...wholeData, en_name:e.target.value })}/>
                                </Field>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="file">登录背景图</FieldLabel>
                                        <ImageCropper
                                            aspectRatio={16/9}
                                            maxSize={1920}
                                            onUploaded={(fileUrl) => {
                                                setWholeData((prev) => ({ ...prev, bg: fileUrl }));
                                                toast.success("图片上传成功");
                                            }}
                                            onError={(e) => toast.error(e instanceof Error ? e.message : "上传失败，请重新选择图片")}
                                            trigger={({ onClick }) => (
                                                <div className="flex flex-wrap items-center gap-3">
                                                {
                                                    wholeData.bg ? (
                                                        <div className="flex flex-col justify-center items-center bg-accent rounded-md gap-2">
                                                            <img src={wholeData.bg} className="w-48 h-27 rounded-md overflow-hidden border border-black/20" />
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => setWholeData((prev) => ({ ...prev, bg: "" }))}
                                                            >
                                                                清除已上传文件
                                                            </Button>
                                                        </div>
                                                    )
                                                    :
                                                    (
                                                        <Button type="button" variant="outline" className="w-48 h-27 flex flex-col"  onClick={onClick}>
                                                            <UploadCloudIcon className="mr-1 size-6" />
                                                            <span className="text-warp">选择图片并裁剪</span>
                                                        </Button>
                                                    )
                                                }
                                                </div>
                                            )}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="icon">展厅图标</FieldLabel>
                                        <ImageCropper
                                            aspectRatio={2}
                                            maxSize={200}
                                            onUploaded={(fileUrl) => {
                                                setWholeData((prev) => ({ ...prev, icon: fileUrl }));
                                                toast.success("图片上传成功");
                                            }}
                                            onError={(e) => toast.error(e instanceof Error ? e.message : "上传失败，请重新选择图片")}
                                            trigger={({ onClick }) => (
                                                <div className="flex flex-wrap items-center gap-3">
                                                {
                                                    wholeData.icon ? (
                                                        <div className="flex flex-col justify-center items-center bg-accent rounded-md gap-2">
                                                            <img src={wholeData.icon} className="w-48 h-27 rounded-md overflow-hidden border border-black/20" />
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => setWholeData((prev) => ({ ...prev, icon: "" }))}
                                                            >
                                                                清除已上传文件
                                                            </Button>
                                                        </div>
                                                    )
                                                    :
                                                    (
                                                        <Button type="button" variant="outline" className="w-30 h-20 flex flex-col"  onClick={onClick}>
                                                            <UploadCloudIcon className="mr-1 size-6" />
                                                            <span className="text-warp">选择图片并裁剪</span>
                                                        </Button>
                                                    )
                                                }
                                                </div>
                                            )}
                                        />
                                        
                                    </Field>
                                </div>
                                <Field>
                                    <FieldLabel htmlFor="color">展厅色系</FieldLabel>
                                    <Input id="color" value={wholeData.color } onChange={(e) => setWholeData({ ...wholeData, color:e.target.value })} />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="msg">展厅信息</FieldLabel>
                                    <Textarea id="msg" value={wholeData.msg} placeholder="可选输入，备注" onChange={(e) => setWholeData({ ...wholeData, msg: e.target.value })} />
                                </Field>
                                
                            </FieldGroup>
                        </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setWholeDialogOpen(false)}>取消</Button>
                        <Button onClick={hanldeWholeSave}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* 展厅中控续期编辑弹窗 */}
            <Dialog open={activeDialogOpen} onOpenChange={setActiveDialogOpen}>
                <DialogContent className="sm:max-w-180">
                    <DialogHeader><DialogTitle>展厅中控延期</DialogTitle></DialogHeader>
                        <form className="w-full">
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="msg">延期码</FieldLabel>
                                    <Textarea className="min-h-40" id="active" onChange={(e) => setActiveData({ ...welcomeData, active: e.target.value })} />
                                    <FieldDescription >请联系展厅中控供应商获取延期码</FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActiveDialogOpen(false)}>取消</Button>
                        <Button onClick={hanldeActiveSave}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
