import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { trackCommercialEvent } from "@/lib/commercial-analytics";

export function MarketingFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_2fr]">
        <div>
          <BrandLogo className="w-44" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Sua prática clínica organizada em um só lugar, independentemente de onde você atende.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <FooterGroup title="Conheça">
            <a href="#inicio">Início</a><a href="#recursos">Recursos</a><a href="#planos">Planos</a><a href="#faq">FAQ</a>
          </FooterGroup>
          <FooterGroup title="TeraClini">
            <Link to="/auth" onClick={() => trackCommercialEvent("login_click")}>Acessar minha conta</Link>
            <Link to="/auth" search={{ mode: "signup" }} onClick={() => trackCommercialEvent("signup_click")}>Criar conta</Link>
            <Link to="/auth">Suporte</Link>
          </FooterGroup>
          <FooterGroup title="Legal">
            <Link to="/privacidade">Política de Privacidade</Link>
            <Link to="/termos">Termos de Uso</Link>
          </FooterGroup>
        </div>
      </div>
      <div className="border-t px-5 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TeraClini. Todos os direitos reservados.
      </div>
    </footer>
  );
}

function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="flex flex-col items-start gap-3 [&_a]:text-muted-foreground [&_a]:transition-colors [&_a:hover]:text-foreground"><p className="font-semibold text-foreground">{title}</p>{children}</div>;
}