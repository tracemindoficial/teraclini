import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Ban, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/conta-indisponivel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Conta indisponível — TeraClini" },
      { name: "description", content: "Situação de acesso à conta TeraClini." },
      { property: "og:title", content: "Conta indisponível — TeraClini" },
      { property: "og:description", content: "Situação de acesso à conta TeraClini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AccountUnavailablePage,
});

function AccountUnavailablePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-lg text-center">
        <BrandLogo className="mx-auto w-56" />
        <div className="surface mt-8 p-7 sm:p-9">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <Ban className="size-6" />
          </span>
          <h1 className="mt-5 text-xl font-semibold">Conta indisponível</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            O acesso a este espaço profissional está suspenso ou encerrado. Entre em contato com o
            suporte para verificar a situação da conta.
          </p>
          <Button className="mt-6 gap-2" variant="outline" onClick={signOut}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </section>
    </main>
  );
}
