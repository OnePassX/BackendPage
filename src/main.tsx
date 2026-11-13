import { createRoot } from 'react-dom/client';
import { HashRouter,Routes,Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner"
import routes from '@/routers/index.tsx'
import './index.css'

function renderRoute(item: any,index: number) {
  if (item.children?.length) {
    return (
        <Route key={index} path={item.path} element={item.element}>
            {item.children.map((c, i) => (
                <Route key={i} path={c.path} element={c.element} />
            ))}
        </Route>
    );
  }
  return <Route key={index} path={item.path} element={item.element} />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Routes>
          {routes.map(renderRoute)}
        </Routes>
        <Toaster position="top-center" richColors toastOptions={{duration: 1000,}}/>
      </TooltipProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>,
)
