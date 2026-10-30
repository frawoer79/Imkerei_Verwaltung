"use client";

export type StandMitVoelkern = {
  id: string;
  name: string;
  voelker: { id: string; name: string }[];
};

// Eine Behandlung deckt in der Praxis den ganzen Stand ab, nicht ein einzelnes
// Volk - deshalb Mehrfachauswahl mit "ganzer Stand" als einem Griff. Gewählte
// Völker gehen als versteckte Felder "volkIds" mit dem Formular.
export function VoelkerAuswahl({
  staende,
  gewaehlt,
  setGewaehlt,
  titel,
}: {
  staende: StandMitVoelkern[];
  gewaehlt: string[];
  setGewaehlt: (aendern: (bisher: string[]) => string[]) => void;
  titel: string;
}) {
  function volkUmschalten(volkId: string) {
    setGewaehlt((bisher) =>
      bisher.includes(volkId) ? bisher.filter((id) => id !== volkId) : [...bisher, volkId]
    );
  }

  function standUmschalten(stand: StandMitVoelkern) {
    const alleIds = stand.voelker.map((volk) => volk.id);
    const vollstaendig = alleIds.every((id) => gewaehlt.includes(id));
    setGewaehlt((bisher) =>
      vollstaendig
        ? bisher.filter((id) => !alleIds.includes(id))
        : [...bisher, ...alleIds.filter((id) => !bisher.includes(id))]
    );
  }

  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-muted">{titel}</p>
      <div className="flex flex-col gap-3">
        {staende.map((stand) => {
          const alleIds = stand.voelker.map((volk) => volk.id);
          const vollstaendig = alleIds.length > 0 && alleIds.every((id) => gewaehlt.includes(id));
          return (
            <div key={stand.id} className="rounded-md border border-border p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{stand.name}</span>
                <button
                  type="button"
                  onClick={() => standUmschalten(stand)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-background"
                >
                  {vollstaendig ? "Auswahl aufheben" : "Ganzer Stand"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {stand.voelker.map((volk) => {
                  const an = gewaehlt.includes(volk.id);
                  return (
                    <button
                      key={volk.id}
                      type="button"
                      onClick={() => volkUmschalten(volk.id)}
                      aria-pressed={an}
                      className={`rounded-full border px-3 py-1 text-sm ${
                        an
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-background hover:border-accent"
                      }`}
                    >
                      {volk.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {gewaehlt.map((volkId) => (
        <input key={volkId} type="hidden" name="volkIds" value={volkId} />
      ))}
      <p className="mt-1 text-xs text-muted">
        {gewaehlt.length === 0
          ? "Noch kein Volk gewählt"
          : `${gewaehlt.length} ${gewaehlt.length === 1 ? "Volk" : "Völker"} gewählt`}
      </p>
    </div>
  );
}
