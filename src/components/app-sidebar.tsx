"use client"

import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import * as LucideIcons from "lucide-react"
import { LoaderIcon, LogOutIcon, ChevronRightIcon } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from "@/components/ui/collapsible"
import { getMenuSidebar } from "@/api/menu";
import { getSession, signOut } from "@/api/session";
import { useSession } from "@/hooks/use-session";

// ── Types ──

export interface SidebarItem {
    key: string
    label: string
    icon?: React.ReactNode
    url?: string
    children?: SidebarItem[]
}

interface ApiMenu {
    id: number
    name: string
    icon: string
    url: string
    pid: number | null
    type: number
    permission: string
    status: number
    target: number
    note: string
    sort: number
    children?: ApiMenu[]
}

// ── Icon resolver ──

const iconModule = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
>

function resolveIcon(name: string): React.ReactNode {
    if (!name) return null
    const candidates = [name, name.charAt(0).toUpperCase() + name.slice(1)]
    for (const c of candidates) {
        const Icon = iconModule[c]
        if (Icon) return <Icon className="size-4" />
    }
    return null
}

// ── Normalise URL → route key ──

function normaliseUrl(url: string): string | null {
    if (!url || url === "#") return null
    if (url.startsWith("/")) return url
    return `/server/${url}`
}
// ── Build sidebar items from API tree ──

function buildItems(items: ApiMenu[]): SidebarItem[] {
    const result: SidebarItem[] = []
    for (const item of items) {

        const childItems = item.children ? buildItems(item.children) : []
        const routeKey = normaliseUrl(item.url)
        result.push({
            key: routeKey || `s-${item.id}`,
            label: item.name,
            icon: resolveIcon(item.icon),
            url: item.url,
            children: childItems.length > 0 ? childItems : undefined,
        })
    }
    return result
}



// ── Recursive menu renderer ──

function MenuBranch({
    items,
    depth,
    locationPath,
    onNavigate,
}: {
    items: SidebarItem[]
    depth: number
    locationPath: string
    onNavigate: (key: string) => void
}) {
    
    return (
        <>
            {items.map((item, index) => {
                // console.log(item)
                const hasChildren = item.children && item.children.length > 0
                const canNav =
                    item.url && item.url !== "#" && item.key && !item.key.startsWith("s-")

                if (hasChildren) {
                    if (depth === 0) {
                        
                        return (
                            <SidebarGroup key={item.key} className="p-0">
                                <SidebarGroupLabel className="flex items-center gap-2 py-1 text-sm font-medium text-foreground ">
                                    {item.icon}
                                    <span className="flex-1">{item.label}</span>
                                </SidebarGroupLabel>
                                <SidebarMenu>
                                    <MenuBranch
                                        items={item.children!}
                                        depth={depth + 1}
                                        locationPath={locationPath}
                                        onNavigate={onNavigate}
                                    />
                                </SidebarMenu>
                            </SidebarGroup>
                        )
                        
                    }
                    // Deeper levels: collapsible with tree lines
                    return (
                        <Collapsible key={item.key} defaultOpen>
                            <SidebarGroup className="p-1!">
                                <CollapsibleTrigger
                                    render={
                                        <SidebarMenuButton className="relative flex items-center gap-2 px-2 py-1 pl-6 font-medium text-muted-foreground">
                                            {/* <TreeLine isLast={false} /> */}
                                            {item.icon}
                                            <span className="flex-1">{item.label}</span>
                                            <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/60 transition-transform aria-expanded:rotate-90" />
                                        </SidebarMenuButton>
                                    }
                                />
                                <CollapsibleContent>
                                    <SidebarMenu>
                                        <MenuBranch
                                            items={item.children!}
                                            depth={depth + 1}
                                            locationPath={locationPath}
                                            onNavigate={onNavigate}
                                        />
                                    </SidebarMenu>
                                </CollapsibleContent>
                            </SidebarGroup>
                        </Collapsible>
                    )
                }

                // Leaf item
                if (depth === 0) {
                    return (
                        <SidebarMenuItem key={item.key}>
                            <SidebarMenuButton
                                tooltip={item.label}
                                isActive={canNav && locationPath.startsWith(item.key)}
                                onClick={() => canNav && onNavigate(item.key)}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                }

                if (depth === 1) {
                    return (
                        <SidebarMenuItem key={item.key}>
                            <SidebarMenuButton
                                tooltip={item.label}
                                isActive={canNav && locationPath.startsWith(item.key)}
                                onClick={() => canNav && onNavigate(item.key)}
                                className="pl-7"
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                }

                // depth > 0 leaf — with tree line
                return (
                    <SidebarMenuItem key={item.key} className="relative">
                        {/* <TreeLine isLast={isLast} /> */}
                        <SidebarMenuButton
                            tooltip={item.label}
                            isActive={canNav && locationPath == item.key}
                            onClick={() => canNav && onNavigate(item.key)}
                            className="pl-10"
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )
            })}
        </>
    )
}

// ── Component ──

export function AppSidebar({
    ...props
}: React.ComponentProps<typeof Sidebar>) {
    const navigate = useNavigate()
    const location = useLocation()
    // 身份来自 session module，不再各自读 localStorage
    const session = useSession()
    const username = session?.displayName || session?.username || "未登录"
    const rolename = session?.roleName || "未分配角色"

    const [items, setItems] = React.useState<SidebarItem[]>([])
    const [loading, setLoading] = React.useState(true)

    const fetchMenus = React.useCallback(async () => {
        // 每次请求都从 session 现读角色，避免 useCallback([]) 捕获首帧角色导致换角色后菜单不刷新
        const current = getSession()
        if (!current) {
            setItems([])
            setLoading(false)
            return
        }
        // 后端要求 role id；无角色的账号没有菜单可显示
        if (current.roleId == null) {
            setItems([])
            setLoading(false)
            return
        }
        try {
            const res = await getMenuSidebar({ id: current.roleId })
            const raw = res.data
            const list: ApiMenu[] = Array.isArray(raw) ? raw : []
            setItems(buildItems(list))
        } catch {
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchMenus()
    }, [fetchMenus, session?.roleId])

    React.useEffect(() => {
        const id = setInterval(fetchMenus, 30000)
        return () => clearInterval(id)
    }, [fetchMenus])

    const handleLogout = () => {
        signOut()
    }

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            className="data-[slot=sidebar-menu-button]:p-1.5!"
                            size="lg"
                        >
                            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <LucideIcons.LayoutDashboardIcon className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">智能中控系统</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    CenterControl V4.0
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">
                            加载菜单...
                        </span>
                    </div>
                ) : (
                    <SidebarMenu>
                        <MenuBranch
                            items={items}
                            depth={0}
                            locationPath={location.pathname}
                            onNavigate={(key) => navigate(key)}
                        />
                    </SidebarMenu>
                )}
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <SidebarMenuButton
                                        size="lg"
                                        className="aria-expanded:bg-muted"
                                    />
                                }
                            >
                                <Avatar className="size-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg">
                                        {username.slice(0, 1)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{username}</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {rolename}
                                    </span>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                
                                align="start"
                                sideOffset={4}
                            >
                                <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={handleLogout}>
                                        <LogOutIcon className="mr-2 size-4" />
                                        退出登录
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
