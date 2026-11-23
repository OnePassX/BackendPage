
import React, { useEffect,useState,useMemo,useRef } from 'react';

import { PlusIcon ,PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";


import { HiPlusSm,HiOutlineMinusSm,HiOutlineVolumeOff,HiOutlineVolumeUp,HiOutlinePause,HiOutlinePlay,HiOutlineFastForward,HiOutlineRewind,HiOutlineRefresh,HiOutlineHome,HiOutlineChevronLeft,HiOutlineChevronRight,HiArrowNarrowUp,HiArrowNarrowDown,HiOutlineCursorClick  } from "react-icons/hi";
import { LuPanelBottomOpen,LuPanelTopOpen  } from "react-icons/lu";
import { message_To_Client,code_To_Client,get_Device_Code,get_Global_Device,change_Volume,change_Content } from '@/api/quick.js';
import { PiMouseLeftClick,PiMouseRightClick   } from "react-icons/pi";
import { AiEditor } from "aieditor";
// import "aieditor/dist/style.css"

export const SoftwareControlPage = (props) => {
    const { contentData,exhibitData,currentHall,currentExhibit,baseControl,linkControl,color,showEdit = true,onAddControlNode,onEditControlNode } = props;

    const [contentId,setContentId] = useState(null);

    const [fileType,setFileType] = useState(null);

    const [controlJson,setControlJson] = useState([]);

    const [exhibit,setExhibit] = useState(0)

    const [hall,setHall] = useState(0)
    // base控制列表
    const [baseControlList,setBaseControlList] = useState([]);

    const [values, setValues] = React.useState(new Set(["1"]));

    const [firstSelected,setFirstSelected] = useState(null);
    const [secondSelected,setSecondSelected]=  useState(null);
    const [thirdSelected,setThirdSelected]=  useState(null);
    const [fourthSelected,setFourthSelected]=  useState(null);
    const [fifthSelected,setFifthSelected]=  useState(null);

    const [x,setX] = useState(0);
    const [y,setY] = useState(0);

    const baseButton = [
        {"id":"1","code":"dec","name":"音量加",'port':5566,'icon':<HiPlusSm size={16}/>},
        {"id":"2","code":"inc","name":"音量减",'port':5566,'icon':<HiOutlineMinusSm  size={16}/>},
        {"id":"3","code":"mute","name":"静音",'port':5566,'icon':<HiOutlineVolumeOff size={16}/>},
        {"id":"4","code":"unmute","name":"取消静音",'port':5566,'icon':<HiOutlineVolumeUp size={16}/>},
        {"id":"5","code":"open","name":"窗口打开",'port':5566,'icon':<LuPanelBottomOpen size={16}/>},
        {"id":"6","code":"close","name":"窗口关闭",'port':5566,'icon':<LuPanelTopOpen size={16}/>}
    ]

    const videoControlButton = [
        {"id":"1","bCode":"play","bName":"播放",'bPort':5566,'other':[],'icon':<HiOutlinePlay size={20}/>},
        {"id":"2","bCode":"pause","bName":"暂停",'bPort':5566,'other':[],'icon':<HiOutlinePause size={20}/>},
        {"id":"3","bCode":"rw","bName":"后退",'bPort':5566,'other':[],'icon':<HiOutlineRewind  size={20}/>},
        {"id":"4","bCode":"fw","bName":"前进",'bPort':5566,'other':[],'icon':<HiOutlineFastForward size={20}/>},
        {"id":"5","bCode":"replay","bName":"重播",'bPort':5566,'other':[],'icon':<HiOutlineRefresh size={20}/>}
    ]

    const pptControlButton = [
        {"id":"1","bCode":"home","bName":"首页",'bPort':5566,'other':[],'icon':<HiOutlineHome size={20}/>},
        {"id":"2","bCode":"prev","bName":"上一页",'bPort':5566,'other':[],'icon':<HiOutlineChevronLeft size={20}/>},
        {"id":"3","bCode":"next","bName":"下一页",'bPort':5566,'other':[],'icon':<HiOutlineChevronRight  size={20}/>},
    ]

    const htmlControlButton = [
        {"id":"1","bCode":"leftclick","bName":"左键单击",'bPort':5566,'other':[],'icon':<PiMouseLeftClick size={20}/>},
        {"id":"2","bCode":"rightclick","bName":"右键单击",'bPort':5566,'other':[],'icon':<PiMouseRightClick size={20}/>},
        {"id":"3","bCode":"doubleclick","bName":"双击",'bPort':5566,'other':[],'icon':<HiOutlineCursorClick   size={20}/>},
        {"id":"4","bCode":"moveup","bName":"滚轮上移",'bPort':5566,'other':[],'icon':<HiArrowNarrowUp  size={20}/>},
        {"id":"5","bCode":"movedown","bName":"滚轮下移",'bPort':5566,'other':[],'icon':<HiArrowNarrowDown  size={20}/>},
    ]

    const onBaseBtnPress = (id) => {
        const basedata = baseButton.filter(item => item.id === id)[0]
        if(["1","2","3","4"].indexOf(id)!==-1){
            change_Volume({eid: exhibit, code:basedata.code}).then(res=>{ 
                // console.log(res.data)
                if (res.data.code == 200) {
                    toast.success(res.data.msg)
                }else{
                    toast.error(res.data.msg)
                }
            }).catch(err=>{ 
                console.log(err)
                toast('提示信息', { description: err })
            }) 
        }else{
            changeContent({id: contentId, code:basedata.code,})
        }
    }

    const onLinkBtnPress = (data) => {
        console.log(data)
        data && messageToClient({content_code:data.content_code?data.content_code:[],device_code:data.device_code})
    }

    const onFirstPress = (item,index) => { 
        console.log(item,index) 
        setFirstSelected(index)
        setSecondSelected(null)
        setThirdSelected(null)
        setFourthSelected(null)
        messageToClient({content_code:item.content_code,device_code:item.device_code})
    }

    const onSecondPress = (item,index) => { 
        console.log(item,index) 
        setSecondSelected(index)
        setThirdSelected(null)
        setFourthSelected(null)
        messageToClient({content_code:item.content_code,device_code:item.device_code})
    }

    const onThirdPress = (item,index) => {
        console.log(item,index) 
        setThirdSelected(index)
        setFourthSelected(null)
        messageToClient({content_code:item.content_code,device_code:item.device_code})
    }

    const onFourthPress = (item,index) => {
        console.log(item,index)  
        setFourthSelected(index)
        messageToClient({content_code:item.content_code,device_code:item.device_code})
    }

    const onFifthPress = (item,index) => {
        console.log(item,index)  
        setFifthSelected(index)
        messageToClient({content_code:item.content_code,device_code:item.device_code})
    }

    const onOtherPress = (item,index) => { 
        console.log(item,index) 
        setFirstSelected(index)
        setSecondSelected(null)
        setThirdSelected(null)
        setFourthSelected(null)
        changeContent({id: contentId, code:item.bCode })
    }

    const onMouseDown = (event) => { 
        setX(event.clientX)
        setY(event.clientY)
    }
    
    const onMouseUp = (event) => { 
        const endx = event.clientX - x
        const endy = event.clientY - y
        // console.log(endx,endy)
        const msg = 'mousemove'+'_'+endx+'_'+endy
        changeContent({ id: contentId, code: msg })
    }
    const onTouchStart = (event) => { 
        setX(event.touches[0].clientX)
        setY(event.touches[0].clientY) 
    }
    const onTouchEnd = (event) => {
        const endx = parseInt(String(event.changedTouches[0].clientX - x))
        const endy = parseInt(String(event.changedTouches[0].clientY - y))
        const msg = 'mousemove'+'_'+endx+'_'+endy
        changeContent({ id: contentId, code: msg })
    }

    const messageToClient = (params) => {
        message_To_Client(params).then(res=>{ 
            // console.log(res.data)
            if (res.data.code == 200) {
                toast('提示信息', { description: res.data.msg })
            }else{
                toast('提示信息', { description: res.data.msg })
            }
        }).catch(err=>{ 
            console.log(err)
            toast('提示信息', { description: err })
        })
    }
    const changeContent = (params) => { 
        change_Content(params).then(res=>{ 
            // console.log(res.data)
            if (res.data.code == 200) {
                toast('提示信息', { description: res.data.msg })
            }else{
                toast('提示信息', { description: res.data.msg })
            }
        }).catch(err=>{ 
            console.log(err)
            toast('提示信息', { description: err })
        })
    }

    // 内容刷新后（同一条内容）保留控制树的展开层级，避免保存按钮后树被重置
    const prevContentIdRef = useRef<any>(null)

    useEffect(()=>{
        const sameContent = prevContentIdRef.current != null && prevContentIdRef.current === contentData?.id
        prevContentIdRef.current = contentData?.id ?? null
        setFileType(contentData?.fileType)
        setControlJson(contentData?.controlJson)
        setContentId(contentData?.id)
        if (!sameContent) {
            setFirstSelected(null)
            setSecondSelected(null)
            setThirdSelected(null)
            setFourthSelected(null)
            setFifthSelected(null)
        }
    },[contentData])

    // 仅切换选中层级（不触发指令下发），用于「添加下级按钮」前定位父级
    const selectPath = (path: number[]) => {
        setFirstSelected(path[0] ?? null)
        setSecondSelected(path[1] ?? null)
        setThirdSelected(path[2] ?? null)
        setFourthSelected(path[3] ?? null)
        setFifthSelected(path[4] ?? null)
    }

    useEffect(()=>{
        setExhibit(Number(Array.from(currentExhibit)[0]))
        setHall(currentHall)
        // const data1 = exhibitData.filter(item=>item.id==currentHall)[0]?.data
        // const data2 = data1?.filter(item=>item.id==Number(Array.from(currentExhibit)[0]))[0]
        // if (data2) {
        //     setBaseControlList(data2.base?.split('_'))
        // }
        // console.log(data1)
        
    },[exhibitData,currentHall,currentExhibit])
    

    // useEffect(()=>{
    //     console.log(controlJson)
    // },[controlJson])

    return (
        <div className={`h-[calc(100%-4rem)] w-full flex flex-col justify-start gap-2 p-2 overflow-hidden ${color[0]}`}>
            {
                (baseControl.length > 0 || linkControl.length > 0) &&
                <div className='w-full h-auto shrink-0 flex flex-col gap-2 overflow-hidden overflow-x-auto scrollbar-hide bg-current/20 rounded-md p-2 border border-[#888888]/20 '>
                    {
                        baseControl.length > 0 &&
                        <div className='max-w-100 w-auto h-auto flex flex-row justify-start gap-2 text-secondary-foreground'>
                        {
                            baseControl.map((value) => {
                                const data = baseButton.filter(item=>item.id==value)[0]
                                return (
                                    <Button className="h-12 " size="default" variant="outline" key={value} onClick={() => {onBaseBtnPress(data.id)}}>{data.icon}{data.name}</Button>
                                )
                            })
                        }
                        </div>
                    }
                    {
                        linkControl.length > 0 &&
                        <div className='max-w-100 w-auto h-auto flex flex-row justify-start items-start gap-2 '>
                        {
                            linkControl.map((value) => {
                                return value.show && (
                                    <div key={value.id} className='flex items-center gap-1 text-secondary-foreground'>
                                        <Button className="h-12" size="default" variant="outline" onClick={() => {onLinkBtnPress(value)}}>
                                            <span className='w-auto overflow-hidden'>{value.label}</span>
                                        </Button>
                                    </div>
                                )
                            })
                        }
                        </div>
                    }
                </div>
            }
            {
                fileType == 'EXE' &&
                <div className={` ${color[0]} w-full h-auto bg-current/10 border border-[#888888]/20 rounded-md p-2 flex flex-col justify-start items-start overflow-hidden`}>
                    <div className='w-full h-full flex flex-col justify-start overflow-y-auto scrollbar-hide'>
                        <div className="text-xs">一级控制&nbsp;<span>↓</span></div>
                        <div className='grid grid-cols-4 gap-1'>
                            {
                                controlJson?.length > 0 && controlJson?.map((item,index)=>{
                                    return item.show && (
                                        <div key={index} className={`relative w-full h-auto flex flex-col justify-center items-center text-center text-sm border border-[#888888]/20 rounded-md ${firstSelected==index? 'bg-current ' : 'bg-secondary '} min-h-18 py-1`} onClick={()=>{onFirstPress(item,index)}}>
                                            <span className={`flex flex-1 items-center justify-center px-1 ${firstSelected==index? 'text-secondary dark:text-secondary-foreground ':'text-secondary-foreground dark:text-secondary-foreground'}`}>{item.label}</span>
                                            {showEdit && (
                                                <div className="mt-1 flex w-full items-center justify-center gap-1 px-1">
                                                    <button type="button" className="flex h-7 flex-1 items-center justify-center gap-0.5 rounded bg-purple-500/10 text-[11px] text-purple-600" title="添加下级按钮" onClick={(e) => { e.stopPropagation(); selectPath([index]); onAddControlNode?.(2, [index]); }}>
                                                        <PlusIcon className="size-3.5" />下级
                                                    </button>
                                                    <button type="button" className="flex h-7 flex-1 items-center justify-center gap-0.5 rounded bg-yellow-500/10 text-[11px] text-yellow-700" title="编辑按钮" onClick={(e) => { e.stopPropagation(); onEditControlNode?.(item, [index]); }}>
                                                        <PenSquare className="size-3.5" />编辑
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            }
                            {showEdit && (<Button className={`min-w-12 w-auto h-12 text-purple-500`} size="default" variant="outline" onClick={() => onAddControlNode?.(1, [])}><PlusIcon />添加按钮</Button>)}
                        </div>
                        {
                            firstSelected !== null && controlJson[firstSelected].children?.length > 0 &&
                            <>
                                <div className="text-xs">二级控制&nbsp;<span>↓</span></div>
                                <div className='grid grid-cols-4 gap-1'>
                                    {
                                        controlJson[firstSelected].children?.map((item,index)=>{
                                            return item.show && (
                                                <div key={index} className={`relative w-full h-auto flex flex-col justify-center items-center text-center text-sm border border-[#888888]/20 rounded-md ${secondSelected==index? 'bg-current ' : 'bg-secondary '} min-h-18 py-1`} onClick={()=>{onSecondPress(item,index)}}>
                                                    <span className={`flex flex-1 items-center justify-center px-1 ${secondSelected==index? 'text-secondary dark:text-secondary-foreground ':'text-secondary-foreground dark:text-secondary-foreground'}`}>{item.label}</span>
                                                    {showEdit && (
                                                        <div className="mt-1 flex w-full items-center justify-center gap-1 px-1">
                                                            <button type="button" className="flex h-7 flex-1 items-center justify-center gap-0.5 rounded bg-purple-500/10 text-[11px] text-purple-600" title="添加下级按钮" onClick={(e) => { e.stopPropagation(); selectPath([firstSelected, index]); onAddControlNode?.(3, [firstSelected, index]); }}>
                                                                <PlusIcon className="size-3.5" />下级
                                                            </button>
                                                            <button type="button" className="flex h-7 flex-1 items-center justify-center gap-0.5 rounded bg-yellow-500/10 text-[11px] text-yellow-700" title="编辑按钮" onClick={(e) => { e.stopPropagation(); onEditControlNode?.(item, [firstSelected, index]); }}>
                                                                <PenSquare className="size-3.5" />编辑
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    }
                                    {showEdit && (<Button className={`min-w-12 w-auto h-12 text-purple-500`} size="default" variant="outline" onClick={() => onAddControlNode?.(2, [firstSelected])}><PlusIcon />添加按钮</Button>)}
                                </div>
                                
                            </>
                        }

                        {
                            secondSelected !== null && controlJson[firstSelected].children?.length > 0 && controlJson[firstSelected].children[secondSelected].children?.length > 0 &&
                            <>
                            <div className="text-xs">三级控制&nbsp;<span>↓</span></div>
                            <div className='grid grid-cols-4 gap-1'>
                                {
                                    controlJson[firstSelected].children[secondSelected].children?.map((item,index)=>{
                                        return item.show && (
                                            <div key={index} className={`relative w-full h-auto flex flex-col justify-center items-center text-center text-sm border border-[#888888]/20 rounded-md ${thirdSelected==index ? ' bg-current' : 'bg-secondary'} min-h-18 py-1`} onClick={()=>{onThirdPress(item,index)}}>
                                                <span className={`flex flex-1 items-center justify-center px-1 ${thirdSelected==index? 'text-secondary dark:text-secondary-foreground ':'text-secondary-foreground dark:text-secondary-foreground'}`}>{item.label}</span>
                                                {showEdit && (
                                                    <div className="mt-1 flex w-full items-center justify-center gap-1 px-1">
                                                        <button type="button" className="flex h-7 flex-1 items-center justify-center gap-0.5 rounded bg-purple-500/10 text-[11px] text-purple-600" title="添加下级按钮" onClick={(e) => { e.stopPropagation(); selectPath([firstSelected, secondSelected, index]); onAddControlNode?.(4, [firstSelected, secondSelected, index]); }}>
                                                            <PlusIcon className="size-3.5" />下级
                                                        </button>
                                                        <button type="button" className="flex h-7 flex-1 items-center justify-center gap-0.5 rounded bg-yellow-500/10 text-[11px] text-yellow-700" title="编辑按钮" onClick={(e) => { e.stopPropagation(); onEditControlNode?.(item, [firstSelected, secondSelected, index]); }}>
                                                            <PenSquare className="size-3.5" />编辑
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                }
                                {showEdit && (<Button className={`min-w-12 w-auto h-12 text-purple-500`} size="default" variant="outline" onClick={() => onAddControlNode?.(3, [firstSelected, secondSelected])}><PlusIcon />添加按钮</Button>)}
                            </div>
                            </>
                        }

                        {
                            thirdSelected !== null && controlJson[firstSelected].children[secondSelected].children?.length > 0 && controlJson[firstSelected].children[secondSelected].children[thirdSelected].children?.length > 0 &&
                            <>
                            <div className="text-xs">四级控制&nbsp;<span>↓</span></div>
                            <div className=' grid grid-cols-4 gap-1'>
                                {
                                    controlJson[firstSelected].children[secondSelected].children[thirdSelected].children?.map((item,index)=>{
                                        return item.show && (
                                            <div key={index} className={`relative w-full h-auto flex flex-col justify-center items-center text-center text-sm border border-[#888888]/20 rounded-md ${fourthSelected==index ? ' bg-current ' : 'bg-secondary '} min-h-18 py-1`} onClick={()=>{onFourthPress(item,index)}}>
                                                <span className={`flex flex-1 items-center justify-center px-1 ${fourthSelected==index? 'text-secondary dark:text-secondary-foreground ':'text-secondary-foreground dark:text-secondary-foreground'}`}>{item.label}</span>
                                                {showEdit && (
                                                    <div className="mt-1 flex w-full items-center justify-center gap-1 px-1">
                                                        <button type="button" className="flex h-7 flex-1 items-center justify-center gap-0.5 rounded bg-purple-500/10 text-[11px] text-purple-600" title="添加下级按钮" onClick={(e) => { e.stopPropagation(); selectPath([firstSelected, secondSelected, thirdSelected, index]); onAddControlNode?.(5, [firstSelected, secondSelected, thirdSelected, index]); }}>
                                                            <PlusIcon className="size-3.5" />下级
                                                        </button>
                                                        <button type="button" className="flex h-7 flex-1 items-center justify-center gap-0.5 rounded bg-yellow-500/10 text-[11px] text-yellow-700" title="编辑按钮" onClick={(e) => { e.stopPropagation(); onEditControlNode?.(item, [firstSelected, secondSelected, thirdSelected, index]); }}>
                                                            <PenSquare className="size-3.5" />编辑
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                }
                                {showEdit && (<Button className={`min-w-12 w-auto h-12 text-purple-500`} size="default" variant="outline" onClick={() => onAddControlNode?.(4, [firstSelected, secondSelected, thirdSelected])}><PlusIcon />添加按钮</Button>)}
                            </div>
                            </>
                        }

                        {
                            fourthSelected !== null && controlJson[firstSelected].children[secondSelected].children[thirdSelected].children?.length > 0 && controlJson[firstSelected].children[secondSelected].children[thirdSelected].children[fourthSelected].children?.length > 0 &&
                            <>
                            <div className="text-xs">五级控制&nbsp;<span>↓</span></div>
                            <div className=' grid grid-cols-4 gap-1'>
                                {
                                    controlJson[firstSelected].children[secondSelected].children[thirdSelected].children[fourthSelected].children?.map((item,index)=>{
                                        return item.show && (
                                            <div key={index} className={`relative w-full h-auto flex flex-col justify-center items-center text-center text-sm border border-[#888888]/20 rounded-md ${fifthSelected==index ? ' bg-current ' : 'bg-secondary '} min-h-18 py-1`} onClick={()=>{onFifthPress(item,index)}}>
                                                <span className={`flex flex-1 items-center justify-center px-1 ${fifthSelected==index? 'text-secondary dark:text-secondary-foreground ':'text-secondary-foreground dark:text-secondary-foreground'}`}>{item.label}</span>
                                                {showEdit && (
                                                    <div className="mt-1 flex w-full items-center justify-center px-1">
                                                        <button type="button" className="flex h-7 w-full items-center justify-center gap-0.5 rounded bg-yellow-500/10 text-[11px] text-yellow-700" title="编辑按钮" onClick={(e) => { e.stopPropagation(); onEditControlNode?.(item, [firstSelected, secondSelected, thirdSelected, fourthSelected, index]); }}>
                                                            <PenSquare className="size-3.5" />编辑
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                }
                                {showEdit && (<Button className={`min-w-12 w-auto h-12 text-purple-500`} size="default" variant="outline" onClick={() => onAddControlNode?.(5, [firstSelected, secondSelected, thirdSelected, fourthSelected])}><PlusIcon />添加按钮</Button>)}
                            </div>
                            </>
                        }
                    </div>
                </div>
                
            }

            {
                fileType == "VIDEO" && 
                <div className={` ${color[0]} w-full h-auto bg-current/10 border border-[#888888]/20 rounded-md p-2 flex flex-col justify-start items-start overflow-hidden`}>
                    <div className='w-full h-full flex flex-col justify-start overflow-y-auto scrollbar-hide'>
                        
                        <div className=' grid grid-cols-2 gap-1'>
                            {
                                videoControlButton?.map((item,index)=>{
                                    return (
                                        <div key={index} className={`w-full h-auto flex flex-col justify-center items-center text-center gap-1 text-sm border px-2 py-4 border-[#888888]/20 rounded-md ${firstSelected==index? 'bg-current ' : 'bg-secondary'} min-h-12`} onClick={()=>{onOtherPress(item,index)}}>
                                            <span className={`${firstSelected==index? ' text-white' : ' text-secondary-foreground'}`}>{item.icon}</span>
                                            <span className={`${firstSelected==index? ' text-white' : ' text-secondary-foreground'}`}>{item.bName}</span>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
            }

            {
                fileType == "PPT" &&
                <div className={` ${color[0]} w-full h-auto bg-current/10 border border-[#888888]/20 rounded-md p-2 flex flex-col justify-start items-start overflow-hidden`}>
                    <div className='w-full h-full flex flex-col justify-start overflow-y-auto scrollbar-hide'>
                        
                        <div className=' grid grid-cols-4 gap-1'>
                            {
                                pptControlButton?.map((item,index)=>{
                                    return (
                                        <div key={index} className={`w-full h-auto flex flex-col justify-center items-center text-center gap-1 text-sm border px-2 py-4 border-[#888888]/20 rounded-md ${firstSelected==index? 'bg-current' : 'bg-secondary'} min-h-12`} onClick={()=>{onOtherPress(item,index)}}>
                                            <span className={`${firstSelected==index? ' text-white' : 'text-secondary-foreground'}`}>{item.icon}</span>
                                            <span className={`${firstSelected==index? ' text-white' : ' text-secondary-foreground'}`}>{item.bName}</span>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
            }

            {
                fileType == "HTML" &&
                <div className={`${color[0]} w-full h-auto bg-current/10 border border-[#888888]/20 rounded-md p-2 flex flex-row gap-2 justify-start items-start overflow-hidden`}>
                    <div className='h-full w-16 bg-secondary flex flex-col justify-start items-center rounded-md p-1 gap-2'>
                        {
                            htmlControlButton?.map((item,index)=>{
                                return (
                                    <div key={index} className={`w-full h-auto flex flex-col justify-center items-center text-center gap-1 text-sm border px-2 py-4 border-[#888888]/20 rounded-md ${firstSelected==index? 'bg-current ' : 'bg-secondary'} min-h-12`} onClick={()=>{onOtherPress(item,index)}}>
                                        <span className={`${firstSelected==index? ' text-white' : ' text-secondary-foreground'}`}>{item.icon}</span>
                                        <span className={`${firstSelected==index? ' text-white' : ' text-secondary-foreground'} text-xs` }>{item.bName}</span>
                                    </div>
                                )
                            })
                        }
                    </div>
                    <div className='w-[calc(100%-4rem)] h-full flex flex-col justify-start scrollbar-hide bg-secondary rounded-md' onMouseDown={(e)=>{onMouseDown(e)}} onMouseUp={(e)=>{onMouseUp(e)}} onTouchStart={(e)=>{onTouchStart(e)}} onTouchEnd={(e)=>{onTouchEnd(e)}}> 
                    </div>
                </div>
            }
            
            
        </div>
    )
}

export const HardwareControlPage2 = (props) => { 

    const { currentDevice, onEditCode, showEdit = true } = props;

    const [selected,setSelected] = useState(null);

    const [codeData,setCodeData] = useState([]);

    const onPress = (item,index) => { 
        setSelected(index);
        code_To_Client(item.id).then(res=>{ 
            // console.log(res.data)
            if (res.data.code == 200) {
                toast('提示信息', { description: res.data.msg })
            }else{
                toast('提示信息', { description: res.data.msg })
            }
        }).catch(err=>{ 
            console.log(err)
            toast('提示信息', { description: err })
        })
    }

    useEffect(()=>{
        // console.log(currentDevice)
        if( currentDevice !== 0 ){
            get_Device_Code(currentDevice).then(res=>{
                // console.log(res)
                if(res.data.code === 200){
                    setCodeData(res.data.data)
                }else{
                    setCodeData([])
                }
            }).catch(err=>{
                console.log(err)
                toast('提示信息', { description: err })
                setCodeData([])
            })
        }else{
            setCodeData([])
        }
        setSelected(null);
    },[currentDevice])

    return ( 
        <div className='relative h-full w-full px-3 '>
            <div className='w-full h-full flex flex-col justify-start overflow-y-auto scrollbar-hide '>
                <div className='grid grid-cols-2 gap-1'>
                    {
                        codeData?.map((item,index)=>{
                            return (
                                <div key={index} className={`w-full h-auto flex flex-row justify-between items-center text-center gap-1 text-sm border px-2 py-4 border-[#888888]/60 rounded-md ${selected==index? 'bg-current ' : 'bg-secondary '} min-h-12`}>
                                    <Button size="default" variant="secondary" onClick={()=>{onPress(item,index)}}>{item.codeName}</Button>
                                    {showEdit && (
                                <Button size="sm" variant="secondary" onClick={()=>onEditCode?.(item.id)}><PenSquare />编辑</Button>
                            )}
                                </div>
                            )
                        })
                    }
                    
                </div>
            </div>
        </div>
    )
}

export const HardwareControlPage = (props) => { 
    const { status,color } = props;

    const [deviceList,setDeviceList] = useState([]);

    const [currentDevice,setCurrentDevice] = useState(0);

    const [selected,setSelected] = useState(null);
    
    const changeIconColor = (val, color='#201f2c', size = '100%') => {
        val = val && val.replaceAll(/fill=".*?"/g, `fill="${color || '#FFFFFF'}"`);
        val = val && val.replaceAll(/width=".*?"/g, `width="${size || '100%'}"`);
        val = val && val.replaceAll(/width=".*?"/g, `height="${size || '100%'}"`);
        return val
    }

    const onDevicePress = (item,index) => {
        setSelected(index)
        console.log(item)
        setCurrentDevice(item.id)
    }

    useEffect(()=>{
        get_Global_Device().then(res=>{
            if(res.data.code == 200){
                // console.log(res.data.data)
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
    },[])

    return (
        <div className={`absolute top-0 left-0 w-full h-full overflow-x-scroll bg-black/50 backdrop-blur-md flex flex-row justify-center items-center scrollbar-hide py-10 px-10 pt-30 z-40 ${color[0]} ${ status ? 'block' : 'hidden' }`}>
            <div className='w-full h-full max-w-400 flex flex-row justify-center items-center gap-4 '>
                <div className='w-full h-full flex-1 p-2 gap-2 bg-white flex flex-col justify-start items-center rounded-medium overflow-y-auto px-2 scrollbar-line scroll-smooth' >
                {
                    deviceList.length > 0 && deviceList.map((item,index)=>{
                        return(
                            <div key={index} className={`h-auto w-full border-1 border-[#888888]/60 ${selected==index ? 'bg-current': 'bg-white'} rounded-md p-2 flex flex-row justify-start items-center gap-3 `} onClick={()=>onDevicePress(item,index)}>
                                {
                                    item.iconSvg !== '' ?
                                    <div className={`w-12 h-12 ${selected == index ? 'bg-white': 'bg-current/20 '} p-2 rounded-sm`} dangerouslySetInnerHTML={{ __html: changeIconColor(item.iconSvg,color[2])}}></div>
                                    :
                                    <div className="w-12 h-12 bg-white p-2 rounded-sm"><span className="inline-block align-middle text-white"></span></div>
                                }
                                <div className='w-auto h-full flex flex-col justify-center items-start gap-1'>
                                    <span className={`text-base whitespace-nowrap text-ellipsis overflow-hidden text-center w-auto ${selected == index ? 'text-white': 'text-black'} `}>{item.deviceName}</span>
                                    <span className='text-sm text-[#888888]'>{item.deviceIp}</span>
                                </div>
                            </div>
                        )
                    })
                }
                </div>

                <div className='w-auto h-full flex-2 flex flex-row justify-center items-center gap-2 py-3 bg-white rounded-medium'>
                    <HardwareControlPage2 currentDevice={currentDevice} />
                </div>
            </div>
        
        </div>
    )
}   

export const DeviceCode = ({codeList}) => {

    const [click,setClick] = useState(null)

    const onCodePress = (item,index) => {
        console.log(item)
        
        setClick(index)

        code_To_Client(item.id).then(res=>{ 
            // console.log(res.data)
            if (res.data.code == 200) {
                toast('提示信息', { description: res.data.msg })
            }else{
                toast('提示信息', { description: res.data.msg })
            }
        }).catch(err=>{ 
            console.log(err)
            toast('提示信息', { description: err })
        })
    }

    return(
        <div className='w-auto h-auto flex flex-row justify-start items-center flex-wrap gap-2'>
            {
                codeList.map((item,index)=> {
                    return <div key={index} className={`${ click==index ? 'bg-current': 'bg-white ' } w-20 h-20 border border-[#888888]/60 text-center flex justify-center items-center rounded-md text-sm`} onClick={()=>onCodePress(item,index)}><span>{item.codeName}</span></div>
                })
            }
        </div>
    )
}

export const NoteControl = (props) => { 

    const {status, editable,note,onChange } = props;
    const noteRef = useRef(null);
    const aiEditor = useRef(null);

    useEffect(() => { 
        aiEditor.current = new AiEditor({
            element: noteRef.current,
            placeholder: "点击输入内容...",
            content: note,
            editable: editable,
            
        })

        return () => {
            aiEditor.current.destroy()
        }
    }, [])


    //初始化 AiEditor
    // useEffect(() => {
    //     note !== null && aiEditor.current.setContent(note)
    // }, [status,note])

    useEffect(() => { 
        aiEditor.current? aiEditor.current.setEditable(editable) : aiEditor.current.setEditable(editable)
    }, [editable])

    return (
        <div className='w-full h-[calc(100%-5.5rem)]' ref={noteRef}/>
    )
}