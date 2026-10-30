import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { kalenderEinstellungenSpeichern, kalenderTokenErneuern } from "@/lib/actions";
import { Card } from "@/components/ui";
import { KalenderAbo } from "@/components/kalender-abo";
import { KalenderEinstellungen } from "@/components/kalender-einstellungen";
import { SeitenNavigation } from "@/components/seiten-navigation";

export default async function KalenderPage() {
  const betrieb = await prisma.betrieb.findUnique({ where: { id: "standard" } });

  // Öffentliche Adresse aus den Request-Headern - hinter dem Reverse-Proxy
  // von Coolify steht das tatsächliche Protokoll in "x-forwarded-proto".
  const kopfzeilen = await headers();
  const gastgeber = kopfzeilen.get("host") ?? "";
  const protokoll = kopfzeilen.get("x-forwarded-proto") ?? "https";
  const kalenderAdresse = betrieb?.kalenderToken
    ? `${protokoll}://${gastgeber}/kalender/${betrieb.kalenderToken}.ics`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Kalender-Abo</h1>
        <p className="text-sm text-muted">
          Alle offenen Maßnahmen mit Termin kannst du als Kalender abonnieren. Sie erscheinen dann im
          Kalender von iPhone, iPad und Rechner und erinnern dich rechtzeitig, auch ohne dass du die
          App öffnest.
        </p>
      </div>

      <Card>
        {kalenderAdresse ? (
          <div className="flex flex-col gap-4">
            <KalenderAbo adresse={kalenderAdresse} erneuern={kalenderTokenErneuern} />
            <KalenderEinstellungen
              action={kalenderEinstellungenSpeichern}
              erinnerung={betrieb?.kalenderErinnerung ?? null}
              farbe={betrieb?.kalenderFarbe ?? null}
              titel={betrieb?.kalenderTitel ?? null}
            />
          </div>
        ) : (
          <p className="text-sm text-muted">
            Erst unter{" "}
            <Link href="/einstellungen/bienenhalter" className="text-accent hover:underline">
              Bienenhalter
            </Link>{" "}
            deine Angaben speichern. Dabei entsteht die Adresse für den Kalender.
          </p>
        )}
      </Card>
    </div>
  );
}
