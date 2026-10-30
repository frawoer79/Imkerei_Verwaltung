"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// Zeigt einen Link (z.B. die Einladung für einen Testzugang) und kopiert ihn
// auf Knopfdruck in die Zwischenablage.
export function LinkKopieren({ adresse }: { adresse: string }) {
  const [kopiert, setKopiert] = useState(false);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(adresse);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch {
      // Zwischenablage nicht erlaubt - der Link steht sichtbar da und lässt
      // sich von Hand markieren.
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
        {adresse}
      </p>
      <Button type="button" variant="secondary" onClick={kopieren} className="shrink-0">
        {kopiert ? "Kopiert ✓" : "Link kopieren"}
      </Button>
    </div>
  );
}
