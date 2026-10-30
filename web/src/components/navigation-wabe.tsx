"use client";

import Link from "next/link";
import { Fragment, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeUmschalter } from "@/components/theme-umschalter";
import { Abzeichen, nachRang, navItems, useGruppeOffen, type NavItem, type Unterpunkt } from "@/components/navigation";
import { abmelden } from "@/lib/actions";
import { IconLogo, IconQrCode, IconWinkelRechts } from "@/components/icons";

// Navigation für das Design "Wald" (intern "wabe"): am Handy eine Leiste unten (Daumen) mit
// großem Scannen-Knopf in der Mitte, alles Weitere unter "Mehr". Am Tablet
// eine schmale Symbolleiste links, am PC (ab lg) die volle Seitenleiste.

type Props = { faellig: number; velutina: number; aus: readonly string[] };
// Name neben dem Logo (lib/menue-name.ts).
type MitName = { name: string };

// Reihenfolge, aus der die Leiste unten ihre Ziele nimmt (abgeschaltete
// Bereiche fallen weg, der nächste rückt nach).
const LEISTEN_ZIELE = ["/", "/massnahmen", "/koeniginnen", "/behandlungen", "/dokumente"];

function MenueSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 6h13M3.5 10h13M3.5 14h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function aufteilen(alleItems: NavItem[]) {
  const { haupt: items, neben } = nachRang(alleItems);
  const scannen = items.find((item) => item.href === "/scannen");
  const ohneScan = items.filter((item) => item !== scannen);
  const leiste = LEISTEN_ZIELE.map((href) => ohneScan.find((item) => item.href === href))
    .filter((item): item is NavItem => !!item)
    .slice(0, scannen ? 3 : 4);
  const mehr = ohneScan.filter((item) => !leiste.includes(item));
  return { scannen, leiste, mehr, neben };
}

// Beschriftung: am schmalen Tablet die Fassung mit Trennstellen, ab lg die volle.
function Beschriftung({ item }: { item: NavItem }) {
  return (
    <span className="w-full lg:w-auto">
      {item.handyLabel && <span className="lg:hidden">{item.handyLabel}</span>}
      <span className={item.handyLabel ? "hidden lg:inline" : ""}>{item.label}</span>
    </span>
  );
}

