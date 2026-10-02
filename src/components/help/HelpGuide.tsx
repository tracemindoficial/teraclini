import { useEffect, useState } from "react";
import { BookOpenCheck, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompleteHelpTutorial, useHelpTutorial, recordHelpEvent } from "@/lib/data/help";
import { HELP_GUIDE_STORAGE_KEY } from "@/lib/help-types";

export function startHelpGuide(slug: string, routePath: string | null) {
  window.localStorage.setItem(HELP_GUIDE_STORAGE_KEY, slug);
  window.dispatchEvent(new Event("teraclini-help-guide"));
  return routePath;
}

export function HelpGuide() {
  const [slug, setSlug] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const completion = useCompleteHelpTutorial();
  const { data: tutorial } = useHelpTutorial(slug ?? "");

  useEffect(() => {
    const sync = () => setSlug(window.localStorage.getItem(HELP_GUIDE_STORAGE_KEY));
    sync();
    window.addEventListener("teraclini-help-guide", sync);
    return () => window.removeEventListener("teraclini-help-guide", sync);
  }, []);

  useEffect(() => {
    if (!tutorial?.route_path) return;
    if (window.location.pathname !== tutorial.route_path) window.location.assign(tutorial.route_path);
    recordHelpEvent({ eventType: "guide_started", tutorialId: tutorial.id }).catch(() => undefined);
  }, [tutorial?.id, tutorial?.route_path]);

  const steps = tutorial?.steps ?? [];
  const activeStep = steps[step];

  function close(skipped = false) {
    if (skipped && tutorial) recordHelpEvent({ eventType: "guide_skipped", tutorialId: tutorial.id }).catch(() => undefined);
    window.localStorage.removeItem(HELP_GUIDE_STORAGE_KEY);
    setSlug(null);
    setStep(0);
  }

  async function next() {
    if (!tutorial) return;
    if (step < steps.length - 1) return setStep((current) => current + 1);
    await completion.mutateAsync(tutorial.id);
    close();
  }

  return (
    <Dialog open={Boolean(slug && tutorial)} onOpenChange={(open) => !open && close(true)}>
      <DialogContent className="max-w-md" aria-describedby="help-guide-description">
        <DialogHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-lg bg-secondary text-primary"><BookOpenCheck className="size-5" /></div>
          <DialogTitle>{activeStep?.title ?? tutorial?.title}</DialogTitle>
          <DialogDescription id="help-guide-description">{activeStep?.instruction ?? tutorial?.objective}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Etapa {Math.min(step + 1, Math.max(steps.length, 1))} de {Math.max(steps.length, 1)}</span>
          <Button variant="ghost" size="sm" onClick={() => close(true)}>Pular tutorial</Button>
        </div>
        <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
          <Button variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ChevronLeft className="mr-2 size-4" />Voltar</Button>
          <Button onClick={next} disabled={completion.isPending}>{step === steps.length - 1 ? "Concluir" : "Próximo"}<ChevronRight className="ml-2 size-4" /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}