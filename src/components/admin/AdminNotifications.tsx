import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminNotificationList } from "@/components/admin/AdminNotificationList";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAdminNotifications, useMarkAdminNotificationRead } from "@/lib/data/admin-operations";
import { useAdminSelf } from "@/lib/data/admin";
import { useCommunicationUnread } from "@/lib/data/communication";

export function AdminNotifications() {
  const admin = useAdminSelf();
  const { data: replies = 0 } = useCommunicationUnread(true, admin.data?.role === "super_admin");
  const query = useAdminNotifications();
  const isLoading = query.isLoading;
  // A refused request must not crash the whole admin page.
  const data = Array.isArray(query.data) ? query.data : [];
  const markRead = useMarkAdminNotificationRead();
  const unread = data.filter((item) => !item.read).length + replies;
  async function read(key: string) {
    try {
      return await markRead.mutateAsync(key);
    } catch {
      toast.error("Não foi possível marcar a notificação como lida.");
      return undefined;
    }
  }
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={`Notificações${unread ? `, ${unread} novas` : ""}`}
        >
          <Bell className="size-4" />
          {unread ? (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(94vw,28rem)] overflow-y-auto">
        <SheetTitle>Notificações operacionais</SheetTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Alertas derivados dos dados atuais da operação.
        </p>
        <div className="mt-5 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando alertas...</p>
          ) : null}
          {!isLoading && !data.length && !replies ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p>
          ) : null}
          {replies > 0 && (
            <SheetClose asChild>
              <Button asChild variant="secondary" className="h-auto min-h-9 w-full justify-start whitespace-normal text-left">
                <Link to="/admin/comunicacao">
                  Central de Comunicação · {replies === 1 ? "1 resposta não lida" : `${replies} respostas não lidas`}
                </Link>
              </Button>
            </SheetClose>
          )}
          <AdminNotificationList items={data} onRead={read} compact />
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/admin/notificacoes">Ver todas as notificações</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
