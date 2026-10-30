"use client";

import Link from "next/link";
import { knopfKlassen } from "@/components/ui";

// Deutsche Fehlerseite statt der englischen von Next.js ("This page couldn't
// load"). Erscheint, wenn eine Seite oder eine Aktion unerwartet scheitert -
// etwa bei Funkloch mitten im Laden. Die Navigation bleibt dabei stehen, nur
// der Inhalt wird ersetzt.
export default function Fehlerseite({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-md">
      <h1 className="text-xl font-semibold">Da ist etwas schiefgelaufen.</h1>
      <p className="text-sm text-muted">
        Deine letzte Aktion wurde vielleicht nicht gespeichert. Prüf die Verbindung und lade die Seite neu.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={retry}
          className={knopfKlassen("primary", "klein")}
        >
          Seite neu laden
        </button>
        <Link
          href="/"
          className={knopfKlassen("secondary", "klein")}
        >
          Zu den Bienenständen
        </Link>
      </div>
    </div>
  );
}
