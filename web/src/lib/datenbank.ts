import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { zuLangeSpalte } from "@/lib/eingabe-grenzen";
import { mitHistorie } from "@/lib/historie";

// Die eigentlichen Datenbank-Clients, einer je Schema. Der übrige Code
// benutzt `prisma` aus web/src/lib/prisma.ts, das automatisch das Schema des
// angemeldeten Kontos wählt.

// Next.js lädt Module im Entwicklungsmodus bei jeder Code-Änderung neu (Hot Reload).
// Ohne diesen Zwischenspeicher auf `globalThis` würde dabei bei jeder Änderung eine
// neue Datenbankverbindung aufgebaut, bis Postgres keine Verbindungen mehr frei hat.
const globalForPrisma = globalThis as unknown as {
  prismaClients: Map<string, PrismaClient> | undefined;
};

const clients = globalForPrisma.prismaClients ?? new Map<string, PrismaClient>();
globalForPrisma.prismaClients = clients;

export const BASIS_SCHEMA = "public";

export function clientFuerSchema(schema: string): PrismaClient {
  let client = clients.get(schema);
  if (!client) {
    const adapter = new PrismaPg(
      { connectionString: process.env.DATABASE_URL },
      schema === BASIS_SCHEMA ? undefined : { schema },
    );
    // Erst prüfen, dann protokollieren: Abgelehntes landet nicht in der Historie.
    client = mitHistorie(mitLaengenPruefung(new PrismaClient({ adapter })));
    clients.set(schema, client);
  }
  return client;
}

export class EingabeZuLangFehler extends Error {}

type Delegat = { findUnique: (a: unknown) => Promise<Record<string, unknown> | null> };

// Letzte Hürde vor der Datenbank: zu lange Texte (Grenzen in
// lib/eingabe-grenzen.ts) und zu große Zahlen werden nicht gespeichert. Im
// Browser verhindert das schon maxLength; das hier greift nur, wenn jemand
// daran vorbei schickt. Ein schon gespeicherter, zu langer Wert darf
// unverändert wieder mitkommen (z.B. beim Ändern der Notizen eines Volks mit
// altem, langem Namen) - nur Neues muss passen.
function mitLaengenPruefung(basis: PrismaClient): PrismaClient {
  async function pruefen(modell: string, daten: unknown, bisher?: () => Promise<Record<string, unknown> | null>) {
    const liste = Array.isArray(daten) ? daten : [daten];
    for (const eintrag of liste) {
      const treffer = zuLangeSpalte(modell, eintrag as Record<string, unknown>);
      if (!treffer) continue;
      if (bisher) {
        const alt = await bisher();
        const neu = (eintrag as Record<string, unknown>)[treffer.spalte];
        const neuerWert = neu && typeof neu === "object" && "set" in neu ? (neu as { set: unknown }).set : neu;
        if (alt && alt[treffer.spalte] === neuerWert) {
          // Unverändert - die übrigen Spalten trotzdem prüfen.
          const rest = { ...(eintrag as Record<string, unknown>) };
          delete rest[treffer.spalte];
          await pruefen(modell, rest, bisher);
          continue;
        }
      }
      throw new EingabeZuLangFehler(`${modell}.${treffer.spalte} ist zu lang (höchstens ${treffer.grenze}).`);
    }
  }
  function delegat(modell: string): Delegat {
    const schluessel = modell.charAt(0).toLowerCase() + modell.slice(1);
    return (basis as unknown as Record<string, Delegat>)[schluessel];
  }
  return basis.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          await pruefen(model, args.data);
          return query(args);
        },
        async createMany({ model, args, query }) {
          await pruefen(model, args.data);
          return query(args);
        },
        async updateMany({ model, args, query }) {
          await pruefen(model, args.data);
          return query(args);
        },
        async update({ model, args, query }) {
          await pruefen(model, args.data, () => delegat(model).findUnique({ where: args.where }));
          return query(args);
        },
        async upsert({ model, args, query }) {
          await pruefen(model, args.create);
          await pruefen(model, args.update, () => delegat(model).findUnique({ where: args.where }));
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

// Beim Entfernen eines Testzugangs die Verbindungen zu seinem Schema schließen.
export async function clientVerwerfen(schema: string): Promise<void> {
  const client = clients.get(schema);
  if (client) {
    clients.delete(schema);
    await client.$disconnect();
  }
}

// Franks Schema, unabhängig davon, wer angemeldet ist. Nur für die Anmeldung
// und die Verwaltung der Testzugänge - nie für Imkerei-Daten.
export const basisPrisma = clientFuerSchema(BASIS_SCHEMA);
