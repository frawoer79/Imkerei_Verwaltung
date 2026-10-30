import Link from "next/link";
import { basisPrisma } from "@/lib/prisma";
import { aktuellesKonto } from "@/lib/konto";
import { WillkommenKarte } from "@/components/willkommen-karte";
import { EinladungFormular } from "@/components/einladung-formular";
import { PasswortNeuFormular } from "@/components/passwort-neu-formular";
import { PASSWORT_MINDESTLAENGE } from "@/lib/testzugang";

// Persönlicher Einladungslink für einen Testzugang - ohne Anmeldung
// erreichbar (siehe proxy.ts). Gilt nur, solange er noch nicht eingelöst ist.
export default async function EinladungPage({ params }: PageProps<"/einladung/[token]">) {
  const { token } = await params;
  const testzugang = await basisPrisma.testzugang.findUnique({
    where: { einladungToken: token },
    select: { id: true, eingerichtetAm: true, passwortHash: true, name: true },
  });

  // Direkt nach dem Einrichten (oder Neuvergeben des Passworts) lädt Next.js
  // diese Seite neu, der Tester ist dann schon angemeldet: statt "Link
  // ungültig" bekommt er die Willkommenskarte mit der Adresse der App.
  const konto = await aktuellesKonto();
  const istSeinKonto = konto?.art === "tester" && konto.testzugangId === testzugang?.id;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-8">
      {testzugang && istSeinKonto ? (
        <WillkommenKarte name={testzugang.name ?? ""} />
      ) : testzugang && !testzugang.eingerichtetAm ? (
        <EinladungFormular token={token} passwortMindestlaenge={PASSWORT_MINDESTLAENGE} />
      ) : testzugang && !testzugang.passwortHash ? (
        <PasswortNeuFormular
          token={token}
          name={testzugang.name ?? ""}
          passwortMindestlaenge={PASSWORT_MINDESTLAENGE}
        />
      ) : (
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-card p-6 text-center shadow-md">
          <h1 className="text-lg font-semibold tracking-tight">Einladung nicht gültig</h1>
          <p className="text-sm text-muted">
            Dieser Einladungslink ist ungültig oder wurde schon verwendet. Wenn du deinen Zugang
            schon eingerichtet hast, melde dich über die normale Adresse der App mit deinem Namen
            und Passwort an.
          </p>
          <Link href="/login" className="text-sm font-medium text-accent hover:underline">
            Zur Anmeldung
          </Link>
        </div>
      )}
    </div>
  );
}