// Menüpunkt mit Untermenü (Lager) in der Seitenleiste: klappt auf wie im
// aktuellen Design. Am PC stehen die Unterpunkte eingerückt mit Linie
// darunter, in der schmalen Tablet-Leiste als kleine Gruppe auf getönter Fläche.
function WabeGruppe({ item, unterpunkte, pathname }: { item: NavItem; unterpunkte: Unterpunkt[]; pathname: string }) {
  const aktiv = item.istAktiv(pathname);
  const [offen, umschalten] = useGruppeOffen(aktiv, pathname);
  const listeId = `untermenue-wabe-${item.href.slice(1)}`;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={offen}
        aria-controls={listeId}
        onClick={umschalten}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl px-1 py-2 text-center text-[11.5px] font-semibold leading-tight lg:flex-row lg:gap-3 lg:px-3 lg:py-2.5 lg:text-left lg:text-[15px] ${
          aktiv ? "bg-honig-flaeche text-honig-text" : "text-muted hover:bg-flaeche hover:text-foreground"
        }`}
      >
        <span className="relative inline-flex shrink-0">
          <item.icon className="h-[22px] w-[22px] lg:h-5 lg:w-5" />
        </span>
        <Beschriftung item={item} />
        <IconWinkelRechts className={`hidden h-4 w-4 shrink-0 lg:ml-auto lg:block ${offen ? "-rotate-90" : "rotate-90"}`} />
      </button>
      {offen && (
        <div
          id={listeId}
          className="mt-0.5 flex flex-col gap-0.5 rounded-2xl bg-flaeche p-1 lg:mb-1 lg:ml-5 lg:rounded-none lg:border-l-2 lg:border-border lg:bg-transparent lg:p-0 lg:pl-3"
        >
          {unterpunkte.map((unter) => {
            const unterAktiv = pathname.startsWith(unter.href);
            return (
              <Link
                key={unter.href}
                href={unter.href}
                aria-current={unterAktiv ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-center text-[10.5px] font-semibold leading-tight lg:flex-row lg:gap-2.5 lg:px-3 lg:py-2 lg:text-left lg:text-sm ${
                  unterAktiv ? "bg-honig-flaeche text-honig-text" : "text-muted hover:bg-flaeche hover:text-foreground"
                }`}
              >
                <unter.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="w-full break-words lg:w-auto">{unter.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WabeSeitenleiste({ faellig, velutina, aus, name }: Props & MitName) {
  const pathname = usePathname();
  const { scannen, leiste, mehr, neben } = aufteilen(navItems(faellig, velutina, aus));
  const alle = [...leiste, ...mehr];
  return (
    <aside className="sticky top-0 hidden h-screen w-24 shrink-0 flex-col border-r border-border bg-card sm:flex lg:w-64 print:hidden">
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-2 py-4 lg:items-stretch lg:px-4 lg:py-5">
        <Link href="/" aria-label={name} className="flex items-center gap-2.5 px-2 text-accent">
          <IconLogo className="h-7 w-7 shrink-0" />
          {/* Lange Namen brechen auf höchstens zwei Zeilen um. */}
          <span className="wabe-titel hidden min-w-0 break-words hyphens-auto text-lg leading-tight font-bold text-foreground lg:line-clamp-2">{name}</span>
        </Link>
        {scannen && (
          <Link
            href={scannen.href}
            aria-label="Scannen"
            className="my-2 flex h-14 w-14 items-center justify-center gap-2 rounded-[18px] bg-accent font-semibold text-accent-foreground shadow-md lg:h-12 lg:w-auto lg:rounded-[14px]"
          >
            <IconQrCode className="h-6 w-6 lg:h-5 lg:w-5" />
            <span className="hidden lg:inline">Scannen</span>
          </Link>
        )}
        <nav className="flex w-full flex-col gap-0.5">
          {alle.map((item) => {
            const aktiv = item.istAktiv(pathname);
            if (item.unterpunkte) return <WabeGruppe key={item.href} item={item} unterpunkte={item.unterpunkte} pathname={pathname} />;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={aktiv ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-center text-[11.5px] font-semibold leading-tight lg:flex-row lg:gap-3 lg:px-3 lg:py-2.5 lg:text-left lg:text-[15px] ${
                  aktiv ? "bg-honig-flaeche text-honig-text" : "text-muted hover:bg-flaeche hover:text-foreground"
                }`}
              >
                <span className="relative inline-flex shrink-0">
                  <item.icon className="h-[22px] w-[22px] lg:h-5 lg:w-5" />
                  {item.badge !== undefined && <Abzeichen anzahl={item.badge} titel={item.badgeTitel} />}
                </span>
                <Beschriftung item={item} />
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Einstellungen und Anleitung: unten, abgesetzt und kleiner. */}
      <nav aria-label="Weiteres" className="flex shrink-0 flex-col gap-0.5 border-t border-border px-2 py-2 lg:px-4">
        {neben.map((item) => {
          const aktiv = item.istAktiv(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={aktiv ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-center text-[10.5px] font-semibold leading-tight lg:min-h-10 lg:flex-row lg:gap-2.5 lg:px-3 lg:text-left lg:text-sm ${
                aktiv ? "bg-honig-flaeche text-honig-text" : "text-muted hover:bg-flaeche hover:text-foreground"
              }`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0 lg:h-4 lg:w-4" />
              <Beschriftung item={item} />
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 flex-col items-center gap-3 border-t border-border p-3 lg:items-stretch lg:p-4">
        <div className="flex flex-col items-center gap-2 lg:flex-row lg:justify-between">
          <ThemeUmschalter />
          <form action={abmelden}>
            <button type="submit" className="inline-flex min-h-11 items-center px-2 text-xs text-muted hover:text-foreground hover:underline">
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export function WabeKopf({ name }: MitName) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:hidden print:hidden">
      <Link href="/" className="flex min-w-0 items-center gap-2.5 text-accent">
        <IconLogo className="h-7 w-7 shrink-0" />
        <span className="wabe-titel truncate text-xl font-bold text-foreground">{name}</span>
      </Link>
    </header>
  );
}

export function WabeTabLeiste({ faellig, velutina, aus }: Props) {
  const pathname = usePathname();
  const blatt = useRef<HTMLDialogElement>(null);
  const { scannen, leiste, mehr, neben } = aufteilen(navItems(faellig, velutina, aus));
  const mehrAktiv = [...mehr, ...neben].some((item) => item.istAktiv(pathname));
  const mehrBadge = mehr.reduce((summe, item) => summe + (item.badge ?? 0), 0);
  // Aufgeklapptes Untermenü (Lager) im Blatt, wie das Handy-Untermenü im
  // aktuellen Design: volle Zeile direkt unter der Reihe des Menüpunkts.
  const [untermenueOffen, setUntermenueOffen] = useState(false);
  const schliessen = () => {
    blatt.current?.close();
    setUntermenueOffen(false);
  };
  const spalten = mehr.length === 4 ? 4 : 3;
  const gruppe = mehr.find((item) => item.unterpunkte);
  const gruppenIndex = gruppe ? mehr.indexOf(gruppe) : -1;
  const reihenEnde = Math.min(mehr.length - 1, Math.floor(gruppenIndex / spalten) * spalten + spalten - 1);

  const tab = (item: NavItem) => {
    const aktiv = item.istAktiv(pathname);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={aktiv ? "page" : undefined}
        className={`flex flex-col items-center gap-0.5 py-1 text-[11.5px] font-semibold ${aktiv ? "text-foreground" : "text-muted"}`}
      >
        <span className={`relative flex h-8 w-14 items-center justify-center rounded-full ${aktiv ? "bg-honig-flaeche text-honig-text" : ""}`}>
          <item.icon className="h-[22px] w-[22px]" />
          {item.badge !== undefined && <Abzeichen anzahl={item.badge} titel={item.badgeTitel} />}
        </span>
        {item.label === "Bienenstände" ? "Stände" : item.label}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Hauptmenü"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card px-1 pt-1.5 shadow-[0_-6px_18px_rgba(0,0,0,0.06)] sm:hidden print:hidden"
        style={{ paddingBottom: "max(0.6rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {leiste.slice(0, 2).map(tab)}
        {scannen && (
          <Link
            href={scannen.href}
            aria-current={scannen.istAktiv(pathname) ? "page" : undefined}
            className="flex flex-col items-center gap-0.5 text-[11.5px] font-semibold text-muted"
          >
            <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent text-accent-foreground shadow-lg">
              <IconQrCode className="h-7 w-7" />
            </span>
            Scannen
          </Link>
        )}
        {leiste.slice(2).map(tab)}
        <button
          type="button"
          onClick={() => blatt.current?.showModal()}
          className={`flex cursor-pointer flex-col items-center gap-0.5 py-1 text-[11.5px] font-semibold ${mehrAktiv ? "text-foreground" : "text-muted"}`}
        >
          <span className={`relative flex h-8 w-14 items-center justify-center rounded-full ${mehrAktiv ? "bg-honig-flaeche text-honig-text" : ""}`}>
            <MenueSymbol className="h-[22px] w-[22px]" />
            <Abzeichen anzahl={mehrBadge} />
          </span>
          Mehr
        </button>
      </nav>

      {/* Blatt von unten mit allen weiteren Bereichen. Tippen daneben schließt es. */}
      <dialog
        ref={blatt}
        onClick={(event) => event.target === blatt.current && schliessen()}
        onClose={() => setUntermenueOffen(false)}
        className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-3xl border-0 bg-card p-0 text-foreground shadow-lg backdrop:bg-black/40 sm:hidden"
      >
        <div className="flex flex-col gap-4 px-4 pt-2" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
          <span className="h-1 w-10 self-center rounded-full bg-border" aria-hidden="true" />
          <div className={`grid gap-2 ${spalten === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
            {mehr.map((item, index) => {
              const aktiv = item.istAktiv(pathname);
              const offen = !!item.unterpunkte && untermenueOffen;
              const klassen = `flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-center text-xs font-semibold ${
                aktiv || offen ? "bg-honig-flaeche text-honig-text" : "bg-flaeche text-foreground"
              } ${aktiv ? "ring-1 ring-honig/50" : ""}`;
              const inhalt = (
                <>
                  <span className="relative inline-flex">
                    <item.icon className="h-6 w-6" />
                    {item.badge !== undefined && <Abzeichen anzahl={item.badge} titel={item.badgeTitel} />}
                  </span>
                  {item.handyLabel ?? item.label}
                </>
              );
              return (
                <Fragment key={item.href}>
                  {item.unterpunkte ? (
                    <button
                      type="button"
                      aria-expanded={offen}
                      aria-controls="untermenue-wabe-blatt"
                      onClick={() => setUntermenueOffen(!untermenueOffen)}
                      className={`cursor-pointer ${klassen}`}
                    >
                      {inhalt}
                    </button>
                  ) : (
                    <Link href={item.href} onClick={schliessen} aria-current={aktiv ? "page" : undefined} className={klassen}>
                      {inhalt}
                    </Link>
                  )}
                  {untermenueOffen && gruppe?.unterpunkte && index === reihenEnde && (
                    <WabeBlattUntermenue
                      unterpunkte={gruppe.unterpunkte}
                      spalte={gruppenIndex % spalten}
                      spalten={spalten}
                      pathname={pathname}
                      schliessen={schliessen}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1 border-t border-border pt-3">
            {neben.map((item) => {
              const aktiv = item.istAktiv(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={schliessen}
                  aria-current={aktiv ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${
                    aktiv ? "bg-honig-flaeche text-honig-text" : "text-muted"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <ThemeUmschalter />
            <form action={abmelden}>
              <button type="submit" className="inline-flex min-h-11 items-center px-3 text-sm text-muted hover:underline">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

// Untermenü im Blatt: volle Zeile unter der Kachelreihe, ein Zipfel zeigt auf
// die Kachel des Menüpunkts (wie HandyUntermenue im aktuellen Design).
function WabeBlattUntermenue({
  unterpunkte,
  spalte,
  spalten,
  pathname,
  schliessen,
}: {
  unterpunkte: Unterpunkt[];
  spalte: number;
  spalten: number;
  pathname: string;
  schliessen: () => void;
}) {
  return (
    <div id="untermenue-wabe-blatt" className="relative col-span-full grid grid-cols-2 gap-2 rounded-2xl bg-honig-flaeche p-2">
      <span
        aria-hidden="true"
        className="absolute -top-1.5 h-3 w-3 rotate-45 bg-honig-flaeche"
        style={{ left: `calc(${((spalte + 0.5) / spalten) * 100}% - 6px)` }}
      />
      {unterpunkte.map((unter) => {
        const aktiv = pathname.startsWith(unter.href);
        return (
          <Link
            key={unter.href}
            href={unter.href}
            onClick={schliessen}
            aria-current={aktiv ? "page" : undefined}
            className={`relative flex min-h-13 items-center gap-2.5 rounded-xl bg-card px-2.5 py-2 ${aktiv ? "ring-2 ring-honig" : ""}`}
          >
            <unter.icon className="h-6 w-6 shrink-0 text-honig-text" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{unter.label}</span>
              <span className="block text-xs leading-snug text-muted">{unter.inhalt}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
