"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { ImportScheduleDialog } from "./import-schedule-dialog";

export function ImportScheduleButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Importar Horário</span>
      </Button>
      <ImportScheduleDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
