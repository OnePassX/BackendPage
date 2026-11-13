import { useNavigate, useLocation } from "react-router-dom"
import { LogOutIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import ModeToggle from "@/components/mode-toggle"
import { TOKEN_KEY } from "@/api/apiClient"
import { FRONTEND_MENU } from "@/components/frontend-sidebar"

export function FrontendHeader() {
  const navigate = useNavigate()
  const location = useLocation()

  const currentLabel =
    FRONTEND_MENU.find((m) => location.pathname.startsWith(m.key))?.label || "首页"

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem("frontend_username")
    navigate("/", { replace: true })
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 data-vertical:self-auto"
          />
          <h1 className="text-base font-medium">{currentLabel}</h1>
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
