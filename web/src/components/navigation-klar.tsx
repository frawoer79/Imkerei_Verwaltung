"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeUmschalter } from "@/components/theme-umschalter";
import { Abzeichen, nachRang, navItems, useGruppeOffen, type NavItem, type Unterpunkt } from "@/components/navigation";
import { abmelden } from "@/lib/actions";
import { IconLogo, IconQrCode, IconWinkelRechts } from "@/components/icons";

// Navigation für das Design "Bergsee" (intern "klar"): dunkles Kopfband. Am Handy darunter ein
// Reiterstreifen zum Wischen, ab Tablet die Menüpunkte im Band selbst
// (erst ab sehr breiten Monitoren alle, sonst die ersten fünf plus "Mehr").
// Einstellungen und Anleitung stehen immer klein im Menü hinter dem Knopf.

type Props = { faellig: number; velutina: number; aus: readonly string[] };

// So viele Menüpunkte stehen unterhalb von 2xl direkt im Kopfband.
const IM_BAND = 5;

function MenueSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 6h13M3.5 10h13M3.5 14h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Schließt ein Aufklapp-Panel bei Klick daneben und bei Escape.
function useSchliessenDaneben(offen: boolean, schliessen: () => void) {
  const bereich = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!offen) return;
    const klick = (event: MouseEvent) => {
      if (bereich.current && !bereich.current.contains(event.target as Node)) schliessen();
    };
    const taste = (event: KeyboardEvent) => event.key === "Escape" && schliessen();
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen, schliessen]);
  return bereich;
}

