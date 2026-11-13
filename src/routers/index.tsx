import NotFound from "@/lib/not-found";
import BackendLogin from "@/app/login";
import BackendLayout from "@/app/layout";
import DashboardPage from "@/app/dashboard";
import MenuRoutePage from "@/app/route-fallback";

import UserPage from "@/app/system/user";
import RolePage from "@/app/system/role";
import MenuPage from "@/app/system/menu";

import ManagePage from "@/app/main";
import PavilionPage from "@/app/exhibition/pavilion";
import MachinePage from "@/app/exhibition/machine";
import ExhibitionPage from "@/app/exhibition/exhibition";
import ContentCodePage from "@/app/exhibition/code";
import PmePage from "@/app/exhibition/pme";
import ContentPage from "@/app/exhibition/content";

import DevicePage from "@/app/device/index";
import DeviceCodePage from "@/app/device/code";

import DictPage from "@/app/dict/index";
import IconPage from "@/app/icon/index";
import PreviewPage from "@/app/preview/index";
import SettingPage from "@/app/setting/index";

import SoftwareModelPage from "@/app/model/smodel";
import HardwareModelPage from "@/app/model/hmodel";

import ProcessPage from "@/app/model/process";


const routers = [
    { title: '后台登录', path: '/', element: <BackendLogin /> },
    { title: '后台登录', path: '/server/login', element: <BackendLogin /> },

    // ===== 后台管理 =====
    {
      title: '后台管理',
      path: '/server',
      element: <BackendLayout />,
      children: [
        { path: '', element: <DashboardPage /> },
        { path: 'dashboard', element: <DashboardPage /> },

        { path: 'user', element: <UserPage /> },
        { path: 'role', element: <RolePage /> },
        { path: 'menu', element: <MenuPage /> },

        { path: 'main', element: <ManagePage /> },

        { path: 'pme', element: <PmePage /> },
        { path: 'pavilion', element: <PavilionPage /> },
        { path: 'machine', element: <MachinePage /> },
        { path: 'exhibition', element: <ExhibitionPage /> },
        { path: 'content', element: <ContentPage /> },
        { path: 'contentcode', element: <ContentCodePage /> },
        
        { path: 'device', element: <DevicePage /> },
        { path: 'code', element: <DeviceCodePage /> },

        { path: 'dict', element: <DictPage /> },
        { path: 'icon', element: <IconPage /> },
        { path: 'preview', element: <PreviewPage /> },
        { path: 'setting', element: <SettingPage /> },

        { path: 'smodel', element: <SoftwareModelPage /> },
        { path: 'hmodel', element: <HardwareModelPage /> },

        { path: 'process', element: <ProcessPage /> },
        

        // Wildcard: catches any /server/:path not matched above
        // Shows the menu item name from API, or "页面组件待实现"
        { path: '*', element: <MenuRoutePage /> },
      ],
    },

    // ===== 前端大屏 =====
    // {
    //   title: '前端大屏',
    //   path: '/login',
    //   element: <FrontendLogin />,
    // },{
    //   title: '前端大屏',
    //   path: '/index',
    //   element: <FrontendIndex />,
    // },

    { title: 'Error', path: '*', element: <NotFound /> },
];

export default routers;
