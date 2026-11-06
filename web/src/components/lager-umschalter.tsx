import Link from "next/link";

export type LagerTeil = "material" | "erzeugnisse" | "verkaeufe";

export const LAGER_TEILE: { teil: LagerTeil; href: string; label: string }[] = [
  { teil: "material", href: "/lager/material", label: "Material" },
  { teil: "erzeugnisse", href: "/lager/erzeugnisse", label: "Erzeugnisse" },
  { teil: "verkaeufe", href: "/lager/verkaeufe", label: "Verkäufe" },
];

// Umschalter unter der Überschrift der Lager-Seiten: so wechselt man
// zwischen Material, Erzeugnissen und Verkäufen, ohne erst das Menü aufzuklappen. Gleiche
// Optik wie die Reiter auf der Königinnen-Seite, aber als Links, weil es zwei
// eigene Seiten sind.
export function LagerUmschalter({ aktiv }: { aktiv: LagerTeil }) {
  return (
    <nav aria-label="Lager" className="-mt-2 grid grid-cols-3 gap-1 rounded-lg bg-border p-1 sm:max-w-md">
      {LAGER_TEILE.map(({ teil, href, label }) => (
        <Link
          key={teil}
          href={href}
          aria-current={teil === aktiv ? "page" : undefined}
          className={`flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium ${
            teil === aktiv ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
