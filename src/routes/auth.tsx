import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { describeAuthError, logAuthEvent, withTimeout } from "@/lib/auth-errors";
import { getAuthenticatedDestination } from "@/lib/auth-session";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — TeraClini" },
      { name: "description", content: "Acesse seu espaço profissional no TeraClini." },
      { property: "og:title", content: "Entrar — TeraClini" },
      { property: "og:description", content: "Acesse seu espaço profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "recovery">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitting = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function continueAuthenticatedSession() {
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;
      const destination = await getAuthenticatedDestination(data.session.user.id);
      if (!active) return;
      navigate({
        to: destination,
        replace: true,
      });
    }
    void continueAuthenticatedSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  function validate(): string | null {
    if (mode === "signup" && fullName.trim().length < 2) return "Informe seu nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return "Informe um e-mail válido.";
    if (mode === "recovery") return null;
    if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    if (mode === "signup" && !/[A-Za-z]/.test(password))
      return "A senha deve conter letras e números.";
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return; // impede envios duplicados
    const invalid = validate();
    setFormError(invalid);
    if (invalid) return;

    submitting.current = true;
    setLoading(true);
    const startedAt = Date.now();
    const step =
      mode === "signup" ? "signup" : mode === "recovery" ? "password_recovery" : "signin";
    logAuthEvent(step, "start");
    try {
      if (mode === "recovery") {
        const { error } = await withTimeout(
          supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/reset-password`,
          }),
        );
        if (error) throw error;
        logAuthEvent(step, "success", { durationMs: Date.now() - startedAt });
        setFormError(
          "Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha.",
        );
        return;
      }
      if (mode === "signup") {
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: { full_name: fullName.trim() },
            },
          }),
        );
        if (error) throw error;
        // Supabase devolve usuário sem identidades quando o e-mail já existe.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          throw { code: "user_already_exists" };
        }
        if (!data.session) {
          // Sem sessão imediata: confirmação pendente, estado explícito para o usuário.
          setFormError(
            "Conta criada. Confirme seu e-mail para entrar — verifique também a caixa de spam.",
          );
          logAuthEvent(step, "success", { code: "pending_confirmation" });
          return;
        }
        logAuthEvent(step, "success", { durationMs: Date.now() - startedAt });
        toast.success("Sua conta foi criada com sucesso.");
        navigate({ to: "/onboarding", replace: true });
      } else {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email: email.trim(), password }),
        );
        if (error) throw error;
        logAuthEvent(step, "success", { durationMs: Date.now() - startedAt });
        navigate({ to: "/meu-dia", replace: true });
      }
    } catch (error) {
      const failure = describeAuthError(error);
      logAuthEvent(step, "failure", {
        code: failure.code,
        durationMs: Date.now() - startedAt,
      });
      setFormError(failure.message);
      toast.error(failure.message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) {
        logAuthEvent("oauth_google", "failure", { code: "oauth_error" });
        setFormError("Não foi possível entrar com o Google. Tente novamente.");
        toast.error("Não foi possível entrar com o Google.");
        return;
      }
      if (result.redirected) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Sessão não estabelecida após o acesso com Google.");
      const destination = await getAuthenticatedDestination(userId);
      navigate({
        to: destination,
        replace: true,
      });
    } catch (error) {
      const failure = describeAuthError(error);
      logAuthEvent("oauth_google", "failure", { code: failure.code });
      setFormError("Não foi possível concluir o acesso com Google. Tente novamente.");
      toast.error("Não foi possível concluir o acesso com Google.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10 sm:py-14">
      <div className="w-full max-w-md">
        <BrandLogo className="mx-auto w-64 max-w-[78vw]" />

        <div className="surface mt-7 p-6 sm:p-8">
          <h1 className="text-xl font-semibold">
            {mode === "signin"
              ? "Entrar"
              : mode === "signup"
                ? "Criar sua conta"
                : "Recuperar senha"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu espaço profissional, independente da clínica.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Seu nome</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            ) : null}
            {mode !== "recovery" ? (
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
              {mode === "signup" ? (
                <p className="text-xs text-muted-foreground">
                  Mínimo de 8 caracteres, com letras e números.
                </p>
              ) : null}
            </div>
            {formError ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
              {loading
                ? mode === "signin"
                  ? "Entrando..."
                  : mode === "signup"
                    ? "Criando conta..."
                    : "Enviando..."
                : mode === "signin"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Criar conta"
                    : "Enviar link de recuperação"}
            </Button>
          </form>

          {mode !== "recovery" ? (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={loading}
              >
                Continuar com Google
              </Button>
            </>
          ) : null}

          {mode === "signin" ? (
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setFormError(null);
                setMode("recovery");
              }}
              className="mt-3 w-full text-center text-sm"
            >
              Esqueci minha senha
            </Button>
          ) : null}

          <Button
            type="button"
            variant="link"
            onClick={() => {
              setFormError(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            className="mt-5 w-full text-center text-sm text-muted-foreground"
          >
            {mode === "signin" ? "Não tenho conta ainda" : "Voltar para entrar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