// Menüpunkt mit Untermenü (Lager) im Kopfband: klappt ein kleines Panel
// darunter auf, mit denselben Unterpunkten wie im aktuellen Design.
function BandGruppe({ item, unterpunkte, pathname, className }: { item: NavItem; unterpunkte: Unterpunkt[]; pathname: string; className: string }) {
  const aktiv = item.istAktiv(pathname);
  const [offenAuf, setOffenAuf] = useState<string | null>(null);
  const offen = offenAuf === pathname;
  const bereich = useSchliessenDaneben(offen, () => setOffenAuf(null));
  return (
    <div ref={bereich} className={`relative items-stretch ${className}`}>
      <button
        type="button"
        aria-expanded={offen}
        aria-current={aktiv ? "page" : undefined}
        onClick={() => setOffenAuf(offen ? null : pathname)}
        className={`flex cursor-pointer items-center gap-2 border-y-[3px] border-t-transparent px-2.5 text-sm font-semibold whitespace-nowrap ${
          aktiv ? "border-b-honig text-kopf-text" : "border-b-transparent text-kopf-leise hover:text-kopf-text"
        }`}
      >
        <item.icon className="h-[18px] w-[18px]" />
        {item.label}
        <IconWinkelRechts className={`h-3.5 w-3.5 ${offen ? "-rotate-90" : "rotate-90"}`} />
      </button>
      {offen && (
        <div className="absolute left-0 top-full z-50 mt-1 flex w-64 flex-col gap-0.5 rounded-lg border border-border bg-card p-2 text-foreground shadow-xl">
          {unterpunkte.map((unter) => (
            <UnterLink key={unter.href} unter={unter} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

function UnterLink({ unter, pathname }: { unter: Unterpunkt; pathname: string }) {
  const aktiv = pathname.startsWith(unter.href);
  return (
    <Link
      href={unter.href}
      aria-current={aktiv ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold hover:bg-flaeche ${aktiv ? "bg-accent/10 text-accent" : ""}`}
    >
      <unter.icon className="h-5 w-5 shrink-0" />
      {unter.label}
    </Link>
  );
}

// Menüpunkt mit Untermenü im "Mehr"-Menü: klappt die Unterpunkte eingerückt
// darunter auf, wie die Seitenleiste im aktuellen Design.
function MenueGruppe({ item, unterpunkte, pathname, className }: { item: NavItem; unterpunkte: Unterpunkt[]; pathname: string; className: string }) {
  const aktiv = item.istAktiv(pathname);
  const [offen, umschalten] = useGruppeOffen(aktiv, pathname);
  return (
    <div className={`flex-col ${className}`}>
      <button
        type="button"
        aria-expanded={offen}
        onClick={umschalten}
        className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold hover:bg-flaeche ${aktiv ? "text-accent" : ""}`}
      >
        <item.icon className="h-5 w-5" />
        {item.label}
        <IconWinkelRechts className={`ml-auto h-4 w-4 ${offen ? "-rotate-90" : "rotate-90"}`} />
      </button>
      {offen && (
        <div className="mb-1 ml-5 flex flex-col gap-0.5 border-l-2 border-border pl-2">
          {unterpunkte.map((unter) => (
            <UnterLink key={unter.href} unter={unter} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

export function KlarKopf({ faellig, velutina, aus, name }: Props & { name: string }) {
  const pathname = usePathname();
  const { haupt: items, neben } = nachRang(navItems(faellig, velutina, aus));
  const scannen = items.find((item) => item.href === "/scannen");
  const menue = items.filter((item) => item !== scannen);
  const [offen, setOffen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const streifen = useRef<HTMLDivElement>(null);
  // Untermenü am Handy: gilt nur auf der Seite, auf der es geöffnet wurde.
  const [streifenOffenAuf, setStreifenOffenAuf] = useState<string | null>(null);
  const streifenOffen = streifenOffenAuf === pathname;
  const streifenGruppe = menue.find((item) => item.unterpunkte);

  // Menü schließt bei Klick daneben, Escape und Seitenwechsel.
  useEffect(() => {
    if (!offen) return;
    const klick = (event: MouseEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) setOffen(false);
    };
    const taste = (event: KeyboardEvent) => event.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);
  const [offenAuf, setOffenAuf] = useState(pathname);
  if (offenAuf !== pathname) {
    setOffenAuf(pathname);
    setOffen(false);
  }

  // Aktiven Reiter am Handy in den sichtbaren Bereich holen.
  useEffect(() => {
    streifen.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-kopf text-kopf-text print:hidden">
      <div className="mx-auto flex h-14 max-w-[96rem] items-stretch gap-1 px-3 sm:h-15 sm:px-5 2xl:px-8">
        {/* Name neben dem Logo (lib/menue-name.ts); lange Namen werden
            gekürzt, damit sie die Menüpunkte im Band nicht verdrängen. */}
        <Link href="/" title={name} className="mr-3 flex min-w-0 items-center gap-2 text-[17px] font-bold">
          <IconLogo className="h-6 w-6 shrink-0 text-honig" />
          <span className="max-w-[12rem] truncate sm:max-w-[9rem] lg:max-w-[16rem]">{name}</span>
        </Link>
        <nav className="hidden flex-1 items-stretch gap-0.5 sm:flex">
          {menue.map((item, index) => {
            const aktiv = item.istAktiv(pathname);
            const sichtbar = `${index < IM_BAND ? "flex" : "hidden 2xl:flex"} ${index >= 3 && index < IM_BAND ? "sm:hidden lg:flex" : ""}`;
            if (item.unterpunkte) {
              return <BandGruppe key={item.href} item={item} unterpunkte={item.unterpunkte} pathname={pathname} className={sichtbar} />;
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={aktiv ? "page" : undefined}
                className={`items-center gap-2 border-y-[3px] border-t-transparent px-2.5 text-sm font-semibold whitespace-nowrap ${sichtbar} ${
                  aktiv ? "border-b-honig text-kopf-text" : "border-b-transparent text-kopf-leise hover:text-kopf-text"
                }`}
              >
                <span className="relative inline-flex">
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.badge !== undefined && <Abzeichen anzahl={item.badge} titel={item.badgeTitel} />}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {scannen && (
            <Link
              href={scannen.href}
              aria-label="Scannen"
              className="flex h-10 items-center gap-2 rounded-lg bg-honig px-3 text-sm font-bold text-[#1c1300]"
            >
              <IconQrCode className="h-5 w-5" />
              <span className="hidden sm:inline">Scannen</span>
            </Link>
          )}
          <div ref={panel} className="relative">
            <button
              type="button"
              aria-expanded={offen}
              aria-haspopup="true"
              aria-label="Menü"
              onClick={() => setOffen(!offen)}
              className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-kopf-text hover:bg-white/10 ${
                neben.some((item) => item.istAktiv(pathname)) ? "bg-white/10" : ""
              }`}
            >
              <MenueSymbol className="h-5 w-5" />
              <span className="hidden sm:inline 2xl:hidden">Mehr</span>
            </button>
            {offen && (
              <div className="absolute right-0 top-full z-50 mt-2 flex w-72 flex-col gap-1 rounded-lg border border-border bg-card p-2 text-foreground shadow-xl">
                {menue.map((item, index) => {
                  const sichtbar = index < 3 ? "hidden" : index < IM_BAND ? "hidden sm:flex lg:hidden" : "hidden sm:flex 2xl:hidden";
                  if (item.unterpunkte) {
                    return <MenueGruppe key={item.href} item={item} unterpunkte={item.unterpunkte} pathname={pathname} className={sichtbar} />;
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-flaeche ${
                        item.istAktiv(pathname) ? "text-accent" : ""
                      } ${sichtbar}`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
                {/* Einstellungen und Anleitung: immer hier, abgesetzt und kleiner. */}
                <div className="flex flex-col gap-0.5 border-border sm:mt-1 sm:border-t sm:pt-1 2xl:mt-0 2xl:border-t-0 2xl:pt-0">
                  {neben.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={item.istAktiv(pathname) ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium hover:bg-flaeche ${
                        item.istAktiv(pathname) ? "text-accent" : "text-muted"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-border px-3 pt-2">
                  <ThemeUmschalter />
                  <form action={abmelden}>
                    <button type="submit" className="inline-flex min-h-11 items-center px-2 text-sm text-muted hover:underline">
                      Abmelden
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Handy: alle Bereiche als Reiter zum Wischen. */}
      <div
        ref={streifen}
        className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 sm:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {menue.map((item) => {
          const aktiv = item.istAktiv(pathname);
          if (item.unterpunkte) {
            return (
              <button
                key={item.href}
                type="button"
                aria-expanded={streifenOffen}
                aria-controls="untermenue-klar-handy"
                aria-current={aktiv ? "page" : undefined}
                onClick={() => setStreifenOffenAuf(streifenOffen ? null : pathname)}
                className={`flex shrink-0 cursor-pointer items-center gap-1 border-b-[3px] px-2.5 pt-2.5 pb-2 text-sm font-semibold whitespace-nowrap ${
                  aktiv ? "border-honig text-kopf-text" : streifenOffen ? "border-kopf-leise text-kopf-text" : "border-transparent text-kopf-leise"
                }`}
              >
                {item.label}
                <IconWinkelRechts className={`h-3.5 w-3.5 ${streifenOffen ? "-rotate-90" : "rotate-90"}`} />
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={aktiv ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-2.5 pt-2.5 pb-2 text-sm font-semibold whitespace-nowrap ${
                aktiv ? "border-honig text-kopf-text" : "border-transparent text-kopf-leise"
              }`}
            >
              {item.label}
              {!!item.badge && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gefahr-voll px-1 text-xs font-bold text-gefahr-voll-text">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {/* Handy: Untermenü (Lager) als zweite Reihe unter den Reitern. */}
      {streifenOffen && streifenGruppe?.unterpunkte && (
        <div id="untermenue-klar-handy" className="grid grid-cols-2 gap-2 border-t border-white/10 px-3 py-2 sm:hidden">
          {streifenGruppe.unterpunkte.map((unter) => {
            const aktiv = pathname.startsWith(unter.href);
            return (
              <Link
                key={unter.href}
                href={unter.href}
                aria-current={aktiv ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
                  aktiv ? "bg-honig text-[#1c1300]" : "bg-white/10 text-kopf-text"
                }`}
              >
                <unter.icon className="h-5 w-5 shrink-0" />
                {unter.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
