import { abgeschalteteBereiche } from "@/lib/bereiche";
import { istAdmin, istHelfer } from "@/lib/konto";
import { EinstellungenSpalte } from "@/components/einstellungen-spalte";

// Rahmen aller Einstellungsseiten: ab lg links die Spalte mit allen Punkten,
// rechts die geöffnete Seite. Darunter (Handy, iPad hoch) nur die Seite, der
// Einstieg ist dort die Liste auf /einstellungen.
export default async function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  const [aus, admin, helfer] = await Promise.all([abgeschalteteBereiche(), istAdmin(), istHelfer()]);
  return (
    <div className="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-10">
      <aside className="hidden lg:sticky lg:top-8 lg:block in-data-[design=klar]:lg:top-22 print:hidden">
        <EinstellungenSpalte aus={aus} admin={admin} helfer={helfer} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
