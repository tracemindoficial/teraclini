import { useEffect, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  FileClock,
  FolderLock,
  Laptop,
  MapPin,
  MenuSquare,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";

import dashboardAsset from "@/assets/teraclini-dashboard-mobile-640.webp.asset.json";
import experienceAsset from "@/assets/teraclini-brand-experience-1280.webp.asset.json";
import experienceSmallAsset from "@/assets/teraclini-brand-experience-640.webp.asset.json";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackCommercialEvent } from "@/lib/commercial-analytics";
import type { PublicPlan } from "@/lib/public-commercial.functions";

const features = [
  {
    icon: CalendarDays,
    title: "Agenda unificada",
    text: "Visualize atendimentos presenciais e online, em todos os seus locais, sem alternar entre sistemas.",
    benefit: "Mais clareza para organizar a semana.",
  },
  {
    icon: UsersRound,
    title: "Pacientes",
    text: "Mantenha cadastro, responsáveis e histórico de cada paciente no seu próprio espaço profissional.",
    benefit: "Informações reunidas e fáceis de encontrar.",
  },
  {
    icon: MapPin,
    title: "Locais e salas",
    text: "Associe cada atendimento à clínica, ao consultório, à sala ou à modalidade online correta.",
    benefit: "Sua agenda acompanha onde você trabalha.",
  },
  {
    icon: FileClock,
    title: "Prontuário cronológico",
    text: "Registre anamneses, evoluções, documentos e acontecimentos em uma linha do tempo privada.",
    benefit: "Continuidade para a história clínica.",
  },
  {
    icon: ClipboardCheck,
    title: "Pacotes de atendimentos",
    text: "Acompanhe sessões contratadas e realizadas com histórico de alterações preservado.",
    benefit: "Controle sem misturar cuidado e cobrança.",
  },
  {
    icon: Search,
    title: "Busca global",
    text: "Encontre rapidamente pacientes e informações operacionais dentro da sua conta.",
    benefit: "Menos tempo procurando, mais tempo cuidando.",
  },
] as const;

const benefits = [
  ["Uma rotina mais leve", "Reduza a fragmentação entre agendas, cadastros e registros."],
  [
    "Continuidade profissional",
    "Seus pacientes e históricos seguem com você quando o local de atendimento muda.",
  ],
  ["Visão do dia", "Veja compromissos, pendências e próximos passos logo ao entrar."],
  ["Organização no celular", "Consulte e atualize sua rotina entre um atendimento e outro."],
  [
    "Decisões com contexto",
    "Acompanhe a história do paciente sem perder a sequência dos registros.",
  ],
  ["Espaço individual", "Sua prática fica separada e vinculada à sua própria conta profissional."],
] as const;

const audiences = ["Psicólogos", "Psicopedagogos", "Fonoaudiólogos", "Psicanalistas", "Terapeutas"];

const faqs = [
  [
    "O que é o TeraClini?",
    "É um sistema para profissionais independentes organizarem agenda, pacientes, locais de atendimento e registros clínicos em um único espaço.",
  ],
  [
    "Para quem é o TeraClini?",
    "Para psicólogos, psicopedagogos, fonoaudiólogos, psicanalistas e terapeutas que administram a própria prática, inclusive em diferentes locais.",
  ],
  [
    "Preciso instalar algum programa?",
    "Não. O acesso é feito online pelo navegador, no computador, tablet ou celular.",
  ],
  [
    "Como funciona a licença?",
    "As licenças disponíveis aparecem nesta página quando são ativadas pela administração. Você escolhe uma opção antes de criar a conta.",
  ],
  [
    "Como funciona o pagamento?",
    "As condições de pagamento serão apresentadas no fluxo de contratação quando uma licença estiver disponível. Não realizamos cobranças sem sua confirmação.",
  ],
  [
    "Posso cancelar minha assinatura?",
    "As regras de cancelamento acompanham a licença escolhida e serão exibidas antes da contratação.",
  ],
  [
    "Meus dados ficam protegidos?",
    "O acesso é autenticado e cada conta profissional possui seu próprio espaço. Informações clínicas não são exibidas na administração da plataforma.",
  ],
  [
    "Já sou usuário. Como acesso?",
    "Use o botão “Acessar minha conta” e entre com o mesmo e-mail ou acesso Google usado no cadastro.",
  ],
  [
    "Como solicito suporte?",
    "Depois de entrar, abra Suporte no menu do TeraClini para acompanhar sua solicitação dentro da conta.",
  ],
] as const;

