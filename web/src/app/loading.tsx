// Platzhalter während ein Seitenwechsel lädt - ohne ihn blieb bei
// langsamem Netz die alte Seite ohne jede Rückmeldung stehen, und man tippte
// ein zweites Mal. Navigation und Kopfzeile bleiben dabei bedienbar.
export default function Laden() {
  return (
    <div role="status" aria-label="Seite wird geladen" className="flex flex-col gap-4">
      {/* Dünner Fortschrittsbalken ganz oben am Bildschirm. */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden">
        <div className="ladebalken h-full w-1/3 bg-accent" />
      </div>
      <div aria-hidden="true" className="h-8 w-48 animate-pulse rounded-md bg-card" />
      {[0, 1, 2].map((nummer) => (
        <div key={nummer} aria-hidden="true" className="h-40 animate-pulse rounded-xl bg-card" />
      ))}
    </div>
  );
}
