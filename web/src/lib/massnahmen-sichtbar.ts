import type { Prisma } from "@/generated/prisma/client";

/// Maßnahmen, die in Listen, Kalender und Hinweisen erscheinen. Schritte eines
/// biotechnischen Verfahrens nur, wenn beim Verfahren "In die Maßnahmen"
/// gewählt ist - sonst stehen sie nur beim Verfahren selbst.
export const SICHTBARE_MASSNAHMEN = {
  OR: [{ bioVerfahrenId: null }, { bioVerfahren: { inMassnahmen: true } }],
} satisfies Prisma.MassnahmeWhereInput;
