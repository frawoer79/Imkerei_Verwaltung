import { notFound, redirect } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { DemoRahmen, RepositoryLink } from "@/components/demo-rahmen";
import { istDemo, istDemoPlatz, platzStand, RUHE_MINUTEN } from "@/lib/demo";
import { demoStarten } from "@/lib/demo-actions";
import { aktuellesKonto } from "@/lib/konto";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Imkereiverwaltung · Demo",
  description: "Die Imkereiverwaltung ohne Anmeldung ausprobieren: Stände, Völker, Durchsichten, Königinnen und Lager mit Fantasiedaten.",
};

const HINWEISE: Record<string, string> = {
  voll: "Gerade sind alle Demoplätze belegt. Versuch es in ein paar Minuten noch einmal.",
  gebremst: "Von deiner Internetadresse wurden in der letzten Stunde schon mehrere Demos gestartet. Bitte später noch einmal.",
  abgelaufen: `Deine Demo wurde zurückgesetzt (${RUHE_MINUTEN} Minuten ohne Klick oder neuer Tag). Du kannst gleich neu starten.`,
};

// Startseite der öffentlichen Demo (lib/demo.ts). Wer schon einen Platz hat,
// kommt direkt in die App.
export default async function DemoPage({ searchParams }: { searchParams: Promise<{ hinweis?: string }> }) {
  if (!istDemo()) notFound();
  const konto = await aktuellesKonto();
  if (konto?.art === "tester" && istDemoPlatz(konto.testzugangId)) redirect("/");

  const { hinweis } = await searchParams;
  const stand = await platzStand();
  const meldung = hinweis ? HINWEISE[hinweis] : undefined;
  const bereit = stand.frei > 0;

  return (
    <DemoRahmen>
      <Card className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Ausprobieren ohne Anmeldung</h1>
        <p>
          Das ist die Demo der Imkereiverwaltung. Darin liegen erfundene Stände, Völker, Königinnen, Durchsichten,
          Behandlungen, Lager und Verkäufe.
        </p>
        <p>
          Du kannst alles anklicken und ändern. Niemand sonst sieht deine Änderungen. Nach {RUHE_MINUTEN} Minuten ohne
          Klick, beim Schließen des Browsers und spätestens um Mitternacht wird alles gelöscht.
        </p>
        <p className="text-sm text-muted">
          Fotos hochladen und E-Mails verschicken sind in der Demo ausgeschaltet.
        </p>

        {meldung && (
          <p className="rounded-md border border-warnung-rand bg-warnung-flaeche px-3 py-2 text-sm text-warnung">{meldung}</p>
        )}

        <form action={demoStarten}>
          <Button type="submit" className="w-full sm:w-auto" disabled={!bereit}>
            Demo starten
          </Button>
        </form>
        {!bereit && (
          <p className="text-sm text-muted">
            {stand.imAufbau > 0 && stand.imAufbau === stand.gesamt
              ? "Die Demo wird gerade vorbereitet. Lade die Seite in einer Minute neu."
              : "Gerade ist kein Platz frei. Lade die Seite in ein paar Minuten neu."}
          </p>
        )}
      </Card>

      <Card className="mt-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Selbst nutzen</h2>
        <p>
          Die Imkereiverwaltung ist kostenlos. Du installierst sie auf einem eigenen kleinen Server, deine Daten bleiben
          bei dir. Anleitung und Quellcode findest du auf GitHub.
        </p>
        <RepositoryLink className="text-lg" />
      </Card>
    </DemoRahmen>
  );
}
