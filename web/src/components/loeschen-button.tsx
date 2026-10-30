"use client";

import { useRef } from "react";
import { Button } from "@/components/ui";
import { bestaetigen } from "@/lib/bestaetigen";

export function LoeschenButton({
  action,
  bestaetigung,
  children = "Löschen",
  className = "",
  variant = "danger",
  groesse = "normal",
  label,
}: {
  action: (formData: FormData) => void;
  bestaetigung: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "danger" | "secondary" | "leiseGefahr";
  groesse?: "normal" | "mittel" | "klein" | "symbol";
  /// Für einen Knopf nur mit Symbol (aria-label und Hinweis beim Zeigen).
  label?: string;
}) {
  // Erst nach dem Ja im Popup wird das Formular wirklich abgeschickt.
  const bestaetigt = useRef(false);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (bestaetigt.current) {
          bestaetigt.current = false;
          return;
        }
        event.preventDefault();
        const formular = event.currentTarget;
        bestaetigen(bestaetigung, { gefahr: variant !== "secondary" }).then((ja) => {
          if (!ja) return;
          bestaetigt.current = true;
          formular.requestSubmit();
        });
      }}
    >
      <Button type="submit" variant={variant} groesse={groesse} className={className} aria-label={label} title={label}>
        {children}
      </Button>
    </form>
  );
}
