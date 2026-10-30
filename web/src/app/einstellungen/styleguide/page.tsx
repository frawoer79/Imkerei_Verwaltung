import Link from "next/link";
import { UpdateLeiste } from "@/components/update-leiste";
import { AenderungsText } from "@/components/aenderungs-text";
import { notFound } from "next/navigation";
import { entwicklerSeiten } from "@/lib/hauptzugang";
import { istAdmin } from "@/lib/konto";
import { AMPEL_FLAECHE, AMPEL_TEXT } from "@/lib/ampel";
import { FAELLIGKEIT_PLAKETTE } from "@/lib/faelligkeit";
import * as Symbole from "@/components/icons";
import { Button, Card, Input, Label, LinkKnopf, Select, Textarea } from "@/components/ui";
import { AmpelSymbol } from "@/components/ampel-symbol";
import { Aufklappbar } from "@/components/aufklappbar";
import { AuswahlListe } from "@/components/auswahl-liste";
import { BewertungsSchieber } from "@/components/bewertungs-schieber";
import { FuettererPlakette } from "@/components/fuetterer-plakette";
import { GesamteindruckPlakette } from "@/components/gesamteindruck-plakette";
import { MiniStrahl } from "@/components/mini-strahl";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { StandtypBadge } from "@/components/standtyp";
import { ZahlStepper } from "@/components/zahl-stepper";
import { BEURTEILUNGS_KRITERIEN, GESAMTEINDRUCK_KRITERIUM } from "@/components/stockkarten-eintrag-felder";
import { ChipBeispiel, FarbFeld, SchalterBeispiel, SortierBeispiel } from "./beispiele";

// Styleguide: alle Farben, Schriften und Bausteine der App auf einer Seite,
// gebaut aus denselben Bausteinen wie die App selbst. Dient als Nachschlage-
// werk für neue Seiten und zum Prüfen, ob alles zusammenpasst (hell/dunkel
// über den Umschalter in der Kopfzeile). Nur für Frank, Tester sehen
// "nicht gefunden".

const FARBEN: { gruppe: string; felder: [string, string][] }[] = [
  {
    gruppe: "Grundfarben",
    felder: [
      ["--background", "Seitenhintergrund"],
      ["--card", "Karten, Felder, Popups"],
      ["--foreground", "Schrift"],
      ["--muted", "Nebentext, Beschriftungen"],
      ["--accent", "Hauptknöpfe, Links, Fokus"],
      ["--accent-foreground", "Schrift auf Akzent"],
      ["--umfeld", "Rand neben der App auf großen Monitoren"],
    ],
  },
  {
    gruppe: "Ränder",
    felder: [
      ["--border", "Trennlinien, Kartenrand"],
      ["--rand-ruhig", "Abschnitte, Zeilen, Zusatzknöpfe"],
      ["--rand-bedienung", "Eingabefelder (mind. 3:1)"],
    ],
  },
  {
    gruppe: "Ampel: Text, Fläche, Rand",
    felder: [
      ["--ok", "Grün: in Ordnung"],
      ["--ok-flaeche", "Grüner Hinweiskasten"],
      ["--ok-rand", "Rand grüner Kasten"],
      ["--warnung", "Gelb: Vorsicht"],
      ["--warnung-flaeche", "Gelber Hinweiskasten"],
      ["--warnung-rand", "Rand gelber Kasten"],
      ["--gefahr", "Rot: Gefahr, überfällig"],
      ["--gefahr-flaeche", "Roter Hinweiskasten"],
      ["--gefahr-rand", "Rand roter Kasten"],
    ],
  },
  {
    gruppe: "Ampel: gefüllte Plaketten",
    felder: [
      ["--ok-voll", "Grüne Plakette"],
      ["--warnung-voll", "Gelbe Plakette"],
      ["--warnung-voll-rand", "Rand gelbe Plakette"],
      ["--gefahr-voll", "Rote Plakette"],
    ],
  },
  {
    gruppe: "Bewertungsstrahl",
    felder: [
      ["--zone-ok", "Grüne Zone"],
      ["--zone-warnung", "Gelbe Zone"],
      ["--zone-gefahr", "Rote Zone"],
      ["--marke-ok", "Marke grün"],
      ["--marke-warnung", "Marke gelb"],
      ["--marke-gefahr", "Marke rot"],
    ],
  },
];

