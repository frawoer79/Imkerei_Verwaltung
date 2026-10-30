"use client";

import { useRef, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

// Behandlungen werden nicht bearbeitet oder gelöscht, sondern storniert: der
// Nachweis muss unveränderlich sein (§ 1 Abs. 1 THAMNV), die stornierte Zeile
// bleibt mit ihrem Grund im Bestandsbuch stehen.
export function BehandlungStornieren({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [grund, setGrund] = useState("");

  return (
    <>
      <Button type="button" data-schreibt variant="secondary" onClick={() => dialogRef.current?.showModal()}>
        Stornieren
      </Button>

      <dialog
        ref={dialogRef}
        className="w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <form action={action} className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-semibold">Behandlung stornieren</h2>
          <p className="text-sm text-muted">
            Die Zeile bleibt im Nachweis stehen und wird als storniert gekennzeichnet. Gelöscht
            wird nichts. Bitte kurz angeben, warum.
          </p>
          <div>
            <Label htmlFor="storniertGrund">Grund</Label>
            <Input
              id="storniertGrund"
              name="storniertGrund"
              value={grund}
              onChange={(event) => setGrund(event.target.value)}
              placeholder="z.B. falsches Volk erfasst"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Abbrechen
            </Button>
            <Button type="submit" variant="danger" disabled={!grund.trim()}>
              Stornieren
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
