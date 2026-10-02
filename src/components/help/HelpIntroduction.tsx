import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HELP_INTRO_STORAGE_KEY } from "@/lib/help-types";

export function HelpIntroduction() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (!window.localStorage.getItem(HELP_INTRO_STORAGE_KEY)) setOpen(true);
  }, []);
  function finish() {
    window.localStorage.setItem(HELP_INTRO_STORAGE_KEY, "true");
    setOpen(false);
  }
  return <Dialog open={open} onOpenChange={(next) => !next && finish()}><DialogContent className="max-w-md"><DialogHeader><div className="mb-2 grid size-11 place-items-center rounded-lg bg-secondary text-primary"><BookOpen className="size-5" /></div><DialogTitle>Conheça sua prática digital</DialogTitle><DialogDescription>Um guia opcional mostra os principais caminhos do TeraClini. Você pode explorar sozinho e abrir a Ajuda quando quiser.</DialogDescription></DialogHeader><DialogFooter className="gap-2 sm:space-x-0"><Button variant="outline" onClick={finish}>Explorar sozinho</Button><Button onClick={() => { finish(); navigate({ to: "/ajuda" }); }}>Começar tutorial</Button></DialogFooter></DialogContent></Dialog>;
}