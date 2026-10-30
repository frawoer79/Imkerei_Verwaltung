import { Fragment } from "react";

// Zeigt die Änderungsliste eines Release (Markdown von GitHub, geschrieben
// nach AENDERUNGEN.md) als einfache Absätze, Zwischenüberschriften und
// Aufzählungen. Bewusst nur dieser kleine Teil von Markdown und kein HTML:
// Der Text kommt aus dem Internet und wird nie als HTML eingesetzt.
export function AenderungsText({ text }: { text: string }) {
  const bloecke: React.ReactNode[] = [];
  let liste: string[] = [];
  let absatz: string[] = [];

  const listeAbschliessen = () => {
    if (liste.length === 0) return;
    bloecke.push(
      <ul key={bloecke.length} className="list-disc space-y-1 pl-5">
        {liste.map((punkt, i) => (
          <li key={i}>{fett(punkt)}</li>
        ))}
      </ul>,
    );
    liste = [];
  };
  const absatzAbschliessen = () => {
    if (absatz.length === 0) return;
    bloecke.push(<p key={bloecke.length}>{fett(absatz.join(" "))}</p>);
    absatz = [];
  };

  for (const roh of text.replace(/\r\n/g, "\n").split("\n")) {
    const zeile = roh.trim();
    const ueberschrift = /^#{1,6}\s+(.*)$/.exec(zeile);
    const punkt = /^[-*+]\s+(.*)$/.exec(zeile);
    if (zeile === "" || /^<!--.*-->$/.test(zeile)) {
      absatzAbschliessen();
      listeAbschliessen();
    } else if (ueberschrift) {
      absatzAbschliessen();
      listeAbschliessen();
      bloecke.push(
        <p key={bloecke.length} className="font-semibold">
          {fett(ueberschrift[1])}
        </p>,
      );
    } else if (punkt) {
      absatzAbschliessen();
      liste.push(punkt[1]);
    } else if (liste.length > 0 && /^\s/.test(roh)) {
      // Eingerückte Fortsetzung eines Aufzählungspunkts.
      liste[liste.length - 1] += ` ${zeile}`;
    } else {
      listeAbschliessen();
      absatz.push(zeile);
    }
  }
  absatzAbschliessen();
  listeAbschliessen();

  return <div className="flex flex-col gap-2 text-sm">{bloecke}</div>;
}

// **fett** und `Code` hervorheben, Links als reinen Text (ohne Adresse).
function fett(text: string): React.ReactNode {
  const ohneLinks = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  return ohneLinks.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((teil, i) => {
    if (teil.startsWith("**") && teil.endsWith("**") && teil.length > 4) {
      return <b key={i}>{teil.slice(2, -2)}</b>;
    }
    if (teil.startsWith("`") && teil.endsWith("`") && teil.length > 2) {
      return (
        <code key={i} className="rounded bg-flaeche px-1 font-mono text-[0.9em]">
          {teil.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{teil}</Fragment>;
  });
}
