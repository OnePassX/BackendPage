
import { useState, useEffect } from "react";

import { UploadCloudIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel,FieldDescription } from "@/components/ui/field";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageCropper } from "@/components/image-cropper";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"

import { getEhData, saveEhData, getEhActive, getWelcome, saveWelcome } from "@/api/main.js";

interface EhdataItem {
    id: number;
    cn_name: string;
    en_name: string;
    bg: string;
    icon: string;
    color: string;
    msg: string;
} 

interface ActiveItem {
    id: number;
    enable: boolean;
    active: boolean;
    expire_time: string
}

interface WelcomeItem { 
    id: number;
    show: boolean;
    msg: string;
    other: string;
}

const defaultForm = { id:1, cn_name: "", en_name: "", bg: "", icon: "", color: "", msg:'' };

const welcomeForm = { id:1, msg: "", other: "",show:true };

export default function EhdataPage() {

    const [formData, setFormData] = useState<EhdataItem>(defaultForm);
    
    // 激活
    const [activeData,setActiveData] = useState<ActiveItem | null>(null);
    const [activeForm,setActiveForm] = useState<any>(null);
    // 欢迎词
    const [welcomeData,setWelcomeData] = useState<WelcomeItem>(welcomeForm);


    const fetchData = async () => { 
        
        try {
            const res = await getEhData();
            const raw = res.data;
            console.log(raw);
            setFormData(raw);
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "加载失败"); 
        } finally { }
    };

    const fetchActiveData = async () => { 
        
        try {
            const res = await getEhActive();
            const raw = res.data;
            console.log(raw);
            setActiveData(raw);
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "加载失败"); 
        } finally { }
    };

    const fetchWelcomeData = async () => { 
        
        try {
            const res = await getWelcome();
            const raw = res.data;
            console.log(raw);
            setWelcomeData(raw);
        } catch (e: unknown) { 
            toast.error(e instanceof Error ? e.message : "加载失败"); 
        } finally { }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { fetchActiveData(); }, []);
    useEffect(() => { fetchWelcomeData(); }, []);

    const HandleSaveEhdata = async () => { 
        try{
            await saveEhData(formData); 
            toast.success("操作成功"); 
            fetchData();
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
    };

    const hanldeSaveWelcome = async () => { 
        try{
            await saveWelcome(welcomeData); 
            toast.success("操作成功"); 
            fetchWelcomeData();
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "操作失败"); }
    };

    return (
        <div className="flex flex-col gap-4 px-4 lg:px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">展厅信息管理</h1>
            </div>
            <div className="flex gap-4 h-full items-start flex-wrap">

                <Card className="w-full h-auto drop-shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl">展厅欢迎词</CardTitle>
                        <CardDescription>
                            配置展厅展项前可先配置此信息
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="w-full">
                            <FieldGroup>

                                <Field className="hidden">
                                    <FieldLabel htmlFor="id">展厅中文名称</FieldLabel>
                                    <Input id="id" value={welcomeData?.id} />
                                    <FieldDescription >请输入展厅中文名称</FieldDescription>
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="msg">欢迎词</FieldLabel>
                                    <Textarea id="msg" value={welcomeData?.msg} placeholder="可选输入，备注" onChange={(e) => setWelcomeData({ ...welcomeData, msg: e.target.value })} />
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="msg">其他信息</FieldLabel>
                                        <Input id="other" value={welcomeData?.other} placeholder="可选输入，备注" onChange={(e) => setWelcomeData({ ...welcomeData, other: e.target.value })} />
                                        
                                    </Field>
                                    <Field >
                                        <FieldLabel >展厅欢迎词是否启用</FieldLabel>
                                        <div className="flex items-center gap-2">
                                            <Switch className="m-1" id="show" size="default" defaultChecked={welcomeData?.show ? true:false} onCheckedChange={(e) => setWelcomeData({...welcomeData, show: e})}/>
                                            {welcomeData?.show ? '启用':'禁用'}
                                        </div>
                                    </Field>
                                </div>
                            </FieldGroup>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <Button variant="default" onClick={hanldeSaveWelcome}>
                        保存
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="w-full 2xl:w-1/2 h-auto drop-shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl">基础信息管理</CardTitle>
                        <CardDescription>
                            配置展厅展项前可先配置此信息
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="w-full">
                            <FieldGroup>
                                
                                <Field className="hidden">
                                    <FieldLabel htmlFor="id">ID</FieldLabel>
                                    <Input id="id" value={formData.id} />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="cn_name">展厅中文名称</FieldLabel>
                                    <Input id="cn_name" value={formData.cn_name} onChange={(e) => setFormData({ ...formData, cn_name: e.target.value })}/>
                                </Field>
                                
                                <Field>
                                    <FieldLabel htmlFor="en_name">展厅英文名称</FieldLabel>
                                    <Input id="en_name" value={formData.en_name} onChange={(e) => setFormData({ ...formData, en_name:e.target.value })}/>
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="file">上传文件</FieldLabel>
                                    <ImageCropper
                                        aspectRatio={2}
                                        maxSize={1920}
                                        onUploaded={(fileUrl) => {
                                            setFormData((prev) => ({ ...prev, bg: fileUrl }));
                                            toast.success("图片上传成功");
                                        }}
                                        onError={(e) => toast.error(e instanceof Error ? e.message : "上传失败，请重新选择图片")}
                                        trigger={({ onClick }) => (
                                            <div className="flex flex-wrap items-center gap-3">
                                                <Button type="button" variant="outline" className="w-30 h-20 flex flex-col"  onClick={onClick}>
                                                    <UploadCloudIcon className="mr-1 size-6" />
                                                    <span className="text-warp">选择图片并裁剪</span>
                                                </Button>
                                                {formData.bg && (
                                                    <div className="flex flex-col justify-center items-center">
                                                        <img src={formData.bg} className="w-40 h-20" />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setFormData((prev) => ({ ...prev, bg: "" }))}
                                                        >
                                                            清除已上传文件
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="icon">展厅色系</FieldLabel>
                                    <Input id="icon" value={formData.icon } onChange={(e) => setFormData({ ...formData, icon:e.target.value })} />
                                    
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="color">展厅色系</FieldLabel>
                                    <Input id="color" value={formData.color } onChange={(e) => setFormData({ ...formData, color:e.target.value })} />
                                    
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="msg">展厅信息</FieldLabel>
                                    <Textarea id="msg" value={formData.msg} placeholder="可选输入，备注" onChange={(e) => setFormData({ ...formData, msg: e.target.value })} />
                                </Field>
                                
                            </FieldGroup>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" onClick={HandleSaveEhdata}>
                        保存
                        </Button>
                    </CardFooter>
                </Card>
            
                <Card className="w-auto h-auto drop-shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl">过期管理</CardTitle>
                        <CardDescription>
                            展厅控制系统将于指定日期后到期，到期后输入激活码进行激活
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-2xl">系统到期时间</span>
                                <span className="text-5xl">{activeData?.expire_time}</span>
                            </div>

                            <div className="flex flex-row justify-center items-center gap-4">
                                <span>是否启用过期管理:</span>
                                <Badge >{activeData?.enable ?'是':'否'}</Badge>
                            </div>

                            <div className="flex flex-row justify-center items-center gap-4">
                                <span>是否到期:</span>
                                <Badge >{activeData?.active ?'是':'否'}</Badge>
                            </div>
                        </div>
                        <form className="w-full">
                            <FieldGroup>
                                <Field className="hidden">
                                    <FieldLabel htmlFor="id">ID</FieldLabel>
                                    <Input id="id" value={activeData?.id} />
                                    <FieldDescription >ID</FieldDescription>
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="msg">延期码:</FieldLabel>
                                    <Textarea id="msg" value="" onChange={(e) => setActiveForm({ ...activeForm, msg: e.target.value })} />
                                    <FieldDescription >请联系展厅中控供应商获取延期码</FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" >提交</Button>
                    </CardFooter>
                </Card>
                
            </div>
        </div>
    )
}
