import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { trackCommercialEvent } from "@/lib/commercial-analytics";

const links = [
  ["Início", "#inicio"],
  ["Como funciona", "#como-funciona"],
  ["Recursos", "#recursos"],
  ["Benefícios", "#beneficios"],
  ["Planos", "#planos"],
  ["FAQ", "#faq"],
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-5 px-5 sm:px-8">
        <BrandLogo className="w-36 sm:w-40" />
        <nav aria-label="Navegação principal" className="ml-auto hidden items-center gap-5 lg:flex">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 sm:flex lg:ml-4">
          <Button asChild variant="ghost" onClick={() => trackCommercialEvent("login_click")}>
            <Link to="/auth">Acessar minha conta</Link>
          </Button>
          <Button asChild onClick={() => trackCommercialEvent("signup_click")}>
            <a href="#planos">Começar agora</a>
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto lg:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open ? (
        <div className="border-t bg-background px-5 py-4 lg:hidden">
          <nav aria-label="Navegação móvel" className="mx-auto grid max-w-7xl gap-1">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
              >
                {label}
              </a>
            ))}
            <div className="mt-3 grid gap-2 border-t pt-4 sm:hidden">
              <Button asChild variant="outline" onClick={() => trackCommercialEvent("login_click")}>
                <Link to="/auth">Acessar minha conta</Link>
              </Button>
              <Button asChild onClick={() => trackCommercialEvent("signup_click")}>
                <a href="#planos">Começar agora</a>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
