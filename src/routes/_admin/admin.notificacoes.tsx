import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminNotificationList } from "@/components/admin/AdminNotificationList";
import { AdminShell, AdminState } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminNotifications,
  useMarkAdminNotificationRead,
  useMarkAllAdminNotificationsRead,
} from "@/lib/data/admin-operations";

export const Route = createFileRoute("/_admin/admin/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Administração TeraClini" },
      { name: "description", content: "Alertas operacionais da administração TeraClini." },
      { property: "og:title", content: "Notificações — Administração TeraClini" },
      { property: "og:description", content: "Alertas operacionais da administração TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminNotificationsPage,
});

function AdminNotificationsPage() {
  const notifications = useAdminNotifications();
  const markRead = useMarkAdminNotificationRead();
  const markAll = useMarkAllAdminNotificationsRead();
  const [filter, setFilter] = useState<
    "all" | "unread" | "account" | "support" | "subscription" | "payment"
  >("all");
  const items = (notifications.data ?? []).filter(
    (item) => filter === "all" || (filter === "unread" ? !item.read : item.kind === filter),
  );
  async function read(key: string) {
    try {
      return await markRead.mutateAsync(key);
    } catch {
      toast.error("Não foi possível marcar a notificação como lida.");
    }
  }
  async function readAll() {
    try {
      await markAll.mutateAsync(
        (notifications.data ?? []).filter((item) => !item.read).map((item) => item.key),
      );
      toast.success("Notificações marcadas como lidas.");
    } catch {
      toast.error("Não foi possível atualizar as notificações.");
    }
  }
  return (
    <AdminShell
      title="Notificações"
      description="Alertas operacionais e seus destinos"
      action={
        <Button
          variant="outline"
          disabled={markAll.isPending || !(notifications.data ?? []).some((item) => !item.read)}
          onClick={() => void readAll()}
        >
          Marcar todas como lidas
        </Button>
      }
    >
      <div className="mb-5 max-w-xs">
        <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="unread">Não lidas</SelectItem>
            <SelectItem value="account">Contas</SelectItem>
            <SelectItem value="support">Suporte</SelectItem>
            <SelectItem value="subscription">Licenças</SelectItem>
            <SelectItem value="payment">Pagamentos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {notifications.isLoading ? (
        <AdminState kind="loading">Carregando notificações...</AdminState>
      ) : notifications.error ? (
        <AdminState kind="error">Não foi possível carregar as notificações.</AdminState>
      ) : !items.length ? (
        <AdminState>Nenhuma notificação corresponde ao filtro.</AdminState>
      ) : (
        <AdminNotificationList items={items} onRead={read} />
      )}
    </AdminShell>
  );
}
