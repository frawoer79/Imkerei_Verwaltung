"use client";

import { useEffect } from "react";
import "./globals.css";

// Letzte Rückfallebene, wenn sogar das Grundgerüst der App (layout.tsx)
// scheitert - ersetzt dann die ganze Seite, darum mit eigenem <html>/<body>.
// Die Hell-/Dunkel-Wahl aus dem Umschalter wird hier selbst nachgezogen,
// weil das Skript aus layout.tsx in diesem Fall nicht läuft.
//
// Bewusst ein <a> statt <Link>: Ist das Grundgerüst kaputt, soll der Weg zur
// Startseite die Seite vollständig neu laden.
export default function GlobaleFehlerseite({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    try {
      const gespeichert = localStorage.getItem("theme");
      if (gespeichert === "light" || gespeichert === "dark") document.documentElement.dataset.theme = gespeichert;
    } catch {
      // Ohne localStorage gilt die Systemeinstellung.
    }
  }, []);

  return (
    <html lang="de">
      <body className="flex min-h-full flex-col px-4 py-10">
        <title>Fehler – Imkereiverwaltung</title>
        <div className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-md">
          <h1 className="text-xl font-semibold">Da ist etwas schiefgelaufen.</h1>
          <p className="text-sm text-muted">
            Deine letzte Aktion wurde vielleicht nicht gespeichert. Prüf die Verbindung und lade die Seite neu.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={retry}
              className="inline-flex cursor-pointer items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90"
            >
              Seite neu laden
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-rand-ruhig bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
            >
              Zu den Bienenständen
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
