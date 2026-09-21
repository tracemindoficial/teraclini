import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  FileText,
  Home,
  MapPin,
  Menu,
  Search,
  Settings,
  Users,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

const NAV = [
  { to: "/meu-dia", label: "Meu Dia", icon: Home },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/locais", label: "Locais", icon: MapPin },
  { to: "/documentos", label: "Documentos", icon: FileText },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const MOBILE_NAV = NAV.slice(0, 3);

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navList = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar px-4 py-6 lg:flex">
        <Brand />
        <div className="mt-8 flex-1">{navList()}</div>
        <div className="border-t pt-4">
          <p className="truncate px-3 text-sm font-medium">{profile?.full_name || "Profissional"}</p>
          <p className="truncate px-3 text-xs text-muted-foreground">{profile?.profession ?? ""}</p>
          <Button variant="ghost" className="mt-2 w-full justify-start gap-3" onClick={handleSignOut}>
            <LogOut className="size-4.5" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/85 px-4 py-3 backdrop-blur lg:px-8">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Brand />
              <div className="mt-8">{navList(() => setMenuOpen(false))}</div>
              <Button variant="ghost" className="mt-6 w-full justify-start gap-3" onClick={handleSignOut}>
                <LogOut className="size-4.5" />
                Sair
              </Button>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
            {description ? (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{description}</p>
            ) : null}
          </div>

          <Button
            variant="outline"
            size="icon"
            aria-label="Buscar"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4.5" />
          </Button>
          {action}
        </header>

        <main className="px-4 pb-28 pt-5 lg:px-8 lg:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 backdrop-blur lg:hidden">
        {MOBILE_NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setSearchOpen(true)}
          className="h-auto flex-1 flex-col items-center gap-1 rounded-none py-2.5 text-[11px] font-medium text-muted-foreground"
        >
          <Search className="size-5" />
          Busca
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMenuOpen(true)}
          className="h-auto flex-1 flex-col items-center gap-1 rounded-none py-2.5 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="size-5" />
          Mais
        </Button>
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

function Brand() {
  return (
    <Link to="/meu-dia" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
        P
      </span>
      <span className="font-display text-base font-semibold">Projeto Prática</span>
    </Link>
  );
}