export function MarketingLanding({ plans, plansUnavailable = false }: { plans: PublicPlan[]; plansUnavailable?: boolean }) {
  useEffect(() => {
    trackCommercialEvent("landing_view");
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <MarketingHeader />
      <main>
        <section
          id="inicio"
          className="relative isolate min-h-[720px] overflow-hidden border-b bg-primary sm:min-h-[760px]"
        >
          <img
            src={dashboardAsset.url}
            width={340}
            height={625}
            fetchPriority="high"
            decoding="async"
            alt="Painel móvel do TeraClini com resumo da rotina e agenda do dia"
            className="absolute inset-y-0 right-[-7rem] h-full w-auto max-w-none object-contain opacity-35 sm:right-0 sm:opacity-55 lg:right-[5%] lg:opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/25" />
          <div className="relative mx-auto flex min-h-[720px] max-w-7xl items-center px-5 py-20 sm:min-h-[760px] sm:px-8">
            <div className="max-w-3xl text-primary-foreground">
              <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/10">
                Feito para profissionais independentes
              </Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.12] sm:text-6xl lg:text-7xl">
                Sua prática clínica, organizada para acompanhar você.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-primary-foreground/80 sm:text-xl sm:leading-8">
                Uma agenda única para todos os locais onde você atende, com pacientes e registros
                reunidos no seu próprio espaço profissional.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  variant="highlight"
                  onClick={() => trackCommercialEvent("signup_click")}
                >
                  <a href="#planos">
                    Quero conhecer o TeraClini <ArrowRight />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                  onClick={() => trackCommercialEvent("login_click")}
                >
                  <Link to="/auth">Acessar minha conta</Link>
                </Button>
              </div>
              <p className="mt-5 text-sm text-primary-foreground/65">
                A clínica muda. Sua prática continua com você.
              </p>
            </div>
          </div>
        </section>

        <Section
          eyebrow="Sua rotina hoje"
          title="Quando as informações ficam espalhadas, a rotina pesa mais."
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Agenda em um lugar, registros em outro, endereços na conversa e pendências na memória.
              Para quem atende sozinho em diferentes clínicas ou online, essa fragmentação toma
              tempo e interrompe a visão do todo.
            </p>
            <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
              {[
                "Várias agendas para consultar",
                "Dados difíceis de acompanhar",
                "Tarefas manuais repetidas",
                "Histórico separado por local",
              ].map((item) => (
                <div key={item} className="flex min-h-24 items-center gap-3 bg-card p-5">
                  <Clock3 className="size-5 shrink-0 text-accent" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <section id="recursos" className="border-y bg-card py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHeading
              eyebrow="Uma plataforma, uma rotina"
              title="Tudo o que sustenta sua prática, conectado."
              description="O TeraClini centraliza atividades que já fazem parte do seu dia sem transformar sua prática em uma clínica."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text, benefit }) => (
                <article
                  key={title}
                  className="group rounded-lg border bg-background p-6 transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                  <p className="mt-5 flex gap-2 border-t pt-4 text-sm font-medium">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {benefit}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHeading
              eyebrow="Como funciona"
              title="Da criação da conta à sua rotina organizada."
              description="Um caminho direto para configurar seu espaço e começar a usar o TeraClini."
            />
            <ol className="mt-12 grid gap-8 md:grid-cols-5">
              {[
                "Crie sua conta",
                "Escolha sua licença",
                "Configure seu ambiente",
                "Comece a utilizar",
                "Acompanhe sua rotina",
              ].map((step, index) => (
                <li key={step} className="relative border-t pt-5">
                  <span className="text-sm font-semibold text-accent">0{index + 1}</span>
                  <h3 className="mt-2 font-semibold">{step}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {index === 0
                      ? "Cadastre seu acesso com segurança."
                      : index === 1
                        ? "Veja as opções comerciais disponíveis."
                        : index === 2
                          ? "Informe seu perfil, locais e preferências."
                          : index === 3
                            ? "Organize pacientes e atendimentos."
                            : "Use o Meu Dia como ponto de partida."}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="beneficios"
          className="border-y bg-primary py-20 text-primary-foreground sm:py-28"
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              dark
              eyebrow="Benefícios"
              title="Menos tempo administrando. Mais continuidade no cuidado."
              description="O sistema acompanha sua forma de trabalhar, mesmo quando seus locais e sua agenda mudam."
            />
            <div className="grid gap-px overflow-hidden rounded-lg bg-primary-foreground/20 sm:grid-cols-2">
              {benefits.map(([title, text]) => (
                <article key={title} className="bg-primary p-6">
                  <Sparkles className="size-5 text-secondary" />
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-primary-foreground/70">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <Section
          eyebrow="Experiência do sistema"
          title="Uma visão clara da sua prática, onde você estiver."
          description="Acompanhe o dia, veja seus próximos atendimentos e acesse as áreas essenciais com uma navegação consistente no computador e no celular."
        >
          <div className="overflow-hidden rounded-lg border bg-card shadow-lift">
            <img
              src={experienceAsset.url}
              srcSet={`${experienceSmallAsset.url} 640w, ${experienceAsset.url} 1254w`}
              sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1280px) calc(100vw - 64px), 1216px"
              width={1254}
              height={1254}
              loading="lazy"
              decoding="async"
              alt="Identidade visual e exemplos das telas do TeraClini no computador e no celular"
              className="h-auto w-full"
            />
          </div>
        </Section>

        <section className="border-y bg-card py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHeading
              eyebrow="Para quem é"
              title="Para profissionais que conduzem a própria prática."
              description="Especialmente para quem atende em um ou mais locais e quer manter uma única organização profissional."
            />
            <div className="mt-10 flex flex-wrap gap-3">
              {audiences.map((audience) => (
                <span
                  key={audience}
                  className="rounded-lg border bg-background px-5 py-4 font-medium"
                >
                  {audience}
                </span>
              ))}
            </div>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Difference
                icon={<MenuSquare />}
                title="Tudo conectado"
                text="Agenda, pacientes, locais e registros no mesmo ambiente."
              />
              <Difference
                icon={<Smartphone />}
                title="Acesso online"
                text="Uma experiência preparada para computador, tablet e celular."
              />
              <Difference
                icon={<ShieldCheck />}
                title="Espaço individual"
                text="Acesso autenticado e informações separadas por conta profissional."
              />
              <Difference
                icon={<Laptop />}
                title="Evolução contínua"
                text="Uma base preparada para acompanhar as necessidades da prática."
              />
            </div>
          </div>
        </section>

        <PricingSection plans={plans} unavailable={plansUnavailable} />

        <section className="border-y bg-card py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading
                eyebrow="Segurança e confiança"
                title="Informações profissionais no espaço certo."
                description="O TeraClini foi estruturado para separar cada conta e restringir o acesso às informações da prática."
              />
              <Button asChild variant="outline" className="mt-7">
                <Link to="/privacidade">Conhecer nossa política de privacidade</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Trust
                icon={<FolderLock />}
                title="Dados por conta"
                text="Cada profissional acessa seu próprio espaço."
              />
              <Trust
                icon={<ShieldCheck />}
                title="Controle de acesso"
                text="A entrada exige autenticação e autorização."
              />
              <Trust
                icon={<FileClock />}
                title="Histórico preservado"
                text="Registros importantes mantêm sua sequência."
              />
              <Trust
                icon={<UsersRound />}
                title="Administração separada"
                text="A gestão da plataforma não exibe conteúdo clínico."
              />
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <SectionHeading eyebrow="Perguntas frequentes" title="Antes de começar" />
            <Accordion type="single" collapsible className="mt-10 border-t">
              {faqs.map(([question, answer], index) => (
                <AccordionItem key={question} value={`faq-${index}`}>
                  <AccordionTrigger className="text-base">{question}</AccordionTrigger>
                  <AccordionContent className="leading-6 text-muted-foreground">
                    {answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="bg-secondary py-16 sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 sm:px-8 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-secondary-foreground/70">
                Seu consultório digital
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-secondary-foreground sm:text-4xl">
                Pronto para simplificar sua rotina profissional?
              </h2>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" onClick={() => trackCommercialEvent("signup_click")}>
                <a href="#planos">
                  Começar agora <ArrowRight />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                onClick={() => trackCommercialEvent("login_click")}
              >
                <Link to="/auth">Já tenho uma conta</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function PricingSection({
  plans,
  unavailable = false,
  standalone = false,
}: {
  plans: PublicPlan[];
  unavailable?: boolean;
  standalone?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    const section = document.getElementById("planos");
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          trackCommercialEvent("plans_view", { pagePath: standalone ? "/planos" : "/" });
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [standalone]);

  return (
    <section id="planos" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Planos e licenças"
          title="Escolha a licença ideal para você."
          description="Valores e condições abaixo são publicados diretamente pela administração do TeraClini."
        />
        {unavailable ? (
          <div className="mx-auto mt-12 max-w-2xl rounded-lg border bg-card p-8 text-center shadow-soft" role="status">
            <h3 className="text-xl font-semibold">Licenças temporariamente indisponíveis</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Não foi possível consultar os planos. Você pode tentar novamente ou acessar sua conta normalmente.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => { void router.invalidate(); }}>Tentar consultar novamente</Button>
              <Button asChild><Link to="/auth">Acessar minha conta</Link></Button>
            </div>
          </div>
        ) : plans.length > 0 ? (
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
            {plans.map((plan) => (
              <article
                key={plan.id}
                data-plan-code={plan.code}
                className="rounded-lg border bg-card p-7 shadow-soft"
              >
                <Badge variant="secondary">Licença ativa</Badge>
                <h3 className="mt-5 text-2xl font-semibold">{plan.name}</h3>
                <p className="mt-4 text-3xl font-semibold">
                  {formatPrice(plan)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {periodLabel(plan.billing_interval_months)}
                  </span>
                </p>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  O valor permanece o mesmo enquanto a assinatura estiver ativa, sem aumento
                  automático após determinado número de meses.
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Crie sua conta e solicite a contratação em Assinatura. A equipe TeraClini conclui
                  o processo com você; o cadastro não gera cobrança automática.
                </p>
                <Button
                  asChild
                  className="mt-7 w-full"
                  onClick={() =>
                    trackCommercialEvent("plan_select", {
                      planCode: plan.code,
                      pagePath: standalone ? "/planos" : "/",
                    })
                  }
                >
                  <Link to="/auth" search={{ mode: "signup", plan: plan.code }}>
                    Quero assinar agora <ArrowRight />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-2xl rounded-lg border bg-card p-8 text-center shadow-soft">
            <Clock3 className="mx-auto size-8 text-accent" />
            <h3 className="mt-4 text-xl font-semibold">Licenças em preparação</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nenhum plano está disponível para contratação neste momento. Os valores e as condições
              serão exibidos aqui quando forem ativados.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6"
              onClick={() =>
                trackCommercialEvent("login_click", { pagePath: standalone ? "/planos" : "/" })
              }
            >
              <Link to="/auth">Já tenho uma conta</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function formatPrice(plan: PublicPlan) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: plan.currency }).format(
    plan.price_cents / 100,
  );
}
function periodLabel(months: number) {
  return months === 1 ? "mês" : `${months} meses`;
}
function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
function SectionHeading({
  eyebrow,
  title,
  description,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  description?: string | undefined;
  dark?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p
        className={
          dark
            ? "text-sm font-semibold uppercase text-secondary"
            : "text-sm font-semibold uppercase text-accent"
        }
      >
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">{title}</h2>
      {description ? (
        <p
          className={
            dark
              ? "mt-5 text-base leading-7 text-primary-foreground/70 sm:text-lg"
              : "mt-5 text-base leading-7 text-muted-foreground sm:text-lg"
          }
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
function Difference({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="border-t pt-5">
      <span className="text-accent [&_svg]:size-5">{icon}</span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}
function Trust({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-lg border bg-background p-5">
      <span className="text-primary [&_svg]:size-5">{icon}</span>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}
