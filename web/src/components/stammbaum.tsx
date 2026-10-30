import Link from "next/link";
import { STATUS_LABEL, anzeigeFarbe, istVerfuegbar, type KoeniginStatus } from "@/lib/koeniginnen";
import { KoeniginStern } from "@/components/koenigin-stern";
import { vorfahren, type Stammbaum, type StammbaumKoenigin } from "@/lib/stammbaum";

// Darstellung als eingerückter Baum: jede Generation eine Stufe weiter
// rechts, verbunden über eine senkrechte Linie. Liest sich auch in
// Handybreite, anders als ein waagerecht ausladender Baum.

export function StammbaumEintrag({
  koenigin,
  hervorgehoben = false,
}: {
  koenigin: StammbaumKoenigin;
  hervorgehoben?: boolean;
}) {
  const farbe = anzeigeFarbe(koenigin.jahrgang, koenigin.zeichenFarbe);
  const status = koenigin.status as KoeniginStatus;
  return (
    <Link
      href={`/koeniginnen/${koenigin.id}`}
      className={`inline-flex items-center gap-2 rounded-full border py-0.5 pl-1 pr-3 text-sm hover:border-accent hover:text-accent ${hervorgehoben ? "border-accent bg-accent/10 font-semibold" : "border-border"} ${istVerfuegbar(status) ? "" : "text-muted"}`}
    >
      <span
        className="h-4 w-4 shrink-0 rounded-full border border-rand-bedienung"
        style={{ background: farbe?.hex ?? "transparent" }}
      />
      {koenigin.kennung}
      {koenigin.stern && <KoeniginStern className="-ml-1 h-7 w-7" />}
      <span className="text-xs font-normal text-muted">
        {koenigin.volkName ?? STATUS_LABEL[status]}
      </span>
      {/* Vaterseite: Belegstelle und Belegjahr, ausgeschrieben beim Zeigen
          und auf der Seite der Königin. */}
      {koenigin.vater && (
        <span className="text-xs font-normal text-muted" title={koenigin.vater.lang ?? undefined}>
          ♂ {koenigin.vater.kurz}
        </span>
      )}
    </Link>
  );
}

export function StammbaumZweig({
  baum,
  koenigin,
  hervorhebenId,
  gesehen = new Set<string>(),
}: {
  baum: Stammbaum;
  koenigin: StammbaumKoenigin;
  hervorhebenId?: string;
  gesehen?: Set<string>;
}) {
  if (gesehen.has(koenigin.id)) return null;
  const weiter = new Set(gesehen).add(koenigin.id);
  const toechter = baum.toechter.get(koenigin.id) ?? [];
  return (
    <div>
      <StammbaumEintrag koenigin={koenigin} hervorgehoben={koenigin.id === hervorhebenId} />
      {toechter.length > 0 && (
        <ul className="ml-3 mt-1 flex flex-col gap-1 border-l border-border pl-4">
          {toechter.map((tochter) => (
            <li key={tochter.id}>
              <StammbaumZweig baum={baum} koenigin={tochter} hervorhebenId={hervorhebenId} gesehen={weiter} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/// Linie einer einzelnen Königin: ihre Vorfahren (nur die direkte
/// Mutterlinie) und darunter alle ihre Nachkommen.
export function KoeniginLinie({ baum, koeniginId }: { baum: Stammbaum; koeniginId: string }) {
  const koenigin = baum.nachId.get(koeniginId);
  if (!koenigin) return null;
  const kette = vorfahren(baum, koeniginId);

  let inhalt = <StammbaumZweig baum={baum} koenigin={koenigin} hervorhebenId={koeniginId} />;
  for (const ahnin of [...kette].reverse()) {
    inhalt = (
      <div>
        <StammbaumEintrag koenigin={ahnin} />
        <div className="ml-3 mt-1 border-l border-dashed border-border pl-4">{inhalt}</div>
      </div>
    );
  }
  return inhalt;
}
