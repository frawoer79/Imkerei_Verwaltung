import Link from "next/link";
import { knopfKlassen } from "@/components/ui";

// Deutsche Seite für nicht vorhandene Adressen und gelöschte Datensätze
// (notFound() in den Seiten) statt "404 · This page could not be found."
export default function NichtGefunden() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-md">
      <h1 className="text-xl font-semibold">Nicht gefunden.</h1>
      <p className="text-sm text-muted">
        Dieses Volk oder diese Seite gibt es nicht (mehr). Vielleicht gelöscht oder archiviert.
      </p>
      <div>
        <Link
          href="/"
          className={knopfKlassen("primary", "klein")}
        >
          Zu den Bienenständen
        </Link>
      </div>
    </div>
  );
}
