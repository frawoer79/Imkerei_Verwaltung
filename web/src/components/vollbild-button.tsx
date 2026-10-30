"use client";

import { IconVollbild, IconVollbildSchliessen } from "@/components/icons";

export function VollbildButton({
  istVollbild,
  onToggle,
}: {
  istVollbild: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-background"
    >
      {istVollbild ? (
        <>
          <IconVollbildSchliessen className="h-4 w-4" /> Vollbild schließen
        </>
      ) : (
        <>
          <IconVollbild className="h-4 w-4" /> Vollbild
        </>
      )}
    </button>
  );
}
