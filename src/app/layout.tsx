
import { Outlet, Navigate } from 'react-router-dom';
import { useState } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { SiteHeader } from "@/components/site-header"
import { AppSidebar } from '@/components/app-sidebar';
import { useSession } from '@/hooks/use-session';

const BackendLayout = () => {

    const [open, setOpen] = useState(false);
    // 会话的唯一判断入口；失效时 session module 会清空并跳转，这里只做兜底
    const user = useSession();

    if (!user) return <Navigate to="/" replace />;
	return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width': 'calc(var(--spacing) * 60)',
                    '--sidebar-height': 'calc(var(--spacing) * 200)',
                    '--header-height': 'calc(var(--spacing) * 12)',
                } as React.CSSProperties
            }
            open={open}
            onOpenChange={setOpen}
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col overflow-y-auto">
                    <div className="h-full flex flex-col gap-4 py-4 md:gap-6 md:p-4">
                        <Outlet />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
	)
}

export default BackendLayout
