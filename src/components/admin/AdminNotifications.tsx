import { Bell, Check, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAdminNotifications, useMarkAdminNotificationRead } from "@/lib/data/admin-operations";

export function AdminNotifications() {
  const { data = [], isLoading } = useAdminNotifications();
  const markRead = useMarkAdminNotificationRead();
  const unread = data.filter((item) => !item.read).length;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label={`Notificações${unread ? `, ${unread} novas` : ""}`}>
          <Bell className="size-4" />
          {unread ? <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unread > 99 ? "99+" : unread}</span> : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(94vw,28rem)] overflow-y-auto">
        <SheetTitle>Notificações operacionais</SheetTitle>
        <p className="mt-1 text-sm text-muted-foreground">Alertas derivados dos dados atuais da operação.</p>
        <div className="mt-5 space-y-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando alertas...</p> : null}
          {!isLoading && !data.length ? <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p> : null}
          {data.map((item) => (
            <article key={item.key} className={`rounded-lg border p-3 ${item.read ? "bg-muted/30" : "bg-card"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-sm font-semibold">{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.detail}</p></div>
                {!item.read ? <Button size="icon" variant="ghost" aria-label="Marcar como lida" onClick={() => markRead.mutate(item.key)}><Check className="size-4" /></Button> : null}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <time className="text-xs text-muted-foreground">{new Date(item.date).toLocaleString("pt-BR")}</time>
                <Button asChild size="sm" variant="ghost"><Link to={item.to}><ExternalLink className="mr-1 size-3" />Abrir</Link></Button>
              </div>
            </article>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
