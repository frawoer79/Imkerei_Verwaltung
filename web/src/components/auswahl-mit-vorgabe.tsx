"use client";

import { useEffect, useRef } from "react";

// Auswahlfeld mit defaultValue, das ein Zurücksetzen des Formulars übersteht.
//
// React setzt ein Formular nach einer Server-Aktion zurück. Eingabefelder
// fallen dabei auf ihren (inzwischen neuen) Vorgabewert zurück, ein <select>
// aber auf die erste Option: React merkt sich defaultValue nicht als
// "selected"-Attribut. Die Auswahl sah dann so aus, als sei nichts
// gespeichert, und das nächste Speichern hätte den Wert wirklich gelöscht.
// Hier wird nach dem Zurücksetzen der aktuelle Vorgabewert wieder eingestellt.
export function AuswahlMitVorgabe(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const feld = useRef<HTMLSelectElement>(null);
  const vorgabe = useRef(props.defaultValue);

  // Neuer Vorgabewert vom Server (z.B. gerade gespeichert): übernehmen.
  useEffect(() => {
    vorgabe.current = props.defaultValue;
    einstellen(feld.current, props.defaultValue);
  }, [props.defaultValue]);

  useEffect(() => {
    const formular = feld.current?.form;
    if (!formular) return;
    function zuruecksetzen() {
      // Das reset-Ereignis kommt vor dem eigentlichen Zurücksetzen, und die
      // neuen Daten vom Server sind evtl. noch nicht da: kurz warten. Kommen
      // sie später, stellt der Effekt oben den neuen Wert ein.
      setTimeout(() => einstellen(feld.current, vorgabe.current), 0);
    }
    formular.addEventListener("reset", zuruecksetzen);
    return () => formular.removeEventListener("reset", zuruecksetzen);
  }, []);

  return <select ref={feld} {...props} />;
}

function einstellen(feld: HTMLSelectElement | null, wert: React.SelectHTMLAttributes<HTMLSelectElement>["defaultValue"]) {
  if (feld && wert !== undefined && !Array.isArray(wert)) feld.value = String(wert);
}