const INHALT = [
  ["farben", "Farben"],
  ["schrift", "Schrift"],
  ["knoepfe", "Knöpfe"],
  ["felder", "Eingaben"],
  ["flaechen", "Karten und Abschnitte"],
  ["hinweise", "Hinweise und Plaketten"],
  ["bewertung", "Bewertung"],
  ["symbole", "Symbole"],
  ["regeln", "Regeln"],
] as const;

function Abschnitt({ id, titel, children }: { id: string; titel: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 id={id} className="mb-4 scroll-mt-4 text-lg font-semibold">
        {titel}
      </h2>
      {children}
    </Card>
  );
}

// Kleine graue Zeile unter einem Beispiel: woher der Baustein kommt.
function Quelle({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 font-mono text-xs text-muted">{children}</p>;
}

export default async function StyleguidePage() {
  if (!entwicklerSeiten() || !(await istAdmin())) notFound();

  const sanftmut = BEURTEILUNGS_KRITERIEN.find((k) => k.feld === "sanftmut")!;
  const schwarmtrieb = BEURTEILUNGS_KRITERIEN.find((k) => k.feld === "schwarmtrieb")!;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Styleguide</h1>
        <p className="text-sm text-muted">
          Alle Farben und Bausteine der App auf einer Seite. Neue Seiten werden nur aus diesen
          Bausteinen gebaut. Hell und dunkel prüfst du mit dem Umschalter im Menü, das Design unter{" "}
          <Link href="/einstellungen/design" className="text-accent hover:underline">
            Einstellungen → Design
          </Link>
          .
        </p>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Inhalt">
          {INHALT.map(([id, titel]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-rand-ruhig bg-card px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
            >
              {titel}
            </a>
          ))}
        </nav>
      </div>

      <Abschnitt id="farben" titel="Farben">
        <p className="mb-4 text-sm text-muted">
          Farben nur über diese Namen verwenden, nie als feste Werte. Dann stimmen hell und dunkel
          von selbst. In Tailwind heißen sie z.&nbsp;B. <code>bg-card</code>, <code>text-muted</code>,{" "}
          <code>border-rand-ruhig</code>.
        </p>
        <div className="flex flex-col gap-6">
          {FARBEN.map(({ gruppe, felder }) => (
            <div key={gruppe}>
              <h3 className="mb-2 font-medium">{gruppe}</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {felder.map(([name, zweck]) => (
                  <FarbFeld key={name} name={name} zweck={zweck} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <Quelle>web/src/app/globals.css</Quelle>
      </Abschnitt>

      <Abschnitt id="schrift" titel="Schrift">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-tight">Seitentitel</p>
            <Quelle>h1: text-2xl font-semibold tracking-tight</Quelle>
          </div>
          <div>
            <p className="text-lg font-semibold">Kartenüberschrift</p>
            <Quelle>h2: text-lg font-semibold</Quelle>
          </div>
          <div>
            <p className="font-medium">Zwischenüberschrift</p>
            <Quelle>h3: font-medium</Quelle>
          </div>
          <div>
            <p>Normaler Text. Kurze Sätze, du-Form, sagt, was passiert.</p>
            <Quelle>Grundschrift (16 px)</Quelle>
          </div>
          <div>
            <p className="text-sm text-muted">Erklärung unter einem Titel oder Nebeninfo.</p>
            <Quelle>text-sm text-muted</Quelle>
          </div>
          <div>
            <p className="text-xs text-muted">Kleinste Schrift, nur für Plaketten und Fußnoten.</p>
            <Quelle>text-xs text-muted</Quelle>
          </div>
        </div>
      </Abschnitt>

      <Abschnitt id="knoepfe" titel="Knöpfe">
        <div className="flex flex-col gap-5">
          {(["normal", "mittel", "klein"] as const).map((groesse) => (
            <div key={groesse}>
              <div className="flex flex-wrap items-center gap-3">
                <Button groesse={groesse}>Speichern</Button>
                <Button groesse={groesse} variant="secondary">
                  Abbrechen
                </Button>
                <Button groesse={groesse} variant="danger">
                  Löschen
                </Button>
                <Button groesse={groesse} disabled>
                  Gesperrt
                </Button>
              </div>
              <Quelle>
                {`<Button groesse="${groesse}">`}{" "}
                {groesse === "normal"
                  ? "48 px hoch, Standard (Handschuhe, Sonne)"
                  : groesse === "mittel"
                    ? "44 px, in Zeilen neben Text"
                    : "dicht, nur für Listen am PC"}
              </Quelle>
            </div>
          ))}
          <div>
            <div className="flex flex-wrap items-center gap-1">
              <Button groesse="symbol" variant="leise" aria-label="Bearbeiten" title="Bearbeiten">
                <Symbole.IconBearbeiten className="h-5 w-5" />
              </Button>
              <Button groesse="symbol" variant="leiseGefahr" aria-label="Löschen" title="Löschen">
                <Symbole.IconMuelleimer className="h-5 w-5" />
              </Button>
            </div>
            <Quelle>
              {'<Button groesse="symbol" variant="leise" aria-label="…">'} 44 px, nur Symbol, für dichte Listen
              (aufgeklappte Sammelmaßnahme). Löschen: {'<LoeschenButton variant="leiseGefahr" groesse="symbol" label="Löschen">'}
            </Quelle>
          </div>
          <div>
            <LinkKnopf href="#knoepfe" variant="secondary">
              Link im Knopf-Aussehen
            </LinkKnopf>
            <Quelle>{"<LinkKnopf> statt <Link> mit eigenen Klassen"}</Quelle>
          </div>
          <div>
            <SchalterBeispiel />
            <Quelle>{"<Switch>"}</Quelle>
          </div>
        </div>
        <Quelle>web/src/components/ui.tsx</Quelle>
      </Abschnitt>

      <Abschnitt id="felder" titel="Eingaben">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sg-text">Name des Volkes</Label>
            <Input id="sg-text" name="sg-text" placeholder="z. B. Linde 3" />
            <Quelle>{"<Label> + <Input>"}</Quelle>
          </div>
          <div>
            <Label htmlFor="sg-auswahl">Beutensystem</Label>
            <Select id="sg-auswahl" name="sg-auswahl" defaultValue="zander">
              <option value="zander">Zander</option>
              <option value="dadant">Dadant</option>
            </Select>
            <Quelle>{"<Select>"}</Quelle>
          </div>
          <div>
            <Label htmlFor="sg-gesperrt">Gesperrtes Feld</Label>
            <Input id="sg-gesperrt" name="sg-gesperrt" defaultValue="nicht änderbar" disabled />
            <Quelle>{"<Input disabled>"}</Quelle>
          </div>
          <div>
            <ZahlStepper name="sg-waben" label="Besetzte Wabengassen" letzterWert={8} />
            <Quelle>{"<ZahlStepper> (zahl-stepper.tsx)"}</Quelle>
          </div>
          <div className="sm:col-span-2">
            <ChipBeispiel />
            <Quelle>
              {"<WahlChip>"} Auswahl als Chip (Sorte, Gebinde, Grund). {"<EntfernChip>"} Eintrag mit × in einer
              Liste (Sorten, Gebinde unter Einstellungen). {"<PlusChip>"} „+ Sorte“, „+ Größe“. Gebinde-Gruppen und
              „+ Größe“-Felder kommen überall aus lib/gebinde.ts und {"<GebindeNeuFelder>"} (gebinde.tsx).
            </Quelle>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sg-notiz">Notiz</Label>
            <Textarea id="sg-notiz" name="sg-notiz" rows={3} placeholder="Was dir aufgefallen ist" />
            <Quelle>{"<Textarea>"}</Quelle>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          Am Handy haben alle Felder 16 px Schrift, sonst zoomt iOS beim Antippen in die Seite.
        </p>
      </Abschnitt>

      <Abschnitt id="flaechen" titel="Karten und Abschnitte">
        <p className="mb-4 text-sm text-muted">
          Kacheln heben sich im hellen Modus mit Schatten vom Untergrund ab, Eingabefelder mit
          einem kleinen. Dafür <code>shadow-md</code> (Kachel) bzw. <code>shadow-sm</code> (Feld,
          kleines Element) nehmen, nie eigene Schattenwerte. Umrandete Karten (bg-card, rounded-lg
          oder -xl) und umrandete Felder bekommen den Schatten auch ohne Klasse. Werte:{" "}
          <code>--schatten-kachel</code>, <code>--schatten-feld</code>.
        </p>
        <p className="mb-4 text-sm text-muted">
          Im Dunkelmodus gibt es keinen Schatten. Dort heben sich Kacheln über ihre Farbe ab:{" "}
          <code>--card</code>, <code>--kopf</code> und <code>--flaeche</code> sind deutlich heller
          als der Untergrund (am 21.10.2026 um 9&nbsp;% zu Weiß aufgehellt, <code>--border</code> um
          11&nbsp;%). Ein neues Design hält diesen Abstand ein. Blasse Schrift (<code>--muted</code>) erreicht auf{" "}
          <code>--flaeche</code> mindestens 4,5:1.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <Card>
              <p className="font-medium">Karte</p>
              <p className="text-sm text-muted">Jede Gruppe auf einer Seite steht in einer Karte.</p>
            </Card>
            <Quelle>{"<Card> (rounded-xl, border, bg-card, Schatten)"}</Quelle>
          </div>
          <div>
            <Aufklappbar
              titel="Brutraum"
              symbol={<Symbole.IconWabenrahmen className="h-5 w-5" />}
              hinweis="Ein Satz, was in diesem Abschnitt eingetragen wird."
            >
              <p className="text-sm">Inhalt des Abschnitts.</p>
            </Aufklappbar>
            <Quelle>{"<Aufklappbar> (aufklappbar.tsx)"}</Quelle>
          </div>
          <div>
            <AuswahlListe
              gruppen={[
                {
                  titel: "Gruppe",
                  zeilen: [
                    { href: "/einstellungen/beuten", label: "Punkt mit Stand", icon: Symbole.IconWabenrahmen, stand: "2 Systeme, 5 Zargengrößen" },
                    { href: "/einstellungen/bienenhalter", label: "Punkt, bei dem etwas fehlt", icon: Symbole.IconPerson, stand: "Noch nicht eingetragen", fehlt: true },
                  ],
                },
              ]}
            />
            <Quelle>{"<AuswahlListe> (auswahl-liste.tsx): Einstieg in Unterseiten, z. B. Einstellungen am Handy"}</Quelle>
          </div>
          <div>
            <SortierBeispiel />
            <Quelle>
              {"<SortierWahl>"} „Sortieren nach“ über einer Liste, Wahl je Gerät merken (z. B. lib/lager-ordnung.ts).{" "}
              {"<Zwischenkopf>"} Gruppe in einer umrandeten Liste mit Summe rechts (Lager → Erzeugnisse).
            </Quelle>
          </div>
          <div>
            <p className="text-sm">
              Ecken: Karten <code>rounded-xl</code>, Felder, Knöpfe und Kästen <code>rounded-md</code>,
              Plaketten <code>rounded-full</code>.
            </p>
          </div>
        </div>
      </Abschnitt>

      <Abschnitt id="hinweise" titel="Hinweise und Plaketten">
        <div className="flex flex-col gap-4">
          {(
            [
              ["ok", "Gespeichert. Die Mail ist raus."],
              ["warnung", "Diese Königin ist älter als drei Jahre."],
              ["gefahr", "Speichern hat nicht geklappt. Versuch es gleich noch mal."],
            ] as const
          ).map(([stufe, text]) => (
            <div key={stufe}>
              <p className={`rounded-md border px-3 py-2 text-sm ${AMPEL_FLAECHE[stufe]} ${AMPEL_TEXT[stufe]}`}>
                {text}
              </p>
              <Quelle>{`Hinweiskasten: AMPEL_FLAECHE.${stufe} + AMPEL_TEXT.${stufe} (lib/ampel.ts)`}</Quelle>
            </div>
          ))}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <GesamteindruckPlakette wert={1.5} />
              <GesamteindruckPlakette wert={4} />
              <GesamteindruckPlakette wert={5.5} />
            </div>
            <Quelle>{"<GesamteindruckPlakette>"}</Quelle>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {(["ueberfaellig", "heute", "bald", "spaeter", "ohne"] as const).map((f) => (
                <span
                  key={f}
                  className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${FAELLIGKEIT_PLAKETTE[f]}`}
                >
                  {{ ueberfaellig: "Überfällig · 16.10.", heute: "Heute", bald: "Fr 23.10.", spaeter: "Mo 9.11.", ohne: "Ohne Termin" }[f]}
                </span>
              ))}
            </div>
            <Quelle>Fälligkeit: FAELLIGKEIT_PLAKETTE (lib/faelligkeit.ts)</Quelle>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FuettererPlakette />
              <StandtypBadge standtyp="FEST" />
              <StandtypBadge standtyp="WANDER" />
            </div>
            <Quelle>{"<FuettererPlakette>, <StandtypBadge>"}</Quelle>
          </div>
          <div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center gap-1 ${AMPEL_TEXT.warnung}`}>
                <AmpelSymbol einstufung="gelb" /> Gelb
              </span>
              <span className={`inline-flex items-center gap-1 ${AMPEL_TEXT.gefahr}`}>
                <AmpelSymbol einstufung="rot" /> Rot
              </span>
            </div>
            <Quelle>{"<AmpelSymbol>: Farbe nie allein, Gelb und Rot immer mit Symbol"}</Quelle>
          </div>
          <div>
            <div className="flex flex-col gap-1 overflow-hidden rounded-md">
              {(
                [
                  ["bg-warnung-flaeche text-warnung", "Offline. 2 Durchsichten warten."],
                  ["bg-gefahr-flaeche text-gefahr", "1 Durchsicht nicht angenommen."],
                  ["bg-ok-flaeche text-ok", "Alles gesendet."],
                ] as const
              ).map(([farbe, text]) => (
                <p key={text} className={`px-4 py-1.5 text-center text-sm font-medium ${farbe}`}>
                  {text}
                </p>
              ))}
            </div>
            <Quelle>{"Leiste oben: <OfflineLeiste> (Verbindung und Warteschlange, lib/warteschlange.ts)"}</Quelle>
          </div>
          <div>
            <div className="pointer-events-none flex flex-col gap-1 overflow-hidden rounded-md" inert>
              <UpdateLeiste hinweis={{ version: "1.5.0", sicherheit: false, hauptversion: false }} />
              <UpdateLeiste hinweis={{ version: "1.4.1", sicherheit: true, hauptversion: false }} />
            </div>
            <Quelle>{"Leiste oben: <UpdateLeiste> (neue Version, nur Hauptzugang, lib/update.ts)"}</Quelle>
          </div>
          <div>
            <AenderungsText text={"## Neu\n- **Eimer** einzeln wiegen\n- Sortierung im Lager\n\nAußerdem kleinere Korrekturen."} />
            <Quelle>{"<AenderungsText>: Änderungsliste eines Release (kleines Markdown, nie HTML)"}</Quelle>
          </div>
          <div>
            <Card className="!shadow-none border-dashed !border-l-[6px] !border-l-warnung">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="font-semibold">25.10., 15:12</p>
                <span className="rounded-full bg-warnung-flaeche px-2 py-0.5 text-xs font-medium text-warnung">
                  Wartet auf Senden
                </span>
              </div>
              <p className="text-sm text-muted">Durchsicht liegt auf diesem Gerät und wird von selbst gesendet.</p>
            </Card>
            <Quelle>{"<WartendeEingaben>: gestrichelte Karte im Verlauf, noch nicht gesendet"}</Quelle>
          </div>
        </div>
      </Abschnitt>

      <Abschnitt id="bewertung" titel="Bewertung">
        <div className="flex flex-col gap-5">
          <div>
            <BewertungsSchieber name="sg-sanftmut" kriterium={sanftmut} defaultValue={2} />
            <Quelle>{"<BewertungsSchieber> (Eingabe in der Durchsicht)"}</Quelle>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <MiniStrahl kriterium={GESAMTEINDRUCK_KRITERIUM} wert={2} />
            <MiniStrahl kriterium={schwarmtrieb} wert={3} />
            <MiniStrahl kriterium={sanftmut} wert={5.5} />
          </div>
          <Quelle>{"<MiniStrahl> (Anzeige im Verlauf, nur Wertungstext, keine Note)"}</Quelle>
        </div>
      </Abschnitt>

      <Abschnitt id="symbole" titel="Symbole">
        <p className="mb-4 text-sm text-muted">
          Eigene Strichzeichnungen statt Emoji. Sie übernehmen Farbe und Größe vom Text drumherum.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(Symbole).map(([name, Symbol]) => (
            <div key={name} className="flex items-center gap-2">
              <Symbol className="h-6 w-6 shrink-0" />
              <span className="font-mono text-xs text-muted">{name.replace(/^Icon/, "")}</span>
            </div>
          ))}
        </div>
        <Quelle>web/src/components/icons.tsx</Quelle>
      </Abschnitt>

      <Abschnitt id="regeln" titel="Regeln">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          <li>
            Farben nur über die Namen oben, keine festen Farbwerte und kein <code>dark:</code>. Bewusste
            Ausnahmen: Zeichenfarben der Königin, Zuchtmutter-Stern, Kategorie-Plaketten (Dokumentart,
            Begattung, „QR gelernt“), Markierungen auf Karten und alles, was gedruckt wird (PDF).
          </li>
          <li>
            Knöpfe nur mit <code>Button</code> oder <code>LinkKnopf</code>, ein Link im Knopf-Aussehen mit{" "}
            <code>knopfKlassen()</code>. Am Stand die Größe „normal“.
          </li>
          <li>Tippziele mindestens 44 px, Felder mit gut sichtbarem Rand.</li>
          <li>Ampel: Grün in Ordnung, Gelb Vorsicht, Rot Gefahr oder überfällig. Gelb und Rot immer mit Symbol.</li>
          <li>Bewertungen zeigen nur den Wertungstext, keine Noten. Ausnahme: Königinnen.</li>
          <li>Rückfragen nur mit <code>lib/bestaetigen.ts</code>, nie mit dem Browser-Popup.</li>
          <li>Popups stehen immer mittig.</li>
          <li>Texte: kurze Sätze, duzen, keine Gedankenstriche, sagen, was passiert.</li>
          <li>Neue Bausteine hier eintragen, damit die Seite vollständig bleibt.</li>
        </ul>
      </Abschnitt>
    </div>
  );
}
