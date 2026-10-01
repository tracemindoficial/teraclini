import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, FolderLock, MapPin, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Projeto Prática — sua prática clínica, onde você estiver" },
      {
        name: "description",
        content:
          "Agenda única, pacientes, prontuário, anamneses e evoluções que pertencem a você — não à clínica.",
      },
      { property: "og:title", content: "Projeto Prática" },
      {
        property: "og:description",
        content: "A clínica muda. Sua prática continua com você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            P
          </span>
          <span className="font-display text-base font-semibold">Projeto Prática</span>
        </span>
        <Button asChild variant="ghost">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="py-12 sm:py-20">
          <p className="text-sm font-medium text-primary">Para a prática clínica independente</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">
            A clínica muda. Sua prática continua com você.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Uma agenda única para todos os lugares onde você atende, com pacientes, prontuário,
            anamneses e evoluções que pertencem à sua conta — em qualquer clínica, consultório ou
            atendimento online.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Criar minha conta</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Feature
            icon={<CalendarDays className="size-5" />}
            title="Uma agenda só"
            text="Todos os locais em uma visão. Segunda na clínica, quarta no consultório, quinta online."
          />
          <Feature
            icon={<MapPin className="size-5" />}
            title="O local é do atendimento"
            text="Cadastre quantos locais quiser. Trocar de clínica não move nem apaga nada."
          />
          <Feature
            icon={<FolderLock className="size-5" />}
            title="Histórico que fica com você"
            text="Prontuário cronológico, anamneses, evoluções e documentos guardados em área privada."
          />
          <Feature
            icon={<Smartphone className="size-5" />}
            title="Feito para o celular"
            text="Consultar, agendar e registrar a evolução entre um atendimento e outro."
          />
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="surface p-6">
      <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
