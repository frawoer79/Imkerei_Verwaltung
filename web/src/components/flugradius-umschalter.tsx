"use client";

// Ein-/Ausschalter für die Flugradius-Kreise auf den Karten - optisch passend
// zu KartentypUmschalter und VollbildButton (eingeschaltet = Akzentfarbe).
export function FlugradiusUmschalter({
  sichtbar,
  onToggle,
}: {
  sichtbar: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={sichtbar}
      title={sichtbar ? "Flugradius ausblenden" : "Flugradius einblenden"}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium ${
        sichtbar ? "bg-accent text-accent-foreground" : "bg-card hover:bg-background"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-3 w-3 rounded-full border ${
          sichtbar ? "border-current bg-current/40" : "border-muted"
        }`}
      />
      Flugradius
    </button>
  );
}
