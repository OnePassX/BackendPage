import { useNavigate } from "react-router-dom"
import { LogOutIcon, LayoutDashboard } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import ModeToggle from "@/components/mode-toggle";
import { TOKEN_KEY } from "@/api/apiClient";

import { TipButton } from "@/components/tip-button";

export function SiteHeader() {

    const navigate = useNavigate()

    const { toggleSidebar } = useSidebar()

    const handleLogout = () => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem("backend_username")
        localStorage.removeItem("backend_roleid")
        localStorage.removeItem("backend_rolename")
        navigate("/server/login", { replace: true })
    }

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
                <div className="flex items-center gap-1">
                    <SidebarTrigger className="-ml-1" />
                    {/* <button onClick={toggleSidebar}>切换状态</button> */}
                    <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
                    <TipButton size="icon-sm" view={<LayoutDashboard />} label="返回仪表盘" onClick={() => navigate("/server/dashboard", { replace: true })} />
                    <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
                    <h1 className="text-base font-medium">后台管理</h1>
                </div>
                <div className="flex items-center gap-1">
                    <ModeToggle />
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button size="sm" variant="ghost" onClick={handleLogout}>
                                    <LogOutIcon className="size-4" />
                                </Button>
                            }
                        />
                        <TooltipContent>
                            <p>退出登录</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </header>
    )
}
