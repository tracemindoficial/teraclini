import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardClock,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/assinaturas", label: "Assinaturas", icon: WalletCards },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/admin/auditoria", label: "Auditoria", icon: ClipboardClock },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { to: "/admin/perfil", label: "Meu perfil", icon: UserRound },
] as const;

function isActive(pathname: string, to: string) {
  return to === "/admin" ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

export function AdminShell({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navigation = (close?: () => void) => (
    <nav className="space-y-1" aria-label="Administração master">
      {links.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={close}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
            isActive(pathname, item.to)
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          )}
        >
          <item.icon className="size-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-20 items-center border-b border-sidebar-border px-5">
          <BrandLogo to="/admin" className="w-40" />
        </div>
        <div className="border-b border-sidebar-border px-5 py-4">
          <p className="text-xs font-semibold uppercase text-sidebar-foreground/55">
            Central administrativa
          </p>
          <p className="mt-1 text-sm font-medium text-sidebar-foreground">Operação TeraClini</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{navigation()}</div>
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xl">
          <div className="flex min-h-18 items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase text-primary">Painel administrativo</p>
              <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
              {description ? (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{description}</p>
              ) : null}
            </div>
            {action}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[min(88vw,22rem)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Menu administrativo</SheetTitle>
          <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-5">
            <BrandLogo to="/admin" className="w-40" />
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </Button>
          </div>
          <div className="border-b border-sidebar-border px-5 py-4">
            <p className="text-xs font-semibold uppercase text-sidebar-foreground/55">
              Central administrativa
            </p>
          </div>
          <div className="p-4">{navigation(() => setOpen(false))}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function AdminState({
  kind = "empty",
  children,
}: {
  kind?: "empty" | "error" | "loading";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "surface p-8 text-center text-sm",
        kind === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}

export function AdminMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="surface min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon ? <span className="text-primary">{icon}</span> : null}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </article>
  );
}
