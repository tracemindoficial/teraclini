import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  MapPin,
  Menu,
  PackageCheck,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/meu-dia", label: "Meu Dia", mobileLabel: "Início", icon: Home },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/pacotes", label: "Pacotes", icon: PackageCheck },
  { to: "/pacientes/pre-cadastros", label: "Pré-cadastros", icon: ClipboardList },
  { to: "/locais", label: "Locais", icon: MapPin },
  { to: "/documentos", label: "Documentos", icon: FileText },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const PRIMARY_MOBILE_NAV = NAV.slice(0, 3);
const SIDEBAR_STORAGE_KEY = "teraclini-sidebar-expanded";

function isActivePath(pathname: string, destination: string) {
  if (destination === "/pacientes") {
    return pathname === destination || (pathname.startsWith("/pacientes/") && !pathname.startsWith("/pacientes/pre-cadastros"));
  }
  return pathname === destination || pathname.startsWith(`${destination}/`);
}

export function AppShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      setSidebarExpanded(saved === "true");
      return;
    }
    setSidebarExpanded(window.innerWidth >= 1280);
  }, []);

  function toggleSidebar() {
    setSidebarExpanded((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navList = (collapsed = false, onNavigate?: () => void) => (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1.5">
      {NAV.map((item) => {
        const active = isActivePath(pathname, item.to);
        const link = (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group/nav flex min-h-11 items-center rounded-lg text-sm font-medium transition-[background-color,color,padding] duration-200",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/72 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );

        if (!collapsed) return link;
        return (
          <Tooltip key={item.to}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );

  const initials = profile?.full_name
    ?.split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "P";

  return (
    <TooltipProvider delayDuration={180}>
      <div className="min-h-screen bg-background">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex",
            sidebarExpanded ? "w-64" : "w-20",
          )}
        >
          <div className={cn("flex h-20 items-center border-b border-sidebar-border/70", sidebarExpanded ? "px-5" : "justify-center px-2")}>
            <BrandLogo compact={!sidebarExpanded} to="/meu-dia" className={sidebarExpanded ? "w-40" : ""} />
          </div>
          <div className={cn("flex-1 overflow-y-auto py-5", sidebarExpanded ? "px-3" : "px-2")}>
            {navList(!sidebarExpanded)}
          </div>
          <div className={cn("border-t border-sidebar-border/70 py-4", sidebarExpanded ? "px-3" : "px-2")}>
            <div className={cn("mb-2 flex items-center", sidebarExpanded ? "gap-3 px-2" : "justify-center")}>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                {initials}
              </span>
              {sidebarExpanded ? (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{profile?.full_name || "Profissional"}</span>
                  <span className="block truncate text-xs text-sidebar-foreground/60">{profile?.profession ?? ""}</span>
                </span>
              ) : null}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "min-h-10 text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    sidebarExpanded ? "w-full justify-start gap-3" : "w-full px-0",
                  )}
                  onClick={handleSignOut}
                  aria-label="Sair"
                >
                  <LogOut className="size-4.5 shrink-0" />
                  {sidebarExpanded ? "Sair" : null}
                </Button>
              </TooltipTrigger>
              {!sidebarExpanded ? <TooltipContent side="right">Sair</TooltipContent> : null}
            </Tooltip>
          </div>
        </aside>

        <div className={cn("transition-[padding] duration-200 ease-out", sidebarExpanded ? "md:pl-64" : "md:pl-20")}>
          <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl">
            <div className="grid min-h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:px-6 lg:px-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="hidden shrink-0 md:inline-flex"
                aria-label={sidebarExpanded ? "Recolher menu" : "Expandir menu"}
                title={sidebarExpanded ? "Recolher menu" : "Expandir menu"}
              >
                {sidebarExpanded ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
                {description ? <p className="truncate text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Buscar" onClick={() => setSearchOpen(true)}>
                  <Search className="size-4.5" />
                </Button>
                {action}
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-5 sm:px-6 md:pb-12 lg:px-8 lg:pt-7">{children}</main>
        </div>

        <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/96 px-2 pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-nav)] backdrop-blur-xl md:hidden">
          {PRIMARY_MOBILE_NAV.map((item) => {
            const active = isActivePath(pathname, item.to);
            return (
              <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                <item.icon className="size-5" strokeWidth={active ? 2.3 : 1.8} />
                {"mobileLabel" in item ? item.mobileLabel : item.label}
              </Link>
            );
          })}
          <Button type="button" variant="ghost" onClick={() => setMenuOpen(true)} className="h-auto min-h-16 flex-col items-center justify-center gap-1 rounded-none text-[11px] font-medium text-muted-foreground">
            <Menu className="size-5" />
            Mais
          </Button>
        </nav>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="right" className="w-[min(88vw,22rem)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden">
            <SheetTitle className="sr-only">Mais opções</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="flex h-20 items-center justify-between border-b border-sidebar-border/70 px-5">
                <BrandLogo to="/meu-dia" className="w-40" />
                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
                  <X className="size-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-5">{navList(false, () => setMenuOpen(false))}</div>
              <div className="border-t border-sidebar-border/70 p-4">
                <div className="mb-3 flex items-center gap-3 px-2">
                  <span className="grid size-10 place-items-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">{initials}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{profile?.full_name || "Profissional"}</span><span className="block truncate text-xs text-sidebar-foreground/60">{profile?.profession ?? ""}</span></span>
                </div>
                <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleSignOut}><LogOut className="size-4.5" />Sair</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  );
}